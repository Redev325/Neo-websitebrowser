(function () {
  'use strict';
  if (window.__neoSimpleGameUIV5) return;
  window.__neoSimpleGameUIV5 = true;

  var FIRST_TITLE = 'VS IMPOSTOR: LEGACY';
  var SECOND_TITLE = 'Vs Sonic.exe(2.0-4.0)';
  var THIRD_TITLE = 'Vs Accelerant Hank';
  var FOURTH_TITLE = 'Vs Impostor';
  var SECOND_IMAGE = 'https://raw.githubusercontent.com/Redev325/Neo-websitebrowser/main/assets/vs-sonic-exe-2-0-4-0.jpg';
  var VIEWER_TITLE = 'VS Impostor:Legacy';
  var SONIC_VIEWER_TITLE = 'Vs Sonic.exe(2.0-4.0)';
  var SONIC_ICON_URL = 'https://raw.githubusercontent.com/Redev325/Neo-websitebrowser/main/assets/Vs.sonic.exe.png';
  var HANK_ICON_URL = '/VsAccHank.png';
  var HANK_THUMBNAIL_URL = '/assets/vs-accelerant-hank-original.png?v=1';
  var FIRST_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';
  var ICON_URL = 'https://plain-enam-prod-public.komododecks.com/202609/17/Ap8nvejCSQjcy3kMXAbE/image.png';
  var GAME_URL = 'https://redev325.github.io/impostorLegacyPublic/';
  var HANK_GAME_URL = 'https://accelerant.nxtdev.xyz/';
  var SONIC_OLD_BUILD_URL = 'https://sonicrestored30.devs.surf/';
  var SONIC_RESTORED_BUILD_URL = 'https://sonicexerealrestored.devs.surf/';
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
      if (t !== FIRST_TITLE && t !== SECOND_TITLE && t !== THIRD_TITLE && t !== FOURTH_TITLE && !/^Placeholder \d+$/.test(t)) continue;
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
      if (index === 2 && (t === 'Placeholder 3' || t === THIRD_TITLE)) return nodes[i];
      if (index === 3 && t === FOURTH_TITLE) return nodes[i];
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
    if (index === 3) {
      // Card 004 is intentionally a blank thumbnail. Remove inherited
      // placeholder artwork/content from the original React card.
      title.textContent = FOURTH_TITLE;
      preview.style.background = '#1a1a1a';
      preview.style.backgroundColor = '#1a1a1a';
      preview.style.backgroundImage = 'none';
      preview.style.boxShadow = 'none';
      var inheritedChildren = Array.prototype.slice.call(preview.children);
      for (var ic = 0; ic < inheritedChildren.length; ic++) {
        inheritedChildren[ic].style.display = 'none';
        inheritedChildren[ic].style.visibility = 'hidden';
      }
    }
    if (index === 2) {
      title.textContent = THIRD_TITLE;
      var hankImage = preview.querySelector('.neo-hank-card-image');
      if (!hankImage) {
        hankImage = document.createElement('img');
        hankImage.className = 'neo-hank-card-image';
        preview.appendChild(hankImage);
      }
      hankImage.src = HANK_THUMBNAIL_URL;
      hankImage.alt = THIRD_TITLE;
      hankImage.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:1;';
      preview.style.background = '#000';
      preview.style.backgroundColor = '#000';
      var genericImages = preview.querySelectorAll('img');
      for (var gi = 0; gi < genericImages.length; gi++) {
        if (genericImages[gi] !== hankImage) genericImages[gi].style.display = 'none';
      }
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
    if (window.__neoSelectedGame === 'sonic' || window.__neoSelectedGame === 'impostor' || window.__neoSelectedGame === 'hank') return window.__neoSelectedGame;
    try {
      var value = sessionStorage.getItem(SELECTED_GAME_KEY);
      if (value === 'sonic' || value === 'impostor' || value === 'hank') {
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
      if (i === 2 && !cards[i].__neoHankClickBound) {
        cards[i].__neoHankClickBound = true;
        cards[i].addEventListener('click', function () {
          setSelectedGame('hank');
          scheduleViewerActivation();
        }, true);
      }
    }
  }
  function findViewerRoot() {
    var nodes = document.querySelectorAll('div');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], cls = el.classList;
      if (!cls || !cls.contains('fixed') || !cls.contains('inset-0') ||
          !cls.contains('flex') || !cls.contains('flex-col')) continue;
      var r = el.getBoundingClientRect();
      if (r.width < window.innerWidth * 0.9 || r.height < window.innerHeight * 0.8) continue;
      if (el.children.length < 2) continue;
      var header = el.children[0], hr = header.getBoundingClientRect();
      if (hr.height < 40 || hr.height > 64 || hr.width < window.innerWidth * 0.9) continue;
      if (!header.querySelectorAll('button').length) continue;
      return el;
    }
    return null;
  }

  function getViewerParts(root) {
    if (!root || root.children.length < 2) return null;
    var header = root.children[0];
    var stage = root.children[1];
    var left = header.children[0] || null;
    var right = header.children[1] || null;
    var title = null;
    if (left) {
      // Preserve the existing header structure. Find the title wherever the
      // current app rendered it (span/div/heading) instead of assuming span.
      var titleNodes = left.querySelectorAll('span,p,h1,h2,h3,h4,div');
      for (var i = 0; i < titleNodes.length; i++) {
        var candidate = titleNodes[i];
        var t = exactText(candidate);
        if (t === 'Placeholder 1' || t === 'Placeholder 2' || t === 'Placeholder 3' ||
            t === FOURTH_TITLE || /^Placeholder \d{3}$/.test(t) ||
            t === FIRST_TITLE || t === SECOND_TITLE || t === THIRD_TITLE ||
            t === VIEWER_TITLE || t === SONIC_VIEWER_TITLE) {
          title = candidate;
          break;
        }
      }
    }
    return {header:header, stage:stage, left:left, right:right, title:title};
  }

  function updateViewerLogo(parts, selectedGame) {
    if (!parts || !parts.left || !parts.title) return;
    var left = parts.left;
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '10px';
    left.style.minWidth = '0';

    var logo = left.querySelector('#neo-game-header-logo');
    if (!logo) {
      logo = document.createElement('img');
      logo.id = 'neo-game-header-logo';
      logo.alt = '';
      logo.draggable = false;
      left.insertBefore(logo, parts.title);
    }
    logo.src = selectedGame === 'sonic' ? SONIC_ICON_URL : selectedGame === 'hank' ? HANK_ICON_URL : ICON_URL;
    logo.alt = selectedGame === 'sonic' ? SONIC_VIEWER_TITLE : selectedGame === 'hank' ? THIRD_TITLE : VIEWER_TITLE;
    logo.style.display = 'block';
    logo.style.visibility = 'visible';
    logo.style.width = '30px';
    logo.style.height = '30px';
    logo.style.flex = '0 0 30px';
    logo.style.objectFit = 'contain';
    logo.style.position = 'relative';
    logo.style.pointerEvents = 'none';
    logo.style.background = 'transparent';
    logo.style.border = '0';

    // Hide the app's generic icon, leaving only the real game logo.
    var children = left.children;
    for (var ci = 0; ci < children.length; ci++) {
      var child = children[ci];
      if (child !== logo && child !== parts.title && child.tagName === 'DIV') {
        child.style.display = 'none';
      }
    }

    parts.title.textContent = selectedGame === 'sonic' ? SONIC_VIEWER_TITLE : selectedGame === 'hank' ? THIRD_TITLE : VIEWER_TITLE;
    parts.title.title = parts.title.textContent;
    parts.title.style.display = 'block';
    parts.title.style.minWidth = '0';
    parts.title.style.maxWidth = 'calc(100vw - 220px)';
    parts.title.style.whiteSpace = 'nowrap';
    parts.title.style.overflow = 'hidden';
    parts.title.style.textOverflow = 'ellipsis';
    parts.title.style.position = 'relative';
    parts.title.style.left = 'auto';
    parts.title.style.top = 'auto';
    parts.title.style.transform = 'none';
    parts.title.style.margin = '0';
    parts.title.style.padding = '0';
  }

  function updateViewerControls(parts, root) {
    if (!parts || !parts.header) return;

    var header = parts.header;
    var selectedGame = getSelectedGame();

    header.style.position = 'relative';
    header.style.overflow = 'hidden';
    header.style.pointerEvents = 'auto';

    var controls = header.querySelector('#neo-game-header-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'neo-game-header-controls';
      controls.style.position = 'absolute';
      controls.style.right = '10px';
      controls.style.top = '50%';
      controls.style.transform = 'translateY(-50%)';
      controls.style.display = 'flex';
      controls.style.alignItems = 'center';
      controls.style.gap = '8px';
      controls.style.zIndex = '2147483647';
      controls.style.height = '44px';
      controls.style.padding = '0';
      controls.style.minWidth = '94px';
      controls.style.pointerEvents = 'auto';
      header.appendChild(controls);
    }

    function makeButton(id, type, titleText) {
      var button = controls.querySelector('#' + id);
      if (!button) {
        button = document.createElement('button');
        button.id = id;
        button.className = 'neo-viewer-custom-control';
        button.type = 'button';
        controls.appendChild(button);
      }

      if (type === 'close') {
        button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
      } else {
        button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }

      button.setAttribute('aria-label', titleText);
      button.title = titleText;
      // Keep the icon visually compact, but give it a much easier
      // 44px hit target so clicks do not require pixel precision.
      button.style.width = '48px';
      button.style.height = '48px';
      button.style.minWidth = '48px';
      button.style.minHeight = '48px';
      button.style.padding = '0';
      button.style.margin = '0';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      button.style.cursor = 'pointer';
      button.style.pointerEvents = 'auto';
      button.style.visibility = 'visible';
      button.style.touchAction = 'manipulation';
      button.style.userSelect = 'none';
      button.style.opacity = '1';
      button.style.color = 'inherit';
      button.style.background = 'transparent';
      button.style.border = '0';
      button.style.borderRadius = '6px';
      button.style.position = 'relative';
      button.style.zIndex = '2147483647';
      return button;
    }

    var fullscreenButton = makeButton('neo-game-fullscreen', 'fullscreen', 'Fullscreen');
    var closeButton = makeButton('neo-game-close', 'close', 'Exit');

    // Some viewer layers can sit above the custom controls even though the
    // controls have a high z-index. Add a document-level pointer hit test so
    // the two controls remain easy to activate from anywhere inside their
    // enlarged hit rectangles.
    if (!document.__neoViewerControlPointerCapture) {
      document.__neoViewerControlPointerCapture = true;
      document.addEventListener('pointerdown', function (event) {
        var fs = document.getElementById('neo-game-fullscreen');
        var close = document.getElementById('neo-game-close');
        if (!fs && !close) return;

        function inExpandedRect(el) {
          if (!el || !el.isConnected) return false;
          var r = el.getBoundingClientRect();
          var padX = 10, padY = 10;
          return event.clientX >= r.left - padX &&
                 event.clientX <= r.right + padX &&
                 event.clientY >= r.top - padY &&
                 event.clientY <= r.bottom + padY;
        }

        var hit = inExpandedRect(fs) ? fs : inExpandedRect(close) ? close : null;
        if (!hit) return;

        // Ignore the event if it already originated from the actual custom
        // button; its normal handler will process it.
        if (event.target === hit || (event.target && hit.contains(event.target))) return;

        event.preventDefault();
        event.stopPropagation();
        try { hit.click(); } catch (_) {}
      }, true);
    }

    if (!fullscreenButton.__neoBound) {
      fullscreenButton.__neoBound = true;
      fullscreenButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        var activeFullscreen =
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement;

        if (activeFullscreen) {
          try {
            var exit = document.exitFullscreen ||
              document.webkitExitFullscreen ||
              document.mozCancelFullScreen ||
              document.msExitFullscreen;
            if (exit) {
              var exitResult = exit.call(document);
              if (exitResult && typeof exitResult.catch === 'function') {
                exitResult.catch(function () {});
              }
            }
          } catch (_) {}
          return;
        }

        // Prefer the actual game iframe, then the viewer stage, then the
        // complete viewer root. The first successful request wins.
        var targets = [];
        if (parts.stage) {
          var gameFrame =
            parts.stage.querySelector('#neo-sonic-old-build') ||
            parts.stage.querySelector('#neo-sonic-restored-build') ||
            parts.stage.querySelector('#neo-impostor-legacy-game') ||
            parts.stage.querySelector('#neo-accelerant-hank-game');
          if (gameFrame) targets.push(gameFrame);
          targets.push(parts.stage);
        }
        if (root) targets.push(root);
        if (header.parentElement) targets.push(header.parentElement);
        if (document.documentElement) targets.push(document.documentElement);

        for (var ti = 0; ti < targets.length; ti++) {
          var target = targets[ti];
          if (!target) continue;
          var request =
            target.requestFullscreen ||
            target.webkitRequestFullscreen ||
            target.mozRequestFullScreen ||
            target.msRequestFullscreen;
          if (!request) continue;
          try {
            var result = request.call(target);
            if (result && typeof result.catch === 'function') {
              result.catch(function () {});
            }
            // A request was made; don't keep calling other fullscreen targets.
            break;
          } catch (_) {}
        }
      });
    }

    if (!closeButton.__neoBound) {
      closeButton.__neoBound = true;
      closeButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        var activeFullscreen =
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement;

        if (activeFullscreen) {
          try {
            var exit = document.exitFullscreen ||
              document.webkitExitFullscreen ||
              document.mozCancelFullScreen ||
              document.msExitFullscreen;
            if (exit) {
              var exitResult = exit.call(document);
              if (exitResult && typeof exitResult.catch === 'function') {
                exitResult.catch(function () {});
              }
            }
          } catch (_) {}
        }

        // Resolve the CURRENT native close button on every click because the
        // React viewer can replace its header/button tree between renders.
        var liveClose = null;
        try {
          var candidates = Array.prototype.slice.call(
            header.querySelectorAll('button:not(.neo-viewer-custom-control)')
          );
          for (var li = candidates.length - 1; li >= 0; li--) {
            var candidate = candidates[li];
            var label = ((candidate.getAttribute('aria-label') || '') + ' ' + (candidate.title || '')).toLowerCase();
            if (label.indexOf('close') !== -1 || label.indexOf('exit') !== -1) {
              liveClose = candidate;
              break;
            }
          }
          if (!liveClose && candidates.length) liveClose = candidates[candidates.length - 1];
        } catch (_) {}

        if (getSelectedGame()) setSelectedGame('');

        // Always invoke the real viewer close handler too. This closes the
        // React modal state for both special and generic game viewers.
        try {
          if (liveClose && liveClose !== closeButton) {
            liveClose.click();
          } else if (header.__neoNativeClose &&
                     header.__neoNativeClose.isConnected &&
                     header.__neoNativeClose !== closeButton) {
            header.__neoNativeClose.click();
          }
        } catch (_) {}
      });
    }

    // Preserve the actual native close handler for generic viewers.
    // This lets the current X close placeholder/non-special viewers too.
    if (!header.__neoNativeClose) {
      var nativeCandidates = Array.prototype.slice.call(header.querySelectorAll('button:not(.neo-viewer-custom-control)'));
      for (var nc = nativeCandidates.length - 1; nc >= 0; nc--) {
        var candidate = nativeCandidates[nc];
        var label = ((candidate.getAttribute('aria-label') || '') + ' ' + (candidate.title || '')).toLowerCase();
        if (label.indexOf('close') !== -1 || label.indexOf('exit') !== -1) {
          header.__neoNativeClose = candidate;
          break;
        }
      }
      if (!header.__neoNativeClose && nativeCandidates.length) {
        header.__neoNativeClose = nativeCandidates[nativeCandidates.length - 1];
      }
    }

    // The old native viewer bar controls are hidden so there is exactly one
    // visible X and one visible Fullscreen button.
    var nativeButtons = header.querySelectorAll('button:not(.neo-viewer-custom-control)');
    for (var i = 0; i < nativeButtons.length; i++) {
      nativeButtons[i].style.display = 'none';
      nativeButtons[i].style.visibility = 'hidden';
      nativeButtons[i].style.pointerEvents = 'none';
    }
  }

  function embedSonicOldBuild(stage) {
    if (!stage || getSelectedGame() !== 'sonic') return;
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    stage.style.overflow = 'hidden';

    var shell = stage.querySelector('#neo-sonic-buttons-shell');
    if (shell) {
      shell.style.display = 'none';
      shell.style.visibility = 'hidden';
      shell.style.pointerEvents = 'none';
    }

    var iframe = stage.querySelector('#neo-sonic-old-build');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'neo-sonic-old-build';
      iframe.src = SONIC_OLD_BUILD_URL;
      iframe.title = 'Sonic.EXE 2.0 Old Build';
      iframe.allow = 'autoplay; fullscreen; gamepad; keyboard-map; pointer-lock';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('playsinline', '');
      iframe.setAttribute('scrolling', 'no');
      iframe.style.position = 'absolute';
      iframe.style.inset = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.display = 'block';
      iframe.style.background = '#000';
      iframe.style.zIndex = '1';
      stage.appendChild(iframe);
    }
  }

  function embedSonicRestoredBuild(stage) {
    if (!stage || getSelectedGame() !== 'sonic') return;
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    stage.style.overflow = 'hidden';

    var shell = stage.querySelector('#neo-sonic-buttons-shell');
    if (shell) {
      shell.style.display = 'none';
      shell.style.visibility = 'hidden';
      shell.style.pointerEvents = 'none';
    }

    var iframe = stage.querySelector('#neo-sonic-restored-build');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'neo-sonic-restored-build';
      iframe.src = SONIC_RESTORED_BUILD_URL;
      iframe.title = 'Sonic.EXE V4 Restored Build';
      iframe.allow = 'autoplay; fullscreen; gamepad; keyboard-map; pointer-lock';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('playsinline', '');
      iframe.setAttribute('scrolling', 'no');
      iframe.style.position = 'absolute';
      iframe.style.inset = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.display = 'block';
      iframe.style.background = '#000';
      iframe.style.zIndex = '1';
      stage.appendChild(iframe);
    }
  }

  function setupSonicButtons(stage) {
    if (!stage || getSelectedGame() !== 'sonic') return;
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';

    var activeBuild = stage.getAttribute('data-neo-sonic-active-build');
    if (activeBuild === 'old') {
      embedSonicOldBuild(stage);
      return;
    }
    if (activeBuild === 'restored') {
      embedSonicRestoredBuild(stage);
      return;
    }

    var shell = stage.querySelector('#neo-sonic-buttons-shell');
    if (!shell) {
      shell = document.createElement('div');
      shell.id = 'neo-sonic-buttons-shell';
      shell.style.position = 'absolute';
      shell.style.inset = '0';
      shell.style.pointerEvents = 'none';
      shell.style.zIndex = '8';
      stage.appendChild(shell);

      function createSeparateButton(id, label, box) {
        var button = document.createElement('button');
        button.type = 'button';
        button.id = id;
        button.className = 'neo-sonic-separate-button';
        button.setAttribute('aria-label', label);
        button.title = label;
        button.style.position = 'absolute';
        button.style.boxSizing = 'border-box';
        button.style.padding = '0';
        button.style.margin = '0';
        button.style.border = '0';
        button.style.outline = '0';
        button.style.background = 'transparent';
        button.style.cursor = 'pointer';
        button.style.pointerEvents = 'auto';
        button.style.overflow = 'hidden';
        button.style.borderRadius = '18px';
        button.style.transition = 'filter .14s ease, box-shadow .14s ease, transform .14s ease';
        button.dataset.srcX = String(box.x);
        button.dataset.srcY = String(box.y);
        button.dataset.srcW = String(box.w);
        button.dataset.srcH = String(box.h);

        var image = document.createElement('img');
        image.src = '/assets/sonic.exe_buttons.png';
        image.alt = '';
        image.draggable = false;
        image.style.position = 'absolute';
        image.style.maxWidth = 'none';
        image.style.pointerEvents = 'none';
        image.style.userSelect = 'none';
        button.appendChild(image);

        button.addEventListener('mouseenter', function () {
          this.style.filter = 'brightness(1.14) drop-shadow(0 0 10px rgba(255,70,70,.55))';
          this.style.boxShadow = '0 0 18px rgba(255,60,60,.30)';
          this.style.transform = 'scale(1.018)';
        });
        button.addEventListener('mouseleave', function () {
          this.style.filter = 'none';
          this.style.boxShadow = 'none';
          this.style.transform = 'scale(1)';
        });
        button.addEventListener('mousedown', function () {
          this.style.transform = 'scale(.988)';
        });
        button.addEventListener('mouseup', function () {
          this.style.transform = 'scale(1.018)';
        });
        button.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (id === 'neo-sonic-button-old') {
            stage.setAttribute('data-neo-sonic-active-build', 'old');
            embedSonicOldBuild(stage);
            return;
          }
          if (id === 'neo-sonic-button-restored') {
            stage.setAttribute('data-neo-sonic-active-build', 'restored');
            embedSonicRestoredBuild(stage);
            return;
          }
          var detail = { id:id, label:label };
          try {
            stage.dispatchEvent(new CustomEvent('neo-sonic-button-click', {
              bubbles:true,
              detail:detail
            }));
          } catch (_) {}
        });
        shell.appendChild(button);
        return button;
      }

      // Exact bounds of the two button graphics in sonic.exe_buttons.png
      // (1095 x 647): left button x=33..534, right button x=562..1064,
      // both spanning y=250..414.
      createSeparateButton('neo-sonic-button-old', 'Old build version 2.0', {
        x:33, y:250, w:502, h:165
      });
      createSeparateButton('neo-sonic-button-restored', 'Restored build latest 4.0.3.00', {
        x:562, y:250, w:503, h:165
      });
    }

    var stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) return;

    var sourceW = 1095, sourceH = 647;
    // Match the PNG's contain behavior exactly, then crop each separate
    // button from the same source image.
    var scale = Math.min(stageRect.width / sourceW, stageRect.height / sourceH);
    var displayedW = sourceW * scale;
    var displayedH = sourceH * scale;
    var offsetX = (stageRect.width - displayedW) / 2;
    var offsetY = (stageRect.height - displayedH) / 2;

    var buttons = shell.querySelectorAll('.neo-sonic-separate-button');
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      var x = Number(button.dataset.srcX);
      var y = Number(button.dataset.srcY);
      var w = Number(button.dataset.srcW);
      var h = Number(button.dataset.srcH);
      var left = offsetX + x * scale;
      var top = offsetY + y * scale;
      var width = w * scale;
      var height = h * scale;

      button.style.left = left + 'px';
      button.style.top = top + 'px';
      button.style.width = width + 'px';
      button.style.height = height + 'px';

      var image = button.querySelector('img');
      image.style.width = displayedW + 'px';
      image.style.height = displayedH + 'px';
      image.style.left = (-x * scale) + 'px';
      image.style.top = (-y * scale) + 'px';
    }

    shell.style.display = 'block';
    shell.style.visibility = 'visible';
  }

  function embedImpostor(root, stage) {
    if (!root || !stage || getSelectedGame() !== 'impostor') return;
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    stage.style.overflow = 'hidden';
    var iframe = stage.querySelector('#neo-impostor-legacy-game');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'neo-impostor-legacy-game';
      iframe.src = GAME_URL;
      iframe.title = 'VS Impostor: Legacy';
      iframe.allow = 'autoplay; fullscreen; gamepad; keyboard-map; pointer-lock';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('playsinline', '');
      iframe.setAttribute('scrolling', 'no');
      iframe.style.position = 'absolute';
      iframe.style.inset = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.display = 'block';
      iframe.style.background = '#000';
      iframe.style.zIndex = '1';
      stage.appendChild(iframe);
    }
  }

  function embedHank(root, stage) {
    if (!root || !stage || getSelectedGame() !== 'hank') return;
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    stage.style.overflow = 'hidden';

    var iframe = stage.querySelector('#neo-accelerant-hank-game');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'neo-accelerant-hank-game';
      iframe.src = HANK_GAME_URL;
      iframe.title = 'Vs Accelerant Hank';
      iframe.allow = 'autoplay; fullscreen; gamepad; keyboard-map; pointer-lock';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('playsinline', '');
      iframe.setAttribute('scrolling', 'no');
      iframe.style.position = 'absolute';
      iframe.style.inset = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.display = 'block';
      iframe.style.background = '#808080';
      iframe.style.zIndex = '1';
      stage.appendChild(iframe);
    }
  }

  function removeStrayGameIframe() {
    if (!isExplorePage() || getSelectedGame()) return;
    var frames = document.querySelectorAll('#neo-impostor-legacy-game, #neo-sonic-old-build, #neo-sonic-restored-build, #neo-accelerant-hank-game');
    for (var i = 0; i < frames.length; i++) frames[i].remove();
  }

  function syncNativeCursorForViewer(active) {
    var root = document.documentElement;
    if (!root) return;

    var next = !!active;
    if (root.__neoNativeCursorState === next) return;
    root.__neoNativeCursorState = next;

    root.classList.toggle('neo-native-cursor', next);

    // Remove any already-rendered Neo cursor effects while native mode is active.
    var cursor = document.getElementById('custom-cursor');
    if (next) {
      if (cursor) {
        cursor.style.display = 'none';
        cursor.style.visibility = 'hidden';
      }
      var effects = document.querySelectorAll('.cursor-trail-dot, .cursor-particle');
      for (var i = 0; i < effects.length; i++) effects[i].remove();
    } else if (cursor && window.__neoCursorHasMoved) {
      cursor.style.display = 'block';
      cursor.style.visibility = 'visible';
      if (typeof window.__neoCursorMouseX === 'number') cursor.style.left = window.__neoCursorMouseX + 'px';
      if (typeof window.__neoCursorMouseY === 'number') cursor.style.top = window.__neoCursorMouseY + 'px';
    }

    var frames = document.querySelectorAll('iframe');
    for (var f = 0; f < frames.length; f++) {
      try {
        frames[f].contentWindow.postMessage({source:'neo-browser-shell', nativeCursor:next}, '*');
      } catch (_) {}
    }
  }

  function bindViewerCursor(root) {
    if (!root || root.__neoCursorBound) return;
    root.__neoCursorBound = true;

    function enterViewer() {
      syncNativeCursorForViewer(true);
    }

    function leaveViewer() {
      if (document.fullscreenElement === root || document.webkitFullscreenElement === root) return;
      syncNativeCursorForViewer(false);
    }

    root.addEventListener('mouseenter', enterViewer, true);
    root.addEventListener('mouseleave', leaveViewer, true);
  }

  function simplifyViewer() {
    var root = findViewerRoot();
    if (!root) {
      syncNativeCursorForViewer(false);
      removeStrayGameIframe();
      return;
    }
    var selectedGame = getSelectedGame();
    // The current viewer bar must also be applied to regular Explore cards,
    // not only the three special embedded games.
    bindViewerCursor(root);
    // Start with the normal Neo cursor unless the mouse is already over the viewer.
    var currentX = typeof window.__neoCursorMouseX === 'number' ? window.__neoCursorMouseX : -1;
    var currentY = typeof window.__neoCursorMouseY === 'number' ? window.__neoCursorMouseY : -1;
    var rr = root.getBoundingClientRect();
    var overViewer = currentX >= rr.left && currentX <= rr.right && currentY >= rr.top && currentY <= rr.bottom;
    syncNativeCursorForViewer(overViewer || document.fullscreenElement === root || document.webkitFullscreenElement === root);
    var parts = getViewerParts(root);
    if (!parts) return;

    if (parts.title) {
      parts.title.setAttribute('data-neo-game-viewer-title', selectedGame || 'generic');
      if (selectedGame === 'sonic' || selectedGame === 'hank' || selectedGame === 'impostor') {
        parts.title.textContent = selectedGame === 'sonic' ? SONIC_VIEWER_TITLE : selectedGame === 'hank' ? THIRD_TITLE : VIEWER_TITLE;
        root.setAttribute('data-neo-game-viewer', selectedGame);
        updateViewerLogo(parts, selectedGame);
      } else {
        root.setAttribute('data-neo-game-viewer', 'generic');
      }
    }

    // The game surface itself must remain fully interactive.
    if (parts.stage) {
      parts.stage.style.pointerEvents = 'auto';
      parts.stage.style.userSelect = 'none';
    }
    if (parts.stage) {
      var interactiveFrames = parts.stage.querySelectorAll('iframe');
      for (var pf = 0; pf < interactiveFrames.length; pf++) {
        interactiveFrames[pf].style.pointerEvents = 'auto';
      }
    }

    // Always apply the current X + Fullscreen viewer bar.
    updateViewerControls(parts, root);
    if (selectedGame === 'sonic') {
      setupSonicButtons(parts.stage);
    } else {
      var oldSonic = parts.stage && parts.stage.querySelector('#neo-sonic-buttons-shell');
      if (oldSonic) oldSonic.remove();
      var oldSonicFrame = parts.stage && parts.stage.querySelector('#neo-sonic-old-build');
      if (oldSonicFrame) oldSonicFrame.remove();
      var restoredSonicFrame = parts.stage && parts.stage.querySelector('#neo-sonic-restored-build');
      if (restoredSonicFrame) restoredSonicFrame.remove();
      if (parts.stage) parts.stage.removeAttribute('data-neo-sonic-active-build');
    }
    if (selectedGame === 'impostor') embedImpostor(root, parts.stage);
    if (selectedGame === 'hank') embedHank(root, parts.stage);
  }

  function scheduleViewerActivation() {
    if (window.__neoViewerActivationTimer) clearTimeout(window.__neoViewerActivationTimer);
    var attempts = 0;
    function retry() {
      attempts++;
      try { simplifyViewer(); } catch (_) {}
      if (attempts < 30 && getSelectedGame()) {
        window.__neoViewerActivationTimer = setTimeout(retry, 50);
      } else {
        window.__neoViewerActivationTimer = null;
      }
    }
    retry();
  }

  function run() {
    if (!findViewerRoot()) {
      try { simplifyExplore(); } catch (_) {}
    }
    try { simplifyViewer(); } catch (_) {}
  }

  function keepNativeCursorInViewer() {
    try {
      var root = findViewerRoot();
      if (!root) {
        syncNativeCursorForViewer(false);
        return;
      }
      var x = typeof window.__neoCursorMouseX === 'number' ? window.__neoCursorMouseX : -1;
      var y = typeof window.__neoCursorMouseY === 'number' ? window.__neoCursorMouseY : -1;
      var r = root.getBoundingClientRect();
      var inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      syncNativeCursorForViewer(inside || document.fullscreenElement === root || document.webkitFullscreenElement === root);
    } catch (_) {}
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
          if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
            schedule();
            break;
          }
        }
      }).observe(document.documentElement, {childList:true, subtree:true, characterData:true});
    } catch (_) {}
    window.addEventListener('resize', schedule, {passive:true});
    document.addEventListener('fullscreenchange', keepNativeCursorInViewer);
    document.addEventListener('webkitfullscreenchange', keepNativeCursorInViewer);
    document.addEventListener('mousemove', function (event) {
      window.__neoCursorMouseX = event.clientX;
      window.__neoCursorMouseY = event.clientY;
      window.__neoCursorHasMoved = true;
      var root = findViewerRoot();
      if (!root) {
        syncNativeCursorForViewer(false);
        return;
      }
      var r = root.getBoundingClientRect();
      var inside = event.clientX >= r.left && event.clientX <= r.right &&
                   event.clientY >= r.top && event.clientY <= r.bottom;
      syncNativeCursorForViewer(inside || document.fullscreenElement === root || document.webkitFullscreenElement === root);
    }, {passive:true});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }
})();
