/**
 * PayPack Marketplace — floating actions + dashboard import.
 * Site URL and FAB visibility: extension icon → popup.
 */
const PP_DEBUG = false;
function ppLog(...args) {
  if (!PP_DEBUG) return;
  console.log("[PayPackExt]", ...args);
}

function ppWarn(...args) {
  if (!PP_DEBUG) return;
  console.log("[PayPackExt]", ...args);
}

let ppInjectScheduled = false;
let ppLastRunAt = 0;
let ppMutationTimer = null;
let ppListingWatchInterval = null;
let ppLastUrl = "";
let ppUrlInjectAttempts = 0;
const PP_RUN_COOLDOWN_MS = 1200;
const PP_MAX_ATTEMPTS_PER_URL = 40;
const PP_SHADOW_HOST_ID = "paypack-mp-shadow-host";
const MESSAGE_ACTION_LABEL =
  /send|message|contact seller|enviar|mensaje|отправ|сообщ|написать|seller/i;

function resetUrlAttemptsIfNeeded() {
  const nowUrl = window.location.href;
  if (nowUrl !== ppLastUrl) {
    ppLastUrl = nowUrl;
    ppUrlInjectAttempts = 0;
    ppLog("url changed, reset attempts", { nowUrl });
  }
}

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

function titleFromListingPageStructure() {
  const main = document.querySelector('[role="main"]');
  if (!main) return "";
  const selectors = [
    'h1 span[dir="auto"]',
    'h1',
    '[role="main"] [role="heading"][aria-level="1"]',
    '[role="main"] [role="heading"][aria-level="2"]',
    '[role="main"] [data-testid] span[dir="auto"]',
  ];
  for (const sel of selectors) {
    const nodes = main.querySelectorAll(sel);
    for (const node of nodes) {
      const t = node.innerText?.trim();
      if (!t || t.length < 4 || t.length > 420) continue;
      if (isGarbageTitle(t)) continue;
      if (/^\d[\d\s\u00A0.,]*(MX\$|€|\$|USD|EUR|руб|₽|MXN)/i.test(t)) continue;
      return t.slice(0, 400);
    }
  }
  return "";
}

