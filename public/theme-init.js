(function () {
  try {
    var key =
      document.documentElement.getAttribute("data-theme-storage-key") ||
      "ronningen-crm";
    var theme = "system";
    var raw = localStorage.getItem(key);
    if (raw) {
      var parsed = JSON.parse(raw);
      var stored = parsed && parsed.state && parsed.state.theme;
      if (stored === "light" || stored === "dark" || stored === "system") {
        theme = stored;
      }
    }
    var resolved = theme;
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-theme", resolved);
    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (_error) {}
})();
