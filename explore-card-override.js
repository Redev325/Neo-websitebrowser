(function () {
  'use strict';
  if (window.__neoSimpleGameUIV1) return;
  window.__neoSimpleGameUIV1 = true;

  var FIRST_TITLE = 'VS IMPOSTOR: LEGACY';
  var FIRST_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';

  function leaf(el) {
    return el && !el.children.length ? String(el.textContent || '').trim() : '';
  }

  function onExplore() {
    return /^\/Explore\/?$/i.test(location.pathname);
  }

  function cardFromTitle(title) {
    var node = title;
    for (var i = 0; i < 12 && node; i++, node = node.parentElement) {
      if (node.querySelector && node.querySelector('.aspect-video')) return node;
    }
    return title.parentElement;
  }

  function simplifyExplore() {
    if (!onExplore()) return;
    var nodes = document.querySelectorAll('p,h1,h2,h3,h4,span,div');
    var cards = [];

    for (var i = 0; i < nodes.length; i++) {
      var t = leaf(nodes[i]);
      if (!/^Placeholder \d+$/.test(t) && t !== FIRST_TITLE) continue;
      var card = cardFromTitle(nodes[i]);
      if (card && cards.indexOf(card) === -1) cards.push(card);
    }

    for (var c = 0; c < cards.length; c++) {
      var card = cards[c];
      var titles = card.querySelectorAll('p,h1,h2,h3,h4,span,div');
      var title = null;
      for (var j = 0; j < titles.length; j++) {
        var tt = leaf(titles[j]);
        if ((c === 0 && (tt === 'Placeholder 1' || tt === FIRST_TITLE)) || (c > 0 && /^Placeholder \d+$/.test(tt))) {
          title = titles[j];
          break;
        }
      }
      var preview = card.querySelector('.aspect-video');
      if (!title || !preview) continue;

      card.style.overflow = 'hidden';
      card.style.height = 'auto';
      card.style.minHeight = '0';
      card.style.paddingBottom = '0';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';

      preview.style.position = 'relative';
      preview.style.width = '100%';
      preview.style.aspectRatio = '16 / 9';
      preview.style.height = 'auto';
      preview.style.minHeight = '0';

      if (c === 0) {
        title.textContent = FIRST_TITLE;
        var image = preview.querySelector('.neo-simple-game-image');
        if (!image) {
          image = document.createElement('img');
          image.className = 'neo-simple-game-image';
          preview.appendChild(image);
        }
        image.src = FIRST_IMAGE;
        image.alt = FIRST_TITLE;
        image.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:1;';
        var svgs = preview.querySelectorAll('svg');
        for (var s = 0; s < svgs.length; s++) svgs[s].style.display = 'none';
      }

      title.style.display = 'block';
      title.style.width = '100%';
      title.style.boxSizing = 'border-box';
      title.style.margin = '0';
      title.style.padding = '14px';
      title.style.fontWeight = '800';
      title.style.fontSize = '15px';
      title.style.lineHeight = '1.2';

      var descendants = card.querySelectorAll('*');
      for (var d = 0; d < descendants.length; d++) {
        var el = descendants[d];
        if (el === title || (el.contains && el.contains(title))) continue;
        var value = leaf(el);
        if (value === 'lorem ipsum dolor sit amet, consectetur adipiscing elit' || value === 'Featured' || /^(\d+)\s*Views?$/i.test(value)) {
          el.style.display = 'none';
        }
      }
    }
  }

  function findViewerHeader() {
    var nodes = document.querySelectorAll('p,h1,h2,h3,h4,span,div,button');
    for (var i = 0; i < nodes.length; i++) {
      var text = leaf(nodes[i]);
      if (!text || text === 'All' || text === 'Favorites') continue;
      var r = nodes[i].getBoundingClientRect();
      if (r.top >= -5 && r.top < 70 && r.left < 420 && r.width > 0 && r.height > 0) return nodes[i];
    }
    return null;
  }

  function simplifyViewer() {
    if (onExplore()) return;
    var title = findViewerHeader();
    if (!title) return;

    // The first card keeps the requested name in the viewer.
    if (leaf(title) === 'Placeholder 1') title.textContent = FIRST_TITLE;

    // Let the title use as much room as it needs instead of clipping it.
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'visible';
    title.style.textOverflow = 'clip';
    title.style.maxWidth = 'none';

    // Simplified bar: keep only the fullscreen and close controls.
    var buttons = document.querySelectorAll('button');
    var topButtons = [];
    for (var b = 0; b < buttons.length; b++) {
      var br = buttons[b].getBoundingClientRect();
      if (br.top < 55 && br.right > window.innerWidth * 0.75 && br.width > 0 && br.height > 0) topButtons.push(buttons[b]);
    }
    topButtons.sort(function (a, z) { return a.getBoundingClientRect().left - z.getBoundingClientRect().left; });
    if (topButtons.length >= 4) {
      for (var h = 0; h < topButtons.length - 2; h++) topButtons[h].style.display = 'none';
    }

    // Remove any leftovers from the older viewer experiments.
    ['neo-impostor-legacy-logo','neo-impostor-legacy-corner-icon','neo-impostor-legacy-game'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    var launchers = document.querySelectorAll('.neo-impostor-legacy-launch');
    for (var q = 0; q < launchers.length; q++) launchers[q].remove();
  }

  function run() {
    try { simplifyExplore(); } catch (_) {}
    try { simplifyViewer(); } catch (_) {}
  }

  function start() {
    run();
    var queued = false;
    function schedule() {
      if (queued) return;
      queued = true;
      setTimeout(function () { queued = false; run(); }, 50);
    }
    try {
      new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    } catch (_) {}
    setInterval(run, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
