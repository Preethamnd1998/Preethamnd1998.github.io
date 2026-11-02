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
    var navElement = navbar;
    var onScroll = function () { navElement.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu
  var toggle = document.getElementById('menuToggle');
  var menu = document.getElementById('navbarMenu');
  if (toggle && menu) {
    var menuToggle = toggle;
    var navMenu = menu;
    var setMenu = function (open) {
      navMenu.classList.toggle('open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
    };
    menuToggle.addEventListener('click', function () { setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function (e) {
      var target = e.target;
      if (!(target instanceof Node) || (!navMenu.contains(target) && !menuToggle.contains(target))) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuToggle.focus();
      }
    });
    navMenu.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', function () { setMenu(false); }); });
  }


  // Responsive, touch-aware dotted typography for both the title and tagline.
  /** @type {NodeListOf<HTMLCanvasElement>} */
  var humanizeCanvases = document.querySelectorAll('.dot-word-canvas');
  var humanizeReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  humanizeCanvases.forEach(function (canvas) {
    var context = canvas.getContext('2d');
    if (!context) return;
    /** @type {CanvasRenderingContext2D} */
    var drawingContext = context;
    var dots = [];
    var pointer = { x: -10000, y: -10000, active: false };
    var width = 1, height = 1, dpr = 1, frame = 0;
    var word = canvas.getAttribute('data-word') || 'Humanize';
    var isTagline = canvas.getAttribute('data-kind') === 'tagline';
    function build() {
      var rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      var off = document.createElement('canvas');
      off.width = Math.ceil(width);
      off.height = Math.ceil(height);
      var oc = off.getContext('2d', { willReadFrequently: true });
      if (!oc) return;
      var fontSize = isTagline
        ? Math.min(width / Math.max(10, word.length) * 1.55, height * 0.78, 28)
        : Math.min(width * 0.22, height * 0.68, 320);
      oc.font = (isTagline ? '500 ' : '400 ') + fontSize + 'px ' + (isTagline ? 'Arial, sans-serif' : 'Arial, Helvetica, sans-serif');
      oc.textAlign = 'center';
      oc.textBaseline = 'middle';
      oc.fillStyle = '#fff';
      oc.fillText(word, width / 2, height / 2, width * 0.96);
      var pixels = oc.getImageData(0, 0, off.width, off.height).data;
      var stride = width < 600 ? (isTagline ? 2 : 3) : (isTagline ? 2 : 3);
      dots = [];
      for (var y = 0; y < off.height; y += stride) {
        for (var x = 0; x < off.width; x += stride) {
          if (pixels[(y * off.width + x) * 4 + 3] > 70) dots.push({ ox:x, oy:y, x:x, y:y, vx:0, vy:0 });
        }
      }
      draw(0, true);
    }
    function draw(time, once) {
      drawingContext.clearRect(0, 0, width, height);
      var dark = root.getAttribute('data-theme') === 'dark';
      var color = dark ? '245,245,247' : '29,29,31';
      var radius = isTagline ? (width < 600 ? .95 : 1.15) : (width < 600 ? 1.45 : 1.75);
      for (var i = 0; i < dots.length; i++) {
        var p = dots[i], dx = p.x - pointer.x, dy = p.y - pointer.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (!humanizeReduced && pointer.active && dist < (isTagline ? 65 : 145)) {
          var range = isTagline ? 65 : 145;
          var f = (range - dist) / range;
          var push = f * (isTagline ? 2.8 : 3.8);
          p.vx += (dx / (dist || 1)) * push;
          p.vy += (dy / (dist || 1)) * push;
        }
        p.vx += (p.ox - p.x) * .055;
        p.vy += (p.oy - p.y) * .055;
        p.vx *= .79;
        p.vy *= .79;
        p.x += p.vx;
        p.y += p.vy;
        var shimmer = humanizeReduced ? 0 : Math.sin((p.ox + p.oy) * .018 + time * .0014) * .12;
        drawingContext.fillStyle = 'rgba(' + color + ',' + (.82 + shimmer) + ')';
        drawingContext.beginPath();
        drawingContext.arc(p.x, p.y, radius, 0, Math.PI * 2);
        drawingContext.fill();
      }
      if (!once && !humanizeReduced) frame = window.requestAnimationFrame(draw);
    }
    /** @param {PointerEvent} event */
    function move(event) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      if (humanizeReduced) draw(0, true);
    }
    function leave() {
      pointer.active = false;
      pointer.x = -10000;
      pointer.y = -10000;
      if (humanizeReduced) draw(0, true);
    }
    canvas.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'touch') move(event);
    }, { passive:true });
    canvas.addEventListener('pointermove', move, { passive:true });
    canvas.addEventListener('pointerup', leave, { passive:true });
    canvas.addEventListener('pointercancel', leave, { passive:true });
    canvas.addEventListener('pointerleave', leave, { passive:true });
    if (window.ResizeObserver) new ResizeObserver(function () {
      if (frame) window.cancelAnimationFrame(frame);
      build();
      if (!humanizeReduced) frame = window.requestAnimationFrame(draw);
    }).observe(canvas);
    else window.addEventListener('resize', build);
    build();
    if (!humanizeReduced) frame = window.requestAnimationFrame(draw);
    if (themeToggle) themeToggle.addEventListener('click', function () { draw(0, true); });
  });

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
