(function () {
  'use strict';
  if (window.__neoImpostorLegacyEmbed) return;
  window.__neoImpostorLegacyEmbed = true;

  var GAME_URL = 'https://redev325.github.io/impostorLegacyPublic/';
  var TARGET_TITLE = 'VS Impostor:Legacy';
  var iframe = null;

  function isTargetViewer() {
    var nodes = document.querySelectorAll('p, span, div, h1, h2, h3');
    for (var i = 0; i < nodes.length; i++) {
      var text = (nodes[i].textContent || '').trim();
      if (text === TARGET_TITLE) return nodes[i];
    }
    return null;
  }

  function looksLikeCursor(el) {
    var id = String(el.id || '').toLowerCase();
    var cls = String(el.className || '').toLowerCase();
    return id.indexOf('cursor') !== -1 || cls.indexOf('cursor') !== -1 ||
      cls.indexOf('particle') !== -1 || cls.indexOf('trail') !== -1 ||
      id.indexOf('custom-cursor') !== -1;
  }

  function findStage(titleNode) {
    var titleRect = titleNode.getBoundingClientRect();
    var cx = Math.floor(window.innerWidth / 2);
    var cy = Math.floor(window.innerHeight / 2);
    var stack = document.elementsFromPoint ? document.elementsFromPoint(cx, cy) : [];
    var best = null;
    var bestArea = 0;

    for (var i = 0; i < stack.length; i++) {
      var el = stack[i];
      if (!el || el === document.documentElement || el === document.body || looksLikeCursor(el)) continue;
      if (el.tagName !== 'DIV' && el.tagName !== 'SECTION' && el.tagName !== 'MAIN') continue;
      if (el.querySelector && el.querySelector('#neo-impostor-legacy-game')) continue;

      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.width < window.innerWidth * 0.55 || r.height < window.innerHeight * 0.55) continue;
      if (r.top < titleRect.bottom - 8) continue;

      var area = r.width * r.height;
      if (area > bestArea) {
        best = el;
        bestArea = area;
      }
    }

    return best;
  }

  function ensureGame() {
    var titleNode = isTargetViewer();
    if (!titleNode) {
      iframe = null;
      return;
    }

    if (iframe && iframe.isConnected) {
      if (iframe.getAttribute('src') !== GAME_URL) iframe.src = GAME_URL;
      return;
    }

    var stage = findStage(titleNode);
    if (!stage) return;

    try {
      var computed = getComputedStyle(stage);
      if (computed.position === 'static') stage.style.position = 'relative';
    } catch (_) {}

    iframe = document.createElement('iframe');
    iframe.id = 'neo-impostor-legacy-game';
    iframe.title = 'VS Impostor: Legacy';
    iframe.src = GAME_URL;
    iframe.setAttribute('allow', 'fullscreen; autoplay; gamepad; pointer-lock; clipboard-read; clipboard-write; encrypted-media; accelerometer; gyroscope');
    iframe.setAttribute('allowfullscreen', '');
    iframe.style.position = 'absolute';
    iframe.style.inset = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.margin = '0';
    iframe.style.padding = '0';
    iframe.style.display = 'block';
    iframe.style.background = 'transparent';
    iframe.style.zIndex = '1';

    stage.appendChild(iframe);
  }

  function run() {
    try { ensureGame(); } catch (_) {}
  }

  run();
  setTimeout(run, 250);
  setTimeout(run, 750);
  setTimeout(run, 1500);
  setTimeout(run, 3000);
  setInterval(run, 1000);
  try {
    new MutationObserver(function () { run(); }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  } catch (_) {}
})();
