const I18N = {
  en: {
    overview: "Overview",
    history: "History",
    settings: "Settings",
    help: "Help",
    checking: "Checking…",
    ready: "Ready",
    onListing: "On listing",
    notMarketplace: "Not Marketplace",
    openDashboard: "Open dashboard",
    importCurrent: "Import current listing",
    copyCurrent: "Copy import link",
    hintListing: "Open a Facebook Marketplace listing to import.",
    hintReady: "You can import the current listing into PayPack.",
    saved: "Saved",
    copied: "Import link copied",
    opened: "Opened in PayPack",
    failed: "Could not import this page",
    noHistory: "No imports yet from this browser.",
    clearConfirm: "Clear all import history?",
  },
  ru: {
    overview: "Обзор",
    history: "История",
    settings: "Настройки",
    help: "Справка",
    checking: "Проверка…",
    ready: "Готово",
    onListing: "На объявлении",
    notMarketplace: "Не Marketplace",
    openDashboard: "Открыть кабинет",
    importCurrent: "Импорт объявления",
    copyCurrent: "Копировать ссылку",
    hintListing: "Откройте объявление Facebook Marketplace для импорта.",
    hintReady: "Можно импортировать текущее объявление в PayPack.",
    saved: "Сохранено",
    copied: "Ссылка скопирована",
    opened: "Открыто в PayPack",
    failed: "Не удалось импортировать",
    noHistory: "Пока нет импортов в этом браузере.",
    clearConfirm: "Очистить всю историю импортов?",
  },
};

let currentSettings = PayPackStorage.normalizeSettings(PayPackStorage.SYNC_DEFAULTS);
let historyCache = [];
let tabInfo = { url: "", isMarketplace: false, isListing: false };

function t(key) {
  const lang = currentSettings.uiLang === "ru" ? "ru" : "en";
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}

function showToast(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 1800);
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return String(Math.round(n));
}

function setActiveTab(name) {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === name);
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    const on = panel.id === `panel-${name}`;
    panel.classList.toggle("active", on);
    panel.hidden = !on;
  });
}

function applyUiLanguage() {
  document.querySelectorAll(".tab").forEach((btn) => {
    const key = btn.dataset.tab;
    if (key && I18N.en[key]) btn.textContent = t(key);
  });
  const openDash = document.getElementById("btnOpenDashboard");
  const importCur = document.getElementById("btnImportCurrent");
  const copyCur = document.getElementById("btnCopyCurrent");
  if (openDash) openDash.textContent = t("openDashboard");
  if (importCur) importCur.textContent = t("importCurrent");
  if (copyCur) copyCur.textContent = t("copyCurrent");
  const empty = document.getElementById("historyEmpty");
  if (empty) empty.textContent = t("noHistory");
  updateStatusUi();
}

function updateStatusUi() {
  const pill = document.getElementById("statusPill");
  const hint = document.getElementById("overviewHint");
  const importBtn = document.getElementById("btnImportCurrent");
  const copyBtn = document.getElementById("btnCopyCurrent");
  if (!pill) return;

  pill.classList.remove("ok", "warn", "muted");
  if (tabInfo.isListing) {
    pill.textContent = t("onListing");
    pill.classList.add("ok");
    if (hint) hint.textContent = t("hintReady");
  } else if (tabInfo.isMarketplace) {
    pill.textContent = t("ready");
    pill.classList.add("warn");
    if (hint) hint.textContent = t("hintListing");
  } else {
    pill.textContent = t("notMarketplace");
    pill.classList.add("muted");
    if (hint) hint.textContent = t("hintListing");
  }

  const canImport = !!tabInfo.isListing;
  if (importBtn) importBtn.disabled = !canImport;
  if (copyBtn) copyBtn.disabled = !canImport;
}

