(function () {
  'use strict';
  if (window.__neoSimpleExploreV3) return;
  window.__neoSimpleExploreV3 = true;

  var FIRST_TITLE = 'VS IMPOSTOR: LEGACY';
  var FIRST_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';

  function leaf(el) {
    return el && !el.children.length ? String(el.textContent || '').trim() : '';
  }

  function isExplore() {
    return /^\/Explore\/?$/i.test(location.pathname);
  }

  function findCardFromTitle(titleEl) {
    var node = titleEl;
    for (var i = 0; i < 12 && node; i++, node = node.parentElement) {
      if (node.querySelector && node.querySelector('.aspect-video')) return node;
    }
    return titleEl.parentElement;
  }

  function getTitle(card) {
    var els = card.querySelectorAll('p,h1,h2,h3,h4,span,div');
    for (var i = 0; i < els.length; i++) {
      var t = leaf(els[i]);
      if (/^Placeholder \d+$/.test(t) || t === FIRST_TITLE) return els[i];
    }
    return null;
  }

  function simplify(card, index) {
    var title = getTitle(card);
    var preview = card.querySelector('.aspect-video');
    if (!title || !preview) return;

    card.classList.add('neo-simple-card');
    card.style.overflow = 'hidden';
    card.style.height = 'auto';
    card.style.minHeight = '0';
    card.style.paddingBottom = '0';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';

    preview.style.position = 'relative';
    preview.style.width = '100%';
    preview.style.height = 'auto';
    preview.style.minHeight = '0';
    preview.style.aspectRatio = '16 / 9';
    preview.style.flex = '0 0 auto';

    if (index === 0) {
      title.textContent = FIRST_TITLE;
      var img = preview.querySelector('.neo-simple-card-image');
      if (!img) {
        img = document.createElement('img');
        img.className = 'neo-simple-card-image';
        preview.appendChild(img);
      }
      img.src = FIRST_IMAGE;
      img.alt = FIRST_TITLE;
      img.style.position = 'absolute';
      img.style.inset = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';
      img.style.zIndex = '1';
      var svgs = preview.querySelectorAll('svg');
      for (var s = 0; s < svgs.length; s++) svgs[s].style.display = 'none';
    }

    title.style.display = 'block';
    title.style.width = '100%';
    title.style.boxSizing = 'border-box';
    title.style.margin = '0';
    title.style.padding = '14px 14px 16px';
    title.style.fontWeight = '800';
    title.style.fontSize = '15px';
    title.style.lineHeight = '1.2';

    // Remove everything that made the old cards busy: description, views, eye icon row, Featured badge.
    var descendants = card.querySelectorAll('*');
    for (var j = 0; j < descendants.length; j++) {
      var el = descendants[j];
      if (el === title || (el.contains && el.contains(title))) continue;
      var t = leaf(el);
      if (t === 'lorem ipsum dolor sit amet, consectetur adipiscing elit' ||
          t === 'Featured' || /^(\d+)\s*Views?$/i.test(t)) {
        el.style.display = 'none';
      }
    }

    // Keep the existing heart/favorite button exactly as Neo provides it.
    var buttons = card.querySelectorAll('button');
    for (var b = 0; b < buttons.length; b++) {
      var br = buttons[b].getBoundingClientRect();
      if (br.width > 0 && br.height > 0 && br.width <= 60 && br.height <= 60) {
        buttons[b].style.zIndex = '10';
      }
    }
  }

  function run() {
    if (!isExplore()) return;
    var titleNodes = document.querySelectorAll('p,h1,h2,h3,h4,span,div');
    var cards = [];
    for (var i = 0; i < titleNodes.length; i++) {
      var t = leaf(titleNodes[i]);
      if (!/^Placeholder \d+$/.test(t) && t !== FIRST_TITLE) continue;
      var card = findCardFromTitle(titleNodes[i]);
      if (card && cards.indexOf(card) === -1) cards.push(card);
    }
    for (var c = 0; c < cards.length; c++) simplify(cards[c], c);
  }

  function start() {
    run();
    var queued = false;
    function schedule() {
      if (queued) return;
      queued = true;
      setTimeout(function () { queued = false; run(); }, 60);
    }
    try {
      new MutationObserver(schedule).observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true
      });
    } catch (_) {}
    setInterval(run, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
