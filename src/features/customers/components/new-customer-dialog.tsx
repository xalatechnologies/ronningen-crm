"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customerUpsertFormSchema, type CustomerUpsertFormInput } from "@/lib/validations";
import { useTranslation } from "@/i18n/client";
import { createCustomerAtomic } from "@/lib/reservations/atomic-create";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";





/** Dialog with the name, phone and e-mail form for a new customer. Creates the customer in one database call. */
export function NewCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customerId: string) => void;
}) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateCustomers } = useTenantDataInvalidation();

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
      onOpenChange(false);
      onCreated(result.customerId);
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

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
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
                onClick={() => onOpenChange(false)}
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
  );
}
