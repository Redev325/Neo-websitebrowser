(function () {
  'use strict';
  if (window.__neoSimpleGameUIV3) return;
  window.__neoSimpleGameUIV3 = true;

  var FIRST_TITLE = 'VS IMPOSTOR: LEGACY';
  var VIEWER_TITLE = 'VS Impostor:Legacy';
  var FIRST_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';

  function leaf(el) { return el && !el.children.length ? String(el.textContent || '').trim() : ''; }
  function isExplorePage() { return /^\/Explore\/?$/i.test(location.pathname); }
  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  }

  function cardFromTitle(title) {
    var node = title;
    for (var i = 0; i < 12 && node; i++, node = node.parentElement) {
      if (node.querySelector && node.querySelector('.aspect-video')) return node;
    }
    return title.parentElement;
  }

  function findCards() {
    var nodes = document.querySelectorAll('p,h1,h2,h3,h4,span,div'), cards = [];
    for (var i = 0; i < nodes.length; i++) {
      var t = leaf(nodes[i]);
      if (!/^Placeholder \d+$/.test(t) && t !== FIRST_TITLE) continue;
      var card = cardFromTitle(nodes[i]);
      if (card && cards.indexOf(card) === -1) cards.push(card);
    }
    return cards;
  }

  function getCardTitle(card, index) {
    var nodes = card.querySelectorAll('p,h1,h2,h3,h4,span,div');
    for (var i = 0; i < nodes.length; i++) {
      var t = leaf(nodes[i]);
      if (index === 0 && (t === 'Placeholder 1' || t === FIRST_TITLE)) return nodes[i];
      if (index !== 0 && /^Placeholder \d+$/.test(t)) return nodes[i];
    }
    return null;
  }

  function simplifyCard(card, index) {
    var title = getCardTitle(card, index), preview = card.querySelector('.aspect-video');
    if (!title || !preview) return;
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
      var image = preview.querySelector('.neo-simple-game-image');
      if (!image) { image = document.createElement('img'); image.className = 'neo-simple-game-image'; preview.appendChild(image); }
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
    title.style.position = 'relative';
    title.style.zIndex = '2';

    // Remove old text metadata, but never touch buttons so the favorite remains.
    var descendants = card.querySelectorAll('*');
    for (var d = 0; d < descendants.length; d++) {
      var el = descendants[d];
      if (el.tagName === 'BUTTON') continue;
      if (el === title || (el.contains && el.contains(title))) continue;
      var value = leaf(el);
      if (value === 'lorem ipsum dolor sit amet, consectetur adipiscing elit' || value === 'Featured' || /^(\d+)\s*Views?$/i.test(value)) el.style.display = 'none';
    }

    var buttons = card.querySelectorAll('button');
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].style.display = '';
      buttons[b].style.visibility = 'visible';
      buttons[b].style.opacity = '1';
      buttons[b].style.pointerEvents = 'auto';
      buttons[b].style.zIndex = '20';
    }
  }

  function simplifyExplore() {
    if (!isExplorePage()) return;
    var cards = findCards();
    for (var i = 0; i < cards.length; i++) simplifyCard(cards[i], i);
  }

  // The viewer is a modal over /Explore, so DO NOT require a different URL.
  function findViewerTitle() {
    var nodes = document.querySelectorAll('p,h1,h2,h3,h4,span,div,button');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], t = leaf(el);
      if (t !== 'Placeholder 1' && t !== FIRST_TITLE && t !== VIEWER_TITLE) continue;
      if (!visible(el)) continue;
      var r = el.getBoundingClientRect();
      if (r.top >= -5 && r.top < 60 && r.left >= 20 && r.left < 500) return el;
    }
    return null;
  }

  function simplifyViewer() {
    var title = findViewerTitle();
    if (!title) return;

    title.textContent = VIEWER_TITLE;
    title.setAttribute('title', VIEWER_TITLE);
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'visible';
    title.style.textOverflow = 'clip';
    title.style.maxWidth = 'none';

    // Viewer example: keep the existing top bar, fullscreen button, and X.
    // Remove the extra trophy/report buttons by keeping only the two rightmost viewer buttons.
    var buttons = document.querySelectorAll('button'), topButtons = [];
    for (var i = 0; i < buttons.length; i++) {
      var br = buttons[i].getBoundingClientRect();
      if (br.top < 52 && br.right > window.innerWidth * 0.72 && br.width >= 20 && br.height >= 20 && br.width <= 60 && br.height <= 60) topButtons.push(buttons[i]);
    }
    topButtons.sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
    if (topButtons.length >= 3) {
      for (var j = 0; j < topButtons.length - 2; j++) topButtons[j].style.display = 'none';
    }

    // Do not add a custom viewer, logo, launcher, or anything to the gray game area.
  }

  function run() { try { simplifyExplore(); } catch (_) {} try { simplifyViewer(); } catch (_) {} }

  function start() {
    run();
    var queued = false;
    function schedule() {
      if (queued) return;
      queued = true;
      setTimeout(function () { queued = false; run(); }, 35);
    }
    try { new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true, characterData:true }); } catch (_) {}
    setInterval(run, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
