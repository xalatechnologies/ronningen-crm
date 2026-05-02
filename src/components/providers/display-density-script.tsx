import { displayStorageKey } from "@/config/display";

/** Runs before React paint to reduce density flash from persisted Zustand state. */
export function DisplayDensityScript() {
  const inline = `
(function(){
  try {
    var raw = localStorage.getItem(${JSON.stringify(displayStorageKey)});
    if (!raw) return;
    var parsed = JSON.parse(raw);
    var d = parsed && parsed.state && parsed.state.displayDensity;
    if (d === "compact" || d === "comfortable" || d === "spacious") {
      document.documentElement.setAttribute("data-density", d);
    }
  } catch (e) {}
})();`;

  return (
    <script dangerouslySetInnerHTML={{ __html: inline }} />
  );
}
