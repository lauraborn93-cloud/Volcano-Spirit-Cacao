/*
 * Minimal GDPR/ePrivacy-style consent manager.
 * - Nothing non-essential loads until the visitor chooses.
 * - Choice is stored in localStorage and can be changed anytime via the
 *   "Cookie Preferences" link in the footer (#open-cookie-prefs).
 * - To gate a future analytics/marketing script, wrap it like:
 *     window.addEventListener("vsc:consent-changed", function (e) {
 *       if (e.detail.analytics) { loadGoogleAnalytics(); }
 *     });
 *   and also check `VSCConsent.get().analytics` on page load in case
 *   consent was already given in a previous visit.
 */
(function () {
  "use strict";

  var KEY = "vsc_consent_v1";
  var DEFAULT = { necessary: true, analytics: false, marketing: false };

  function get() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? Object.assign({}, DEFAULT, JSON.parse(raw)) : null;
    } catch (e) {
      return null;
    }
  }

  function save(consent) {
    var full = Object.assign({}, DEFAULT, consent, { necessary: true, savedAt: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(full));
    window.dispatchEvent(new CustomEvent("vsc:consent-changed", { detail: full }));
    return full;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var banner = document.getElementById("cookie-banner");
    var overlay = document.getElementById("cookie-modal-overlay");
    if (!banner || !overlay) return;

    var analyticsToggle = document.getElementById("consent-analytics");
    var marketingToggle = document.getElementById("consent-marketing");

    function openModal() {
      var current = get() || DEFAULT;
      analyticsToggle.checked = current.analytics;
      marketingToggle.checked = current.marketing;
      overlay.classList.add("is-visible");
      overlay.setAttribute("aria-hidden", "false");
    }
    function closeModal() {
      overlay.classList.remove("is-visible");
      overlay.setAttribute("aria-hidden", "true");
    }
    function hideBanner() { banner.classList.remove("is-visible"); }
    function showBanner() { banner.classList.add("is-visible"); }

    var existing = get();
    if (!existing) {
      setTimeout(showBanner, 600);
    }

    document.getElementById("cookie-accept-all").addEventListener("click", function () {
      save({ analytics: true, marketing: true });
      hideBanner();
      closeModal();
    });
    document.getElementById("cookie-reject").addEventListener("click", function () {
      save({ analytics: false, marketing: false });
      hideBanner();
      closeModal();
    });
    document.getElementById("cookie-manage").addEventListener("click", openModal);
    document.getElementById("cookie-modal-close").addEventListener("click", function () {
      closeModal();
      if (!get()) showBanner();
    });
    document.getElementById("cookie-modal-save").addEventListener("click", function () {
      save({ analytics: analyticsToggle.checked, marketing: marketingToggle.checked });
      hideBanner();
      closeModal();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        closeModal();
        if (!get()) showBanner();
      }
    });

    document.querySelectorAll("#open-cookie-prefs").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        openModal();
      });
    });
  });

  window.VSCConsent = { get: get, save: save };
})();