function fillSettingsForm(settings) {
  const origin = document.getElementById("origin");
  const showFab = document.getElementById("showFab");
  const showFeed = document.getElementById("showFeedButtons");
  const label = document.getElementById("buttonLabel");
  const color = document.getElementById("buttonColor");
  const colorText = document.getElementById("buttonColorText");
  const debug = document.getElementById("debugMode");
  const uiLang = document.getElementById("uiLang");
  const help = document.getElementById("helpLink");
  const statOrigin = document.getElementById("statOrigin");

  if (origin) origin.value = settings.paypackOrigin;
  if (showFab) showFab.checked = settings.showFab;
  if (showFeed) showFeed.checked = settings.showFeedButtons;
  if (label) label.value = settings.buttonLabel;
  if (color) color.value = settings.buttonColor;
  if (colorText) colorText.value = settings.buttonColor;
  if (debug) debug.checked = settings.debugMode;
  if (uiLang) uiLang.value = settings.uiLang;
  if (help) help.href = PayPackStorage.extensionHelpUrl(settings.paypackOrigin);
  if (statOrigin) {
    try {
      statOrigin.textContent = new URL(settings.paypackOrigin).host;
    } catch {
      statOrigin.textContent = settings.paypackOrigin;
    }
  }
}

function readSettingsForm() {
  return PayPackStorage.normalizeSettings({
    paypackOrigin: document.getElementById("origin")?.value,
    showFab: document.getElementById("showFab")?.checked,
    showFeedButtons: document.getElementById("showFeedButtons")?.checked,
    buttonLabel: document.getElementById("buttonLabel")?.value,
    buttonColor:
      document.getElementById("buttonColorText")?.value ||
      document.getElementById("buttonColor")?.value,
    debugMode: document.getElementById("debugMode")?.checked,
    uiLang: document.getElementById("uiLang")?.value,
  });
}

function renderHistory(filter = "") {
  const body = document.getElementById("historyBody");
  const empty = document.getElementById("historyEmpty");
  const table = body?.closest("table");
  if (!body || !empty) return;

  const q = String(filter || "").trim().toLowerCase();
  const rows = historyCache.filter((item) => {
    if (!q) return true;
    return String(item.title || "").toLowerCase().includes(q);
  });

  body.innerHTML = "";
  if (!rows.length) {
    empty.hidden = false;
    if (table) table.hidden = true;
    return;
  }
  empty.hidden = true;
  if (table) table.hidden = false;

  for (const item of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(item.at)}</td>
      <td class="title-cell" title="${escapeAttr(item.title)}">${escapeHtml(item.title || "—")}</td>
      <td>${escapeHtml(formatPrice(item.price))}</td>
      <td><span class="status ${escapeAttr(item.status)}">${escapeHtml(item.status)}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="linkish" data-act="open" data-id="${escapeAttr(item.id)}">Open</button>
          <button type="button" class="linkish" data-act="copy" data-id="${escapeAttr(item.id)}">Copy</button>
          <button type="button" class="linkish danger" data-act="del" data-id="${escapeAttr(item.id)}">Delete</button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function refreshStats() {
  const today = document.getElementById("statToday");
  const total = document.getElementById("statTotal");
  if (today) today.textContent = String(PayPackStorage.countToday(historyCache));
  if (total) total.textContent = String(historyCache.length);
}

function loadHistory() {
  PayPackStorage.getHistory((list) => {
    historyCache = list;
    refreshStats();
    renderHistory(document.getElementById("historySearch")?.value || "");
  });
}

function detectTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    const url = tab?.url || "";
    tabInfo = {
      url,
      isMarketplace: /facebook\.com\/marketplace/i.test(url),
      isListing: /facebook\.com\/marketplace\/item\/\d+/i.test(url),
    };
    updateStatusUi();
  });
}

function scrapeViaContentScript(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "pp_scrape_listing" }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response || null);
    });
  });
}

