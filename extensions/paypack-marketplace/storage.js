/**
 * Shared settings + import history for popup and content script.
 */
var PayPackStorage = (function () {
  var DEFAULT_ORIGIN = "https://paypack.uno";
  var HISTORY_KEY = "importHistory";
  var LAST_IMPORT_KEY = "lastImport";
  var HISTORY_LIMIT = 80;

  var SYNC_DEFAULTS = {
    paypackOrigin: DEFAULT_ORIGIN,
    showFab: true,
    showFeedButtons: true,
    buttonLabel: "BUY IN PAYPACK",
    buttonColor: "#0f7680",
    debugMode: false,
    uiLang: "en",
  };

  function normalizeOrigin(raw) {
    var s = String(raw || "").trim();
    if (!s) return DEFAULT_ORIGIN;
    try {
      var u = new URL(s);
      if (u.protocol !== "http:" && u.protocol !== "https:") return DEFAULT_ORIGIN;
      return u.origin;
    } catch {
      return DEFAULT_ORIGIN;
    }
  }

  function normalizeHexColor(raw, fallback) {
    var fb = fallback || SYNC_DEFAULTS.buttonColor;
    var s = String(raw || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      return (
        "#" +
        s
          .slice(1)
          .split("")
          .map(function (c) {
            return c + c;
          })
          .join("")
          .toLowerCase()
      );
    }
    return fb;
  }

  function darkenHex(hex, amount) {
    var h = normalizeHexColor(hex, SYNC_DEFAULTS.buttonColor).slice(1);
    var n = parseInt(h, 16);
    var r = Math.max(0, ((n >> 16) & 255) - amount);
    var g = Math.max(0, ((n >> 8) & 255) - amount);
    var b = Math.max(0, (n & 255) - amount);
    return (
      "#" +
      [r, g, b]
        .map(function (x) {
          return x.toString(16).padStart(2, "0");
        })
        .join("")
    );
  }

  function normalizeSettings(raw) {
    var src = raw || {};
    return {
      paypackOrigin: normalizeOrigin(src.paypackOrigin),
      showFab: src.showFab !== false,
      showFeedButtons: src.showFeedButtons !== false,
      buttonLabel: String(src.buttonLabel || SYNC_DEFAULTS.buttonLabel).trim() ||
        SYNC_DEFAULTS.buttonLabel,
      buttonColor: normalizeHexColor(src.buttonColor, SYNC_DEFAULTS.buttonColor),
      debugMode: !!src.debugMode,
      uiLang: src.uiLang === "ru" ? "ru" : "en",
    };
  }

  function uid() {
    return (
      "pp_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function parseLastImport(value) {
    if (!value) return null;
    try {
      var j = typeof value === "string" ? JSON.parse(value) : value;
      if (!j || typeof j !== "object") return null;
      return {
        id: j.id || uid(),
        at: Number(j.at) || Date.now(),
        title: String(j.title || ""),
        price: Number(j.price) || 0,
        link: String(j.link || ""),
        importUrl: String(j.importUrl || ""),
        image: String(j.image || ""),
        paypackOrigin: String(j.paypackOrigin || DEFAULT_ORIGIN),
        status: j.status === "copied" || j.status === "failed" ? j.status : "opened",
      };
    } catch {
      return null;
    }
  }

  function getSettings(cb) {
    if (typeof chrome === "undefined" || !chrome.storage?.sync) {
      cb(normalizeSettings(SYNC_DEFAULTS));
      return;
    }
    chrome.storage.sync.get(SYNC_DEFAULTS, function (sync) {
      cb(normalizeSettings(sync));
    });
  }

  function setSettings(partial, cb) {
    getSettings(function (current) {
      var next = normalizeSettings(Object.assign({}, current, partial || {}));
      if (typeof chrome === "undefined" || !chrome.storage?.sync) {
        if (cb) cb(next);
        return;
      }
      chrome.storage.sync.set(next, function () {
        if (cb) cb(next);
      });
    });
  }

  function getHistory(cb) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      cb([]);
      return;
    }
    chrome.storage.local.get(
      { importHistory: [], lastImport: null },
      function (local) {
        var list = Array.isArray(local.importHistory) ? local.importHistory.slice() : [];
        list = list
          .map(parseLastImport)
          .filter(Boolean)
          .sort(function (a, b) {
            return b.at - a.at;
          });

        if (!list.length && local.lastImport) {
          var migrated = parseLastImport(local.lastImport);
          if (migrated) {
            list = [migrated];
            chrome.storage.local.set({ importHistory: list });
          }
        }
        cb(list);
      },
    );
  }

  function saveHistory(list, cb) {
    var next = (list || [])
      .map(parseLastImport)
      .filter(Boolean)
      .sort(function (a, b) {
        return b.at - a.at;
      })
      .slice(0, HISTORY_LIMIT);
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      if (cb) cb(next);
      return;
    }
    var payload = { importHistory: next };
    if (next[0]) payload.lastImport = JSON.stringify(next[0]);
    chrome.storage.local.set(payload, function () {
      if (cb) cb(next);
    });
  }

  function addHistoryEntry(entry, cb) {
    getHistory(function (list) {
      var item = parseLastImport(
        Object.assign({}, entry || {}, { id: (entry && entry.id) || uid(), at: (entry && entry.at) || Date.now() }),
      );
      if (!item) {
        if (cb) cb(list);
        return;
      }
      var next = [item].concat(
        list.filter(function (x) {
          return x.importUrl !== item.importUrl || x.at !== item.at;
        }),
      );
      saveHistory(next, cb);
    });
  }

  function removeHistoryEntry(id, cb) {
    getHistory(function (list) {
      saveHistory(
        list.filter(function (x) {
          return x.id !== id;
        }),
        cb,
      );
    });
  }

  function clearHistory(cb) {
    saveHistory([], cb);
  }

  function countToday(list) {
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    var t = start.getTime();
    return (list || []).filter(function (x) {
      return x.at >= t;
    }).length;
  }

  function extensionHelpUrl(origin) {
    return normalizeOrigin(origin).replace(/\/$/, "") + "/extension/";
  }

  function dashboardUrl(origin) {
    return normalizeOrigin(origin).replace(/\/$/, "") + "/dashboard/";
  }

  return {
    DEFAULT_ORIGIN: DEFAULT_ORIGIN,
    SYNC_DEFAULTS: SYNC_DEFAULTS,
    HISTORY_LIMIT: HISTORY_LIMIT,
    normalizeOrigin: normalizeOrigin,
    normalizeHexColor: normalizeHexColor,
    darkenHex: darkenHex,
    normalizeSettings: normalizeSettings,
    getSettings: getSettings,
    setSettings: setSettings,
    getHistory: getHistory,
    addHistoryEntry: addHistoryEntry,
    removeHistoryEntry: removeHistoryEntry,
    clearHistory: clearHistory,
    countToday: countToday,
    extensionHelpUrl: extensionHelpUrl,
    dashboardUrl: dashboardUrl,
  };
})();
