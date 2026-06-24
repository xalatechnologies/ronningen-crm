"use client";

import { ROLE_DISPLAY_LABELS, USER_ROLES, type UserRole } from "@/constants/roles";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthUser } from "@/hooks/use-auth-user";
import { notifyTeamMemberAdded } from "@/lib/notifications/actions/org-events";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import {
  teamMemberAddSchema,
  type TeamMemberAddInput,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export type TeamMemberRow = {
  id: string;
  userId: string;
  role: UserRole;
  createdAtIso: string;
  fullName: string | null;
  email: string | null;
};

const ASSIGNABLE_ROLES = USER_ROLES.filter((r) => r !== "owner");

const roleOptions = ASSIGNABLE_ROLES.map((r) => ({
  value: r,
  label: ROLE_DISPLAY_LABELS[r],
}));

const allRoleOptions = USER_ROLES.map((r) => ({
  value: r,
  label: ROLE_DISPLAY_LABELS[r],
}));

export function TeamMembersSection({
  members: initialMembers,
}: {
  members: TeamMemberRow[];
}) {
  const supabase = useSupabase();
  const router = useRouter();
  const { user } = useAuthUser();
  const { currentOrganizationId } = useCurrentOrganization();
  const [members, setMembers] = useState(initialMembers);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberRow | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);

  const addForm = useForm<TeamMemberAddInput>({
    resolver: zodResolver(teamMemberAddSchema),
    defaultValues: { email: "", role: "manager" },
  });

  const ownerCount = useMemo(
    () => members.filter((m) => m.role === "owner").length,
    [members],
  );

  async function onAddMember(data: TeamMemberAddInput) {
    if (!supabase) return;
    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Ingen aktiv organisasjon.",
      );
      return;
    }

    setAddBusy(true);
    try {
      const { data: userId, error: lookupError } = await supabase.rpc(
        "find_user_id_by_email",
        { lookup_email: data.email },
      );

      if (lookupError) {
        toast.error("Kunne ikke slå opp bruker", {
          description: lookupError.message,
        });
        return;
      }

      if (!userId) {
        toast.error("Brukeren finnes ikke", {
          description:
            "Ingen konto med denne e-posten i Event Manager. Personen må registrere seg med samme adresse først, eller du må skrive e-posten nøyaktig som ved innlogging.",
        });
        return;
      }

      if (members.some((m) => m.userId === userId)) {
        toast.error("Brukeren er allerede medlem");
        return;
      }

      const { error } = await supabase.from("organization_members").insert({
        organization_id: orgId,
        user_id: userId,
        role: data.role,
      });

      if (error) {
        toast.error("Kunne ikke legge til medlem", {
          description: error.message,
        });
        return;
      }

      void notifyTeamMemberAdded({
        organizationId: orgId,
        userId,
      });

      toast.success("Medlem lagt til");
      addForm.reset({ email: "", role: "manager" });
      router.refresh();
    } finally {
      setAddBusy(false);
    }
  }

  async function onRoleChange(member: TeamMemberRow, nextRole: string) {
    if (!supabase || member.role === nextRole) return;

    if (member.role === "owner" && ownerCount <= 1 && nextRole !== "owner") {
      toast.error("Kan ikke endre rolle", {
        description: "Organisasjonen må ha minst én hovedeier.",
      });
      return;
    }

    setRoleBusyId(member.id);
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: nextRole })
        .eq("id", member.id);

      if (error) {
        toast.error("Kunne ikke oppdatere rolle", { description: error.message });
        return;
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, role: nextRole as UserRole } : m,
        ),
      );
      toast.success("Rolle oppdatert");
      router.refresh();
    } finally {
      setRoleBusyId(null);
    }
  }

  async function confirmRemoveMember() {
    if (!supabase || !removeTarget) return;

    if (removeTarget.role === "owner" && ownerCount <= 1) {
      toast.error("Kan ikke fjerne siste hovedeier");
      return;
    }

    if (removeTarget.userId === user?.id) {
      toast.error("Du kan ikke fjerne deg selv her");
      return;
    }

    setRemoveBusy(true);
    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", removeTarget.id);

      if (error) {
        toast.error("Kunne ikke fjerne medlem", { description: error.message });
        return;
      }

      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      toast.success("Medlem fjernet");
      setRemoveTarget(null);
      router.refresh();
    } finally {
      setRemoveBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void addForm.handleSubmit(onAddMember)();
        }}
        className={cn("flex flex-col gap-4 p-6 md:p-8", RN_CARD_SHELL)}
      >
        <h2 className="font-heading text-lg font-bold">Legg til medlem</h2>
        <p className="text-sm text-muted-foreground">
          Brukeren må allerede ha registrert en konto med denne e-postadressen.
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-4 md:flex-row md:flex-nowrap md:items-center md:gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <Label
                htmlFor="team-email"
                className="shrink-0 text-sm font-semibold md:w-14"
              >
                E-post
              </Label>
              <Input
                id="team-email"
                type="email"
                className="h-12 min-h-12 w-full min-w-0 rounded-md border-2 border-rn-border-strong md:flex-1"
                {...addForm.register("email")}
              />
            </div>
            <div className="flex shrink-0 flex-col gap-2 md:w-52 md:flex-row md:items-center md:gap-3">
              <Label
                htmlFor="team-role"
                className="shrink-0 text-sm font-semibold md:w-12"
              >
                Rolle
              </Label>
              <FormSelect
                id="team-role"
                value={addForm.watch("role")}
                onValueChange={(v) =>
                  addForm.setValue("role", v as TeamMemberAddInput["role"])
                }
                options={roleOptions}
                className="h-12 min-h-12 w-full md:min-w-0 md:flex-1"
              />
            </div>
            <Button
              type="submit"
              variant="success"
              disabled={addBusy}
              className="h-12 min-h-12 w-full shrink-0 gap-2 px-5 font-semibold md:w-auto"
            >
              <UserPlus className="size-5 shrink-0" aria-hidden />
              Legg til
            </Button>
          </div>
          {addForm.formState.errors.email ? (
            <p className="text-sm text-destructive">
              {addForm.formState.errors.email.message}
            </p>
          ) : null}
        </div>
      </form>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Medlem siden</TableHead>
              <TableHead className="w-28 text-right">
                <span className="sr-only">Handlinger</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  {m.fullName?.trim() || "—"}
                </TableCell>
                <TableCell>{m.email ?? "—"}</TableCell>
                <TableCell>
                  {m.role === "owner" ? (
                    <span className="font-medium">
                      {ROLE_DISPLAY_LABELS.owner}
                    </span>
                  ) : (
                    <FormSelect
                      value={m.role}
                      onValueChange={(v) => void onRoleChange(m, v)}
                      disabled={roleBusyId === m.id}
                      options={allRoleOptions.filter((o) => o.value !== "owner")}
                      className="h-10 min-h-10 text-sm"
                    />
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(m.createdAtIso), "d. MMM yyyy", {
                    locale: nb,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    disabled={m.userId === user?.id}
                    onClick={() => setRemoveTarget(m)}
                  >
                    Fjern
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDeleteDialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Fjerne teammedlem?"
        description={
          removeTarget
            ? `${removeTarget.fullName ?? removeTarget.email ?? "Medlemmet"} mister tilgang til organisasjonen.`
            : null
        }
        confirmLabel="Ja, fjern"
        busy={removeBusy}
        onConfirm={confirmRemoveMember}
      />
    </div>
  );
}
