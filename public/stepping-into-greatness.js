(() => {
  "use strict";

  const PRODUCTION_FRONTEND_ORIGIN = "https://mufasafitsite.onrender.com";
  const PRODUCTION_BACKEND_ORIGIN = "https://mufasa-fitness-node.onrender.com";
  const RUN_CLUB_ROUTE = "/greatness.html?mode=run-club";
  const links = document.querySelectorAll('[data-start-greatness]');

  function configureRunClubPresentation() {
    document.title = "PocketPT Run Club | Free Digital Run Club";
    document.querySelectorAll(".brand span:last-child").forEach((node) => {
      node.innerHTML = "PocketPT <b>Run Club</b>";
    });
    const eyebrow = document.querySelector(".hero .eyebrow");
    if (eyebrow) eyebrow.innerHTML = "<span></span> PocketPT free digital run club";
    const heroTitle = document.getElementById("hero-title");
    if (heroTitle) heroTitle.innerHTML = "Run your city. <em>Build your greatness.</em>";
    links.forEach((link) => link.setAttribute("href", RUN_CLUB_ROUTE));
  }

  async function restoreCanonicalRunClubAuth() {
    // This public static page historically loaded without runtime-config.js. On
    // the production static host that made auth restoration fall back to the
    // frontend origin instead of the Node API. Set the canonical backend before
    // forcing one clean restore; this does not grant access or create auth state.
    if (window.location.origin === PRODUCTION_FRONTEND_ORIGIN && !window.MAAT_BACKEND_ORIGIN) {
      window.MAAT_BACKEND_ORIGIN = PRODUCTION_BACKEND_ORIGIN;
    }
    if (window.AuthStateRuntime?.restoreCanonicalAuthState) {
      await window.AuthStateRuntime.restoreCanonicalAuthState({ force: true, reason: "run-club-entry" }).catch(() => null);
    }
    const result = await window.AuthNavigation?.requireUser?.({ returnTo: RUN_CLUB_ROUTE, redirect: false });
    if (!result || result.ok || result.retryable) return;
    links.forEach((link) => link.setAttribute("href", result.target));
  }

  configureRunClubPresentation();
  restoreCanonicalRunClubAuth();

  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(item => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(item => observer.observe(item));
})();
