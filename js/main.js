(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.querySelector(".mobile-nav");

  var hasHero = !!document.querySelector(".hero");
  if (hasHero) document.body.classList.add("has-hero");

  var LOGO_FADE_DISTANCE = 380;

  function onScroll() {
    if (!hasHero) return;
    var scrolled = window.scrollY > 40;
    header.classList.toggle("is-scrolled", scrolled);
    document.body.classList.toggle("is-scrolled", scrolled);

    var progress = Math.min(window.scrollY / LOGO_FADE_DISTANCE, 1);
    document.documentElement.style.setProperty("--hero-logo-opacity", String(1 - progress));
    document.documentElement.style.setProperty("--hero-logo-scale", String(1 - progress * 0.55));
    document.documentElement.style.setProperty("--brand-opacity", String(progress));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function closeNav() {
    toggle.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  toggle.addEventListener("click", function () {
    var isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeNav();
    } else {
      toggle.setAttribute("aria-expanded", "true");
      mobileNav.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
  });

  mobileNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeNav);
  });

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
