(function () {
  'use strict';
  if (window.__neoImpostorLegacyOverrideV2) return;
  window.__neoImpostorLegacyOverrideV2 = true;

  var CARD_TITLE = 'VS IMPOSTOR: LEGACY';
  var VIEWER_TITLE = 'VS Impostor:Legacy';
  var DESCRIPTION = 'A from-the-ground-up remaster of the 2023 mod, VS IMPOSTOR V4! VS IMPOSTOR: LEGACY intends to be faithful to the original experience, while introducing new tweaks and features to make it the definitive version of the mod you know and love.';
  var CARD_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';
  var GAME_URL = 'https://redev325.github.io/impostorLegacyPublic/';

  function isExplore() {
    return /^\/Explore\/?$/i.test(location.pathname);
  }

  function leafText(el) {
    return el && !el.children.length ? (el.textContent || '').trim() : '';
  }

  function findCardTitle() {
    var els = document.querySelectorAll('p,h1,h2,h3,h4,span,div');
    for (var i = 0; i < els.length; i++) {
      var text = leafText(els[i]);
      if (text === 'Placeholder 1' || text === CARD_TITLE) return els[i];
    }
    return null;
  }

  function findCard(titleEl) {
    if (!titleEl) return null;
    var node = titleEl;
    for (var i = 0; i < 12 && node; i++, node = node.parentElement) {
      try {
        if (node.querySelector && node.querySelector('.aspect-video')) return node;
      } catch (_) {}
    }
    return titleEl.parentElement;
  }

  function updateCard() {
    if (!isExplore()) return;
    var titleEl = findCardTitle();
    if (!titleEl) return;
    var card = findCard(titleEl);
    if (!card) return;

    if (leafText(titleEl) !== CARD_TITLE) titleEl.textContent = CARD_TITLE;
    titleEl.setAttribute('title', CARD_TITLE);

    var ps = card.querySelectorAll('p,span,div');
    for (var i = 0; i < ps.length; i++) {
      var el = ps[i];
      if (el === titleEl || el.children.length) continue;
      if (leafText(el) === 'lorem ipsum dolor sit amet, consectetur adipiscing elit') {
        el.textContent = DESCRIPTION;
      }
    }

    var preview = card.querySelector('.aspect-video');
    if (preview) {
      var img = preview.querySelector('img.neo-impostor-legacy-thumbnail');
      if (!img) {
        img = document.createElement('img');
        img.className = 'neo-impostor-legacy-thumbnail';
        img.alt = CARD_TITLE;
        img.setAttribute('aria-hidden', 'true');
        preview.appendChild(img);
      }
      img.src = CARD_IMAGE;
      img.alt = CARD_TITLE;
      img.style.position = 'absolute';
      img.style.inset = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';
      img.style.zIndex = '2';
      preview.style.position = 'relative';
      var oldIcon = preview.querySelectorAll('svg');
      for (var j = 0; j < oldIcon.length; j++) oldIcon[j].style.display = 'none';
    }
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom >= 0 && r.right >= 0 && r.top <= window.innerHeight && r.left <= window.innerWidth;
  }

  function findViewerTitle() {
    var els = document.querySelectorAll('p,h1,h2,h3,h4,span,div,button');
    var fallback = null;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var text = leafText(el);
      if (text !== 'Placeholder 1' && text !== VIEWER_TITLE) continue;
      if (!visible(el)) continue;
      var r = el.getBoundingClientRect();
      if (r.top < 90 && r.left < 360) return el;
      fallback = fallback || el;
    }
    return fallback;
  }

  function findViewerRoot(titleEl) {
    if (!titleEl) return null;
    var node = titleEl.parentElement;
    var best = null;
    for (var i = 0; i < 14 && node; i++, node = node.parentElement) {
      var r = node.getBoundingClientRect();
      var style = getComputedStyle(node);
      var coversScreen = r.width >= window.innerWidth * 0.82 && r.height >= window.innerHeight * 0.70;
      var overlayish = style.position === 'fixed' || style.position === 'absolute';
      if (coversScreen && (overlayish || i >= 2)) best = node;
      if (r.width >= window.innerWidth * 0.96 && r.height >= window.innerHeight * 0.90) return node;
    }
    return best;
  }

  function findViewerStage(root) {
    if (!root) return null;
    var rootRect = root.getBoundingClientRect();
    var all = root.querySelectorAll('*');
    var best = null;
    var bestArea = 0;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.id === 'neo-impostor-legacy-frame') continue;
      var r = el.getBoundingClientRect();
      if (r.width < rootRect.width * 0.72 || r.height < rootRect.height * 0.68) continue;
      if (r.top < rootRect.top + 28) continue;
      if (r.bottom > rootRect.bottom + 5) continue;
      var area = r.width * r.height;
      if (area > bestArea) {
        best = el;
        bestArea = area;
      }
    }
    if (best) return best;

    var direct = root.children;
    for (var j = 0; j < direct.length; j++) {
      var d = direct[j].getBoundingClientRect();
      if (d.top >= rootRect.top + 30 && d.width >= rootRect.width * 0.72 && d.height >= rootRect.height * 0.68) return direct[j];
    }
    return null;
  }

  function ensureGameFrame(stage) {
    if (!stage) return;
    var frame = stage.querySelector('#neo-impostor-legacy-frame');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'neo-impostor-legacy-frame';
      frame.title = VIEWER_TITLE;
      frame.src = GAME_URL;
      frame.setAttribute('allow', 'fullscreen; autoplay; gamepad; pointer-lock; clipboard-read; clipboard-write; encrypted-media; accelerometer; gyroscope');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.style.position = 'absolute';
      frame.style.inset = '0';
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.border = '0';
      frame.style.margin = '0';
      frame.style.padding = '0';
      frame.style.display = 'block';
      frame.style.background = '#000';
      frame.style.zIndex = '1';
      stage.appendChild(frame);
    } else if (frame.src !== GAME_URL) {
      frame.src = GAME_URL;
    }
    var stageStyle = getComputedStyle(stage);
    if (stageStyle.position === 'static') stage.style.position = 'relative';
    stage.style.overflow = 'hidden';
  }

  function updateViewer() {
    if (isExplore()) return;
    var titleEl = findViewerTitle();
    if (!titleEl) return;
    if (leafText(titleEl) === 'Placeholder 1') titleEl.textContent = VIEWER_TITLE;
    titleEl.setAttribute('title', VIEWER_TITLE);

    var root = findViewerRoot(titleEl);
    if (!root) return;
    var stage = findViewerStage(root);
    if (stage) ensureGameFrame(stage);
  }

  function run() {
    try { updateCard(); } catch (_) {}
    try { updateViewer(); } catch (_) {}
  }

  function start() {
    run();
    var observer = new MutationObserver(function () { run(); });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    setInterval(run, 250);
    setTimeout(run, 300);
    setTimeout(run, 800);
    setTimeout(run, 1500);
    setTimeout(run, 3000);
    setTimeout(run, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();