(function () {
  'use strict';

  var CARD_TITLE = 'VS IMPOSTOR: LEGACY';
  var VIEWER_TITLE = 'VS Impostor:Legacy';
  var DESCRIPTION = 'A from-the-ground-up remaster of the 2023 mod, VS IMPOSTOR V4! VS IMPOSTOR: LEGACY intends to be faithful to the original experience, while introducing new tweaks and features to make it the definitive version of the mod you know and love.';
  var CARD_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';
  var GAME_ICON = 'data:image/png;base64,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';

  function updateCard() {
    var titleNodes = document.querySelectorAll('p');
    for (var i = 0; i < titleNodes.length; i++) {
      var titleNode = titleNodes[i];
      var titleText = titleNode.textContent.trim();
      if (titleText !== 'Placeholder 1' && titleText !== CARD_TITLE) continue;
      var card = titleNode.closest('button');
      if (!card) continue;

      if (titleText === 'Placeholder 1') titleNode.textContent = CARD_TITLE;
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
          image = document.createElement('img');
          image.className = 'neo-impostor-legacy-thumbnail absolute inset-0 w-full h-full object-cover';
          preview.appendChild(image);
        }
        image.src = CARD_IMAGE;
        image.alt = CARD_TITLE;
        image.loading = 'lazy';
      }
    }
  }

  function updateViewer() {
    var nodes = document.querySelectorAll('p, span, div, h1, h2, h3');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var text = node.textContent.trim();
      if (text !== 'Placeholder 1' && text !== VIEWER_TITLE) continue;

      if (text === 'Placeholder 1') node.textContent = VIEWER_TITLE;
      node.setAttribute('title', VIEWER_TITLE);

      var titleRect = node.getBoundingClientRect();
      var root = node.parentElement;
      for (var level = 0; level < 8 && root; level++) {
        var rootRect = root.getBoundingClientRect();
        if (rootRect.width >= window.innerWidth * 0.7 && rootRect.height >= 45) break;
        root = root.parentElement;
      }
      if (!root) continue;

      var images = root.querySelectorAll('img');
      var best = null;
      var bestScore = Infinity;
      for (var j = 0; j < images.length; j++) {
        var img = images[j];
        var r = img.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.right > titleRect.left + 3) continue;
        if (r.bottom < titleRect.top - 10 || r.top > titleRect.bottom + 10) continue;
        if (r.width > 64 || r.height > 64 || r.width < 10 || r.height < 10) continue;
        var score = Math.abs((r.left + r.right) / 2 - titleRect.left) + Math.abs((r.top + r.bottom) / 2 - (titleRect.top + titleRect.height / 2));
        if (score < bestScore) {
          best = img;
          bestScore = score;
        }
      }

      if (best) {
        best.src = GAME_ICON;
        best.removeAttribute('srcset');
        best.removeAttribute('sizes');
        best.style.objectFit = 'contain';
        best.alt = VIEWER_TITLE;
      }
    }
  }

  function run() {
    updateCard();
    updateViewer();
  }

  function start() {
    run();
    var observer = new MutationObserver(function () {
      run();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    setTimeout(run, 500);
    setTimeout(run, 1500);
    setTimeout(run, 3000);
    setTimeout(run, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
