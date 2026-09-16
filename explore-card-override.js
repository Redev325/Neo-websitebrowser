(function () {
  'use strict';

  var CARD_TITLE = 'VS IMPOSTOR: LEGACY';
  var VIEWER_TITLE = 'VS Impostor:Legacy';
  var DESCRIPTION = 'A from-the-ground-up remaster of the 2023 mod, VS IMPOSTOR V4! VS IMPOSTOR: LEGACY intends to be faithful to the original experience, while introducing new tweaks and features to make it the definitive version of the mod you know and love.';
  var CARD_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';
  var GAME_ICON = '/vs-impostor-legacy-icon.svg';
  var cardButton = null;
  var overlay = null;

  function updateCard() {
    var titleNodes = document.querySelectorAll('p');
    for (var i = 0; i < titleNodes.length; i++) {
      var titleNode = titleNodes[i];
      var text = titleNode.textContent.trim();
      if (text !== 'Placeholder 1' && text !== CARD_TITLE) continue;
      var card = titleNode.closest('button');
      if (!card) continue;
      cardButton = card;
      if (text === 'Placeholder 1') titleNode.textContent = CARD_TITLE;
      titleNode.setAttribute('title', CARD_TITLE);

      var textNodes = card.querySelectorAll('p');
      for (var j = 0; j < textNodes.length; j++) {
        if (textNodes[j] === titleNode) continue;
        if (textNodes[j].textContent.trim() === 'lorem ipsum dolor sit amet, consectetur adipiscing elit') {
          textNodes[j].textContent = DESCRIPTION;
        }
      }

      var preview = card.querySelector('.aspect-video');
      if (preview) {
        var image = preview.querySelector('img.neo-impostor-legacy-thumbnail');
        if (!image) {
          preview.innerHTML = '';
          image = document.createElement('img');
          image.className = 'neo-impostor-legacy-thumbnail absolute inset-0 w-full h-full object-cover';
          preview.appendChild(image);
        }
        image.src = CARD_IMAGE;
        image.alt = CARD_TITLE;
        image.loading = 'lazy';
      }
      return true;
    }
    return false;
  }

  function svg(path) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + path + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function closeViewer() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  function openViewer() {
    closeViewer();
    overlay = document.createElement('div');
    overlay.className = 'neo-impostor-viewer';
    overlay.innerHTML = '' +
      '<div class="neo-impostor-viewer-bar">' +
        '<div class="neo-impostor-viewer-left">' +
          '<span class="neo-impostor-viewer-icon-wrap"><img src="' + GAME_ICON + '" alt="" class="neo-impostor-viewer-icon"></span>' +
          '<span class="neo-impostor-viewer-title">' + VIEWER_TITLE + '</span>' +
        '</div>' +
        '<div class="neo-impostor-viewer-actions">' +
          '<button type="button" title="Trophy" aria-label="Trophy" class="neo-viewer-action">' + svg('M8 21h8 M12 17v4 M7 4h10v4a5 5 0 0 1-10 0V4Z M7 6H4a3 3 0 0 0 3 3 M17 6h3a3 3 0 0 1-3 3') + '</button>' +
          '<button type="button" title="Report" aria-label="Report" class="neo-viewer-action">' + svg('M5 21V4h11l3 3v5H5 M5 16h9') + '</button>' +
          '<button type="button" title="Fullscreen" aria-label="Fullscreen" class="neo-viewer-action neo-viewer-fullscreen">' + svg('M8 3H3v5 M16 3h5v5 M21 16v5h-5 M3 16v5h5') + '</button>' +
          '<button type="button" title="Close" aria-label="Close" class="neo-viewer-action neo-viewer-close">' + svg('M6 6l12 12 M18 6L6 18') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="neo-impostor-viewer-stage">' +
        '<img src="' + GAME_ICON + '" alt="' + VIEWER_TITLE + '" class="neo-impostor-stage-icon">' +
      '</div>';

    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    var style = document.getElementById('neo-impostor-viewer-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'neo-impostor-viewer-style';
      style.textContent =
        '.neo-impostor-viewer{position:fixed;inset:0;z-index:2147483646;background:#1a1a1a;color:#fff;display:flex;flex-direction:column;font-family:inherit}' +
        '.neo-impostor-viewer-bar{height:49px;min-height:49px;box-sizing:border-box;background:#211d1e;border-top:1px solid rgba(255,255,255,.16);border-bottom:1px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:space-between;padding:0 11px 0 15px}' +
        '.neo-impostor-viewer-left{display:flex;align-items:center;min-width:0;gap:9px}' +
        '.neo-impostor-viewer-icon-wrap{width:25px;height:25px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(255,255,255,.05);flex:none}' +
        '.neo-impostor-viewer-icon{width:22px;height:22px;object-fit:contain;display:block}' +
        '.neo-impostor-viewer-title{font-size:15px;font-weight:700;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.neo-impostor-viewer-actions{display:flex;align-items:center;gap:6px}' +
        '.neo-viewer-action{width:28px;height:28px;padding:3px;border:0;background:transparent;color:rgba(255,255,255,.88);border-radius:5px;display:grid;place-items:center;cursor:pointer}' +
        '.neo-viewer-action:hover{background:rgba(255,255,255,.08);color:#fff}' +
        '.neo-viewer-action svg{width:18px;height:18px;display:block}' +
        '.neo-impostor-viewer-stage{position:relative;flex:1;min-height:0;background:#1b1b1b;overflow:hidden}' +
        '.neo-impostor-stage-icon{position:absolute;left:210px;top:60px;width:96px;height:96px;object-fit:contain;display:block}' +
        '.neo-impostor-viewer.is-fullscreen .neo-impostor-viewer-bar{height:42px;min-height:42px}' +
        '.neo-impostor-viewer.is-fullscreen .neo-impostor-stage-icon{left:24px;top:24px}' +
        '.neo-impostor-viewer.is-fullscreen{background:#000}' ;
      document.head.appendChild(style);
    }

    overlay.querySelector('.neo-viewer-close').addEventListener('click', closeViewer);
    overlay.querySelector('.neo-viewer-fullscreen').addEventListener('click', function () {
      overlay.classList.toggle('is-fullscreen');
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeViewer();
    });
  }

  function installCardClick() {
    if (!cardButton) return;
    if (cardButton.__neoImpostorClick) return;
    cardButton.__neoImpostorClick = true;
    cardButton.addEventListener('click', function (event) {
      var target = event.target;
      var innerButton = target && target.closest ? target.closest('button') : null;
      if (innerButton && innerButton !== cardButton) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      openViewer();
    }, true);
  }

  function start() {
    updateCard();
    installCardClick();
    var observer = new MutationObserver(function () {
      updateCard();
      installCardClick();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
