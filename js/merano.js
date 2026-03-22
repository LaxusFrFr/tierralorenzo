/**
 * Merano — single site script (aligned with Bine’s flow).
 * - After first paint: one requestAnimationFrame → reveal-on-load, hero-revealed, stagger-revealed
 * - Scroll: IntersectionObserver on reveal targets + grid stagger (like Bine’s scroll-reveal)
 */
(function () {
  "use strict";

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    var scrollRevealSelector =
      ".scroll-reveal, .reveal-group, .reveal-stagger, .reveal-fade, .reveal-scale";

    function isInHero(el) {
      return !!el.closest(".hero");
    }

    function isInStaggerLoad(el) {
      return !!el.closest(".stagger-reveal-on-load");
    }

    function isElementInViewport(el) {
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      return r.bottom > 4 && r.top < vh * 0.96;
    }

    function sortRevealOrder(a, b) {
      var ra = a.getBoundingClientRect();
      var rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) < 14) {
        var pos = a.compareDocumentPosition(b);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      }
      return ra.top - rb.top;
    }

    function applyGridStagger(el) {
      var root = el.closest("[data-reveal-stagger]") || el.closest(".grid-2");
      if (!root) return;
      var chain = root.querySelectorAll(
        ":scope > .scroll-reveal, :scope > .reveal-scale, :scope > .reveal-group, :scope > .reveal-fade, :scope > .reveal-stagger"
      );
      if (chain.length < 2) return;
      var idx = Array.prototype.indexOf.call(chain, el);
      if (idx < 0) return;
      el.style.transitionDelay = idx * 0.08 + "s";
    }

    /** Home “Project Pages” cards: on viewports ≤960px, stagger runs when the grid scrolls into view (matches scroll-reveal UX; avoids off-screen load animations on tall mobile heroes). Desktop unchanged. */
    function initExploreGridStaggerOnScrollMobile() {
      if (!window.matchMedia("(max-width: 960px)").matches) return;
      var grid = document.querySelector(".explore-grid.stagger-reveal-on-load");
      if (!grid || grid.classList.contains("stagger-revealed")) return;

      function reveal() {
        grid.classList.add("stagger-revealed");
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        reveal();
        return;
      }

      if (typeof IntersectionObserver === "undefined") {
        reveal();
        return;
      }

      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            reveal();
            io.disconnect();
          });
        },
        { root: null, rootMargin: "0px 0px -36px 0px", threshold: 0 }
      );
      io.observe(grid);
    }

    function initScrollRevealObserver() {
      var els = Array.from(document.querySelectorAll(scrollRevealSelector));
      if (!els.length) return;

      var candidates = els.filter(function (el) {
        return !isInHero(el) && !isInStaggerLoad(el);
      });

      var above = [];
      var below = [];
      candidates.forEach(function (el) {
        if (isElementInViewport(el)) above.push(el);
        else below.push(el);
      });

      /* Stagger in real time (setTimeout), not only transition-delay — avoids “everything at once”. */
      above.sort(sortRevealOrder);
      above.forEach(function (el, i) {
        setTimeout(function () {
          applyGridStagger(el);
          el.classList.add("is-visible");
        }, i * 200);
      });

      if (!below.length) return;

      if (typeof IntersectionObserver === "undefined") {
        below.forEach(function (el) {
          applyGridStagger(el);
          el.classList.add("is-visible");
        });
        return;
      }

      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            applyGridStagger(el);
            el.classList.add("is-visible");
            io.unobserve(el);
          });
        },
        { root: null, rootMargin: "0px 0px -36px 0px", threshold: 0 }
      );

      below.forEach(function (el) {
        io.observe(el);
      });
    }

    function runEntrancePipeline() {
      document.querySelectorAll(".reveal-on-load").forEach(function (el, index) {
        if (el.classList.contains("scroll-reveal")) return;
        el.style.animationDelay = 0.15 * index + "s";
        el.classList.add("is-visible");
      });

      document.querySelectorAll(".hero.hero-reveal-on-load").forEach(function (hero) {
        hero.classList.add("hero-revealed");
      });

      document.querySelectorAll(".stagger-reveal-on-load").forEach(function (block) {
        if (window.matchMedia("(max-width: 960px)").matches && block.classList.contains("explore-grid")) {
          return;
        }
        block.classList.add("stagger-revealed");
      });

      initExploreGridStaggerOnScrollMobile();

      initScrollRevealObserver();
    }

    /* Header hide on scroll */
    var headerWrap = document.getElementById("header-wrap");
    var lastScrollY = 0;
    var scrollThreshold = 80;

    function getScrollY() {
      return window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? 0;
    }

    function updateHeaderWrap() {
      if (!headerWrap) return;
      var navOpen = document.querySelector(".nav-main.is-open");
      if (navOpen) return;

      var y = getScrollY();
      if (y <= scrollThreshold) {
        headerWrap.classList.remove("header-hidden");
      } else if (y > lastScrollY) {
        headerWrap.classList.add("header-hidden");
      } else if (y < lastScrollY) {
        headerWrap.classList.remove("header-hidden");
      }
      lastScrollY = y;
    }

    if (headerWrap) {
      window.addEventListener("scroll", updateHeaderWrap, { passive: true });
      window.addEventListener("resize", updateHeaderWrap, { passive: true });
      setTimeout(updateHeaderWrap, 80);
      requestAnimationFrame(updateHeaderWrap);
    }

    var siteHeader = document.getElementById("site-header");
    if (siteHeader) {
      function tickShadow() {
        siteHeader.classList.toggle("is-scrolled", getScrollY() > 12);
      }
      tickShadow();
      window.addEventListener("scroll", tickShadow, { passive: true });
    }

    function updateNavOffset() {
      if (!siteHeader) return;
      var h = siteHeader.offsetHeight || 0;
      document.documentElement.style.setProperty("--nav-offset", h + "px");
    }
    updateNavOffset();
    window.addEventListener("resize", updateNavOffset, { passive: true });

    /* If the home explore grid was waiting for scroll (mobile) and the viewport becomes desktop, reveal so cards are never stuck hidden. */
    window.addEventListener(
      "resize",
      function () {
        if (!window.matchMedia("(min-width: 961px)").matches) return;
        var grid = document.querySelector(".explore-grid.stagger-reveal-on-load");
        if (grid && !grid.classList.contains("stagger-revealed")) {
          grid.classList.add("stagger-revealed");
        }
      },
      { passive: true }
    );

    var navToggle = document.querySelector(".nav-toggle");
    var navMain = document.querySelector(".nav-main");

    /* Desktop: sliding underline between primary nav links (sessionStorage remembers previous page index) */
    var NAV_PREV_KEY = "merano_nav_prev_idx";
    function getNavPageLinks(nav) {
      return Array.prototype.slice.call(nav.querySelectorAll("a")).filter(function (a) {
        return !a.classList.contains("nav-mobile-cta");
      });
    }
    function placeIndicator(indicator, nav, linkEl) {
      if (!indicator || !nav || !linkEl) return;
      var navRect = nav.getBoundingClientRect();
      var linkRect = linkEl.getBoundingClientRect();
      var left = linkRect.left - navRect.left + nav.scrollLeft;
      var width = linkRect.width;
      indicator.style.width = width + "px";
      indicator.style.transform = "translateX(" + left + "px)";
    }
    function initNavSlideIndicator() {
      if (!navMain || navMain.dataset.navIndicatorInit === "1") return;
      if (window.matchMedia("(max-width: 960px)").matches) return;
      var links = getNavPageLinks(navMain);
      if (links.length < 2) return;
      var current = navMain.querySelector('a[aria-current="page"]');
      if (!current) return;
      var currentIdx = links.indexOf(current);
      if (currentIdx < 0) return;

      var indicator = navMain.querySelector(".nav-indicator");
      if (!indicator) {
        indicator = document.createElement("span");
        indicator.className = "nav-indicator";
        indicator.setAttribute("aria-hidden", "true");
        navMain.appendChild(indicator);
      }
      navMain.classList.add("has-nav-indicator");
      navMain.dataset.navIndicatorInit = "1";

      var prevRaw = sessionStorage.getItem(NAV_PREV_KEY);
      var prevIdx = prevRaw !== null ? parseInt(prevRaw, 10) : NaN;
      var fromLink =
        !isNaN(prevIdx) && prevIdx !== currentIdx && links[prevIdx] ? links[prevIdx] : null;

      indicator.style.transition = "none";
      if (fromLink) {
        placeIndicator(indicator, navMain, fromLink);
      } else {
        placeIndicator(indicator, navMain, current);
      }

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          indicator.style.transition = "";
          placeIndicator(indicator, navMain, current);
        });
      });

      setTimeout(function () {
        try {
          sessionStorage.removeItem(NAV_PREV_KEY);
        } catch (e) {
          /* ignore */
        }
      }, 450);

      links.forEach(function (a) {
        a.addEventListener("click", function () {
          sessionStorage.setItem(NAV_PREV_KEY, String(currentIdx));
        });
      });

      window.addEventListener(
        "resize",
        function () {
          if (window.matchMedia("(max-width: 960px)").matches) return;
          var cur = navMain.querySelector('a[aria-current="page"]');
          if (cur) placeIndicator(indicator, navMain, cur);
        },
        { passive: true }
      );
    }
    initNavSlideIndicator();
    window.addEventListener(
      "resize",
      function () {
        if (window.innerWidth > 960) initNavSlideIndicator();
      },
      { passive: true }
    );

    function restoreBodyScroll() {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    function syncMobileNavAria() {
      if (!navMain) return;
      if (window.innerWidth > 960) {
        navMain.removeAttribute("aria-hidden");
      } else {
        navMain.setAttribute("aria-hidden", navMain.classList.contains("is-open") ? "false" : "true");
      }
    }

    function closeMenu() {
      if (!navMain || !navToggle) return;
      navMain.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
      if (navOverlay) navOverlay.classList.remove("is-visible");
      restoreBodyScroll();
      syncMobileNavAria();
    }

    var navOverlay = document.querySelector(".nav-overlay");
    if (!navOverlay && navMain) {
      navOverlay = document.createElement("div");
      navOverlay.className = "nav-overlay";
      navOverlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(navOverlay);
    }

    if (navToggle && navMain && navOverlay) {
      syncMobileNavAria();

      navToggle.addEventListener("click", function () {
        var willOpen = !navMain.classList.contains("is-open");
        navMain.classList.toggle("is-open", willOpen);
        navToggle.classList.toggle("is-open", willOpen);
        navToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
        navToggle.setAttribute("aria-label", willOpen ? "Close menu" : "Open menu");
        navOverlay.classList.toggle("is-visible", willOpen);
        syncMobileNavAria();
        if (willOpen) {
          document.body.style.overflow = "hidden";
          document.documentElement.style.overflow = "hidden";
          if (headerWrap) headerWrap.classList.remove("header-hidden");
        } else {
          restoreBodyScroll();
        }
      });

      navOverlay.addEventListener("click", closeMenu);

      window.addEventListener(
        "resize",
        function () {
          if (window.innerWidth > 960) closeMenu();
          else syncMobileNavAria();
        },
        { passive: true }
      );

      navMain.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          if (window.innerWidth <= 960) closeMenu();
        });
      });
    }

    /* —— Carousels, unit tabs, inquiry form (was main.js) —— */
    function initCarousel(root) {
      if (!root) return;
      var track = root.querySelector(".carousel-track");
      var slides = root.querySelectorAll(".carousel-slide");
      var prev = root.querySelector(".carousel-nav.prev");
      var next = root.querySelector(".carousel-nav.next");
      var dotsWrap = root.querySelector(".carousel-dots");
      if (!track || !slides.length) return;

      var i = 0;
      var timer;

      function go(index) {
        i = (index + slides.length) % slides.length;
        track.style.transform = "translateX(-" + i * 100 + "%)";
        root.querySelectorAll(".carousel-dot").forEach(function (d, j) {
          d.setAttribute("aria-current", j === i ? "true" : "false");
        });
      }

      function startAutoplay() {
        if (timer) clearInterval(timer);
        timer = setInterval(function () {
          go(i + 1);
        }, 5500);
      }

      if (dotsWrap) {
        slides.forEach(function (_, j) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.className = "carousel-dot";
          dot.setAttribute("aria-label", "Go to slide " + (j + 1));
          if (j === 0) dot.setAttribute("aria-current", "true");
          dot.addEventListener("click", function () {
            go(j);
          });
          dotsWrap.appendChild(dot);
        });
      }

      if (prev) prev.addEventListener("click", function () { go(i - 1); });
      if (next) next.addEventListener("click", function () { go(i + 1); });

      startAutoplay();
      root.addEventListener("mouseenter", function () {
        if (timer) clearInterval(timer);
      });
      root.addEventListener("mouseleave", startAutoplay);
    }

    initCarousel(document.getElementById("carousel-interiors"));
    initCarousel(document.getElementById("carousel-amenities"));

    var tablist = document.querySelector(".unit-tabs");
    if (tablist) {
      var indicator = tablist.querySelector(".unit-tabs-indicator");
      var tabs = tablist.querySelectorAll(".unit-tab");
      var panels = document.querySelectorAll(".unit-panel");

      function placeIndicator(activeTab) {
        if (!indicator || !activeTab) return;
        indicator.style.left = activeTab.offsetLeft + "px";
        indicator.style.width = activeTab.offsetWidth + "px";
      }

      tabs.forEach(function (tab, idx) {
        tab.addEventListener("click", function () {
          tabs.forEach(function (t) {
            t.setAttribute("aria-selected", "false");
          });
          panels.forEach(function (p) {
            p.classList.remove("is-active");
            p.hidden = true;
          });
          tab.setAttribute("aria-selected", "true");
          if (panels[idx]) {
            panels[idx].classList.add("is-active");
            panels[idx].hidden = false;
          }
          placeIndicator(tab);
        });
      });

      var initial =
        tablist.querySelector('.unit-tab[aria-selected="true"]') || tabs[0];
      if (initial) {
        requestAnimationFrame(function () {
          placeIndicator(initial);
        });
      }

      window.addEventListener(
        "resize",
        function () {
          var active = tablist.querySelector('.unit-tab[aria-selected="true"]');
          if (active) placeIndicator(active);
        },
        { passive: true }
      );
    }

    var inquiryForm = document.getElementById("inquiry-form");
    var formSuccess = document.getElementById("form-success");
    if (inquiryForm && formSuccess) {
      inquiryForm.addEventListener("submit", function (e) {
        e.preventDefault();
        formSuccess.classList.add("is-visible");
        inquiryForm.reset();
        formSuccess.focus();
      });
    }

    /* Bine: one requestAnimationFrame after DOM ready, then load animations + scroll observer */
    requestAnimationFrame(function () {
      runEntrancePipeline();
    });
  });
})();
