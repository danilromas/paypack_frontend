const DEFAULT_ORIGIN = "https://paypack.uno";

function normalizeOrigin(raw) {
  let s = (raw || "").trim();
  if (!s) return DEFAULT_ORIGIN;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return DEFAULT_ORIGIN;
    }
    return u.origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

function extensionHelpUrl(origin) {
  const base = normalizeOrigin(origin).replace(/\/$/, "");
  return `${base}/extension/`;
}

function load() {
  chrome.storage.sync.get(
    { paypackOrigin: DEFAULT_ORIGIN, showFab: true },
    (sync) => {
      const originEl = document.getElementById("origin");
      const showFabEl = document.getElementById("showFab");
      const help = document.getElementById("help");
      if (originEl) originEl.value = sync.paypackOrigin || DEFAULT_ORIGIN;
      if (showFabEl) showFabEl.checked = sync.showFab !== false;
      if (help) help.href = extensionHelpUrl(originEl?.value || sync.paypackOrigin);
    }
  );

  chrome.storage.local.get({ lastImport: null }, (local) => {
    const pre = document.getElementById("last");
    const empty = document.getElementById("lastEmpty");
    if (!pre || !empty) return;
    if (!local.lastImport) {
      empty.hidden = false;
      pre.hidden = true;
      pre.textContent = "";
      return;
    }
    let text = "";
    try {
      const j =
        typeof local.lastImport === "string"
          ? JSON.parse(local.lastImport)
          : local.lastImport;
      text = JSON.stringify(j, null, 2);
    } catch {
      text = String(local.lastImport);
    }
    empty.hidden = true;
    pre.hidden = false;
    pre.textContent = text;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  load();

  const originEl = document.getElementById("origin");
  const help = document.getElementById("help");
  originEl?.addEventListener("input", () => {
    if (help && originEl) help.href = extensionHelpUrl(originEl.value);
  });

  document.getElementById("save")?.addEventListener("click", () => {
    const o = document.getElementById("origin");
    const raw = o && "value" in o ? o.value : "";
    const origin = normalizeOrigin(raw);
    const showFab = /** @type {HTMLInputElement} */ (
      document.getElementById("showFab")
    ).checked;

    chrome.storage.sync.set({ paypackOrigin: origin, showFab }, () => {
      const toast = document.getElementById("toast");
      if (toast) {
        toast.hidden = false;
        setTimeout(() => {
          toast.hidden = true;
        }, 1600);
      }
      if (help) help.href = extensionHelpUrl(origin);
    });
  });
});
