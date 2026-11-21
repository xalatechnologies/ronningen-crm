"use client";

import { ListPagination } from "@/components/ui/list-pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { StatCard } from "@/components/ui/stat-card";
import {
  customerUpsertFormSchema,
  type CustomerUpsertFormInput,
} from "@/lib/validations";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { CustomersPageSearchToolbar } from "@/components/customers/customers-page-search-toolbar";
import { usePageSearch } from "@/providers/page-search-provider";
import { CustomersPageTabBar } from "@/components/customers/customers-page-tab-bar";
import { useCustomersPageTab } from "@/components/customers/use-customers-page-tab";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { RN_PAGE_SEARCH_ACTIONS } from "@/lib/rn-ui";
import { APP_DATA_AMOUNT, APP_DATA_BODY, APP_DATA_PRIMARY } from "@/lib/table-typography";
import { cn } from "@/lib/utils";
import { deleteCustomerWithClient } from "@/lib/customers/delete-customer";
import { createCustomerAtomic } from "@/lib/reservations/atomic-create";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight } from "lucide-react";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CustomerAvatar } from "./customer-avatar";
import { CustomerDrawerBody } from "./customer-drawer-body";
import { PartnersPanel } from "./partners-panel";
import type {
  CustomerBookingListItem,
  CustomerRow,
  PartnerRow,
} from "./types";

import { TENANT_LIST_PAGE_SIZE } from "@/lib/list-pagination";


const TAB_TITLE_KEYS = {
  customers: "customers.title",
  partners: "customers.partners",
} as const satisfies Record<"customers" | "partners", TranslationKey>;

export type { CustomerBookingListItem, PartnerRow } from "./types";

export type CustomersSectionProps = {
  customers: CustomerRow[];
  partners: PartnerRow[];
  bookings: CustomerBookingListItem[];
  loadError: string | null;
};

function aggregateByCustomer(bookings: CustomerBookingListItem[]) {
  const map = new Map<
    string,
    { count: number; spent: number; outstanding: number }
  >();
  for (const b of bookings) {
    const cur =
      map.get(b.customer_id) ?? { count: 0, spent: 0, outstanding: 0 };
    cur.count += 1;
    cur.spent += Number(b.total_price);
    cur.outstanding += Number(b.remaining_amount);
    map.set(b.customer_id, cur);
  }
  return map;
}

