import { emphasizeWifiPassword, splitContractTermLines } from "@/lib/contracts/layout";

/**
 * The agreement's terms as the customer sees them: numbered sections as headings, short titles over bullet
 * lists in bold, other lines as paragraphs. Used by the contract itself and by the template preview, so the
 * preview always matches the real thing.
 */
export function ContractTermsView({ text }: { text: string }) {
  return (
    <section className="space-y-1">
      {splitContractTermLines(text).map((line, index) => {
        if (!line.text.trim()) {
          return <div key={`gap-${index}`} className="h-2" />;
        }
        if (line.kind === "section") {
          return (
            <h3 key={`sec-${index}`} className="font-heading pt-4 text-base font-bold">
              {line.text.trim()}
            </h3>
          );
        }
        if (line.kind === "subtitle") {
          return (
            <p key={`sub-${index}`} className="pt-3 font-semibold">
              {line.text.trim()}
            </p>
          );
        }
        return (
          <p key={`body-${index}`} className="leading-relaxed">
            {emphasizeWifiPassword(line.text).map((part, partIndex) =>
              part.bold ? <strong key={partIndex}>{part.text}</strong> : <span key={partIndex}>{part.text}</span>,
            )}
          </p>
        );
      })}
    </section>
  );
}
