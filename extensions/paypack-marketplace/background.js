/**
 * Reads a Facebook Marketplace listing on behalf of the PayPack site: when a buyer pastes an FB link
 * into "New deal", the site asks us (via bridge.js) for the listing details. We open the listing in a
 * background tab of the user's own browser, let content.js scrape it exactly as the "Buy in PayPack"
 * button does, then close the tab. Nothing leaves the browser except back to the PayPack page.
 */
importScripts("storage.js");

const PP_FIXED_ALLOWED_ORIGINS = [
  "https://paypack.uno",
  "https://paypack-nu.vercel.app",
  "http://localhost:3000",
];
const PP_SCRAPE_TIMEOUT_MS = 20000;
const PP_SCRAPE_POLL_MS = 700;

function isFacebookListingUrl(raw) {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      /^(www\.|web\.|m\.)?facebook\.com$/i.test(u.hostname) &&
      /\/marketplace\/item\/\d+/.test(u.pathname)
    );
  } catch {
    return false;
  }
}

function senderOriginAllowed(sender) {
  return new Promise((resolve) => {
    let origin = "";
    try {
      origin = new URL(sender.url || sender.origin || "").origin;
    } catch {
      resolve(false);
      return;
    }
    if (PP_FIXED_ALLOWED_ORIGINS.includes(origin)) {
      resolve(true);
      return;
    }
    chrome.storage.sync.get({ paypackOrigin: PayPackStorage.DEFAULT_ORIGIN }, (s) => {
      resolve(PayPackStorage.normalizeOrigin(s.paypackOrigin) === origin);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrapeListingInBackgroundTab(url) {
  const tab = await chrome.tabs.create({ url, active: false });
  const deadline = Date.now() + PP_SCRAPE_TIMEOUT_MS;
  let best = null;
  try {
    while (Date.now() < deadline) {
      await sleep(PP_SCRAPE_POLL_MS);
      const current = await chrome.tabs.get(tab.id).catch(() => null);
      if (current?.url && /facebook\.com\/(login|checkpoint)/.test(current.url)) {
        return { ok: false, error: "login_required" };
      }
      let res;
      try {
        res = await chrome.tabs.sendMessage(tab.id, { type: "PP_SCRAPE_CURRENT" });
      } catch {
        continue; // content script not injected yet
      }
      if (res?.data?.title) {
        best = res.data;
        // Price/image often render a moment after the title — give them one more tick.
        if (best.price && best.image) break;
      }
    }
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
  return best ? { ok: true, data: best } : { ok: false, error: "not_found" };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "PP_SCRAPE_LISTING") return false;
  (async () => {
    if (!(await senderOriginAllowed(sender))) {
      sendResponse({ ok: false, error: "origin_not_allowed" });
      return;
    }
    if (!isFacebookListingUrl(msg.url)) {
      sendResponse({ ok: false, error: "invalid_url" });
      return;
    }
    try {
      sendResponse(await scrapeListingInBackgroundTab(msg.url));
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true; // async sendResponse
});
