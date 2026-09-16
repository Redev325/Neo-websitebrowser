(function () {
  'use strict';

  var TITLE = 'VS IMPOSTOR: LEGACY';
  var DESCRIPTION = 'A from-the-ground-up remaster of the 2023 mod, VS IMPOSTOR V4! VS IMPOSTOR: LEGACY intends to be faithful to the original experience, while introducing new tweaks and features to make it the definitive version of the mod you know and love.';
  var IMAGE = '/vs-impostor-legacy-icon.svg';

  function exactText(node, text) {
    return node && node.nodeType === 1 && node.textContent.trim() === text;
  }

  function updateCard() {
    var nodes = document.querySelectorAll('p, span, div, button');
    for (var i = 0; i < nodes.length; i++) {
      var titleNode = nodes[i];
      if (!exactText(titleNode, 'Placeholder 1')) continue;

      var card = titleNode.closest('button');
      if (!card) continue;

      titleNode.textContent = TITLE;
      titleNode.setAttribute('title', TITLE);

      var textNodes = card.querySelectorAll('p, span, div');
      for (var j = 0; j < textNodes.length; j++) {
        if (textNodes[j] === titleNode) continue;
        if (textNodes[j].textContent.trim() === 'lorem ipsum dolor sit amet, consectetur adipiscing elit') {
          textNodes[j].textContent = DESCRIPTION;
        }
      }

      var preview = card.querySelector('.aspect-video');
      if (preview) {
        var image = preview.querySelector('img');
        if (!image) {
          image = document.createElement('img');
          image.className = 'absolute inset-0 w-full h-full object-cover';
          preview.innerHTML = '';
          preview.appendChild(image);
        }
        image.src = IMAGE;
        image.alt = TITLE;
      }
      return true;
    }
    return false;
  }

  function updateOpenViewer() {
    var nodes = document.querySelectorAll('p, span, div, button, h1, h2, h3');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (exactText(node, 'Placeholder 1')) {
        node.textContent = TITLE;
        node.setAttribute('title', TITLE);
      }
    }
  }

  function start() {
    updateCard();
    updateOpenViewer();

    var observer = new MutationObserver(function () {
      updateCard();
      updateOpenViewer();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(updateCard, 500);
    setTimeout(updateCard, 1500);
    setTimeout(updateOpenViewer, 500);
    setTimeout(updateOpenViewer, 1500);
    setTimeout(updateOpenViewer, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
