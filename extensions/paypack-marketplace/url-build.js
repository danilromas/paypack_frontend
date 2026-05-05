/**
 * Shared dashboard import URL builder (content script + unit tests via vm).
 * Keep in sync with tests/extension-url-build.test.ts expectations.
 */
var PayPackUrlBuild = {
  DEFAULT_ORIGIN: "https://paypack.uno",

  /**
   * @param {string} [paypackOrigin]
   * @param {{ title?: string; link?: string; price?: number; desc?: string; image?: string }} listing
   * @returns {string}
   */
  buildDashboardImportUrl: function (paypackOrigin, listing) {
    var title = listing.title != null ? String(listing.title) : "";
    var link = listing.link != null ? String(listing.link) : "";
    var price = Number(listing.price);
    if (Number.isNaN(price)) price = 0;
    var desc = listing.desc != null ? String(listing.desc) : "";
    var image = listing.image != null ? String(listing.image) : "";

    var params = new URLSearchParams();
    params.set("pp_import", "1");
    params.set("link", link);
    if (title) params.set("title", title);
    if (price > 0) params.set("price", String(price));
    if (desc) params.set("desc", desc);
    if (image) params.set("image", image);

    var base = (paypackOrigin || PayPackUrlBuild.DEFAULT_ORIGIN).replace(/\/$/, "");
    return base + "/dashboard/?" + params.toString();
  },
};
