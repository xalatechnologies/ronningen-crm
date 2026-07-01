"use client";

import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  customerUpsertFormSchema,
  type CustomerUpsertFormInput,
} from "@/lib/validations";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { CustomersPageSearchToolbar } from "@/components/customers/customers-page-search-toolbar";
import { CustomersPageTabBar } from "@/components/customers/customers-page-tab-bar";
import { useCustomersPageTab } from "@/components/customers/use-customers-page-tab";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { RN_CARD_SHELL, RN_PAGE_SEARCH_ACTIONS } from "@/lib/rn-ui";
import { APP_DATA_AMOUNT, APP_DATA_BODY, APP_DATA_PRIMARY } from "@/lib/table-typography";
import { cn } from "@/lib/utils";
import { deleteCustomerWithClient } from "@/lib/customers/delete-customer";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { CustomerDrawerBody } from "./customer-drawer-body";
import { PartnersPanel } from "./partners-panel";
import type {
  CustomerBookingListItem,
  CustomerRow,
  PartnerRow,
} from "./types";

import { TENANT_LIST_PAGE_SIZE } from "@/lib/list-pagination";

const customersTableHeadClass =
  "customers-table-head whitespace-nowrap px-6 py-4 font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";

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
  const [query, setQuery] = useState("");
  const [partnersQuery, setPartnersQuery] = useState("");
  const [customersPage, setCustomersPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [partnersAddOpen, setPartnersAddOpen] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [customerDeleteTarget, setCustomerDeleteTarget] =
    useState<CustomerRow | null>(null);

  const stats = useMemo(() => aggregateByCustomer(bookings), [bookings]);

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

  async function onAddCustomer(data: CustomerUpsertFormInput) {
    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
      );
      return;
    }

    const { data: row, error } = await supabase
      .from("customers")
      .insert({
        name: data.name.trim(),
        phone: data.phone.trim() || null,
        email: data.email.trim() || null,
        organization_id: orgId,
      })
      .select("id")
      .single();

    if (error || !row) {
      toast.error(t("customers.toasts.customerCreateFailed"), {
        description: error?.message ?? t("customers.toasts.unknownError"),
      });
      return;
    }

    toast.success(t("customers.toasts.customerCreated"));
    addForm.reset();
    setAddOpen(false);
    setSelectedId(row.id);
    invalidateCustomers();
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

  return (
    <div className="customers-page-workspace mx-auto flex w-full flex-col gap-8 pb-24 md:pb-8">
      {loadError ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          {t("customers.loadError", { error: loadError })}
        </div>
      ) : null}

      {!loadError ? (
        <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
          <div className="border-b-2 border-rn-border-strong bg-card/80 px-6 py-5 md:px-8 md:py-6">
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
                        searchId="customers-search"
                        searchAriaLabel={t("customers.searchCustomersAria")}
                        searchPlaceholder={t("customers.searchCustomersPlaceholder")}
                        query={query}
                        onQueryChange={(v) => {
                          setQuery(v);
                          setCustomersPage(1);
                        }}
                        addLabel={t("customers.newCustomer")}
                        onAdd={() => setAddOpen(true)}
                        toolbarAriaLabel={t("customers.toolbarCustomersAria")}
                      />
                    ) : (
                      <CustomersPageSearchToolbar
                        searchId="partners-search"
                        searchAriaLabel={t("customers.searchPartnersAria")}
                        searchPlaceholder={t("customers.searchPartnersPlaceholder")}
                        query={partnersQuery}
                        onQueryChange={setPartnersQuery}
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

          <div
            role="tabpanel"
            id="tabpanel-customers"
            aria-labelledby="tab-customers"
            hidden={tab !== "customers"}
          >
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center md:px-8 md:py-16">
                <p className="customers-empty-hint text-muted-foreground">
                  {t("customers.emptyCustomers")}
                </p>
              </div>
            ) : (
              <>
                <div className="app-table overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-app-base">
                    <thead>
                      <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                        <th className={customersTableHeadClass}>{t("common.fields.name")}</th>
                        <th className={customersTableHeadClass}>{t("common.fields.phone")}</th>
                        <th className={customersTableHeadClass}>{t("common.fields.email")}</th>
                        <th className={customersTableHeadClass}>{t("customers.table.bookings")}</th>
                        <th className={customersTableHeadClass}>
                          {t("customers.table.totalSpent")}
                        </th>
                        <th
                          className={cn(
                            customersTableHeadClass,
                            "w-12 text-right",
                          )}
                        >
                          <span className="sr-only">{t("customers.open")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rn-border-strong/50">
                      {pageRows.map((c) => {
                      const st = stats.get(c.id) ?? {
                        count: 0,
                        spent: 0,
                        outstanding: 0,
                      };
                      const isActive = selectedId === c.id;
                      return (
                        <tr
                          key={c.id}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-rn-surface-row-hover",
                            isActive && "bg-rn-surface-row-hover",
                          )}
                          onClick={() => setSelectedId(c.id)}
                        >
                          <td className="px-6 py-5 md:px-8 md:py-6">
                            <span
                              className={cn(
                                "customers-row-name",
                                APP_DATA_PRIMARY,
                                isActive ? "text-success" : "",
                              )}
                            >
                              {c.name}
                            </span>
                          </td>
                          <td className={cn("customers-row-meta px-6 py-5 md:px-8 md:py-6", APP_DATA_BODY)}>
                            {c.phone ?? "—"}
                          </td>
                          <td className={cn("customers-row-meta px-6 py-5 md:px-8 md:py-6", APP_DATA_BODY)}>
                            {c.email ?? "—"}
                          </td>
                          <td className="px-6 py-5 md:px-8 md:py-6">
                            <span
                              className={cn(
                                "customers-booking-count-pill inline-flex items-center font-semibold tabular-nums",
                                st.count > 0 ? "text-success" : "text-rn-text-body",
                              )}
                            >
                              {st.count}
                            </span>
                          </td>
                          <td className={cn("customers-row-metric px-6 py-5 md:px-8 md:py-6", APP_DATA_AMOUNT, "font-bold text-success")}>
                            {formatCurrency(st.spent)}
                          </td>
                          <td className="px-6 py-5 text-right md:px-8 md:py-6">
                            <div className="flex items-center justify-end">
                              <ChevronRight
                                className="size-6 shrink-0 text-muted-foreground md:size-7"
                                aria-hidden
                              />
                            </div>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>

                {filtered.length > 0 ? (
                  <div className="flex flex-col gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 font-medium text-rn-footer-text sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-6">
                    <span>
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
                    </span>
                    {filtered.length > TENANT_LIST_PAGE_SIZE ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 gap-1 rounded-md border-2 border-rn-border-strong px-4 text-base font-semibold"
                        disabled={currentPage <= 1}
                        onClick={() =>
                          setCustomersPage((p) => Math.max(1, p - 1))
                        }
                      >
                        <ChevronLeft className="size-5" aria-hidden />
                        {t("customers.footer.prev")}
                      </Button>
                      <span className="flex items-center px-2 tabular-nums">
                        {t("customers.footer.pageOf", {
                          current: currentPage,
                          total: totalPages,
                        })}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 gap-1 rounded-md border-2 border-rn-border-strong px-4 text-base font-semibold"
                        disabled={currentPage >= totalPages}
                        onClick={() =>
                          setCustomersPage((p) =>
                            Math.min(totalPages, p + 1),
                          )
                        }
                      >
                        {t("common.actions.next")}
                        <ChevronRight className="size-5" aria-hidden />
                      </Button>
                    </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div
            role="tabpanel"
            id="tabpanel-partners"
            aria-labelledby="tab-partners"
            hidden={tab !== "partners"}
          >
            <PartnersPanel
              partners={partners}
              showHeader={false}
              query={partnersQuery}
              onQueryChange={setPartnersQuery}
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
            "w-full max-w-[min(100vw,36rem)] gap-0 border-l-2 border-rn-border-strong bg-card p-0 sm:max-w-[36rem]",
            "shadow-rn-card",
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
          className="max-w-[calc(100%-2rem)] gap-4 rounded-md border-2 border-rn-border-strong bg-card p-6 shadow-xl sm:max-w-md"
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
                  className="w-full border-2 border-rn-border-strong sm:w-auto"
                  onClick={() => setCustomerDeleteTarget(null)}
                >
                  {t("common.actions.cancel")}
                </Button>
                <Button
                  type="button"
                  size="cta"
                  disabled={deleteBusyId != null}
                  className="w-full border-2 border-red-200 bg-red-600 !text-white hover:bg-red-700 sm:w-auto"
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
          className="max-w-md rounded-md"
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
                className="h-11 rounded-md border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
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
                className="h-11 rounded-md border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("common.fields.email")}</Label>
              <Input
                type="email"
                {...addForm.register("email")}
                className="h-11 rounded-md border-2 border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25"
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" variant="success" size="cta">
                {t("common.actions.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
