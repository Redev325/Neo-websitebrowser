(function () {
  'use strict';

  // Keep the Explore card exactly as it was before the broken viewer changes.
  var CARD_TITLE = 'VS IMPOSTOR: LEGACY';
  var VIEWER_TITLE = 'VS Impostor:Legacy';
  var DESCRIPTION = 'A from-the-ground-up remaster of the 2023 mod, VS IMPOSTOR V4! VS IMPOSTOR: LEGACY intends to be faithful to the original experience, while introducing new tweaks and features to make it the definitive version of the mod you know and love.';
  var CARD_IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';
  var GAME_ICON = '/vs-impostor-legacy-icon.svg';

  function updateCard() {
    var titleNodes = document.querySelectorAll('p');
    for (var i = 0; i < titleNodes.length; i++) {
      var titleNode = titleNodes[i];
      if (titleNode.textContent.trim() !== 'Placeholder 1') continue;

      var card = titleNode.closest('button');
      if (!card) continue;

      titleNode.textContent = CARD_TITLE;
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
        var oldImage = preview.querySelector('img.neo-impostor-legacy-thumbnail');
        if (!oldImage) {
          preview.innerHTML = '';
          var image = document.createElement('img');
          image.className = 'neo-impostor-legacy-thumbnail absolute inset-0 w-full h-full object-cover';
          image.src = CARD_IMAGE;
          image.alt = CARD_TITLE;
          image.loading = 'lazy';
          preview.appendChild(image);
        } else {
          oldImage.src = CARD_IMAGE;
          oldImage.alt = CARD_TITLE;
        }
      }

      return true;
    }
    return false;
  }

  function replaceViewerIcon(titleNode) {
    var parent = titleNode.parentElement;
    for (var level = 0; level < 4 && parent; level++, parent = parent.parentElement) {
      var existing = parent.querySelector('img.neo-impostor-legacy-viewer-icon');
      if (existing) {
        existing.src = GAME_ICON;
        existing.alt = VIEWER_TITLE;
        return true;
      }

      var svgs = parent.querySelectorAll('svg');
      if (svgs.length) {
        // The first SVG in the small title/header group is the existing game icon.
        var icon = svgs[0];
        var img = document.createElement('img');
        img.className = 'neo-impostor-legacy-viewer-icon';
        img.src = GAME_ICON;
        img.alt = VIEWER_TITLE;
        img.style.width = '22px';
        img.style.height = '22px';
        img.style.objectFit = 'contain';
        img.style.flex = '0 0 auto';
        icon.replaceWith(img);
        return true;
      }
    }
    return false;
  }

  function updateOpenViewer() {
    var nodes = document.querySelectorAll('p, span, div, button, h1, h2, h3');
    var found = false;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.textContent.trim() !== 'Placeholder 1') continue;
      node.textContent = VIEWER_TITLE;
      node.setAttribute('title', VIEWER_TITLE);
      replaceViewerIcon(node);
      found = true;
    }
    return found;
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
