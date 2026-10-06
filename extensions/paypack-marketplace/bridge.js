/**
 * Runs on the PayPack site. Relays "read this Facebook listing" requests from the page to the
 * extension's background worker and posts the result back. Only same-window messages are accepted,
 * and background.js re-checks that the page's origin is a PayPack origin.
 */
(function () {
  const PAGE_SOURCE = "paypack-page";
  const EXT_SOURCE = "paypack-extension";

  function reply(payload) {
    window.postMessage(Object.assign({ source: EXT_SOURCE }, payload), window.location.origin);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const msg = event.data;
    if (!msg || msg.source !== PAGE_SOURCE) return;

    if (msg.type === "PP_PING") {
      reply({ type: "PP_PONG", version: chrome.runtime.getManifest().version });
      return;
    }

    if (msg.type === "PP_SCRAPE_LISTING" && typeof msg.url === "string") {
      chrome.runtime.sendMessage({ type: "PP_SCRAPE_LISTING", url: msg.url }, (res) => {
        const err = chrome.runtime.lastError;
        reply({
          type: "PP_SCRAPE_RESULT",
          requestId: msg.requestId,
          ok: !err && !!res?.ok,
          data: res?.data ?? null,
          error: err ? err.message : res?.error ?? null,
        });
      });
    }
  });

  reply({ type: "PP_PONG", version: chrome.runtime.getManifest().version });
})();
