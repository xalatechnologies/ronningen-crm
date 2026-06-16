(function () {
  try {
    var key =
      document.documentElement.getAttribute("data-theme-storage-key") ||
      "ronningen-crm";
    var theme = "light";
    var raw = localStorage.getItem(key);
    if (raw) {
      var parsed = JSON.parse(raw);
      var stored = parsed && parsed.state && parsed.state.theme;
      if (stored === "light" || stored === "dark") {
        theme = stored;
      } else if (stored === "system") {
        theme = "light";
      }
    }
    var resolved = theme;
    document.documentElement.setAttribute("data-theme", resolved);
    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (_error) {}
})();
