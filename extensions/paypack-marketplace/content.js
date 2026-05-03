/**
 * PayPack Marketplace — floating actions + dashboard import.
 * Site URL and FAB visibility: extension icon → popup.
 */

/** Служебные заголовки страницы FB — не использовать как название товара */
const GARBAGE_TITLES = new Set([
  "marketplace",
  "facebook marketplace",
  "facebook",
  "buy and sell",
  "маркетплейс",
]);

function isGarbageTitle(t) {
  if (!t || typeof t !== "string") return true;
  const x = t.trim().toLowerCase();
  if (x.length < 3) return true;
  if (GARBAGE_TITLES.has(x)) return true;
  if (/^marketplace\s*[·|]\s*/i.test(t)) return true;
  return false;
}

/** Разделители в title/og у FB: средняя точка ·, буллет • */
function splitTitleParts(s) {
  if (!s) return [];
  return s
    .split(/\s*[·•]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** document.title: "(12) iPhone · City | Facebook" → первая осмысленная часть */
function titleFromDocumentTitle() {
  let s = document.title || "";
  s = s.replace(/\s*\|\s*Facebook(\s+Marketplace)?\s*$/i, "").trim();
  s = s.replace(/^\(\d+\)\s*/, "").trim();
  const parts = splitTitleParts(s);
  for (const p of parts) {
    if (!isGarbageTitle(p)) return p.slice(0, 400);
  }
  if (!isGarbageTitle(s)) return s.slice(0, 400);
  return "";
}

/** og:title часто "Товар · город · Marketplace" — берём первый не-служебный сегмент */
function titleFromOgMeta(raw) {
  if (!raw || typeof raw !== "string") return "";
  const cleaned = raw.replace(/\s*\|\s*Facebook.*$/i, "").trim();
  const parts = splitTitleParts(cleaned);
  for (const p of parts) {
    if (!isGarbageTitle(p)) return p.slice(0, 400);
  }
  if (!isGarbageTitle(cleaned)) return cleaned.slice(0, 400);
  return "";
}

/** Заголовки внутри ленты объявления — часто точнее, чем первый h1 страницы */
function titleFromMainHeadings() {
  const main = document.querySelector('[role="main"]');
  if (!main) return "";
  const selectors = ['[role="heading"]', "h1", "h2", "h3"];
  for (const sel of selectors) {
    for (const el of main.querySelectorAll(sel)) {
      const t = el.innerText?.trim();
      if (!t || t.length < 5 || t.length > 400) continue;
      if (isGarbageTitle(t)) continue;
      return t.slice(0, 400);
    }
  }
  return "";
}

/** На карточке товара название часто в span[dir="auto"] внутри main */
function titleFromMainSpans() {
  const main = document.querySelector('[role="main"]');
  if (!main) return "";
  const spans = main.querySelectorAll('span[dir="auto"]');
  for (const span of spans) {
    const t = span.innerText?.trim();
    if (!t || t.length < 8 || t.length > 320) continue;
    if (isGarbageTitle(t)) continue;
    if (/^\d[\d\s\u00A0.,]*(€|\$|USD|EUR|руб|₽)/i.test(t)) continue;
    return t.slice(0, 400);
  }
  return "";
}

function pickListingTitle() {
  const ogRaw =
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    "";
  const h1 = document.querySelector("h1")?.innerText?.trim() || "";

  const candidates = [
    titleFromDocumentTitle(),
    titleFromOgMeta(ogRaw),
    titleFromMainHeadings(),
    titleFromMainSpans(),
    !isGarbageTitle(h1) ? h1 : "",
    titleFromOgMeta(h1),
  ];

  for (const c of candidates) {
    if (c && !isGarbageTitle(c)) return c;
  }
  return "";
}

/** Убираем пробелы/неразрывные пробелы как разделители тысяч; запятая как десятичная только если после неё 1–2 цифры в конце */
function parseMoneyToInt(raw) {
  if (!raw) return 0;
  let s = String(raw).replace(/[\s\u00A0]/g, "").trim();
  const decComma = /^(\d{1,3}(?:[.,]\d{3})*),(\d{1,2})$/;
  const decDot = /^(\d{1,3}(?:[.,]\d{3})*)\.(\d{1,2})$/;
  let m = s.match(decComma);
  if (m) {
    const intPart = m[1].replace(/[.,]/g, "");
    return Math.round(parseFloat(intPart + "." + m[2]));
  }
  m = s.match(decDot);
  if (m && m[2].length <= 2) {
    const intPart = m[1].replace(/,/g, "");
    return Math.round(parseFloat(intPart + "." + m[2]));
  }
  s = s.replace(/[.,](?=\d{3}\b)/g, "");
  s = s.replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** До блока описания / похожих — без короткого «Descripción» (встречается не у описания и режет шапку). */
function sliceListingHeader(mainText) {
  if (!mainText) return "";
  const stop =
    /(?:Описание\s+от\s+продавца|Seller(?:'s)?\s+description|Descripción\s+del\s+vendedor|About\s+this\s+item|Similar\s+listings|Похожие|Related\s+items|You\s+might\s+also)/i;
  const idx = mainText.search(stop);
  if (idx > 0) return mainText.slice(0, idx);
  return mainText.slice(0, 9000);
}

function extractPriceFromMeta() {
  const raw =
    document.querySelector('meta[property="product:price:amount"]')?.getAttribute("content") ||
    document.querySelector('meta[property="og:price:amount"]')?.getAttribute("content") ||
    document.querySelector('meta[itemprop="price"]')?.getAttribute("content") ||
    "";
  if (!raw) return 0;
  const n = parseMoneyToInt(raw.replace(/[^\d.,]/g, ""));
  return n > 0 && n < 1e11 ? n : 0;
}

function walkJsonForPrice(node, depth) {
  if (depth > 14 || node == null) return 0;
  if (typeof node === "number" && node > 0 && node < 1e11) return Math.round(node);
  if (typeof node === "string") {
    const t = node.trim();
    if (!/^\d/.test(t) && !/^\d[\d\s.,]/.test(t)) return 0;
    const n = parseMoneyToInt(t.replace(/[^\d\s.,]/g, ""));
    return n > 0 && n < 1e11 ? n : 0;
  }
  if (Array.isArray(node)) {
    for (const x of node) {
      const n = walkJsonForPrice(x, depth + 1);
      if (n > 0) return n;
    }
    return 0;
  }
  if (typeof node === "object") {
    if (node["@graph"]) {
      const n = walkJsonForPrice(node["@graph"], depth + 1);
      if (n > 0) return n;
    }
    const type = node["@type"];
    const isProductish =
      type === "Product" ||
      type === "Offer" ||
      (Array.isArray(type) && type.some((t) => t === "Product" || t === "Offer"));
    if (node.price != null && isProductish) {
      const n = walkJsonForPrice(node.price, depth + 1);
      if (n > 0) return n;
    }
    if (node.offers) {
      const n = walkJsonForPrice(node.offers, depth + 1);
      if (n > 0) return n;
    }
    for (const k of Object.keys(node)) {
      if (k === "price" || k === "offers" || k === "lowPrice" || k === "highPrice") {
        const n = walkJsonForPrice(node[k], depth + 1);
        if (n > 0) return n;
      }
    }
  }
  return 0;
}

function extractPriceFromJsonLd() {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.textContent || "");
      const n = walkJsonForPrice(data, 0);
      if (n > 0) return n;
    } catch (_) {}
  }
  return 0;
}

/**
 * Цена: сначала meta / JSON-LD, затем только «шапка» объявления (regex по тексту).
 */
function extractListingPriceFromText(headerText) {
  const tryPatterns = (text) => {
    const patterns = [
      [/(\d[\d\s\u00A0.,]*)\s*MX\$/gi, 1],
      [/MX\$\s*(\d[\d\s\u00A0.,]*)/gi, 1],
      [/(\d[\d\s\u00A0.,]*)\s*MXN\b/gi, 1],
      [/MXN\s*(\d[\d\s\u00A0.,]*)/gi, 1],
      [/(\d[\d\s\u00A0.,]*)\s*(€|EUR|eur)\b/gi, 1],
      [/(\d[\d\s\u00A0.,]*)\s*(USD)\b/gi, 1],
      [/(\d[\d\s\u00A0.,]*)\s*(руб|₽|RUB|rub)\b/gi, 1],
    ];
    for (const [re, g] of patterns) {
      re.lastIndex = 0;
      const m = re.exec(text);
      if (m && m[g]) {
        const n = parseMoneyToInt(m[g]);
        if (n > 0 && n < 1e10) return n;
      }
    }
    return 0;
  };

  return tryPatterns(headerText);
}

function extractListingPrice() {
  let n = extractPriceFromMeta();
  if (n > 0) return n;
  n = extractPriceFromJsonLd();
  if (n > 0) return n;

  const main = document.querySelector('[role="main"]');
  const full = main?.innerText || document.body?.innerText || "";
  const header = sliceListingHeader(full);
  n = extractListingPriceFromText(header);
  if (n > 0) return n;
  return extractListingPriceFromText(full.slice(0, 6000));
}

/**
 * FB часто кладёт заголовок и текст в один блок — ищем по DOM (innerText начинается с метки).
 */
function extractSellerDescriptionFromDom() {
  const main = document.querySelector('[role="main"]');
  if (!main) return "";

  const labelStarts = [
    /^Описание\s+от\s+продавца\s*/i,
    /^Seller(?:'s)?\s+description\s*/i,
    /^Descripción(?:\s+del\s+vendedor)?\s*/i,
    /^About\s+this\s+item\s*/i,
  ];

  const candidates = main.querySelectorAll(
    'div[dir="auto"], span[dir="auto"], div, span, p',
  );
  for (const el of candidates) {
    const t = el.innerText?.trim();
    if (!t || t.length < 18) continue;
    for (const lab of labelStarts) {
      const m = t.match(lab);
      if (!m) continue;
      let rest = t.slice(m[0].length).trim();
      rest = rest.replace(/^[\n\r:\u00A0\s]+/, "").trim();
      if (rest.length > 15) return rest.slice(0, 2000);
    }
  }

  let next = null;
  for (const el of main.querySelectorAll("span, div")) {
    const tx = el.innerText?.trim();
    if (!tx) continue;
    if (
      /^Описание\s+от\s+продавца$/i.test(tx) ||
      /^Seller(?:'s)?\s+description$/i.test(tx)
    ) {
      next = el.nextElementSibling;
      break;
    }
    if (/^Descripción$/i.test(tx) && tx.length < 24) {
      next = el.nextElementSibling;
      break;
    }
  }
  if (next) {
    const rest = next.innerText?.trim();
    if (rest && rest.length > 15) return rest.slice(0, 2000);
  }

  return "";
}

/**
 * Резерв: полный текст main — допускаем любые пробелы между словами заголовка.
 */
function extractSellerDescriptionFromFullText(mainText) {
  if (!mainText) return "";

  const blocks = [
    /Описание\s+от\s+продавца\s*[\n\r\t\f\v\:\s]*([\s\S]+?)(?=\n\s*(?:Location|Местоположение|Listed|Похожие|Similar|Related|See\s+more\s*$)|$)/i,
    /Seller(?:'s)?\s+description\s*[\n\r\t\f\v\:\s]*([\s\S]+?)(?=\n\s*(?:Location|Listed|Similar)|$)/i,
    /Descripción(?:\s+del\s+vendedor)?\s*[\n\r\t\f\v\:\s]*([\s\S]+?)(?=\n\s*(?:Location|Listed|Ubicación)|$)/i,
    /About\s+this\s+item\s*[\n\r\t\f\v\:\s]*([\s\S]+?)(?=\n\s*(?:Location|Listed)|$)/i,
  ];

  for (const re of blocks) {
    const m = mainText.match(re);
    if (m && m[1]) {
      let block = m[1].trim();
      const stopRe =
        /\n\s*(?:Location|Местоположение|Listed\s|Указано|Seller information|See less|Показать полностью)/i;
      const si = block.search(stopRe);
      if (si > 0) block = block.slice(0, si).trim();
      if (block.length > 15) return block.slice(0, 2000);
    }
  }
  return "";
}

function extractSellerDescription(mainText) {
  let d = extractSellerDescriptionFromDom();
  if (d) return d;
  d = extractSellerDescriptionFromFullText(mainText || "");
  return d || "";
}

function scrapeListing() {
  const link = window.location.href;
  const title = pickListingTitle();

  const main = document.querySelector('[role="main"]');
  const mainText = main?.innerText || "";

  let price = extractListingPrice();

  let desc = extractSellerDescription(mainText);
  if (!desc) {
    const og =
      document.querySelector('meta[property="og:description"]') ||
      document.querySelector('meta[name="description"]');
    desc = og?.getAttribute("content")?.trim().slice(0, 2000) || "";
  }

  return { title, link, price, desc };
}

function buildImportUrl(paypackOrigin) {
  return PayPackUrlBuild.buildDashboardImportUrl(paypackOrigin, scrapeListing());
}

function rememberLastImport(paypackOrigin, importUrl) {
  const snap = scrapeListing();
  const payload = {
    at: Date.now(),
    paypackOrigin,
    importUrl,
    title: snap.title,
    link: snap.link,
    price: snap.price,
  };
  try {
    chrome.storage.local.set({
      lastImport: JSON.stringify(payload),
    });
  } catch {
    /* ignore */
  }
}

function openPayPack(paypackOrigin) {
  const url = buildImportUrl(paypackOrigin);
  rememberLastImport(paypackOrigin, url);
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyImportLink(paypackOrigin) {
  const url = buildImportUrl(paypackOrigin);
  rememberLastImport(paypackOrigin, url);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

function injectUi(settings) {
  if (document.getElementById("paypack-mp-root")) return;

  const paypackOrigin =
    (settings && settings.paypackOrigin) || PayPackUrlBuild.DEFAULT_ORIGIN;

  const root = document.createElement("div");
  root.id = "paypack-mp-root";

  const panel = document.createElement("div");
  panel.className = "paypack-mp-panel";
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "PayPack listing tools");

  const stack = document.createElement("div");
  stack.className = "paypack-mp-stack";

  const iconExternal =
    '<svg class="paypack-mp-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  const iconCopy =
    '<svg class="paypack-mp-icon paypack-mp-icon--muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "paypack-mp-btn paypack-mp-btn--primary";
  btn.title =
    "Open PayPack in a new tab with this listing prefilled (title, price, description).";
  btn.innerHTML = `<span class="paypack-mp-btn__row">
    <span class="paypack-mp-badge">PP</span>
    <span class="paypack-mp-btn__label">Open in PayPack</span>
    ${iconExternal}
  </span>`;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPayPack(paypackOrigin);
  });

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "paypack-mp-btn paypack-mp-btn--secondary";
  copyBtn.title = "Copy the dashboard import URL to your clipboard.";
  copyBtn.innerHTML = `<span class="paypack-mp-btn__row paypack-mp-btn__row--secondary">
    ${iconCopy}
    <span class="paypack-mp-copy-label">Copy import link</span>
  </span>`;

  copyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    void copyImportLink(paypackOrigin).then((ok) => {
      const label = copyBtn.querySelector(".paypack-mp-copy-label");
      if (!label) return;
      const prev = label.textContent;
      label.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(() => {
        label.textContent = prev;
      }, 2000);
    });
  });

  stack.appendChild(btn);
  stack.appendChild(copyBtn);
  panel.appendChild(stack);
  root.appendChild(panel);
  document.documentElement.appendChild(root);
}

function removeFab() {
  document.getElementById("paypack-mp-root")?.remove();
}

function applySettings(settings) {
  removeFab();
  if (!settings || settings.showFab === false) return;
  injectUi(settings);
}

function bootstrap() {
  const defaults = {
    paypackOrigin: PayPackUrlBuild.DEFAULT_ORIGIN,
    showFab: true,
  };

  if (typeof chrome !== "undefined" && chrome.storage?.sync) {
    chrome.storage.sync.get(defaults, (sync) => {
      applySettings(sync);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      if (!changes.paypackOrigin && !changes.showFab) return;
      chrome.storage.sync.get(defaults, applySettings);
    });
  } else {
    applySettings(defaults);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
