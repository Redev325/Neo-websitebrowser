(function () {
  'use strict';
  if (window.__neoSimpleGameUIV5) return;
  window.__neoSimpleGameUIV5 = true;

  var FIRST_TITLE = 'VS IMPOSTOR: LEGACY';
  var SECOND_TITLE = 'Vs Sonic.exe(2.0-4.0)';
  var SECOND_IMAGE = 'https://raw.githubusercontent.com/Redev325/Neo-websitebrowser/main/assets/vs-sonic-exe-2-0-4-0.jpg';
  var VIEWER_TITLE = 'VS Impostor:Legacy';
  var SONIC_VIEWER_TITLE = 'Vs Sonic.exe(2.0-4.0)';
  var SONIC_ICON_URL = 'https://raw.githubusercontent.com/Redev325/Neo-websitebrowser/main/assets/Vs.sonic.exe.png';
  var FIRST_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';
  var ICON_URL = 'https://plain-enam-prod-public.komododecks.com/202609/17/Ap8nvejCSQjcy3kMXAbE/image.png';
  var GAME_URL = 'https://redev325.github.io/impostorLegacyPublic/';

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
  function isLikelyExploreCard(card) {
    if (!card) return false;
    var r = card.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    // Never treat the full-screen game/play viewer as an Explore card.
    if (r.width >= window.innerWidth * 0.80 || r.height >= window.innerHeight * 0.65) return false;
    return true;
  }
  function findCards() {
    var nodes = document.querySelectorAll('p,h1,h2,h3,h4,span,div'), cards = [];
    for (var i = 0; i < nodes.length; i++) {
      var t = leaf(nodes[i]);
      if (t !== FIRST_TITLE && t !== SECOND_TITLE && !/^Placeholder \d+$/.test(t)) continue;
      var card = cardFromTitle(nodes[i]);
      if (card && isLikelyExploreCard(card) && cards.indexOf(card) === -1) cards.push(card);
    }
    cards.sort(function (a, b) {
      var ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
      if (Math.abs(ar.top - br.top) > 8) return ar.top - br.top;
      return ar.left - br.left;
    });
    return cards;
  }
  function getCardTitle(card, index) {
    var nodes = card.querySelectorAll('p,h1,h2,h3,h4,span,div');
    for (var i = 0; i < nodes.length; i++) {
      var t = leaf(nodes[i]);
      if (index === 0 && (t === 'Placeholder 1' || t === FIRST_TITLE)) return nodes[i];
      if (index === 1 && (t === 'Placeholder 2' || t === SECOND_TITLE)) return nodes[i];
      if (index >= 2 && /^Placeholder \d+$/.test(t)) return nodes[i];
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
    if (index === 1) {
      card.setAttribute('data-neo-sonic-exe-card', 'true');
      title.textContent = SECOND_TITLE;
      var image2 = preview.querySelector('.neo-sonic-exe-card-image');
      if (!image2) { image2 = document.createElement('img'); image2.className = 'neo-sonic-exe-card-image'; preview.appendChild(image2); }
      image2.src = SECOND_IMAGE;
      image2.alt = SECOND_TITLE;
      image2.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;z-index:1;background:#000;';
      var svgs2 = preview.querySelectorAll('svg');
      for (var s2 = 0; s2 < svgs2.length; s2++) svgs2[s2].style.display = 'none';
    }
    if (index >= 2) {
      preview.style.background = '#000';
      preview.style.backgroundColor = '#000';
      var genericImages = preview.querySelectorAll('img');
      for (var gi = 0; gi < genericImages.length; gi++) genericImages[gi].style.display = 'none';
      var genericSvgs = preview.querySelectorAll('svg');
      for (var gs = 0; gs < genericSvgs.length; gs++) genericSvgs[gs].style.display = 'none';
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
    if (!isExplorePage()) {
      window.__neoLastExplorePath = location.pathname;
      return;
    }
    if (window.__neoLastExplorePath !== location.pathname || !window.__neoExploreStateInitialized) {
      window.__neoLastExplorePath = location.pathname;
      window.__neoExploreStateInitialized = true;
      try { sessionStorage.removeItem('neo-sonic-viewer'); } catch (_) {}
      window.__neoSonicViewer = false;
    }
    var cards = findCards();
    for (var i = 0; i < cards.length; i++) {
      simplifyCard(cards[i], i);
      if (i === 1 && !cards[i].__neoSonicClickBound) {
        cards[i].__neoSonicClickBound = true;
        cards[i].addEventListener('click', function () {
          window.__neoSonicViewer = true;
          try { sessionStorage.setItem('neo-sonic-viewer', '1'); } catch (_) {}
        }, true);
      }
    }
  }
  function isInsideExploreCard(el) {
    var node = el;
    for (var i = 0; i < 12 && node; i++, node = node.parentElement) {
      if (node.getAttribute && node.getAttribute('data-neo-sonic-exe-card') === 'true') return true;
      if (node.querySelector && node.querySelector('.aspect-video')) return true;
    }
    return false;
  }
  function findViewerTitle() {
    var nodes = document.querySelectorAll('p,h1,h2,h3,h4,span,div,button');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], t = leaf(el);
      if (t !== 'Placeholder 1' && t !== FIRST_TITLE && t !== VIEWER_TITLE && t !== SECOND_TITLE) continue;
      if (!visible(el) || isInsideExploreCard(el)) continue;
      var header = findViewerHeader(el);
      if (!header) continue;
      var r = el.getBoundingClientRect(), hr = header.getBoundingClientRect();
      if (r.top >= -5 && r.top < 60 && r.left >= 20 && r.left < 500 &&
          hr.top <= 5 && hr.height >= 40 && hr.height <= 70 &&
          hr.width >= window.innerWidth * 0.85) return el;
    }
    return null;
  }
  function findViewerHeader(title) {
    if (!title) return null;
    var node = title;
    for (var i = 0; i < 10 && node; i++, node = node.parentElement) {
      var r = node.getBoundingClientRect();
      if (r.top <= 5 && r.height >= 40 && r.height <= 70 && r.width >= window.innerWidth * 0.85) return node;
    }
    return null;
  }
  function findViewerContainer(title, header) {
    if (!title || !header) return null;
    var node = header;
    for (var i = 0; i < 12 && node; i++, node = node.parentElement) {
      var r = node.getBoundingClientRect();
      if (r.width >= window.innerWidth * 0.85 && r.height >= window.innerHeight * 0.7 && r.top <= 15) return node;
    }
    return null;
  }
  function removeStrayGameIframe() {
    if (!isExplorePage()) return;
    var frames = document.querySelectorAll('#neo-impostor-legacy-game');
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      var title = findViewerTitle();
      var container = title ? findViewerContainer(title, findViewerHeader(title)) : null;
      if (!container || !container.contains(frame)) frame.remove();
    }
  }
  function clearVisualWrapper(el) {
    if (!el) return;
    el.style.background = 'transparent';
    el.style.backgroundColor = 'transparent';
    el.style.border = '0';
    el.style.borderRadius = '0';
    el.style.boxShadow = 'none';
    el.style.outline = '0';
    el.style.padding = '0';
  }
  function addViewerLogo(title) {
    var header = findViewerHeader(title);
    if (!header) return;
    clearVisualWrapper(header);
    header.style.position = 'relative';
    header.style.overflow = 'hidden';

    var hr = header.getBoundingClientRect();
    var tr = title.getBoundingClientRect();
    if (hr.width < window.innerWidth * 0.7) return;

    var oldIcon = null;
    var media = header.querySelectorAll('img,svg');
    for (var i = 0; i < media.length; i++) {
      var m = media[i];
      if (m.id === 'neo-impostor-legacy-header-logo' || m.id === 'neo-game-header-logo') continue;
      var mr = m.getBoundingClientRect();
      if (mr.width >= 10 && mr.width <= 45 && mr.height >= 10 && mr.height <= 45 && mr.left < tr.left + 2 && mr.right > hr.left && mr.top >= hr.top - 3 && mr.top < hr.top + 45) {
        oldIcon = m;
        break;
      }
    }
    if (oldIcon) {
      oldIcon.style.visibility = 'hidden';
      clearVisualWrapper(oldIcon.parentElement);
      if (oldIcon.parentElement && oldIcon.parentElement.parentElement) clearVisualWrapper(oldIcon.parentElement.parentElement);
    }

    var icon = header.querySelector('#neo-game-header-logo');
    if (!icon) {
      icon = document.createElement('img');
      icon.id = 'neo-game-header-logo';
      icon.alt = '';
      icon.draggable = false;
      icon.style.position = 'absolute';
      icon.style.pointerEvents = 'none';
      icon.style.zIndex = '2147483646';
      icon.style.display = 'block';
      icon.style.boxSizing = 'border-box';
      icon.style.objectFit = 'contain';
      icon.style.objectPosition = 'center';
      icon.style.background = 'transparent';
      icon.style.border = '0';
      icon.style.borderRadius = '0';
      icon.style.boxShadow = 'none';
      icon.style.outline = '0';
      icon.style.mixBlendMode = 'normal';
      icon.style.filter = 'none';
      icon.style.transform = 'none';
      icon.style.transformOrigin = 'center center';
      header.appendChild(icon);
    }

    var sonicViewer = !!window.__neoSonicViewer;
    try { sonicViewer = sonicViewer || sessionStorage.getItem('neo-sonic-viewer') === '1'; } catch (_) {}
    icon.src = sonicViewer ? SONIC_ICON_URL : ICON_URL;
    icon.alt = sonicViewer ? SONIC_VIEWER_TITLE : VIEWER_TITLE;
    icon.style.visibility = 'visible';

    var headerHeight = Math.max(40, Math.min(70, hr.height));
    var size = Math.min(44, Math.max(34, headerHeight - 6));
    var left = oldIcon ? oldIcon.getBoundingClientRect().left - hr.left : Math.max(8, tr.left - hr.left - size - 8);
    left = Math.max(6, Math.min(left, hr.width - size - 6));
    var top = Math.max(3, (hr.height - size) / 2);
    var textLeft = left + size + 10;

    icon.style.left = left + 'px';
    icon.style.top = top + 'px';
    icon.style.width = size + 'px';
    icon.style.height = size + 'px';

    title.style.position = 'absolute';
    title.style.left = textLeft + 'px';
    title.style.top = '50%';
    title.style.transform = 'translateY(-50%)';
    title.style.margin = '0';
    title.style.padding = '0';
    title.style.width = 'auto';
    title.style.maxWidth = 'calc(100% - ' + textLeft + 'px - 140px)';
    title.style.zIndex = '20';
  }
  function embedGame(container, header) {
    if (!container || !header) return;
    var sonicViewer = !!window.__neoSonicViewer;
    try { sonicViewer = sonicViewer || sessionStorage.getItem('neo-sonic-viewer') === '1'; } catch (_) {}
    if (sonicViewer) return;
    var iframe = container.querySelector('#neo-impostor-legacy-game');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'neo-impostor-legacy-game';
      iframe.src = GAME_URL;
      iframe.title = 'VS Impostor: Legacy';
      iframe.allow = 'autoplay; fullscreen; gamepad; keyboard-map';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('playsinline', '');
      iframe.setAttribute('scrolling', 'no');
      iframe.style.position = 'absolute';
      iframe.style.border = '0';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.background = '#333';
      iframe.style.zIndex = '5';
      container.appendChild(iframe);
    }
    var cr = container.getBoundingClientRect();
    var hr = header.getBoundingClientRect();
    var top = Math.max(48, hr.bottom - cr.top);
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    iframe.style.left = '0';
    iframe.style.top = top + 'px';
    iframe.style.width = '100%';
    iframe.style.height = Math.max(120, cr.height - top) + 'px';
    var buttons = header.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].style.position = 'relative';
      buttons[i].style.zIndex = '20';
    }
  }
  function simplifyViewer() {
    var title = findViewerTitle();
    if (!title) {
      removeStrayGameIframe();
      return;
    }
    var header = findViewerHeader(title);
    if (!header) {
      removeStrayGameIframe();
      return;
    }
    var sonicViewer = !!window.__neoSonicViewer;
    try { sonicViewer = sonicViewer || sessionStorage.getItem('neo-sonic-viewer') === '1'; } catch (_) {}
    title.textContent = sonicViewer ? SONIC_VIEWER_TITLE : VIEWER_TITLE;
    title.setAttribute('title', sonicViewer ? SONIC_VIEWER_TITLE : VIEWER_TITLE);
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'visible';
    title.style.textOverflow = 'clip';
    title.style.maxWidth = 'none';
    var buttons = document.querySelectorAll('button'), topButtons = [];
    for (var i = 0; i < buttons.length; i++) {
      var br = buttons[i].getBoundingClientRect();
      if (br.top < 52 && br.right > window.innerWidth * 0.72 && br.width >= 20 && br.height >= 20 && br.width <= 60 && br.height <= 60) topButtons.push(buttons[i]);
    }
    topButtons.sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
    if (topButtons.length >= 3) {
      for (var j = 0; j < topButtons.length - 2; j++) topButtons[j].style.display = 'none';
    }
    addViewerLogo(title);
    embedGame(findViewerContainer(title, header), header);
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
