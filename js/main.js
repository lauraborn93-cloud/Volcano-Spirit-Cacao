(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.querySelector(".mobile-nav");

  var hasHero = !!document.querySelector(".hero");
  if (hasHero) document.body.classList.add("has-hero");

  var LOGO_SHRINK_DISTANCE = 380;
  var scrollTicking = false;

  function onScroll() {
    // The header has no background until scrolled (so it sits invisibly over
    // a hero photo at the top). That must apply on every page, hero or not,
    // or the nav goes unreadable once a non-hero page scrolls past its
    // (comparatively short) photo hero into plain page content beneath it.
    var scrolled = window.scrollY > 40;
    header.classList.toggle("is-scrolled", scrolled);
    document.body.classList.toggle("is-scrolled", scrolled);

    if (!hasHero) return;
    // The logo starts big on load, shrinks as you scroll, and fades out
    // completely so it's gone well before you're past the hero.
    var progress = Math.min(window.scrollY / LOGO_SHRINK_DISTANCE, 1);
    var isMobile = window.innerWidth <= 640;
    // On mobile, only animate opacity, not scale. A continuously-updated
    // transform on a position:fixed element is a known trigger for iOS
    // Safari compositing glitches right as a scroll gesture starts
    // (perceived as the hero photo "zooming"); a static scale removes that
    // risk entirely while opacity is cheap to animate every frame.
    if (isMobile) {
      document.documentElement.style.setProperty("--hero-logo-scale", "1");
    } else {
      var startScale = 1.35;
      var endScale = 0.4;
      document.documentElement.style.setProperty("--hero-logo-scale", String(startScale - progress * (startScale - endScale)));
    }
    document.documentElement.style.setProperty("--hero-logo-opacity", String(1 - progress));
  }
  // Throttle via rAF so this runs at most once per frame instead of once
  // per raw scroll event, which can otherwise cause visible jank/jumping
  // the moment scrolling starts, especially on mobile.
  window.addEventListener(
    "scroll",
    function () {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(function () {
        onScroll();
        scrollTicking = false;
      });
    },
    { passive: true }
  );
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

  // Typewriter effect for the hero subhead: cycles through a list of
  // phrases (pipe-separated in data-phrases), typing and deleting each
  // in turn. The first phrase is already present in markup so the page
  // reads correctly with JS off or before this runs; animation picks up
  // from there. Respects prefers-reduced-motion by leaving the first
  // phrase static.
  var typewriterEls = document.querySelectorAll(".typewriter[data-phrases]");
  typewriterEls.forEach(function (el) {
    var phrases = el
      .getAttribute("data-phrases")
      .split("|")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    var textEl = el.querySelector(".typewriter-text");
    if (!textEl || phrases.length < 2) return;

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    var TYPE_MS = 55;
    var DELETE_MS = 30;
    var PAUSE_MS = 1800;
    var phraseIndex = 0;
    var charIndex = phrases[0].length;
    var deleting = true;

    function tick() {
      var current = phrases[phraseIndex];
      if (deleting) {
        charIndex--;
        textEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          setTimeout(tick, 300);
          return;
        }
        setTimeout(tick, DELETE_MS);
      } else {
        charIndex++;
        textEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, PAUSE_MS);
          return;
        }
        setTimeout(tick, TYPE_MS);
      }
    }
    setTimeout(tick, PAUSE_MS);
  });

  // ---------- Image lightbox ----------
  var lightboxImgs = document.querySelectorAll(".img-lightbox");
  if (lightboxImgs.length) {
    var activeOverlay = null;
    var onLightboxKeydown = function (e) {
      if (e.key === "Escape") closeLightbox();
    };
    var closeLightbox = function () {
      if (!activeOverlay) return;
      activeOverlay.remove();
      activeOverlay = null;
      document.removeEventListener("keydown", onLightboxKeydown);
    };
    var openLightbox = function (src, alt) {
      var overlay = document.createElement("div");
      overlay.className = "lightbox-overlay";
      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "lightbox-close";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.textContent = "×";
      var img = document.createElement("img");
      img.src = src;
      img.alt = alt || "";
      overlay.appendChild(closeBtn);
      overlay.appendChild(img);
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay || e.target === closeBtn) closeLightbox();
      });
      document.body.appendChild(overlay);
      activeOverlay = overlay;
      document.addEventListener("keydown", onLightboxKeydown);
    };
    lightboxImgs.forEach(function (img) {
      img.addEventListener("click", function () {
        openLightbox(img.currentSrc || img.src, img.alt);
      });
    });
  }

  // ---------- Product image sliders ----------
  // A native horizontally-scrolling, scroll-snapped track (swipe/scroll
  // to change slides); this script just keeps the dot indicators in sync
  // and lets clicking a dot scroll to that slide.
  document.querySelectorAll(".product-slider[data-slider]").forEach(function (slider) {
    var track = slider.querySelector(".product-slider-track");
    var dots = slider.querySelectorAll(".product-slider-dots button");
    if (!track || !dots.length) return;

    function setActive(index) {
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
      });
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        var slide = track.children[i];
        if (slide) track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
      });
    });

    var tracking = false;
    track.addEventListener(
      "scroll",
      function () {
        if (tracking) return;
        tracking = true;
        window.requestAnimationFrame(function () {
          var index = Math.round(track.scrollLeft / track.clientWidth);
          setActive(index);
          tracking = false;
        });
      },
      { passive: true }
    );
  });
})();
