(function () {
  'use strict';
  if (window.__neoImpostorLegacyStableFix) return;
  window.__neoImpostorLegacyStableFix = true;

  var CARD_TITLE = 'VS IMPOSTOR: LEGACY';
  var VIEWER_TITLE = 'VS Impostor:Legacy';
  var DESCRIPTION = 'A from-the-ground-up remaster of the 2023 mod, VS IMPOSTOR V4! VS IMPOSTOR: LEGACY intends to be faithful to the original experience, while introducing new tweaks and features to make it the definitive version of the mod you know and love.';
  var CARD_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';
  var GAME_URL = 'https://redev325.github.io/impostorLegacyPublic/';
  var ICON_URL = '/vs-impostor-legacy-icon.svg';

  function leafText(el) {
    return el && !el.children.length ? String(el.textContent || '').trim() : '';
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  }

  function isExplore() {
    return /^\/Explore\/?$/i.test(location.pathname);
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
    var node = titleEl;
    for (var i = 0; i < 12 && node; i++, node = node.parentElement) {
      if (node.querySelector && node.querySelector('.aspect-video')) return node;
    }
    return titleEl && titleEl.parentElement;
  }

  function updateCard() {
    if (!isExplore()) return;
    var titleEl = findCardTitle();
    if (!titleEl) return;
    var card = findCard(titleEl);
    if (!card) return;

    titleEl.textContent = CARD_TITLE;
    titleEl.setAttribute('title', CARD_TITLE);

    var els = card.querySelectorAll('p,span,div');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el === titleEl || el.children.length) continue;
      if (leafText(el) === 'lorem ipsum dolor sit amet, consectetur adipiscing elit') {
        el.textContent = DESCRIPTION;
      }
    }

    var preview = card.querySelector('.aspect-video');
    if (!preview) return;
    var img = preview.querySelector('img.neo-impostor-legacy-thumbnail');
    if (!img) {
      img = document.createElement('img');
      img.className = 'neo-impostor-legacy-thumbnail';
      img.alt = CARD_TITLE;
      img.setAttribute('aria-hidden', 'true');
      preview.appendChild(img);
    }
    img.src = CARD_IMAGE;
    img.style.position = 'absolute';
    img.style.inset = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    img.style.zIndex = '2';
    preview.style.position = 'relative';
    var icons = preview.querySelectorAll('svg');
    for (var j = 0; j < icons.length; j++) icons[j].style.display = 'none';
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
      if (r.top >= -5 && r.top < 80 && r.left >= 20 && r.left < 400) return el;
      if (!fallback) fallback = el;
    }
    return fallback;
  }

  function findViewerHeader(titleEl) {
    var node = titleEl;
    for (var i = 0; i < 12 && node; i++, node = node.parentElement) {
      var r = node.getBoundingClientRect();
      if (r.top <= 5 && r.height >= 40 && r.height <= 75 && r.width >= window.innerWidth * 0.8) return node;
    }
    return titleEl.parentElement;
  }

  function findViewerStage(titleEl) {
    var header = findViewerHeader(titleEl);
    var node = header;
    var best = null;
    for (var i = 0; i < 10 && node; i++, node = node.parentElement) {
      var rr = node.getBoundingClientRect();
      if (rr.width < window.innerWidth * 0.85 || rr.height < window.innerHeight * 0.75) continue;
      var all = node.querySelectorAll('*');
      for (var j = 0; j < all.length; j++) {
        var el = all[j];
        if (el.id === 'neo-impostor-legacy-game') continue;
        var r = el.getBoundingClientRect();
        if (r.top < rr.top + 35) continue;
        if (r.width < rr.width * 0.72 || r.height < rr.height * 0.68) continue;
        if (r.bottom > rr.bottom + 5) continue;
        if (!best || r.width * r.height > best.getBoundingClientRect().width * best.getBoundingClientRect().height) best = el;
      }
      if (best) return best;
    }
    return null;
  }

  function styleHeader(titleEl) {
    var header = findViewerHeader(titleEl);
    if (!header) return;
    var hr = header.getBoundingClientRect();
    if (hr.width < window.innerWidth * 0.7) return;
    if (getComputedStyle(header).position === 'static') header.style.position = 'relative';

    var oldTitle = titleEl;
    var tr = oldTitle.getBoundingClientRect();
    oldTitle.style.visibility = 'hidden';

    var existing = header.querySelector('.neo-impostor-legacy-header-icon');
    if (!existing) {
      existing = document.createElement('img');
      existing.className = 'neo-impostor-legacy-header-icon';
      existing.src = ICON_URL;
      existing.alt = '';
      existing.draggable = false;
      existing.style.position = 'absolute';
      existing.style.objectFit = 'contain';
      existing.style.pointerEvents = 'none';
      existing.style.zIndex = '2147483646';
      header.appendChild(existing);
    }

    var title = header.querySelector('.neo-impostor-legacy-header-title');
    if (!title) {
      title = document.createElement('span');
      title.className = 'neo-impostor-legacy-header-title';
      title.textContent = VIEWER_TITLE;
      title.style.position = 'absolute';
      title.style.whiteSpace = 'nowrap';
      title.style.pointerEvents = 'none';
      title.style.zIndex = '2147483646';
      header.appendChild(title);
    }

    var cs = getComputedStyle(oldTitle);
    title.style.fontFamily = cs.fontFamily;
    title.style.fontSize = cs.fontSize;
    title.style.fontWeight = cs.fontWeight;
    title.style.fontStyle = cs.fontStyle;
    title.style.letterSpacing = cs.letterSpacing;
    title.style.lineHeight = cs.lineHeight;
    title.style.color = cs.color;
    title.style.textShadow = cs.textShadow;
    title.style.left = (tr.left - hr.left) + 'px';
    title.style.top = (tr.top - hr.top) + 'px';
    title.style.height = tr.height + 'px';

    var candidate = null;
    var media = header.querySelectorAll('img,svg');
    var best = Infinity;
    for (var i = 0; i < media.length; i++) {
      var m = media[i];
      if (m === existing || m.className === 'neo-impostor-legacy-header-icon') continue;
      if (m.closest && m.closest('.neo-impostor-legacy-header-icon')) continue;
      var mr = m.getBoundingClientRect();
      if (mr.width <= 0 || mr.height <= 0 || mr.width > 42 || mr.height > 42) continue;
      if (mr.right > tr.left + 4) continue;
      if (mr.bottom < hr.top || mr.top > tr.bottom + 14) continue;
      var score = Math.abs(mr.right - tr.left) + Math.abs(((mr.top + mr.bottom) / 2) - ((tr.top + tr.bottom) / 2));
      if (score < best) { best = score; candidate = m; }
    }

    var ir = candidate ? candidate.getBoundingClientRect() : { left: tr.left - 31, top: tr.top, width: 22, height: 22 };
    if (candidate) candidate.style.visibility = 'hidden';
    existing.style.left = (ir.left - hr.left) + 'px';
    existing.style.top = (ir.top - hr.top) + 'px';
    existing.style.width = Math.max(18, Math.min(26, ir.width)) + 'px';
    existing.style.height = Math.max(18, Math.min(26, ir.height)) + 'px';
  }

  function addSafeGameLauncher(stage) {
    if (!stage) return;
    var oldFrame = stage.querySelector('#neo-impostor-legacy-game');
    if (oldFrame) oldFrame.remove();

    var button = stage.querySelector('.neo-impostor-legacy-launch');
    if (button) return;

    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    stage.style.overflow = 'hidden';

    button = document.createElement('button');
    button.className = 'neo-impostor-legacy-launch';
    button.type = 'button';
    button.textContent = 'Play VS IMPOSTOR: LEGACY';
    button.style.position = 'absolute';
    button.style.left = '50%';
    button.style.top = '50%';
    button.style.transform = 'translate(-50%, -50%)';
    button.style.zIndex = '10';
    button.style.padding = '12px 20px';
    button.style.border = '1px solid rgba(255,255,255,.2)';
    button.style.borderRadius = '10px';
    button.style.background = '#202020';
    button.style.color = '#fff';
    button.style.fontWeight = '700';
    button.style.cursor = 'pointer';

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (stage.querySelector('#neo-impostor-legacy-game')) return;
      button.textContent = 'Loading VS IMPOSTOR: LEGACY...';
      button.disabled = true;

      var frame = document.createElement('iframe');
      frame.id = 'neo-impostor-legacy-game';
      frame.title = VIEWER_TITLE;
      frame.src = GAME_URL;
      frame.loading = 'lazy';
      frame.setAttribute('allow', 'fullscreen; autoplay; gamepad; pointer-lock; clipboard-read; clipboard-write; encrypted-media; accelerometer; gyroscope');
      frame.setAttribute('allowfullscreen', '');
      frame.style.position = 'absolute';
      frame.style.inset = '0';
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.border = '0';
      frame.style.margin = '0';
      frame.style.padding = '0';
      frame.style.display = 'block';
      frame.style.background = '#000';
      frame.style.zIndex = '2';
      stage.appendChild(frame);
      setTimeout(function () { if (button.isConnected) button.remove(); }, 1500);
    }, { once: true });

    stage.appendChild(button);
  }

  function updateViewer() {
    if (isExplore()) return;
    var titleEl = findViewerTitle();
    if (!titleEl) return;
    if (leafText(titleEl) === 'Placeholder 1') titleEl.textContent = VIEWER_TITLE;
    titleEl.setAttribute('title', VIEWER_TITLE);
    styleHeader(titleEl);
    var stage = findViewerStage(titleEl);
    if (stage) addSafeGameLauncher(stage);
  }

  function run() {
    try { updateCard(); } catch (_) {}
    try { updateViewer(); } catch (_) {}
  }

  function start() {
    run();
    var timer = 0;
    var observer = new MutationObserver(function () {
      if (timer) return;
      timer = setTimeout(function () { timer = 0; run(); }, 50);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    setInterval(run, 1000);
    [250, 750, 1500, 3000].forEach(function (ms) { setTimeout(run, ms); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
