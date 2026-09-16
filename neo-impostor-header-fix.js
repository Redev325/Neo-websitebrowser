(function () {
  'use strict';
  if (window.__neoImpostorHeaderFixV1) return;
  window.__neoImpostorHeaderFixV1 = true;

  var TITLE = 'VS Impostor:Legacy';
  var ICON = '/vs-impostor-legacy-icon.svg';

  function leafText(el) {
    return el && !el.children.length ? String(el.textContent || '').trim() : '';
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  }

  function findViewerTitle(root) {
    var els = root.querySelectorAll('p,span,h1,h2,h3,h4,div,button');
    var fallback = null;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var text = leafText(el);
      if (text !== 'Placeholder 1' && text !== TITLE) continue;
      if (!visible(el)) continue;
      var r = el.getBoundingClientRect();
      if (r.top >= -2 && r.top < 75 && r.left >= 25 && r.left < 380) return el;
      fallback = fallback || el;
    }
    return fallback;
  }

  function findHeader(titleEl) {
    var n = titleEl;
    for (var i = 0; i < 12 && n; i++, n = n.parentElement) {
      var r = n.getBoundingClientRect();
      if (r.top <= 5 && r.height >= 40 && r.height <= 75 && r.width >= window.innerWidth * 0.8) return n;
    }
    return titleEl.parentElement;
  }

  function apply(root) {
    var titleEl = findViewerTitle(root);
    if (!titleEl) return false;

    var titleRect = titleEl.getBoundingClientRect();
    var header = findHeader(titleEl);
    if (!header) return false;
    var hr = header.getBoundingClientRect();
    if (hr.width < window.innerWidth * 0.7 || hr.height < 35) return false;

    if (getComputedStyle(header).position === 'static') header.style.position = 'relative';

    var brand = header.querySelector(':scope > .neo-impostor-header-brand');
    if (!brand) {
      brand = document.createElement('span');
      brand.className = 'neo-impostor-header-brand';
      brand.setAttribute('aria-hidden', 'true');
      brand.style.position = 'absolute';
      brand.style.pointerEvents = 'none';
      brand.style.zIndex = '2147483646';
      header.appendChild(brand);
    }

    var iconHost = header.querySelector(':scope > .neo-impostor-header-brand-icon');
    if (!iconHost) {
      iconHost = document.createElement('img');
      iconHost.className = 'neo-impostor-header-brand-icon';
      iconHost.src = ICON;
      iconHost.alt = '';
      iconHost.draggable = false;
      iconHost.style.position = 'absolute';
      iconHost.style.objectFit = 'contain';
      iconHost.style.pointerEvents = 'none';
      brand.appendChild(iconHost);
    }

    var titleHost = header.querySelector(':scope > .neo-impostor-header-brand-title');
    if (!titleHost) {
      titleHost = document.createElement('span');
      titleHost.className = 'neo-impostor-header-brand-title';
      titleHost.textContent = TITLE;
      titleHost.style.position = 'absolute';
      titleHost.style.whiteSpace = 'nowrap';
      titleHost.style.pointerEvents = 'none';
      brand.appendChild(titleHost);
    }

    var cs = getComputedStyle(titleEl);
    titleHost.style.fontFamily = cs.fontFamily;
    titleHost.style.fontSize = cs.fontSize;
    titleHost.style.fontWeight = cs.fontWeight;
    titleHost.style.fontStyle = cs.fontStyle;
    titleHost.style.letterSpacing = cs.letterSpacing;
    titleHost.style.lineHeight = cs.lineHeight;
    titleHost.style.color = cs.color;
    titleHost.style.textShadow = cs.textShadow;

    // Keep the original bar and its controls. Only cover the old title text.
    titleEl.style.visibility = 'hidden';

    var media = header.querySelectorAll('img,svg');
    var candidate = null;
    var best = Infinity;
    for (var i = 0; i < media.length; i++) {
      var m = media[i];
      if (m === iconHost || m.closest('.neo-impostor-header-brand')) continue;
      var mr = m.getBoundingClientRect();
      if (!mr.width || !mr.height || mr.width > 42 || mr.height > 42) continue;
      if (mr.right > titleRect.left + 4) continue;
      if (mr.bottom < hr.top || mr.top > titleRect.bottom + 14) continue;
      var score = Math.abs(mr.right - titleRect.left) + Math.abs(((mr.top + mr.bottom) / 2) - ((titleRect.top + titleRect.bottom) / 2));
      if (score < best) { best = score; candidate = m; }
    }

    var iconRect;
    if (candidate) {
      iconRect = candidate.getBoundingClientRect();
      candidate.style.visibility = 'hidden';
    } else {
      iconRect = { left: titleRect.left - 31, top: titleRect.top, width: 22, height: 22 };
    }

    iconHost.style.left = (iconRect.left - hr.left) + 'px';
    iconHost.style.top = (iconRect.top - hr.top) + 'px';
    iconHost.style.width = Math.max(18, Math.min(26, iconRect.width)) + 'px';
    iconHost.style.height = Math.max(18, Math.min(26, iconRect.height)) + 'px';

    titleHost.style.left = (titleRect.left - hr.left) + 'px';
    titleHost.style.top = (titleRect.top - hr.top) + 'px';
    titleHost.style.height = titleRect.height + 'px';

    return true;
  }

  function scan(root) {
    try { apply(root || document); } catch (_) {}
    try {
      var frames = (root || document).querySelectorAll('iframe');
      for (var i = 0; i < frames.length; i++) {
        try {
          if (frames[i].contentDocument) apply(frames[i].contentDocument);
        } catch (_) {}
      }
    } catch (_) {}
  }

  function run() { scan(document); }
  run();
  [50,150,300,600,1000,2000,4000].forEach(function (ms) { setTimeout(run, ms); });
  setInterval(run, 250);
  try {
    new MutationObserver(function () { run(); }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  } catch (_) {}
})();
