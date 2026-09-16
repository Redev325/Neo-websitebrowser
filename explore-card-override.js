(function () {
  'use strict';
  if (window.__neoImpostorLegacyOverride) return;
  window.__neoImpostorLegacyOverride = true;

  var CARD_TITLE = 'VS IMPOSTOR: LEGACY';
  var DESCRIPTION = 'A from-the-ground-up remaster of the 2023 mod, VS IMPOSTOR V4! VS IMPOSTOR: LEGACY intends to be faithful to the original experience, while introducing new tweaks and features to make it the definitive version of the mod you know and love.';
  var CARD_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';

  function isExplore() {
    return /^\/Explore\/?$/i.test(location.pathname);
  }

  function findTitleElement() {
    var els = document.querySelectorAll('p,h1,h2,h3,h4,span,div');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.children.length) continue;
      var text = (el.textContent || '').trim();
      if (text === 'Placeholder 1' || text === CARD_TITLE) return el;
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

    var titleEl = findTitleElement();
    if (!titleEl) return;
    var card = findCard(titleEl);
    if (!card) return;

    if ((titleEl.textContent || '').trim() !== CARD_TITLE) {
      titleEl.textContent = CARD_TITLE;
    }
    titleEl.setAttribute('title', CARD_TITLE);

    var ps = card.querySelectorAll('p,span,div');
    for (var i = 0; i < ps.length; i++) {
      var el = ps[i];
      if (el === titleEl || el.children.length) continue;
      if ((el.textContent || '').trim() === 'lorem ipsum dolor sit amet, consectetur adipiscing elit') {
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
      for (var j = 0; j < oldIcon.length; j++) {
        oldIcon[j].style.display = 'none';
      }
    }
  }

  function run() {
    try { updateCard(); } catch (_) {}
  }

  function start() {
    run();
    var observer = new MutationObserver(function () { run(); });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    setInterval(run, 300);
    setTimeout(run, 1000);
    setTimeout(run, 2500);
    setTimeout(run, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();