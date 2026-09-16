(function () {
  'use strict';
  if (window.__neoImpostorSimpleFixV2) return;
  window.__neoImpostorSimpleFixV2 = true;

  var CARD_TITLE = 'VS IMPOSTOR: LEGACY';
  var VIEWER_TITLE = 'VS impostor:Legacy';
  var DESCRIPTION = 'A from-the-ground-up remaster of the 2023 mod, VS IMPOSTOR V4! VS IMPOSTOR: LEGACY intends to be faithful to the original experience, while introducing new tweaks and features to make it the definitive version of the mod you know and love.';
  var CARD_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';
  var ICON_URL = '/vs-impostor-legacy-icon.svg';

  function textOf(el) {
    return el && el.children.length === 0 ? String(el.textContent || '').trim() : '';
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  }

  function explore() {
    return /^\/Explore\/?$/i.test(location.pathname);
  }

  function fixCard() {
    if (!explore()) return;
    var els = document.querySelectorAll('p,h1,h2,h3,h4,span,div');
    var title = null;
    for (var i = 0; i < els.length; i++) {
      var t = textOf(els[i]);
      if (t === 'Placeholder 1' || t === CARD_TITLE) { title = els[i]; break; }
    }
    if (!title) return;

    var card = title;
    for (var j = 0; j < 12 && card; j++, card = card.parentElement) {
      if (card.querySelector && card.querySelector('.aspect-video')) break;
    }
    if (!card || !card.querySelector) card = title.parentElement;
    if (!card) return;

    title.textContent = CARD_TITLE;

    var parts = card.querySelectorAll('p,span,div');
    for (var k = 0; k < parts.length; k++) {
      if (!parts[k].children.length && textOf(parts[k]) === 'lorem ipsum dolor sit amet, consectetur adipiscing elit') {
        parts[k].textContent = DESCRIPTION;
      }
    }

    var preview = card.querySelector('.aspect-video');
    if (!preview) return;
    preview.style.position = 'relative';
    var img = preview.querySelector('.neo-impostor-legacy-thumbnail');
    if (!img) {
      img = document.createElement('img');
      img.className = 'neo-impostor-legacy-thumbnail';
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
  }

  function findViewerPlaceholder() {
    var els = document.querySelectorAll('p,h1,h2,h3,h4,span,div,button');
    for (var i = 0; i < els.length; i++) {
      if (textOf(els[i]) !== 'Placeholder 1') continue;
      if (!visible(els[i])) continue;
      var r = els[i].getBoundingClientRect();
      if (r.top >= -5 && r.top < 80 && r.left < 400) return els[i];
    }
    return null;
  }

  function fixViewer() {
    if (explore()) return;
    var placeholder = findViewerPlaceholder();
    if (!placeholder) return;

    // Only change the existing title in the existing Neo viewer.
    placeholder.textContent = VIEWER_TITLE;
    placeholder.setAttribute('title', VIEWER_TITLE);

    // Exact same simple placement every time: logo + title in the existing top bar.
    var icon = document.getElementById('neo-impostor-legacy-logo');
    if (!icon) {
      icon = document.createElement('img');
      icon.id = 'neo-impostor-legacy-logo';
      icon.src = ICON_URL;
      icon.alt = '';
      icon.draggable = false;
      icon.style.cssText = 'position:fixed;left:15px;top:8px;width:27px;height:27px;object-fit:contain;pointer-events:none;z-index:2147483646;';
      document.body.appendChild(icon);
    }

    // Hide only the original small controller icon immediately beside the title.
    var media = document.querySelectorAll('img,svg');
    var titleRect = placeholder.getBoundingClientRect();
    for (var j = 0; j < media.length; j++) {
      var m = media[j];
      if (m === icon) continue;
      var mr = m.getBoundingClientRect();
      if (mr.top >= 0 && mr.top < 44 && mr.left >= 0 && mr.left < titleRect.left && mr.width <= 45 && mr.height <= 45) {
        m.style.visibility = 'hidden';
      }
    }
  }

  function removeViewerLogoWhenClosed() {
    if (explore()) return;
    if (findViewerPlaceholder()) return;
    var icon = document.getElementById('neo-impostor-legacy-logo');
    if (icon) icon.remove();
  }

  function run() {
    try { fixCard(); } catch (_) {}
    try { fixViewer(); } catch (_) {}
    try { removeViewerLogoWhenClosed(); } catch (_) {}
  }

  function start() {
    run();
    var queued = false;
    function schedule() {
      if (queued) return;
      queued = true;
      setTimeout(function () { queued = false; run(); }, 20);
    }
    try {
      new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    } catch (_) {}
    setInterval(run, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
