(function () {
  'use strict';

  var TITLE = 'VS IMPOSTOR: LEGACY';
  var DESCRIPTION = 'A from-the-ground-up remaster of the 2023 mod, VS IMPOSTOR V4! VS IMPOSTOR: LEGACY intends to be faithful to the original experience, while introducing new tweaks and features to make it the definitive version of the mod you know and love.';
  var IMAGE = 'https://camo.githubusercontent.com/831fc627f5c4f8e44b50a16d9eaf4220feacc947f960c04febb3779e36a30056/68747470733a2f2f66696c65732e67616d6562616e616e612e636f6d2f696d672f73732f6d6f64732f363965636665623236386565632e6a7067';

  function updateCard() {
    var titleNodes = document.querySelectorAll('p');
    for (var i = 0; i < titleNodes.length; i++) {
      var titleNode = titleNodes[i];
      if (titleNode.textContent.trim() !== 'Placeholder 1') continue;

      var card = titleNode.closest('button');
      if (!card) continue;

      titleNode.textContent = TITLE;
      titleNode.setAttribute('title', TITLE);

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
          image.src = IMAGE;
          image.alt = TITLE;
          image.loading = 'lazy';
          preview.appendChild(image);
        }
      }

      return true;
    }
    return false;
  }

  function start() {
    if (updateCard()) return;
    var observer = new MutationObserver(function () {
      if (updateCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { updateCard(); }, 1000);
    setTimeout(function () { updateCard(); }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