function getCardTitleFromAnchor(anchor) {
  if (!anchor) return "";
  const container = anchor.closest("a") || anchor;
  const titleNode =
    container.querySelector('span[style*="-webkit-line-clamp"]') ||
    container.querySelector('span[dir="auto"]');
  const t = titleNode?.innerText?.trim() || "";
  if (!t || isGarbageTitle(t)) return "";
  if (/^\d[\d\s\u00A0.,]*(MX\$|€|\$|USD|EUR|руб|₽|MXN)/i.test(t)) return "";
  if (/reciente|недавно|recent/i.test(t.toLowerCase())) return "";
  return t.slice(0, 400);
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
      [/(€|EUR|eur)\s*(\d[\d\s\u00A0.,]*)/gi, 2],
      [/(\d[\d\s\u00A0.,]*)\s*(USD)\b/gi, 1],
      [/(USD)\s*(\d[\d\s\u00A0.,]*)/gi, 2],
      [/(\d[\d\s\u00A0.,]*)\s*(руб|₽|RUB|rub)\b/gi, 1],
      [/(руб|₽|RUB|rub)\s*(\d[\d\s\u00A0.,]*)/gi, 2],
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

function extractListingPriceFromDom() {
  const main = document.querySelector('[role="main"]');
  if (!main) return 0;
  const nodes = main.querySelectorAll('span[dir="auto"], div[dir="auto"], h1, h2');
  for (const node of nodes) {
    const t = node.innerText?.trim();
    if (!t || t.length > 80) continue;
    if (!/(MX\$|MXN|€|EUR|USD|руб|₽|\$)/i.test(t)) continue;
    const n = extractListingPriceFromText(t);
    if (n > 0 && n < 1e10) return n;
  }
  return 0;
}

function extractPriceFromCard(anchor) {
  if (!anchor) return 0;
  const card = anchor.closest("a") || anchor;
  const texts = card.querySelectorAll('span[dir="auto"]');
  for (const node of texts) {
    const t = node.innerText?.trim();
    if (!t) continue;
    if (!/(MX\$|MXN|€|EUR|USD|руб|₽)/i.test(t)) continue;
    const n = extractListingPriceFromText(t);
    if (n > 0) return n;
  }
  return 0;
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

function normalizeDescription(text) {
  if (!text) return "";
  return String(text)
    .replace(/\u00A0/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2000);
}

function extractCardSummary(anchor) {
  if (!anchor) return "";
  const card = anchor.closest("a") || anchor;
  const chunks = [];
  const nodes = card.querySelectorAll('span[dir="auto"]');
  for (const node of nodes) {
    const t = node.innerText?.trim();
    if (!t) continue;
    if (/^\d[\d\s\u00A0.,]*(MX\$|MXN|€|EUR|USD|руб|₽)/i.test(t)) continue;
    if (/reciente|недавно|recent/i.test(t.toLowerCase())) continue;
    if (isGarbageTitle(t)) continue;
    if (t.length < 2 || t.length > 220) continue;
    chunks.push(t);
  }
  const uniq = [...new Set(chunks)];
  return normalizeDescription(uniq.slice(0, 4).join(". "));
}

function collectImageUrls(sourceEl) {
  const urls = [];
  const add = (u) => {
    if (!u || !/^https?:\/\//i.test(u)) return;
    if (/data:image/i.test(u)) return;
    if (urls.includes(u)) return;
    urls.push(u);
  };

  const fromMeta =
    document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
  add(fromMeta);

  if (sourceEl) {
    const card = sourceEl.closest("a") || sourceEl;
    for (const img of card.querySelectorAll("img")) {
      add(img.getAttribute("src") || "");
    }
  }

  const main = document.querySelector('[role="main"]');
  if (main) {
    const imgs = main.querySelectorAll("img");
    for (const img of imgs) {
      const src = img.getAttribute("src") || "";
      const alt = (img.getAttribute("alt") || "").toLowerCase();
      if (alt.includes("profile") || alt.includes("avatar")) continue;
      add(src);
    }
  }
  return urls.slice(0, 1);
}

function extractPrimaryImageUrl(sourceEl) {
  const urls = collectImageUrls(sourceEl);
  for (const src of urls) {
    if (!src) continue;
    return src;
  }
  return "";
}

function scrapeListing(sourceEl) {
  const link = sourceEl?.href || window.location.href;
  const title =
    getCardTitleFromAnchor(sourceEl) ||
    titleFromListingPageStructure() ||
    pickListingTitle();

  const main = document.querySelector('[role="main"]');
  const mainText = main?.innerText || "";

  let price = extractPriceFromCard(sourceEl);
  if (!price) price = extractListingPriceFromDom();
  if (!price) price = extractListingPrice();

  let desc = extractCardSummary(sourceEl);
  if (!desc) desc = normalizeDescription(extractSellerDescription(mainText));
  if (!desc) {
    const og =
      document.querySelector('meta[property="og:description"]') ||
      document.querySelector('meta[name="description"]');
    desc = normalizeDescription(og?.getAttribute("content") || "");
  }
  const image = extractPrimaryImageUrl(sourceEl);
  return { title, link, price, desc, image };
}

function buildImportUrl(paypackOrigin, sourceEl) {
  return PayPackUrlBuild.buildDashboardImportUrl(paypackOrigin, scrapeListing(sourceEl));
}

function rememberLastImport(paypackOrigin, importUrl, sourceEl) {
  const snap = scrapeListing(sourceEl);
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

function openPayPack(paypackOrigin, sourceEl) {
  const url = buildImportUrl(paypackOrigin, sourceEl);
  rememberLastImport(paypackOrigin, url, sourceEl);
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyImportLink(paypackOrigin, sourceEl) {
  const url = buildImportUrl(paypackOrigin, sourceEl);
  rememberLastImport(paypackOrigin, url, sourceEl);
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

function createActionButton(paypackOrigin, compact, sourceEl) {
  const resolvedOrigin = paypackOrigin || PayPackUrlBuild.DEFAULT_ORIGIN;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = compact
    ? "paypack-mp-inline-btn paypack-mp-inline-btn--compact"
    : "paypack-mp-inline-btn";
  btn.title =
    "Buy in PayPack with this listing prefilled (title, price, description, image).";
  btn.textContent = compact ? "Buy in PayPack" : "Buy in PayPack";

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPayPack(resolvedOrigin, sourceEl);
  });
  return btn;
}

function createNativeComposerButton(sendButton, paypackOrigin, sourceEl) {
  const resolvedOrigin = paypackOrigin || PayPackUrlBuild.DEFAULT_ORIGIN;
  const clone = sendButton.cloneNode(true);
  clone.classList.add("paypack-mp-native-btn");
  clone.removeAttribute?.("id");
  clone.removeAttribute?.("data-testid");
  clone.removeAttribute?.("aria-describedby");
  clone.removeAttribute?.("aria-controls");
  clone.removeAttribute?.("disabled");
  clone.setAttribute?.("aria-label", "Buy in PayPack");

  if ("disabled" in clone) {
    try {
      clone.disabled = false;
    } catch {
      // ignore
    }
  }

  const labelNode =
    clone.querySelector('span[dir="auto"]') ||
    clone.querySelector("span") ||
    clone;
  if (labelNode) labelNode.textContent = "Buy in PayPack";

  const roots = [clone, ...clone.querySelectorAll("*")];
  roots.forEach((n) => {
    if (!(n instanceof HTMLElement)) return;
    n.style.setProperty("background", "#22a559", "important");
    n.style.setProperty("border-color", "#22a559", "important");
    n.style.setProperty("color", "#ffffff", "important");
  });

  clone.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPayPack(resolvedOrigin, sourceEl);
  });
  return clone;
}

function isListingPage() {
  return /\/marketplace\/item\/\d+/i.test(window.location.pathname || "");
}

function extractListingIdFromPath(pathname) {
  const match = String(pathname || "").match(/\/marketplace\/item\/(\d+)/i);
  return match ? match[1] : "";
}

function extractListingIdFromHref(href) {
  const match = String(href || "").match(/\/marketplace\/item\/(\d+)/i);
  return match ? match[1] : "";
}

function getListingRoots() {
  const roots = [];
  const seen = new Set();
  const add = (el) => {
    if (!el || seen.has(el)) return;
    seen.add(el);
    roots.push(el);
  };

  add(document.querySelector('[role="main"]'));
  for (const dialog of document.querySelectorAll('[role="dialog"]')) add(dialog);
  for (const modal of document.querySelectorAll('[aria-modal="true"]')) add(modal);
  return roots;
}

function getButtonLabelText(btn) {
  const text = (btn?.textContent || "").trim();
  if (text) return text;
  return (
    btn?.getAttribute("aria-label") ||
    btn?.getAttribute("title") ||
    ""
  ).trim();
}

function isMessageActionButton(btn) {
  if (!btn) return false;
  const hay = getButtonLabelText(btn).toLowerCase();
  if (!hay) return false;
  if (/buy in paypack/.test(hay)) return false;
  return MESSAGE_ACTION_LABEL.test(hay);
}

function hasListingSellerComposer(root) {
  if (!root) return false;
  const textbox =
    root.querySelector("textarea") ||
    root.querySelector('[contenteditable="true"]') ||
    root.querySelector('[role="textbox"]');
  if (!textbox || !isVisibleElement(textbox)) return false;
  const textboxRect = textbox.getBoundingClientRect();
  if (textboxRect.left < window.innerWidth * 0.25) return false;

  for (const btn of root.querySelectorAll('[role="button"], button')) {
    if (!isVisibleElement(btn)) continue;
    if (isMessageActionButton(btn)) return true;
  }
  return false;
}

function isListingDetailView() {
  if (isListingPage()) return true;

  for (const root of getListingRoots()) {
    if (hasListingSellerComposer(root)) return true;
  }

  const title = pickListingTitle() || titleFromListingPageStructure();
  const price =
    extractListingPriceFromDom() ||
    extractPriceFromMeta() ||
    extractListingPrice();
  return price > 0 && !!title && !isGarbageTitle(title);
}

function isMarketplaceContext() {
  return /\/marketplace\//i.test(window.location.pathname || "");
}

function shouldShowListingOverlay() {
  if (!isMarketplaceContext()) return false;
  if (isListingPage()) return true;
  if (/marketplace\s*[·—-]\s+/i.test(document.title || "")) return true;
  return isListingDetailView();
}

function hideListingOverlay() {
  const host = document.getElementById(PP_SHADOW_HOST_ID);
  if (host) host.style.display = "none";
}

function syncFacebookOverlayTheme(host) {
  if (!host) return;
  const dark = document.documentElement.classList.contains("__fb-dark-mode");
  host.setAttribute("data-theme", dark ? "dark" : "light");
}

function applyShadowListingOverlayStyles(shadow) {
  if (!shadow) return;
  let style = shadow.querySelector("style");
  if (!style) {
    style = document.createElement("style");
    shadow.prepend(style);
  }
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      pointer-events: auto;
      display: block;
      font-family: "Segoe UI Historic", "Segoe UI", Helvetica, Arial, sans-serif;
    }
    .wrap {
      display: flex;
      align-items: stretch;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #d0d3d7;
      border-radius: 8px;
      background: #f0f2f5;
      color: #050505;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      line-height: 18px;
      min-height: 36px;
      padding: 8px 12px;
      box-shadow: none;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }
    .btn:hover {
      background: #e4e6eb;
      border-color: #c9ccd1;
    }
    .btn:active { background: #d8dadf; }
    .btn:focus-visible {
      outline: 2px solid rgba(8, 102, 255, 0.35);
      outline-offset: 2px;
    }
    :host([data-theme="dark"]) .btn {
      background: rgba(58, 59, 60, 0.92);
      color: #e4e6eb;
      border-color: rgba(255, 255, 255, 0.12);
    }
    :host([data-theme="dark"]) .btn:hover {
      background: rgba(72, 73, 75, 0.96);
      border-color: rgba(255, 255, 255, 0.18);
    }
  `;
}

function ensureShadowListingOverlay(paypackOrigin) {
  const resolvedOrigin = paypackOrigin || PayPackUrlBuild.DEFAULT_ORIGIN;
  let host = document.getElementById(PP_SHADOW_HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = PP_SHADOW_HOST_ID;
    host.setAttribute("data-paypack-placement", "listing-page-shadow");
    const shadow = host.attachShadow({ mode: "open" });
    applyShadowListingOverlayStyles(shadow);
    const wrap = document.createElement("div");
    wrap.className = "wrap";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = "Buy in PayPack";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const origin = host.dataset.paypackOrigin || PayPackUrlBuild.DEFAULT_ORIGIN;
      openPayPack(origin, getActiveListingAnchor());
    });

    wrap.appendChild(btn);
    shadow.appendChild(wrap);
    document.documentElement.appendChild(host);
  } else {
    applyShadowListingOverlayStyles(host.shadowRoot);
    host.shadowRoot?.querySelector(".badge")?.remove();
  }

  syncFacebookOverlayTheme(host);
  host.dataset.paypackOrigin = resolvedOrigin;
  host.style.display = "block";
  return host;
}

function getActiveListingAnchor() {
  const idFromPath = extractListingIdFromPath(window.location.pathname);
  const selectById = (id) => {
    if (!id) return null;
    for (const root of getListingRoots()) {
      const link = root.querySelector(`a[href*="/marketplace/item/${id}"]`);
      if (link instanceof HTMLAnchorElement) return link;
    }
    const fallback = document.querySelector(`a[href*="/marketplace/item/${id}"]`);
    return fallback instanceof HTMLAnchorElement ? fallback : null;
  };

  if (idFromPath) {
    const byId = selectById(idFromPath);
    if (byId) return byId;
  }

  for (const root of getListingRoots()) {
    for (const link of root.querySelectorAll('a[href*="/marketplace/item/"]')) {
      if (!(link instanceof HTMLAnchorElement)) continue;
      const rect = link.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      const id = extractListingIdFromHref(link.href);
      if (!id) continue;
      if (idFromPath && id !== idFromPath) continue;
      return link;
    }
  }
  return null;
}

function hasVisibleListingPayPackButton() {
  const shadowHost = document.getElementById(PP_SHADOW_HOST_ID);
  return !!(shadowHost && shadowHost.style.display !== "none");
}

function removeListingPayPackButtons(scope) {
  const root = scope || document;
  for (const el of root.querySelectorAll(".paypack-mp-native-btn")) {
    el.remove();
  }
  for (const el of root.querySelectorAll(
    '.paypack-mp-inline-wrap[data-paypack-placement="listing-page"]',
  )) {
    el.remove();
  }
  document.getElementById("paypack-mp-listing-fab")?.remove();
}

function createListingButtonWrap(paypackOrigin, sourceEl) {
  const wrap = document.createElement("div");
  wrap.className = "paypack-mp-inline-wrap paypack-mp-listing-actions";
  wrap.setAttribute("data-paypack-placement", "listing-page");
  wrap.appendChild(createActionButton(paypackOrigin, false, sourceEl));
  return wrap;
}

function injectInlineListingButton(host, paypackOrigin, sourceEl, beforeNode) {
  const wrap = createListingButtonWrap(paypackOrigin, sourceEl);
  if (beforeNode?.parentElement) {
    beforeNode.parentElement.insertBefore(wrap, beforeNode);
    return wrap;
  }
  host.appendChild(wrap);
  return wrap;
}

function ensureListingFab(paypackOrigin, sourceEl) {
  let host = document.getElementById("paypack-mp-listing-fab");
  if (host) return host;
  host = document.createElement("div");
  host.id = "paypack-mp-listing-fab";
  host.className = "paypack-mp-listing-fab";
  host.setAttribute("data-paypack-placement", "listing-page");
  host.appendChild(createActionButton(paypackOrigin, false, sourceEl));
  document.body.appendChild(host);
  return host;
}

function isActionButtonLike(el) {
  return isMessageActionButton(el);
}

function isSendButtonLike(el) {
  return isMessageActionButton(el);
}

function findListingActionAnchor(root) {
  if (!root) return null;
  const strictSelectors = [
    '[aria-label*="Send" i]',
    '[aria-label*="Message" i]',
    '[aria-label*="Contact seller" i]',
    '[aria-label*="Enviar" i]',
    '[aria-label*="Mensaje" i]',
    '[aria-label*="Отправить" i]',
    '[aria-label*="Сообщение" i]',
    '[aria-label*="Написать" i]',
  ];
  for (const sel of strictSelectors) {
    const nodes = root.querySelectorAll(sel);
    let best = null;
    let bestScore = -Infinity;
    for (const node of nodes) {
      if (!isVisibleElement(node)) continue;
      const rect = node.getBoundingClientRect();
      const score = rect.left * 2 + rect.top;
      if (score > bestScore) {
        bestScore = score;
        best = node;
      }
    }
    if (best) return best;
  }

  const buttonLikes = root.querySelectorAll('[role="button"], button, a[role="button"]');
  for (const el of buttonLikes) {
    if (isMessageActionButton(el)) return el;
  }
  return null;
}

function findMessageComposerHost(main) {
  const sendCandidates = main.querySelectorAll('[role="button"], button');
  for (const el of sendCandidates) {
    if (!isSendButtonLike(el)) continue;
    const formHost =
      el.closest("form") ||
      el.closest('[role="form"]') ||
      null;

    if (formHost) {
      return { host: formHost, anchor: el };
    }

    let p = el.parentElement;
    let depth = 0;
    while (p && depth < 10 && p !== main) {
      const hasInput =
        !!p.querySelector("textarea") || !!p.querySelector('[contenteditable="true"]');
      const btnCount = p.querySelectorAll('[role="button"], button').length;
      if (hasInput || btnCount >= 2) {
        return { host: p, anchor: el };
      }
      p = p.parentElement;
      depth += 1;
    }

    if (el.parentElement) return { host: el.parentElement, anchor: el };
  }

  const textarea =
    main.querySelector("textarea") ||
    main.querySelector('[contenteditable="true"]');
  if (!textarea) return null;

  const box =
    textarea.closest("form") ||
    textarea.closest('[role="group"]') ||
    textarea.closest("div");
  if (!box) return null;
  return { host: box, anchor: null };
}

function isVisibleElement(el) {
  if (!el || !el.isConnected) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number(style.opacity) === 0) return false;
  return true;
}

function isListingPayPackButtonVisible(el) {
  if (!isVisibleElement(el)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
  if (rect.right < 0 || rect.left > window.innerWidth) return false;
  return true;
}

function removeAllPayPackButtons(scope) {
  const root = scope || document;
  for (const el of root.querySelectorAll(".paypack-mp-inline-wrap")) {
    el.remove();
  }
  for (const el of root.querySelectorAll(".paypack-mp-native-btn")) {
    el.remove();
  }
}

function getComposerContext(main) {
  const textboxes = main.querySelectorAll(
    'textarea, [contenteditable="true"], [role="textbox"]',
  );
  const visibleTextboxes = [...textboxes].filter(isVisibleElement);
  if (!visibleTextboxes.length) return null;

  // Prefer the right-panel composer (highest left coordinate).
  visibleTextboxes.sort(
    (a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left,
  );

  for (const textbox of visibleTextboxes) {
    let container =
      textbox.closest("form") ||
      textbox.closest('[role="group"]') ||
      textbox.closest("div");
    if (!container) continue;

    let sendButton = null;
    const localButtons = container.querySelectorAll('button, [role="button"]');
    for (const btn of localButtons) {
      if (!isVisibleElement(btn)) continue;
      if (isMessageActionButton(btn)) {
        sendButton = btn;
        break;
      }
    }

    // Fallback: if exact text wasn't found, pick a visible action button below textbox.
    if (!sendButton) {
      const tRect = textbox.getBoundingClientRect();
      const candidates = main.querySelectorAll('button, [role="button"]');
      let best = null;
      let bestScore = -Infinity;
      for (const btn of candidates) {
        if (!isVisibleElement(btn)) continue;
        const bRect = btn.getBoundingClientRect();
        if (bRect.top < tRect.top - 4) continue;
        if (bRect.left < window.innerWidth * 0.45) continue;
        if (bRect.width < 56 || bRect.height < 24) continue;
        const score = bRect.top - tRect.top - Math.abs(bRect.left - tRect.left) * 0.1;
        if (score > bestScore) {
          bestScore = score;
          best = btn;
        }
      }
      sendButton = best;
    }

    if (!sendButton) continue;
    const host = sendButton.parentElement || container;
    if (!host) continue;
    return { host, sendButton };
  }
  return null;
}

function resolveListingComposer(preferredRoot) {
  const roots = [];
  const seen = new Set();
  const add = (root) => {
    if (!root || seen.has(root)) return;
    seen.add(root);
    roots.push(root);
  };
  add(preferredRoot);
  for (const root of getListingRoots()) add(root);

  for (const root of roots) {
    const composerContext = getComposerContext(root);
    if (composerContext?.host && composerContext?.sendButton) {
      return composerContext;
    }

    const composerHost = findMessageComposerHost(root);
    if (composerHost?.host && composerHost?.anchor) {
      return { host: composerHost.host, sendButton: composerHost.anchor };
    }

    const actionAnchor = findListingActionAnchor(root);
    if (actionAnchor) {
      const sendButton =
        actionAnchor.matches('[role="button"], button, a[role="button"]')
          ? actionAnchor
          : actionAnchor.querySelector('[role="button"], button, a[role="button"]');
      if (sendButton) {
        return { host: sendButton.parentElement || actionAnchor, sendButton };
      }
    }
  }

  return null;
}

function injectButtonIntoListingPage(settings) {
  resetUrlAttemptsIfNeeded();
  if (!shouldShowListingOverlay()) {
    ppLog("skip: not listing detail view");
    return;
  }

  const paypackOrigin =
    (settings && settings.paypackOrigin) || PayPackUrlBuild.DEFAULT_ORIGIN;
  for (const root of getListingRoots()) {
    removeListingPayPackButtons(root);
  }
  ensureShadowListingOverlay(paypackOrigin);
  ppUrlInjectAttempts = 0;
  ppLog("injected: listing shadow button");
}

function injectButtonsIntoFeedBlocks(settings) {
  if (shouldShowListingOverlay()) return;

  const paypackOrigin =
    (settings && settings.paypackOrigin) || PayPackUrlBuild.DEFAULT_ORIGIN;

  const links = document.querySelectorAll('a[href*="/marketplace/item/"]');
  links.forEach((a) => {
    const card =
      a.closest('[role="article"]') ||
      a.closest('[data-testid]') ||
      a.parentElement;
    if (!card || !(card instanceof HTMLElement)) return;
    if (card.querySelector(".paypack-mp-inline-wrap")) return;

    const wrap = document.createElement("div");
    wrap.className = "paypack-mp-inline-wrap";
    wrap.setAttribute("data-paypack-placement", "feed-card");
    wrap.appendChild(createActionButton(paypackOrigin, true, a));
    card.appendChild(wrap);
  });
}

function applySettings(settings) {
  injectButtonsIntoFeedBlocks(settings);
  if (shouldShowListingOverlay()) {
    if (settings?.showFab !== false) {
      injectButtonIntoListingPage(settings);
    } else {
      hideListingOverlay();
      for (const root of getListingRoots()) {
        removeListingPayPackButtons(root);
      }
    }
  } else {
    hideListingOverlay();
  }
}

function scheduleApplySettings(defaults, reason, force = false) {
  if (ppInjectScheduled) return;
  const now = Date.now();
  const listingPending =
    shouldShowListingOverlay() && !hasVisibleListingPayPackButton();
  if (!force && !listingPending && now - ppLastRunAt < PP_RUN_COOLDOWN_MS) return;
  ppInjectScheduled = true;
  ppLastRunAt = now;
  setTimeout(() => {
    ppInjectScheduled = false;
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.get(defaults, (sync) => {
        ppLog("scheduled apply", { reason, force });
        applySettings(sync);
      });
    } else {
      ppLog("scheduled apply defaults", { reason, force });
      applySettings(defaults);
    }
  }, 100);
}

function hookSpaNavigation(onNavigate) {
  const notify = () => onNavigate();
  window.addEventListener("popstate", notify);
  const wrap = (original) =>
    function (...args) {
      const result = original.apply(this, args);
      notify();
      return result;
    };
  try {
    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
  } catch {
    // ignore
  }
}

function bootstrap() {
  ppLog("bootstrap:start", {
    href: window.location.href,
    readyState: document.readyState,
  });
  const defaults = {
    paypackOrigin: PayPackUrlBuild.DEFAULT_ORIGIN,
    showFab: true,
  };

  if (typeof chrome !== "undefined" && chrome.storage?.sync) {
    chrome.storage.sync.get(defaults, (sync) => {
      ppLog("storage.sync.get", sync);
      applySettings(sync);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      if (!changes.paypackOrigin && !changes.showFab) return;
      ppLog("storage.onChanged", { area, changes });
      scheduleApplySettings(defaults, "storage.onChanged");
    });
  } else {
    ppWarn("chrome.storage.sync unavailable, using defaults");
    applySettings(defaults);
  }

  const obs = new MutationObserver(() => {
    if (ppMutationTimer) clearTimeout(ppMutationTimer);
    ppMutationTimer = setTimeout(() => {
      ppLog("mutation observed (debounced)");
      scheduleApplySettings(defaults, "mutation");
    }, 350);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  hookSpaNavigation(() => scheduleApplySettings(defaults, "spa-nav", true));
  startListingWatch(defaults);
  ppLog("bootstrap:observer attached");
}

function startListingWatch(defaults) {
  if (ppListingWatchInterval) return;
  ppListingWatchInterval = window.setInterval(() => {
    if (!shouldShowListingOverlay()) {
      hideListingOverlay();
      return;
    }
    if (hasVisibleListingPayPackButton()) return;
    scheduleApplySettings(defaults, "listing-watch", true);
  }, 1500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
