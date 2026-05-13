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
let ppLastUrl = "";
let ppUrlInjectAttempts = 0;
const PP_RUN_COOLDOWN_MS = 1200;
const PP_MAX_ATTEMPTS_PER_URL = 6;

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
  return /\/marketplace\/item\//i.test(window.location.pathname || "");
}

function isActionButtonLike(el) {
  if (!el) return false;
  const t = (el.textContent || "").trim().toLowerCase();
  if (!t) return false;
  return (
    t === "send" ||
    t === "send message" ||
    t === "message" ||
    t === "contact seller" ||
    t === "enviar" ||
    t === "enviar mensaje" ||
    t === "отправить" ||
    t === "сообщение" ||
    t === "написать"
  );
}

function isSendButtonLike(el) {
  if (!el) return false;
  const t = (el.textContent || "").trim().toLowerCase();
  if (!t) return false;
  return (
    t === "send" ||
    t === "send message" ||
    t === "отправить" ||
    t === "enviar" ||
    t === "enviar mensaje"
  );
}

function findListingActionAnchor(main) {
  const strictSelectors = [
    '[role="main"] [aria-label*="Send" i]',
    '[role="main"] [aria-label*="Message" i]',
    '[role="main"] [aria-label*="Contact seller" i]',
    '[role="main"] [aria-label*="Отправить" i]',
    '[role="main"] [aria-label*="Сообщение" i]',
  ];
  for (const sel of strictSelectors) {
    const n = document.querySelector(sel);
    if (n) return n;
  }

  const buttonLikes = main.querySelectorAll('[role="button"], button, a[role="button"]');
  for (const el of buttonLikes) {
    if (isActionButtonLike(el)) return el;
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
  return rect.width > 2 && rect.height > 2;
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
      const t = (btn.textContent || "").trim().toLowerCase();
      if (!t) continue;
      if (/buy in paypack/.test(t)) continue;
      if (/send|message|enviar|mensaje|отправ|сообщ|написать/.test(t)) {
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
        if (bRect.top < tRect.top) continue;
        if (bRect.left < window.innerWidth * 0.52) continue;
        if (bRect.width < 100 || bRect.height < 28) continue;
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

function injectButtonIntoListingPage(settings) {
  resetUrlAttemptsIfNeeded();
  if (ppUrlInjectAttempts >= PP_MAX_ATTEMPTS_PER_URL) {
    ppWarn("skip: max attempts reached for url", {
      attempts: ppUrlInjectAttempts,
      url: window.location.href,
    });
    return;
  }
  ppUrlInjectAttempts += 1;

  const paypackOrigin =
    (settings && settings.paypackOrigin) || PayPackUrlBuild.DEFAULT_ORIGIN;
  ppLog("injectButtonIntoListingPage:start", {
    href: window.location.href,
    path: window.location.pathname,
    isListing: isListingPage(),
    paypackOrigin,
    hasSettings: !!settings,
  });
  if (!isListingPage()) {
    ppLog("skip: not listing page");
    return;
  }

  const sourceEl = null;
  const main = document.querySelector('[role="main"]');
  ppLog("dom probes", {
    listingAnchorFound: !!listingAnchor,
    mainFound: !!main,
  });
  if (!main) {
    ppWarn("skip: [role=main] not found");
    return;
  }

  const composerContext = getComposerContext(main);
  ppLog("anchor probes", {
    composerFound: !!composerContext,
    sendFound: !!composerContext?.sendButton,
    sendText: composerContext?.sendButton
      ? (composerContext.sendButton.textContent || "").trim()
      : "",
  });

  const host = composerContext?.host || null;
  ppLog("host probe", {
    hostFound: !!host,
    hostTag: host?.tagName || null,
    hostClass: host?.className || null,
  });
  if (!host) {
    ppLog("skip: host not found");
    return;
  }

  const sendButton = composerContext?.sendButton || null;
  if (!sendButton) {
    ppLog("skip: send button not found");
    return;
  }

  if (!sendButton.parentElement) {
    ppLog("skip: send container invalid");
    return;
  }

  const sibling = sendButton.previousElementSibling;
  if (sibling && sibling.classList?.contains("paypack-mp-native-btn") && isVisibleElement(sibling)) {
    ppLog("skip: native button already placed near send");
    return;
  }

  removeAllPayPackButtons(main);
  const nativeBtn = createNativeComposerButton(sendButton, paypackOrigin, sourceEl);
  sendButton.parentElement.insertBefore(nativeBtn, sendButton);
  ppLog("injected: native button before send");
  ppLog("post-check", {
    totalButtons: document.querySelectorAll(".paypack-mp-inline-btn").length,
    totalWraps: document.querySelectorAll(".paypack-mp-inline-wrap").length,
    totalNativeButtons: document.querySelectorAll(".paypack-mp-native-btn").length,
  });
}

function injectButtonsIntoFeedBlocks(settings) {
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
}

function scheduleApplySettings(defaults, reason) {
  if (ppInjectScheduled) return;
  const now = Date.now();
  if (now - ppLastRunAt < PP_RUN_COOLDOWN_MS) return;
  ppInjectScheduled = true;
  ppLastRunAt = now;
  setTimeout(() => {
    ppInjectScheduled = false;
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.get(defaults, (sync) => {
        ppLog("scheduled apply", { reason });
        applySettings(sync);
      });
    } else {
      ppLog("scheduled apply defaults", { reason });
      applySettings(defaults);
    }
  }, 100);
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
  ppLog("bootstrap:observer attached");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
