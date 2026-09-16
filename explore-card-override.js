(function () {
  'use strict';

  var CARD_TITLE = 'VS IMPOSTOR: LEGACY';
  var VIEWER_TITLE = 'VS Impostor:Legacy';
  var DESCRIPTION = 'A from-the-ground-up remaster of the 2023 mod, VS IMPOSTOR V4! VS IMPOSTOR: LEGACY intends to be faithful to the original experience, while introducing new tweaks and features to make it the definitive version of the mod you know and love.';
  var CARD_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';
  var GAME_ICON = '/vs-impostor-legacy-icon.svg';
  var cardButton = null;

  function updateCard() {
    var titleNodes = document.querySelectorAll('p');
    for (var i = 0; i < titleNodes.length; i++) {
      var titleNode = titleNodes[i];
      if (titleNode.textContent.trim() !== 'Placeholder 1' && titleNode.textContent.trim() !== CARD_TITLE) continue;

      var card = titleNode.closest('button');
      if (!card) continue;
      cardButton = card;

      if (titleNode.textContent.trim() === 'Placeholder 1') {
        titleNode.textContent = CARD_TITLE;
      }
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

  function replaceTextOnly(node, value) {
    if (!node || node.nodeType !== 1) return false;
    var changed = false;
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (child.nodeType === 3 && child.nodeValue.trim() === 'Placeholder 1') {
        child.nodeValue = value;
        changed = true;
      }
    }
    if (!changed && node.textContent.trim() === 'Placeholder 1') {
      // The title itself contains no other markup, so this is safe here.
      node.textContent = value;
      changed = true;
    }
    if (changed) node.setAttribute('title', value);
    return changed;
  }

  function updateViewer() {
    var nodes = document.querySelectorAll('p, span, div, button, h1, h2, h3');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.textContent.trim() !== 'Placeholder 1') continue;

      // Only change the title text. Do not replace the header or its icons.
      if (replaceTextOnly(node, VIEWER_TITLE)) return true;
    }
    return false;
  }

  function addGameIconToViewer() {
    var titleNodes = document.querySelectorAll('p, span, h1, h2, h3');
    for (var i = 0; i < titleNodes.length; i++) {
      var title = titleNodes[i];
      if (title.textContent.trim() !== VIEWER_TITLE) continue;

      var root = title;
      for (var level = 0; level < 6 && root.parentElement; level++) {
        root = root.parentElement;
        var rect = root.getBoundingClientRect();
        if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.6) break;
      }

      if (!root || root.querySelector('.neo-impostor-legacy-content-icon')) return true;

      var img = document.createElement('img');
      img.className = 'neo-impostor-legacy-content-icon';
      img.src = GAME_ICON;
      img.alt = VIEWER_TITLE;
      img.style.position = 'absolute';
      img.style.left = '24px';
      img.style.top = '74px';
      img.style.width = '96px';
      img.style.height = '96px';
      img.style.objectFit = 'contain';
      img.style.zIndex = '5';
      img.style.pointerEvents = 'none';
      root.style.position = root.style.position || 'relative';
      root.appendChild(img);
      return true;
    }
    return false;
  }

  function startViewerWatch() {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var changed = updateViewer();
      if (changed || document.querySelector('.neo-impostor-legacy-content-icon')) addGameIconToViewer();
      if (tries > 60) clearInterval(timer);
    }, 100);
  }

  document.addEventListener('click', function (event) {
    if (!cardButton) updateCard();
    if (cardButton && cardButton.contains(event.target)) startViewerWatch();
  }, true);

  function start() {
    updateCard();
    var observer = new MutationObserver(function () {
      updateCard();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
