export type ReadinessStepKey = "enabled" | "terms" | "template" | "email";

export type ReadinessStep = { key: ReadinessStepKey; done: boolean };

/**
 * Whether agreements can be sent to customers. Sending needs contracts switched on, approved terms and a
 * template. A missing e-mail setup does not block sending, but customers then get no invitation by e-mail.
 */
export function contractReadiness(input: {
  contractsEnabled: boolean;
  termsApproved: boolean;
  hasTemplate: boolean;
  emailConfigured: boolean;
}) {
  const steps: ReadinessStep[] = [
    { key: "enabled", done: input.contractsEnabled },
    { key: "terms", done: input.termsApproved },
    { key: "template", done: input.hasTemplate },
    { key: "email", done: input.emailConfigured },
  ];
  const ready = input.contractsEnabled && input.termsApproved && input.hasTemplate;
  return { steps, ready, emailMissing: !input.emailConfigured, doneCount: steps.filter((s) => s.done).length };
}
