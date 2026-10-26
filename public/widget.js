/*!
 * PayPack embeddable checkout button.
 *
 *   <script src="https://paypack.uno/widget.js" async></script>
 *   <div data-paypack-button
 *        data-seller="YOUR_PAYPACK_USER_ID"
 *        data-title="iPhone 15, 128 GB"
 *        data-price="650"
 *        data-shipping="15"
 *        data-currency="EUR"
 *        data-image="https://shop.example/iphone.jpg"></div>
 *
 * Or from JS: PayPack.mount(element, { seller, title, price, shipping, currency, image, description, label,
 * theme: "light" | "dark", onSuccess(dealId) {} }). The element also fires a "paypack:deal-created" event.
 */
(function () {
  "use strict"
  if (window.PayPack && window.PayPack.version) return

  var script = document.currentScript
  var BASE = (function () {
    try {
      return new URL(script && script.src ? script.src : "https://paypack.uno/widget.js").origin
    } catch (e) {
      return "https://paypack.uno"
    }
  })()

  var STYLE =
    ":host{display:inline-block;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
    "button{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:12px;padding:12px 18px;" +
    "font:600 15px/1 inherit;cursor:pointer;background:#0f766e;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.12);" +
    "transition:filter .15s,transform .05s}" +
    "button:hover{filter:brightness(1.08)}button:active{transform:translateY(1px)}" +
    "button:focus-visible{outline:3px solid rgba(15,118,110,.35);outline-offset:2px}" +
    "button.dark{background:#111827}" +
    "button[disabled]{opacity:.6;cursor:default}" +
    "small{display:block;margin-top:6px;font:400 12px/1.3 inherit;color:#6b7280;text-align:center}" +
    "svg{width:16px;height:16px;flex:none}"

  var SHIELD =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' +
    '<path d="m9 12 2 2 4-4"/></svg>'

  function readOptions(el) {
    var d = el.dataset
    return {
      seller: d.seller,
      title: d.title,
      price: d.price,
      shipping: d.shipping,
      currency: d.currency,
      image: d.image,
      description: d.description,
      label: d.label,
      theme: d.theme,
    }
  }

  function checkoutUrl(o) {
    var p = new URLSearchParams()
    p.set("seller", o.seller || "")
    p.set("title", o.title || "")
    p.set("price", String(o.price || ""))
    if (o.shipping) p.set("shipping", String(o.shipping))
    p.set("currency", (o.currency || "EUR").toUpperCase())
    if (o.image) p.set("image", o.image)
    if (o.description) p.set("description", o.description)
    p.set("source", location.href)
    p.set("origin", location.origin)
    return BASE + "/checkout/?" + p.toString()
  }

  function mount(el, options) {
    if (!el || el.__paypack) return el && el.__paypack
    var o = Object.assign({}, readOptions(el), options || {})
    if (!o.seller || !o.title || !(Number(o.price) > 0)) {
      console.warn("[PayPack] data-seller, data-title and a positive data-price are required", el)
      return null
    }

    var root = el.attachShadow ? el.attachShadow({ mode: "open" }) : el
    var style = document.createElement("style")
    style.textContent = STYLE
    var button = document.createElement("button")
    button.type = "button"
    if (o.theme === "dark") button.className = "dark"
    button.innerHTML = SHIELD
    button.appendChild(document.createTextNode(o.label || "Pay safely with PayPack"))
    var note = document.createElement("small")
    note.textContent = "Escrow protected • pay only after delivery"
    root.appendChild(style)
    root.appendChild(button)
    root.appendChild(note)

    var popup = null
    function onMessage(event) {
      if (event.origin !== BASE || !popup || event.source !== popup) return
      var data = event.data || {}
      if (data.type !== "paypack:deal_created") return
      el.dispatchEvent(new CustomEvent("paypack:deal-created", { detail: { dealId: data.dealId }, bubbles: true }))
      if (typeof o.onSuccess === "function") o.onSuccess(data.dealId)
    }
    window.addEventListener("message", onMessage)

    button.addEventListener("click", function () {
      var url = checkoutUrl(o)
      var w = 460
      var h = 720
      var left = Math.max(0, (window.screenX || 0) + (window.outerWidth - w) / 2)
      var top = Math.max(0, (window.screenY || 0) + (window.outerHeight - h) / 2)
      popup = window.open(url, "paypack_checkout", "width=" + w + ",height=" + h + ",left=" + left + ",top=" + top)
      // Popup blocked (or a mobile browser that ignores features): continue in this tab.
      if (!popup) location.href = url
    })

    var api = {
      destroy: function () {
        window.removeEventListener("message", onMessage)
        root.innerHTML = ""
        delete el.__paypack
      },
    }
    el.__paypack = api
    return api
  }

  function scan() {
    var nodes = document.querySelectorAll("[data-paypack-button]")
    for (var i = 0; i < nodes.length; i++) mount(nodes[i])
  }

  window.PayPack = { version: "1.0.0", mount: mount, scan: scan, checkoutUrl: checkoutUrl }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan)
  else scan()
})()
