"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/hooks/use-auth-user";
import { createOrganizationForUser } from "@/lib/organizations/organization-queries";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";

export function CreateOrganizationForm() {
  const supabase = useSupabase();
  const router = useRouter();
  const { user } = useAuthUser();
  const { refreshOrganizations } = useCurrentOrganization();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Skriv inn et navn for organisasjonen.");
      return;
    }

    setSubmitting(true);
    try {
      await createOrganizationForUser(supabase, user.id, trimmed);
      await refreshOrganizations();
      toast.success("Organisasjon opprettet.");
      router.push("/app/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunne ikke opprette organisasjon.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="organization-name">Organisasjonsnavn</Label>
        <Input
          id="organization-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="F.eks. Mitt selskap AS"
          autoComplete="organization"
          required
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Oppretter…" : "Opprett og fortsett"}
      </Button>
    </form>
  );
}
