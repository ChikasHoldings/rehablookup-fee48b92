/*!
 * RehabLookup embed loader v1
 * https://rehablookup.com/embed/v1/loader.js
 *
 * Drop-in widget injector. Scans the host page for elements with the
 * class "rehablookup-widget" and replaces each one with a sandboxed
 * iframe pointing at the matching widget content on rehablookup.com.
 *
 * Usage:
 *   <div class="rehablookup-widget"
 *        data-widget="badge"
 *        data-facility="<facility-uuid>"
 *        data-size="medium"
 *        data-theme="light"></div>
 *   <script src="https://rehablookup.com/embed/v1/loader.js" async></script>
 *
 * Guarantees:
 *   - Sandboxed iframe (sandbox="allow-scripts allow-popups
 *     allow-popups-to-escape-sandbox"). Cross-origin to the host, so
 *     it never accesses host cookies or DOM.
 *   - Pure vanilla JS — no inline event handlers, no eval, no
 *     document.write. Safe under most "default-src 'self'" CSPs
 *     provided the host allowlists rehablookup.com for script-src +
 *     frame-src (or omits frame-src entirely).
 *   - Fails silently. Every code path is wrapped in try/catch and any
 *     malformed config (missing facility, unknown widget) drops the
 *     widget without throwing.
 *   - Auto-resize via window.message: the widget content posts
 *     {type:"rehablookup-widget-height", height:N} after render; the
 *     loader resizes the iframe in response (clamped 40–1200px).
 */
(function () {
  "use strict";
  try {
    var ORIGIN = "https://rehablookup.com";
    // Allow self-hosted dev / preview builds (e.g. staging or Vercel
    // preview URLs) by deriving ORIGIN from the script's own src.
    try {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].getAttribute("src") || "";
        if (src.indexOf("/embed/v1/loader.js") !== -1) {
          var m = src.match(/^(https?:\/\/[^/]+)\//);
          if (m) ORIGIN = m[1];
          break;
        }
      }
    } catch (_) {}

    var DEFAULTS = {
      widget: "badge",
      size: "medium",
      theme: "light",
    };

    var SIZES = { small: 1, medium: 1, large: 1 };
    var THEMES = { light: 1, dark: 1, auto: 1 };
    var WIDGETS = { badge: 1, reviews: 1 };

    // Initial-height heuristics. The widget posts its real height after
    // render; these just prevent layout jank in the first frame.
    var INITIAL_HEIGHTS = {
      badge: { small: 60, medium: 80, large: 110 },
      reviews: { small: 320, medium: 420, large: 540 },
    };

    function injectAll() {
      try {
        var nodes = document.querySelectorAll(
          ".rehablookup-widget:not([data-rl-init])"
        );
        for (var i = 0; i < nodes.length; i++) {
          inject(nodes[i]);
        }
      } catch (_) {}
    }

    function inject(el) {
      try {
        el.setAttribute("data-rl-init", "1");

        var widget = (el.getAttribute("data-widget") || DEFAULTS.widget).toLowerCase();
        var facility = el.getAttribute("data-facility") || "";
        var size = (el.getAttribute("data-size") || DEFAULTS.size).toLowerCase();
        var theme = (el.getAttribute("data-theme") || DEFAULTS.theme).toLowerCase();

        if (!WIDGETS[widget]) return;
        if (!SIZES[size]) size = DEFAULTS.size;
        if (!THEMES[theme]) theme = DEFAULTS.theme;
        // UUID v4 / v5 / v7 shape — silently ignore bogus IDs so we
        // don't render broken iframes that would CORS-fail at fetch.
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facility)) return;

        var url =
          ORIGIN +
          "/embed/v1/widget/" +
          widget +
          ".html?facility=" +
          encodeURIComponent(facility) +
          "&size=" +
          size +
          "&theme=" +
          theme;

        var iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.title = "RehabLookup " + widget + " widget";
        iframe.loading = "lazy";
        iframe.setAttribute(
          "sandbox",
          "allow-scripts allow-popups allow-popups-to-escape-sandbox"
        );
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        iframe.setAttribute("allowtransparency", "true");
        iframe.style.border = "0";
        iframe.style.display = "block";
        iframe.style.width = "100%";
        iframe.style.background = "transparent";
        iframe.style.colorScheme = "normal"; // avoid host dark-mode UA quirks
        var initial =
          (INITIAL_HEIGHTS[widget] && INITIAL_HEIGHTS[widget][size]) || 200;
        iframe.style.height = initial + "px";

        // Replace any prior content (idempotent re-inject) and append.
        while (el.firstChild) el.removeChild(el.firstChild);
        el.appendChild(iframe);
      } catch (_) {
        // never break the host
      }
    }

    // Resize listener — widget content posts its actual rendered height
    // after fetch+render and on viewport changes. We clamp the value so
    // a hostile / broken widget can't push an absurd height into the
    // host layout.
    window.addEventListener(
      "message",
      function (e) {
        try {
          if (!e || e.origin !== ORIGIN) return;
          var data = e.data;
          if (typeof data === "string") {
            try {
              data = JSON.parse(data);
            } catch (_) {
              return;
            }
          }
          if (!data || data.type !== "rehablookup-widget-height") return;
          var h = Number(data.height);
          if (!isFinite(h)) return;
          h = Math.max(40, Math.min(1200, Math.ceil(h)));
          var frames = document.querySelectorAll(".rehablookup-widget iframe");
          for (var i = 0; i < frames.length; i++) {
            if (frames[i].contentWindow === e.source) {
              frames[i].style.height = h + "px";
              break;
            }
          }
        } catch (_) {}
      },
      false
    );

    // Mount on DOM ready or immediately if the script is at the end of body.
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", injectAll);
    } else {
      injectAll();
    }

    // Re-scan on next animation frame so widgets added by SPAs after the
    // initial mount also pick up. We don't keep watching forever — one
    // extra pass is enough for most frameworks; hosts that need
    // dynamic injection can re-load the script.
    try {
      setTimeout(injectAll, 250);
      setTimeout(injectAll, 1500);
    } catch (_) {}
  } catch (_) {
    // never break the host
  }
})();