function BookingCountBadge({ count }: { count: number }) {
  return (
    <span
      className={cn(
        "customers-booking-count-pill inline-flex min-w-7 items-center justify-center rounded-full px-2.5 py-0.5 font-semibold tabular-nums",
        count > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {count}
    </span>
  );
}

export function CustomersSection({
  customers,
  partners,
  bookings,
  loadError,
}: CustomersSectionProps) {
  const { t, formatCurrency } = useTranslation();
  const { tab, setTab } = useCustomersPageTab();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateCustomers, invalidateInquiries } = useTenantDataInvalidation();
  const { query } = usePageSearch();
  const [customersPage, setCustomersPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [partnersAddOpen, setPartnersAddOpen] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [customerDeleteTarget, setCustomerDeleteTarget] =
    useState<CustomerRow | null>(null);

  const stats = useMemo(() => aggregateByCustomer(bookings), [bookings]);

  const totals = useMemo(() => {
    let bookingCount = 0;
    let spent = 0;
    for (const v of stats.values()) {
      bookingCount += v.count;
      spent += v.spent;
    }
    return { bookingCount, spent };
  }, [stats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const hay = [c.name, c.email ?? "", c.phone ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [customers, query]);

  useEffect(() => {
    setCustomersPage(1);
  }, [query]);

  const pagination = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filtered.length / TENANT_LIST_PAGE_SIZE),
    );
    const currentPage = Math.min(Math.max(1, customersPage), totalPages);
    const start = (currentPage - 1) * TENANT_LIST_PAGE_SIZE;
    return {
      totalPages,
      currentPage,
      pageRows: filtered.slice(start, start + TENANT_LIST_PAGE_SIZE),
    };
  }, [filtered, customersPage]);

  const { totalPages, currentPage, pageRows } = pagination;

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) ?? null,
    [customers, selectedId],
  );

  const selectedBookings = useMemo(
    () =>
      selectedId
        ? bookings.filter((b) => b.customer_id === selectedId)
        : [],
    [bookings, selectedId],
  );

  const addForm = useForm<CustomerUpsertFormInput>({
    resolver: zodResolver(
      customerUpsertFormSchema,
    ) as Resolver<CustomerUpsertFormInput>,
    defaultValues: { name: "", phone: "", email: "" },
  });
  const submitInFlightRef = useRef(false);
  const {
    formState: { isSubmitting: addIsSubmitting },
  } = addForm;

  async function onAddCustomer(data: CustomerUpsertFormInput) {
    if (submitInFlightRef.current || addIsSubmitting) return;
    submitInFlightRef.current = true;

    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      submitInFlightRef.current = false;
      toast.error(
        err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
      );
      return;
    }

    try {
      const result = await createCustomerAtomic(supabase, {
        organization_id: orgId,
        customer_name: data.name.trim(),
        customer_phone: data.phone.trim() || null,
        customer_email: data.email.trim() || null,
        customer_address: null,
      });

      toast.success(t("customers.toasts.customerCreated"));
      addForm.reset();
      setAddOpen(false);
      setSelectedId(result.customerId);
      invalidateCustomers();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("customers.toasts.unknownError");
      toast.error(t("customers.toasts.customerCreateFailed"), {
        description: message,
      });
    } finally {
      submitInFlightRef.current = false;
    }
  }

  async function performCustomerDelete(id: string) {
    if (!currentOrganizationId) return;
    setDeleteBusyId(id);
    try {
      const result = await deleteCustomerWithClient(
        supabase,
        currentOrganizationId,
        id,
      );
      if (!result.ok) {
        toast.error(t("customers.delete.blockedTitle"), {
          description: result.error,
        });
        return;
      }
      toast.success(t("customers.toasts.customerDeleted"));
      if (selectedId === id) setSelectedId(null);
      invalidateCustomers();
      if (result.deletedInquiries > 0) {
        invalidateInquiries();
      }
    } finally {
      setDeleteBusyId(null);
    }
  }

  function requestDeleteCustomer(c: CustomerRow, bookingCount: number) {
    if (bookingCount > 0) {
      toast.error(t("customers.delete.blockedTitle"), {
        description: t("customers.deleteBlocked", {
          count: bookingCount,
          bookingsLabel:
            bookingCount === 1
              ? t("customers.bookingSingular")
              : t("customers.bookingPlural"),
        }),
      });
      return;
    }
    setCustomerDeleteTarget(c);
  }

  async function confirmCustomerDelete() {
    const c = customerDeleteTarget;
    if (!c) return;
    setCustomerDeleteTarget(null);
    await performCustomerDelete(c.id);
  }

  const detailStats = selected
    ? stats.get(selected.id) ?? { count: 0, spent: 0, outstanding: 0 }
    : null;

  const customerColumns = useMemo<DataTableColumn<CustomerRow>[]>(
    () => [
    {
      id: "name",
      header: t("common.fields.name"),
      cell: (c) => (
        <span className="flex items-center gap-3">
          <CustomerAvatar name={c.name} />
          <span
            className={cn(
              "customers-row-name min-w-0 truncate",
              APP_DATA_PRIMARY,
              selectedId === c.id ? "text-success" : "",
            )}
          >
            {c.name}
          </span>
        </span>
      ),
    },
    {
      id: "phone",
      header: t("common.fields.phone"),
      className: cn("customers-row-meta", APP_DATA_BODY),
      cell: (c) => c.phone ?? "—",
    },
    {
      id: "email",
      header: t("common.fields.email"),
      className: cn("customers-row-meta", APP_DATA_BODY),
      cell: (c) => c.email ?? "—",
    },
    {
      id: "bookings",
      header: t("customers.table.bookings"),
      cell: (c) => <BookingCountBadge count={(stats.get(c.id) ?? { count: 0 }).count} />,
    },
    {
      id: "spent",
      header: t("customers.table.totalSpent"),
      align: "right",
      className: cn("customers-row-metric tabular-nums", APP_DATA_AMOUNT),
      cell: (c) => {
        const spent = (stats.get(c.id) ?? { spent: 0 }).spent;
        return (
          <span className={spent > 0 ? "font-bold text-success" : "font-medium text-muted-foreground"}>
            {formatCurrency(spent)}
          </span>
        );
      },
    },
    {
      id: "open",
      header: t("customers.open"),
      srOnlyHeader: true,
      align: "right",
      headClassName: "w-12",
      className: "pl-2",
      cell: () => (
        <ChevronRight
          className="ml-auto size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      ),
    },
  ],
    [t, formatCurrency, selectedId, stats],
  );

  return (
    <div className="customers-page-workspace mx-auto flex w-full flex-col gap-8 pb-24 md:pb-8">
      {loadError ? (
        <div
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          {t("customers.loadError", { error: loadError })}
        </div>
      ) : null}

      {!loadError ? (
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <div className="customers-page-hero">
              <AppPageHeader
                className="mb-0"
                surface="default"
                title={t(TAB_TITLE_KEYS[tab])}
                titleClassName={
                  tab === "partners" ? "customers-partners-hero" : undefined
                }
                actionsClassName={RN_PAGE_SEARCH_ACTIONS}
                actions={
                  <div className="flex w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
                    <CustomersPageTabBar
                      activeTab={tab}
                      onTabChange={setTab}
                      customerCount={customers.length}
                      partnerCount={partners.length}
                    />
                    {tab === "customers" ? (
                      <CustomersPageSearchToolbar
                        addLabel={t("customers.newCustomer")}
                        onAdd={() => setAddOpen(true)}
                        toolbarAriaLabel={t("customers.toolbarCustomersAria")}
                      />
                    ) : (
                      <CustomersPageSearchToolbar
                        addLabel={t("customers.newPartner")}
                        onAdd={() => setPartnersAddOpen(true)}
                        toolbarAriaLabel={t("customers.toolbarPartnersAria")}
                      />
                    )}
                  </div>
                }
              />
            </div>
          </div>

          {tab === "customers" && customers.length > 0 ? (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4" aria-label={t("customers.title")}>
              {(
                [
                  [t("customers.title"), String(customers.length)],
                  [t("customers.table.bookings"), String(totals.bookingCount)],
                  [t("customers.table.totalSpent"), formatCurrency(totals.spent)],
                ] as const
              ).map(([label, value], i) => (
                <StatCard
                  key={label}
                  label={label}
                  value={value}
                  className={cn(i === 2 && "col-span-2 sm:col-span-1")}
                />
              ))}
            </section>
          ) : null}

          <div
            role="tabpanel"
            id="tabpanel-customers"
            aria-labelledby="tab-customers"
            hidden={tab !== "customers"}
            className={cn(tab === "customers" && "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8")}
          >
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center md:px-8 md:py-16">
                <p className="customers-empty-hint text-muted-foreground">
                  {t("customers.emptyCustomers")}
                </p>
              </div>
            ) : (
              <>
                <DataTable
                  rows={pageRows}
                  getRowKey={(c) => c.id}
                  columns={customerColumns}
                  onRowClick={(c) => setSelectedId(c.id)}
                  rowActionLabel={(c) => `${t("customers.open")}: ${c.name}`}
                  rowClassName={(c) => (selectedId === c.id ? "bg-muted/60" : undefined)}
                  renderMobileItem={(c) => {
                    const st = stats.get(c.id) ?? { count: 0, spent: 0, outstanding: 0 };
                    return (
                      <button
                          type="button"
                          onClick={() => setSelectedId(c.id)}
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
                        >
                          <CustomerAvatar name={c.name} />
                          <span className="min-w-0 flex-1">
                            <span className="customers-row-name block truncate font-semibold text-rn-text-heading">
                              {c.name}
                            </span>
                            <span className="customers-row-meta block truncate text-muted-foreground">
                              {c.phone ?? c.email ?? "—"}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={cn(
                                "customers-row-metric text-app-sm tabular-nums",
                                st.spent > 0 ? "font-bold text-success" : "font-medium text-muted-foreground",
                              )}
                            >
                              {formatCurrency(st.spent)}
                            </span>
                            <BookingCountBadge count={st.count} />
                          </span>
                          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                        </button>
                    );
                  }}
                />

                {filtered.length > 0 ? (
                  <ListPagination
  summary={<>
                      {filtered.length <= TENANT_LIST_PAGE_SIZE
                        ? t("customers.footer.showingCount", {
                            count: filtered.length,
                            label:
                              filtered.length === 1
                                ? t("customers.footer.customerWord")
                                : t("customers.footer.customersWord"),
                          })
                        : t("customers.footer.showingRange", {
                            from:
                              (currentPage - 1) * TENANT_LIST_PAGE_SIZE + 1,
                            to: Math.min(
                              currentPage * TENANT_LIST_PAGE_SIZE,
                              filtered.length,
                            ),
                            total: filtered.length,
                          })}
                    </>}
  page={currentPage}
  totalPages={totalPages}
  onPageChange={setCustomersPage}
/>
                ) : null}
              </>
            )}
          </div>

          <div
            role="tabpanel"
            id="tabpanel-partners"
            aria-labelledby="tab-partners"
            hidden={tab !== "partners"}
            className={cn(tab === "partners" && "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8")}
          >
            <PartnersPanel
              partners={partners}
              showHeader={false}
              addOpen={partnersAddOpen}
              onAddOpenChange={setPartnersAddOpen}
            />
          </div>
        </div>
      ) : null}

      <Sheet
        open={selectedId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className={cn(
            "w-full max-w-[min(100vw,36rem)] gap-0 border-l border-foreground/10 bg-card p-0 sm:max-w-[36rem]",
          )}
        >
          {selected && detailStats ? (
            <CustomerDrawerBody
              key={selected.id}
              customer={selected}
              stats={detailStats}
              bookings={selectedBookings}
              deleteBusy={deleteBusyId != null}
              onClose={() => setSelectedId(null)}
              onDeleteCustomer={() =>
                requestDeleteCustomer(selected, detailStats.count)
              }
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={customerDeleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setCustomerDeleteTarget(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-[calc(100%-2rem)] gap-4 rounded-2xl border border-foreground/10 bg-card p-6 shadow-xl sm:max-w-md"
        >
          {customerDeleteTarget ? (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading">
                  {t("customers.delete.title")}
                </DialogTitle>
                <DialogDescription className="text-base leading-relaxed text-muted-foreground">
                  {t("customers.delete.description", {
                    name: customerDeleteTarget.name,
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="cta"
                  className="w-full rounded-xl border border-foreground/30 bg-card shadow-none hover:bg-muted sm:w-auto"
                  onClick={() => setCustomerDeleteTarget(null)}
                >
                  {t("common.actions.cancel")}
                </Button>
                <Button
                  type="button"
                  size="cta"
                  disabled={deleteBusyId != null}
                  className="w-full rounded-xl border-0 bg-red-600 !text-white shadow-none hover:bg-red-700 sm:w-auto"
                  onClick={() => void confirmCustomerDelete()}
                >
                  {t("customers.delete.confirm")}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="max-w-md rounded-2xl border border-foreground/10"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
              {t("customers.newCustomer")}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={addForm.handleSubmit(onAddCustomer)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>{t("common.fields.name")}</Label>
              <Input
                {...addForm.register("name")}
                aria-invalid={!!addForm.formState.errors.name}
                className="h-12 rounded-xl border border-foreground/25 bg-background px-4 shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
              />
              {addForm.formState.errors.name ? (
                <p className="text-xs text-destructive">
                  {addForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{t("common.fields.phone")}</Label>
              <Input
                {...addForm.register("phone")}
                className="h-12 rounded-xl border border-foreground/25 bg-background px-4 shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("common.fields.email")}</Label>
              <Input
                type="email"
                {...addForm.register("email")}
                className="h-12 rounded-xl border border-foreground/25 bg-background px-4 shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border border-foreground/30 bg-card shadow-none hover:bg-muted"
                onClick={() => setAddOpen(false)}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button
                type="submit"
                variant="success"
                size="cta"
                className="rounded-xl shadow-none"
                disabled={addIsSubmitting}
              >
                {t("common.actions.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
