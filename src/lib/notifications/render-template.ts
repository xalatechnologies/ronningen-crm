import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

export type TemplateVariables = Record<string, string | number | null | undefined>;

export function renderTemplate(
  bodyHtml: string,
  variables: TemplateVariables,
): string {
  return bodyHtml.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    if (value == null) return "";
    return String(value);
  });
}

export async function loadAndRenderTemplate(
  templateKey: string,
  variables: TemplateVariables,
): Promise<{ subject: string; html: string } | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("platform_email_templates")
    .select("subject, body_html")
    .eq("key", templateKey)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    subject: renderTemplate(data.subject, variables),
    html: renderTemplate(data.body_html, variables),
  };
}
