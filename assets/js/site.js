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


  // Interactive dotted lettering: pointer movement creates a soft fluid displacement.
  var humanizeCanvas = document.getElementById('humanizeCanvas');
  if (humanizeCanvas && humanizeCanvas.getContext) {
    var humanizeCtx = humanizeCanvas.getContext('2d');
    var humanizeStage = humanizeCanvas.parentElement;
    var humanizeDots = [];
    var humanizePointer = { x: -10000, y: -10000, active: false };
    var humanizeReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var humanizeWidth = 0, humanizeHeight = 0, humanizeDpr = 1, humanizeFrame = 0;
    function buildHumanizeDots() {
      var rect = humanizeCanvas.getBoundingClientRect();
      humanizeWidth = Math.max(1, rect.width);
      humanizeHeight = Math.max(1, rect.height);
      humanizeDpr = Math.min(window.devicePixelRatio || 1, 2);
      humanizeCanvas.width = Math.round(humanizeWidth * humanizeDpr);
      humanizeCanvas.height = Math.round(humanizeHeight * humanizeDpr);
      humanizeCtx.setTransform(humanizeDpr, 0, 0, humanizeDpr, 0, 0);
      var offscreen = document.createElement('canvas');
      offscreen.width = Math.ceil(humanizeWidth);
      offscreen.height = Math.ceil(humanizeHeight);
      var offCtx = offscreen.getContext('2d', { willReadFrequently: true });
      var fontSize = Math.min(humanizeWidth * 0.205, humanizeHeight * 0.82, 250);
      offCtx.font = '500 ' + fontSize + 'px Arial, Helvetica, sans-serif';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle = '#fff';
      offCtx.fillText('Humanize', humanizeWidth / 2, humanizeHeight / 2);
      var pixels = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
      var stride = humanizeWidth < 600 ? 4 : 5;
      humanizeDots = [];
      for (var y = 0; y < offscreen.height; y += stride) {
        for (var x = 0; x < offscreen.width; x += stride) {
          if (pixels[(y * offscreen.width + x) * 4 + 3] > 80) {
            humanizeDots.push({ ox:x, oy:y, x:x, y:y, vx:0, vy:0 });
          }
        }
      }
      renderHumanizeDots(0);
    }
    function renderHumanizeDots(time) {
      humanizeCtx.clearRect(0, 0, humanizeWidth, humanizeHeight);
      var theme = root.getAttribute('data-theme');
      var dotColor = theme === 'dark' ? '245,245,247' : '29,29,31';
      var radius = humanizeWidth < 600 ? 1.05 : 1.25;
      for (var i = 0; i < humanizeDots.length; i++) {
        var dot = humanizeDots[i];
        var dx = dot.x - humanizePointer.x;
        var dy = dot.y - humanizePointer.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (!humanizeReduced && humanizePointer.active && distance < 105) {
          var force = (105 - distance) / 105;
          var strength = force * 2.1;
          dot.vx += (dx / (distance || 1)) * strength;
          dot.vy += (dy / (distance || 1)) * strength;
        }
        dot.vx += (dot.ox - dot.x) * 0.045;
        dot.vy += (dot.oy - dot.y) * 0.045;
        dot.vx *= 0.82;
        dot.vy *= 0.82;
        dot.x += dot.vx;
        dot.y += dot.vy;
        var shimmer = humanizeReduced ? 0 : Math.sin((dot.ox + dot.oy) * 0.025 + time * 0.001) * 0.1;
        humanizeCtx.fillStyle = 'rgba(' + dotColor + ',' + (0.78 + shimmer) + ')';
        humanizeCtx.beginPath();
        humanizeCtx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        humanizeCtx.fill();
      }
      if (!humanizeReduced) humanizeFrame = window.requestAnimationFrame(renderHumanizeDots);
    }
    humanizeCanvas.addEventListener('pointermove', function (event) {
      var rect = humanizeCanvas.getBoundingClientRect();
      humanizePointer.x = event.clientX - rect.left;
      humanizePointer.y = event.clientY - rect.top;
      humanizePointer.active = true;
      if (humanizeReduced) renderHumanizeDots(0);
    });
    humanizeCanvas.addEventListener('pointerleave', function () {
      humanizePointer.active = false;
      humanizePointer.x = -10000;
      humanizePointer.y = -10000;
    });
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (humanizeFrame) window.cancelAnimationFrame(humanizeFrame);
        buildHumanizeDots();
        if (!humanizeReduced) humanizeFrame = window.requestAnimationFrame(renderHumanizeDots);
      }).observe(humanizeCanvas);
    } else {
      window.addEventListener('resize', buildHumanizeDots);
    }
    buildHumanizeDots();
    if (!humanizeReduced) humanizeFrame = window.requestAnimationFrame(renderHumanizeDots);
    if (themeToggle) themeToggle.addEventListener('click', function () {
      if (humanizeReduced) renderHumanizeDots(0);
    });
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
