(function () {
  try {
    var key =
      document.documentElement.getAttribute("data-display-storage-key") ||
      "ronningen-crm";
    var raw = localStorage.getItem(key);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    var d = parsed && parsed.state && parsed.state.displayDensity;
    if (d === "compact" || d === "comfortable" || d === "spacious") {
      document.documentElement.setAttribute("data-density", d);
    }
  } catch (e) {}
})();
