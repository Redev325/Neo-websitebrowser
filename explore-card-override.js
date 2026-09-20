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
  var SELECTED_GAME_KEY = 'neo-selected-game';

  function leaf(el) { return el && !el.children.length ? String(el.textContent || '').trim() : ''; }
  function exactText(el) { return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
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
    // Keep the full-screen game viewer out of the card scanner.
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
    for (var j = 0; j < cards.length; j++) {
      cards[j].setAttribute('data-neo-explore-card', String(j + 1));
    }
    return cards;
  }
  function getCardTitle(card, index) {
    var wanted = index === 0 ? FIRST_TITLE : index === 1 ? SECOND_TITLE : null;
    var nodes = card.querySelectorAll('p,h1,h2,h3,h4,span,div');
    for (var i = 0; i < nodes.length; i++) {
      var t = leaf(nodes[i]);
      if (index === 0 && (t === 'Placeholder 1' || t === FIRST_TITLE)) return nodes[i];
      if (index === 1 && (t === 'Placeholder 2' || t === SECOND_TITLE)) return nodes[i];
      if (index >= 2 && /^Placeholder \d+$/.test(t)) return nodes[i];
      if (wanted && t === wanted) return nodes[i];
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
  function setSelectedGame(value) {
    try {
      if (value) sessionStorage.setItem(SELECTED_GAME_KEY, value);
      else sessionStorage.removeItem(SELECTED_GAME_KEY);
    } catch (_) {}
    window.__neoSelectedGame = value || '';
    window.__neoSonicViewer = value === 'sonic';
    if (!value && window.__neoViewerHeaderObserver) {
      try { window.__neoViewerHeaderObserver.disconnect(); } catch (_) {}
      window.__neoViewerHeaderObserver = null;
      window.__neoObservedViewerHeader = null;
    }
  }
  function getSelectedGame() {
    if (window.__neoSelectedGame === 'sonic' || window.__neoSelectedGame === 'impostor') return window.__neoSelectedGame;
    try {
      var value = sessionStorage.getItem(SELECTED_GAME_KEY);
      if (value === 'sonic' || value === 'impostor') {
        window.__neoSelectedGame = value;
        window.__neoSonicViewer = value === 'sonic';
        return value;
      }
    } catch (_) {}
    return '';
  }
  function simplifyExplore() {
    if (!isExplorePage()) {
      window.__neoLastExplorePath = location.pathname;
      return;
    }
    if (window.__neoLastExplorePath !== location.pathname || !window.__neoExploreStateInitialized) {
      window.__neoLastExplorePath = location.pathname;
      window.__neoExploreStateInitialized = true;
      setSelectedGame('');
    }
    // Once a game viewer is active, leave the React card tree alone.
    // The viewer can remain mounted under the clicked card while it is open.
    if (getSelectedGame()) return;
    var cards = findCards();
    for (var i = 0; i < cards.length; i++) {
      simplifyCard(cards[i], i);
      if (i === 0 && !cards[i].__neoImpostorClickBound) {
        cards[i].__neoImpostorClickBound = true;
        cards[i].addEventListener('click', function () {
          setSelectedGame('impostor');
          scheduleViewerActivation();
        }, true);
      }
      if (i === 1 && !cards[i].__neoSonicClickBound) {
        cards[i].__neoSonicClickBound = true;
        cards[i].addEventListener('click', function () {
          setSelectedGame('sonic');
          scheduleViewerActivation();
        }, true);
      }
    }
  }
  function isInsideExploreCard(el) {
    var node = el;
    var er = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    for (var i = 0; i < 12 && node; i++, node = node.parentElement) {
      if (!node.getAttribute || !node.getAttribute('data-neo-explore-card')) continue;
      var cr = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
      if (!cr || !er) return true;
      // A play-view can remain mounted inside the card's React tree.
      // Only reject the element when it is visually contained by the small card itself.
      var contained = er.left >= cr.left - 4 && er.right <= cr.right + 4 &&
                      er.top >= cr.top - 4 && er.bottom <= cr.bottom + 4;
      return contained;
    }
    return false;
  }
  function findViewerTitle() {
    var selectedGame = getSelectedGame();
    var nodes = document.querySelectorAll('p,h1,h2,h3,h4,span,div,button');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], t = exactText(el);
      if (t !== 'Placeholder 1' && t !== 'Placeholder 2' && t !== FIRST_TITLE && t !== VIEWER_TITLE && t !== SECOND_TITLE) continue;
      if (!visible(el)) continue;
      // Before a game is selected, never touch text inside an Explore card.
      if (!selectedGame && isInsideExploreCard(el)) continue;
      var r = el.getBoundingClientRect();
      if (r.top < -5 || r.top >= 70 || r.left < 0 || r.left >= 700) continue;
      // When a game is active, require this exact text node to belong to
      // the real full-width play-view header. This prevents the original
      // card title from being selected.
      if (selectedGame && !findViewerHeader(el)) continue;
      return el;
    }
    return null;
  }
  function findViewerHeader(title) {
    if (!title) return null;
    var node = title;
    for (var i = 0; i < 12 && node; i++, node = node.parentElement) {
      var r = node.getBoundingClientRect();
      if (r.top >= -2 && r.top <= 2 && r.width >= window.innerWidth * 0.90 &&
          r.height >= 40 && r.height <= 64) {
        var buttons = node.querySelectorAll ? node.querySelectorAll('button') : [];
        if (buttons.length >= 1) return node;
      }
      // The actual viewer shell is fixed full-screen; its first child is
      // the 48px header. This is the reliable fallback.
      var s = getComputedStyle(node);
      if (s.position === 'fixed' && r.width >= window.innerWidth * 0.90 &&
          r.height >= window.innerHeight * 0.80) {
        var first = node.firstElementChild;
        if (first) {
          var fr = first.getBoundingClientRect();
          var fb = first.querySelectorAll ? first.querySelectorAll('button') : [];
          if (fr.height >= 40 && fr.height <= 64 && fb.length >= 1) return first;
        }
      }
    }
    return null;
  }
  function findViewerContainer(title, header) {
    if (!title || !header) return null;
    var node = header.parentElement;
    for (var i = 0; i < 10 && node; i++, node = node.parentElement) {
      var r = node.getBoundingClientRect();
      if (r.width >= window.innerWidth * 0.90 && r.height >= window.innerHeight * 0.80 &&
          r.top <= 10) return node;
    }
    return header.parentElement || null;
  }
  function removeStrayGameIframe() {
    if (!isExplorePage() || getSelectedGame()) return;
    var frames = document.querySelectorAll('#neo-impostor-legacy-game');
    for (var i = 0; i < frames.length; i++) frames[i].remove();
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
    var selectedGame = getSelectedGame();
    if (selectedGame !== 'impostor' && selectedGame !== 'sonic') return;
    var header = findViewerHeader(title);
    if (!header) return;

    // The built app already has a left-side title row. Replace its generic
    // icon with the selected game's real logo instead of absolutely
    // positioning a second logo over the bar.
    var titleRow = title.parentElement;
    if (!titleRow) return;
    titleRow.style.display = 'flex';
    titleRow.style.alignItems = 'center';
    titleRow.style.gap = '10px';
    titleRow.style.minWidth = '0';

    var icon = titleRow.querySelector('#neo-game-header-logo');
    if (!icon) {
      icon = document.createElement('img');
      icon.id = 'neo-game-header-logo';
      icon.alt = '';
      icon.draggable = false;
      titleRow.insertBefore(icon, titleRow.firstChild);
    }
    icon.src = selectedGame === 'sonic' ? SONIC_ICON_URL : ICON_URL;
    icon.alt = selectedGame === 'sonic' ? SONIC_VIEWER_TITLE : VIEWER_TITLE;
    icon.style.display = 'block';
    icon.style.width = '30px';
    icon.style.height = '30px';
    icon.style.flex = '0 0 30px';
    icon.style.objectFit = 'contain';
    icon.style.position = 'relative';
    icon.style.visibility = 'visible';
    icon.style.pointerEvents = 'none';
    icon.style.background = 'transparent';
    icon.style.border = '0';

    title.style.position = 'relative';
    title.style.left = 'auto';
    title.style.top = 'auto';
    title.style.transform = 'none';
    title.style.margin = '0';
    title.style.padding = '0';
    title.style.width = 'auto';
    title.style.minWidth = '0';
    title.style.maxWidth = 'calc(100vw - 220px)';
    title.style.zIndex = '2';
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';
    title.textContent = selectedGame === 'sonic' ? SONIC_VIEWER_TITLE : VIEWER_TITLE;
  }

  function embedGame(container, header) {
    if (!container || !header) return;
    if (getSelectedGame() === 'sonic') return;
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
  function scheduleViewerActivation() {
    if (window.__neoViewerActivationTimer) {
      clearTimeout(window.__neoViewerActivationTimer);
      window.__neoViewerActivationTimer = null;
    }
    var attempts = 0;
    function retry() {
      attempts++;
      try { simplifyViewer(); } catch (_) {}
      if (attempts < 24 && (getSelectedGame() === 'impostor' || getSelectedGame() === 'sonic')) {
        window.__neoViewerActivationTimer = setTimeout(retry, 50);
      } else {
        window.__neoViewerActivationTimer = null;
      }
    }
    retry();
  }
  function installViewerHeaderObserver(header) {
    if (!header) return;
    if (window.__neoViewerHeaderObserver && window.__neoObservedViewerHeader === header) return;
    if (window.__neoViewerHeaderObserver) {
      try { window.__neoViewerHeaderObserver.disconnect(); } catch (_) {}
    }
    try {
      var observer = new MutationObserver(function () {
        var selected = getSelectedGame();
        if (selected !== 'impostor' && selected !== 'sonic') return;
        try { simplifyViewer(); } catch (_) {}
      });
      observer.observe(header, { childList:true, subtree:true, characterData:true });
      window.__neoViewerHeaderObserver = observer;
      window.__neoObservedViewerHeader = header;
    } catch (_) {}
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
    var selectedGame = getSelectedGame();
    var sonicViewer = selectedGame === 'sonic';
    if (!selectedGame) {
      var currentTitleText = leaf(title);
      if (currentTitleText === 'Placeholder 1' || currentTitleText === FIRST_TITLE || currentTitleText === VIEWER_TITLE) {
        selectedGame = 'impostor';
        setSelectedGame('impostor');
      } else if (currentTitleText === SECOND_TITLE) {
        selectedGame = 'sonic';
        setSelectedGame('sonic');
        sonicViewer = true;
      }
    }
    if (selectedGame !== 'impostor' && selectedGame !== 'sonic') return;
    sonicViewer = selectedGame === 'sonic';
    title.setAttribute('data-neo-game-viewer-title', selectedGame);
    title.textContent = sonicViewer ? SONIC_VIEWER_TITLE : VIEWER_TITLE;
    title.setAttribute('title', sonicViewer ? SONIC_VIEWER_TITLE : VIEWER_TITLE);
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'visible';
    title.style.textOverflow = 'clip';
    title.style.maxWidth = 'none';
    var viewerContainer = findViewerContainer(title, header);

    // The original viewer creates four controls in this row. The last one
    // is the wired Close/X action. Keep it and add exactly one real
    // Fullscreen control immediately before it.
    var headerButtons = Array.prototype.slice.call(header.querySelectorAll('button'));
    if (headerButtons.length) {
      var closeButton = headerButtons[headerButtons.length - 1];
      for (var hb = 0; hb < headerButtons.length - 1; hb++) {
        headerButtons[hb].style.display = 'none';
        headerButtons[hb].style.visibility = 'hidden';
        headerButtons[hb].style.pointerEvents = 'none';
      }
      closeButton.style.display = 'flex';
      closeButton.style.visibility = 'visible';
      closeButton.style.pointerEvents = 'auto';
      closeButton.style.opacity = '1';
      closeButton.style.width = '28px';
      closeButton.style.height = '28px';
      closeButton.style.margin = '0';
      closeButton.setAttribute('aria-label', 'Exit');
      closeButton.title = 'Exit';

      var row = closeButton.parentElement;
      if (row) {
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '4px';

        var fs = row.querySelector('#neo-game-fullscreen');
        if (!fs) {
          fs = document.createElement('button');
          fs.id = 'neo-game-fullscreen';
          fs.type = 'button';
          fs.setAttribute('aria-label', 'Fullscreen');
          fs.title = 'Fullscreen';
          fs.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          fs.style.width = '28px';
          fs.style.height = '28px';
          fs.style.padding = '0';
          fs.style.margin = '0';
          fs.style.display = 'flex';
          fs.style.alignItems = 'center';
          fs.style.justifyContent = 'center';
          fs.style.border = '0';
          fs.style.background = 'transparent';
          fs.style.color = 'inherit';
          fs.style.borderRadius = '4px';
          fs.style.cursor = 'pointer';
          row.insertBefore(fs, closeButton);
        }
        fs.style.display = 'flex';
        fs.style.visibility = 'visible';
        fs.style.pointerEvents = 'auto';
        if (!fs.__neoBound) {
          fs.__neoBound = true;
          fs.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var shell = header.parentElement;
            var target = shell || viewerContainer || header;
            if (document.fullscreenElement) {
              try { document.exitFullscreen(); } catch (_) {}
              return;
            }
            var req = target.requestFullscreen || target.webkitRequestFullscreen;
            if (req) {
              try { req.call(target); } catch (_) {}
            }
          });
        }
      }
    }

    header.setAttribute('data-neo-game-viewer-header', selectedGame);
    addViewerLogo(title);
    installViewerHeaderObserver(header);
    embedGame(viewerContainer, header);
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
      requestAnimationFrame(function () {
        queued = false;
        run();
      });
    }
    try {
      new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].type === 'childList' && mutations[i].addedNodes && mutations[i].addedNodes.length) {
            schedule();
            break;
          }
        }
      }).observe(document.documentElement, { childList:true, subtree:true });
    } catch (_) {}
    var originalPushState = history.pushState;
    history.pushState = function () {
      var result = originalPushState.apply(this, arguments);
      schedule();
      return result;
    };
    var originalReplaceState = history.replaceState;
    history.replaceState = function () {
      var result = originalReplaceState.apply(this, arguments);
      schedule();
      return result;
    };
    window.addEventListener('popstate', schedule);
    window.addEventListener('hashchange', schedule);
    window.addEventListener('resize', schedule, { passive:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
