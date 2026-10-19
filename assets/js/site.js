(function () {
  'use strict';

  // Navbar border once the page scrolls
  var navbar = document.getElementById('navbar');
  if (navbar) {
    var bar = navbar;
    var onScroll = function () {
      bar.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu
  var toggle = document.getElementById('menuToggle');
  var menu = document.getElementById('navbarMenu');
  if (toggle && menu) {
    var btn = toggle;
    var list = menu;
    var setMenu = function (/** @type {boolean} */ open) {
      list.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', function () {
      setMenu(btn.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', function (e) {
      var target = /** @type {Node | null} */ (e.target);
      if (!list.contains(target) && !btn.contains(target)) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        btn.focus();
      }
    });
    list.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
  }

  // Reveal content as it scrolls into view
  var items = document.querySelectorAll('.reveal');
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
