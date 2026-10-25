(function () {
  'use strict';

  // Theme preference is shared across every page on this site.
  var root = document.documentElement;
  var themeToggle = document.getElementById('themeToggle');
  var storedTheme = null;
  try { storedTheme = window.localStorage.getItem('portfolio-theme'); } catch (_) {}
  var initialTheme = storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.setAttribute('data-theme', initialTheme);
  function updateThemeButton(theme) {
    if (!themeToggle) return;
    var dark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    themeToggle.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  updateThemeButton(initialTheme);
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { window.localStorage.setItem('portfolio-theme', next); } catch (_) {}
      updateThemeButton(next);
    });
  }

  // Navbar border once the page scrolls
  var navbar = document.getElementById('navbar');
  if (navbar) {
    var onScroll = function () { navbar.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu
  var toggle = document.getElementById('menuToggle');
  var menu = document.getElementById('navbarMenu');
  if (toggle && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function (e) {
      var target = e.target;
      if (!menu.contains(target) && !toggle.contains(target)) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
    menu.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', function () { setMenu(false); }); });
  }

  // Reduced-motion users still get all content without entrance animations.
  var items = document.querySelectorAll('.reveal');
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 });
  items.forEach(function (el) { observer.observe(el); });
})();