async function importCurrent(mode) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs && tabs[0];
  if (!tab?.id || !tabInfo.isListing) {
    showToast("overviewToast", t("failed"));
    return;
  }

  const scraped = await scrapeViaContentScript(tab.id);
  const listing = scraped?.listing || {
    title: tab.title || "",
    link: tab.url || "",
    price: 0,
    desc: "",
    image: "",
  };
  const importUrl = PayPackUrlBuild.buildDashboardImportUrl(
    currentSettings.paypackOrigin,
    listing,
  );

  const entry = {
    at: Date.now(),
    title: listing.title || "",
    price: listing.price || 0,
    link: listing.link || tab.url || "",
    importUrl,
    image: listing.image || "",
    paypackOrigin: currentSettings.paypackOrigin,
    status: mode === "copy" ? "copied" : "opened",
  };

  if (mode === "copy") {
    try {
      await navigator.clipboard.writeText(importUrl);
      entry.status = "copied";
      PayPackStorage.addHistoryEntry(entry, () => {
        loadHistory();
        showToast("overviewToast", t("copied"));
      });
    } catch {
      entry.status = "failed";
      PayPackStorage.addHistoryEntry(entry, () => {
        loadHistory();
        showToast("overviewToast", t("failed"));
      });
    }
    return;
  }

  chrome.tabs.create({ url: importUrl });
  PayPackStorage.addHistoryEntry(entry, () => {
    loadHistory();
    showToast("overviewToast", t("opened"));
  });
}

function saveSettings() {
  const next = readSettingsForm();
  PayPackStorage.setSettings(next, (saved) => {
    currentSettings = saved;
    fillSettingsForm(saved);
    applyUiLanguage();
    showToast("settingsToast", t("saved"));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const manifest = chrome.runtime.getManifest();
    const ver = document.getElementById("extVersion");
    if (ver && manifest?.version) ver.textContent = manifest.version;
  } catch {
    /* ignore */
  }

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  PayPackStorage.getSettings((settings) => {
    currentSettings = settings;
    fillSettingsForm(settings);
    applyUiLanguage();
  });

  loadHistory();
  detectTab();

  document.getElementById("btnOpenDashboard")?.addEventListener("click", () => {
    chrome.tabs.create({
      url: PayPackStorage.dashboardUrl(currentSettings.paypackOrigin),
    });
  });
  document.getElementById("btnImportCurrent")?.addEventListener("click", () => {
    importCurrent("open");
  });
  document.getElementById("btnCopyCurrent")?.addEventListener("click", () => {
    importCurrent("copy");
  });

  document.getElementById("historySearch")?.addEventListener("input", (e) => {
    renderHistory(e.target.value);
  });

  document.getElementById("btnClearHistory")?.addEventListener("click", () => {
    if (!confirm(t("clearConfirm"))) return;
    PayPackStorage.clearHistory(() => loadHistory());
  });

  document.getElementById("historyBody")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const act = btn.getAttribute("data-act");
    const item = historyCache.find((x) => x.id === id);
    if (!item) return;

    if (act === "open" && item.importUrl) {
      chrome.tabs.create({ url: item.importUrl });
      return;
    }
    if (act === "copy" && item.importUrl) {
      try {
        await navigator.clipboard.writeText(item.importUrl);
        showToast("overviewToast", t("copied"));
      } catch {
        showToast("overviewToast", t("failed"));
      }
      return;
    }
    if (act === "del") {
      PayPackStorage.removeHistoryEntry(id, () => loadHistory());
    }
  });

  const color = document.getElementById("buttonColor");
  const colorText = document.getElementById("buttonColorText");
  color?.addEventListener("input", () => {
    if (colorText) colorText.value = color.value;
  });
  colorText?.addEventListener("change", () => {
    const normalized = PayPackStorage.normalizeHexColor(
      colorText.value,
      currentSettings.buttonColor,
    );
    colorText.value = normalized;
    if (color) color.value = normalized;
  });

  document.getElementById("btnResetColor")?.addEventListener("click", () => {
    const def = PayPackStorage.SYNC_DEFAULTS.buttonColor;
    if (color) color.value = def;
    if (colorText) colorText.value = def;
  });

  document.getElementById("btnValidateOrigin")?.addEventListener("click", () => {
    const origin = PayPackStorage.normalizeOrigin(
      document.getElementById("origin")?.value,
    );
    chrome.tabs.create({ url: origin });
  });

  document.getElementById("btnSaveSettings")?.addEventListener("click", saveSettings);

  document.getElementById("origin")?.addEventListener("input", () => {
    const help = document.getElementById("helpLink");
    if (help) {
      help.href = PayPackStorage.extensionHelpUrl(
        document.getElementById("origin")?.value,
      );
    }
  });
});
