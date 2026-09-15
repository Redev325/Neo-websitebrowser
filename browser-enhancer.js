(function () {
  'use strict';
  if (window.__neoBrowserEnhancer) return;
  window.__neoBrowserEnhancer = true;

  var tabs = [];
  var active = 0;
  var tabStrip = null;
  var frame = null;
  var address = null;
  var lastFrameSrc = '';

  function isBrowserPage() {
    return /^\/browser\/?$/i.test(location.pathname);
  }

  function findFrame() { return document.querySelector('iframe.neo-browser-frame'); }
  function findAddress() { return document.querySelector('.neo-browser-input'); }

  function originalUrl(url) {
    try {
      var u = new URL(url, location.href);
      if (u.pathname === '/api/proxy') {
        return decodeURIComponent(u.searchParams.get('url') || url);
      }
      return url;
    } catch (_) { return url; }
  }

  function titleFor(url) {
    try {
      var u = new URL(originalUrl(url), location.href);
      if (/^\/Explore\/?$/i.test(u.pathname) && u.searchParams.has('q')) return 'Neo Search';
      if (/^\/api\/search$/i.test(u.pathname)) return 'Neo Search';
      return u.hostname.replace(/^www\./i, '') || 'New Tab';
    } catch (_) { return url ? 'Page' : 'New Tab'; }
  }

  function proxyFor(url) {
    try {
      var u = new URL(url, location.href);
      if (!/^https?:$/i.test(u.protocol)) return url;
      return location.origin + '/api/proxy?url=' + encodeURIComponent(u.href);
    } catch (_) { return url; }
  }

  function makeTab(url, title) {
    return { url: url || '', title: title || titleFor(url) };
  }

  function ensureStrip() {
    frame = findFrame();
    if (!frame) return false;
    if (!tabStrip || !tabStrip.isConnected) {
      tabStrip = document.createElement('div');
      tabStrip.className = 'neo-browser-tabs';
      tabStrip.setAttribute('role', 'tablist');
      var anchor = frame.closest('main') || frame.parentElement;
      if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(tabStrip, anchor);
      else if (document.body) document.body.insertBefore(tabStrip, document.body.firstChild);
    }
    return true;
  }

  function renderTabs() {
    if (!ensureStrip()) return;
    tabStrip.replaceChildren();
    tabs.forEach(function (tab, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'neo-tab' + (index === active ? ' active' : '');
      button.dataset.index = String(index);
      button.title = tab.url ? originalUrl(tab.url) : 'New Tab';
      button.style.pointerEvents = 'auto';

      var label = document.createElement('span');
      label.className = 'neo-tab-title';
      label.textContent = tab.title || 'New Tab';

      var close = document.createElement('span');
      close.className = 'neo-tab-close';
      close.textContent = '×';
      close.dataset.close = '1';
      close.setAttribute('aria-label', 'Close tab');

      button.appendChild(label);
      button.appendChild(close);
      tabStrip.appendChild(button);
    });

    var plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'neo-tab-new';
    plus.textContent = '+';
    plus.title = 'New tab';
    plus.setAttribute('aria-label', 'New tab');
    tabStrip.appendChild(plus);
  }

  function switchTab(index) {
    if (!tabs[index]) return;
    active = index;
    frame = findFrame();
    address = findAddress();
    if (frame) frame.src = tabs[index].url || 'about:blank';
    if (address) address.value = tabs[index].url ? originalUrl(tabs[index].url) : '';
    renderTabs();
  }

  function newTab() {
    if (!tabs.length) tabs.push(makeTab(''));
    tabs.push(makeTab(''));
    active = tabs.length - 1;
    frame = findFrame();
    address = findAddress();
    if (frame) frame.src = 'about:blank';
    if (address) {
      address.value = '';
      setTimeout(function () { try { address.focus(); } catch (_) {} }, 0);
    }
    renderTabs();
  }

  function closeTab(index) {
    if (!tabs[index]) return;
    if (tabs.length === 1) {
      tabs[0] = makeTab('');
      active = 0;
      frame = findFrame();
      address = findAddress();
      if (frame) frame.src = 'about:blank';
      if (address) address.value = '';
      renderTabs();
      return;
    }
    tabs.splice(index, 1);
    if (active > index) active--;
    if (active >= tabs.length) active = tabs.length - 1;
    switchTab(active);
  }

  function navigate(value) {
    value = String(value || '').trim();
    if (!value) return;
    if (!tabs.length) tabs.push(makeTab(''));

    // NEO Search is the site's own search page. Do not send browser searches
    // to Bing, DuckDuckGo, or another external search engine.
    var looksLikeUrl = /^https?:\/\//i.test(value) || /^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(value);
    if (!looksLikeUrl) {
      var searchUrl = location.origin + '/Explore?q=' + encodeURIComponent(value);
      tabs[active].url = searchUrl;
      tabs[active].title = 'Neo Search';
      frame = findFrame();
      address = findAddress();
      if (frame) frame.src = searchUrl;
      if (address) address.value = value;
      renderTabs();
      return;
    }

    var target = /^https?:\/\//i.test(value) ? value : 'https://' + value;
    tabs[active].url = proxyFor(target);
    tabs[active].title = titleFor(tabs[active].url);
    frame = findFrame();
    address = findAddress();
    if (frame) frame.src = tabs[active].url;
    if (address) address.value = target;
    renderTabs();
  }

  function navigateFrameTo(url) {
    if (!url || !frame || !tabs[active]) return;
    var proxied = proxyFor(url);
    tabs[active].url = proxied;
    tabs[active].title = titleFor(proxied);
    frame.src = proxied;
    if (address) address.value = url;
    renderTabs();
  }

  function patchFrameLocation(doc) {
    try {
      var win = doc.defaultView;
      if (!win || win.__neoYoutubeLocationPatch) return;
      win.__neoYoutubeLocationPatch = true;
      var proto = win.Location && win.Location.prototype;
      if (!proto) return;
      ['assign', 'replace'].forEach(function (name) {
        try {
          var original = proto[name];
          if (typeof original !== 'function') return;
          proto[name] = function (url) {
            try {
              var u = new URL(String(url), originalUrl(frame.src));
              if (/youtube\.com$/i.test(u.hostname) && u.pathname === '/results') {
                navigateFrameTo(u.href);
                return;
              }
            } catch (_) {}
            return original.apply(this, arguments);
          };
        } catch (_) {}
      });
    } catch (_) {}
  }

  function installYoutubeSearch(doc) {
    if (!doc || doc.__neoYoutubeSearch) return;
    doc.__neoYoutubeSearch = true;
    patchFrameLocation(doc);

    doc.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || !form.querySelector) return;
      var input = form.querySelector('input[name="search_query"], input[name="query"]');
      var action = form.getAttribute('action') || '';
      if (!input || !String(input.value || '').trim()) return;
      if (!/youtube\.com$/i.test((new URL(doc.location.href).hostname)) && !/\/results/i.test(action)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var target = new URL('/results', 'https://www.youtube.com/');
      target.searchParams.set('search_query', String(input.value).trim());
      navigateFrameTo(target.href);
    }, true);

    doc.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('button, a') : null;
      if (!el) return;
      var form = el.closest ? el.closest('form') : null;
      if (!form) return;
      var input = form.querySelector('input[name="search_query"], input[name="query"]');
      if (!input || !String(input.value || '').trim()) return;
      var label = (el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
      var action = form.getAttribute('action') || '';
      if (!/search/.test(label) && !/\/results/i.test(action)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var target = new URL('/results', 'https://www.youtube.com/');
      target.searchParams.set('search_query', String(input.value).trim());
      navigateFrameTo(target.href);
    }, true);
  }

  function onFrameLoad() {
    frame = findFrame();
    address = findAddress();
    if (!frame) return;
    var src = frame.getAttribute('src') || frame.src || '';
    if (src === lastFrameSrc) {
      try { installYoutubeSearch(frame.contentDocument); } catch (_) {}
      return;
    }
    lastFrameSrc = src;
    if (tabs[active]) {
      tabs[active].url = src;
      tabs[active].title = titleFor(src);
    }
    if (address) address.value = src ? originalUrl(src) : '';
    renderTabs();
    try { installYoutubeSearch(frame.contentDocument); } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById('neo-browser-tab-styles')) return;
    var s = document.createElement('style');
    s.id = 'neo-browser-tab-styles';
    s.textContent = '.neo-browser-tabs{display:flex!important;align-items:center!important;gap:6px!important;width:100%!important;margin:8px auto!important;padding:0 8px!important;overflow-x:auto!important;position:relative!important;z-index:2147483000!important;pointer-events:auto!important;min-height:38px!important}.neo-browser-tabs::-webkit-scrollbar{display:none}.neo-tab,.neo-tab-new{appearance:none!important;height:34px!important;border:1px solid rgba(255,255,255,.14)!important;background:rgba(8,9,14,.96)!important;color:rgba(255,255,255,.75)!important;border-radius:9px!important;padding:0 10px!important;display:flex!important;align-items:center!important;gap:9px!important;white-space:nowrap!important;cursor:pointer!important;pointer-events:auto!important;position:relative!important;z-index:2147483001!important}.neo-tab{min-width:125px!important;max-width:220px!important;justify-content:space-between!important}.neo-tab:hover,.neo-tab-new:hover{color:#fff!important;background:rgba(255,255,255,.1)!important}.neo-tab.active{color:#fff!important;border-color:hsl(var(--accent)/.65)!important;box-shadow:0 0 16px hsl(var(--accent)/.14)!important}.neo-tab-title{overflow:hidden;text-overflow:ellipsis}.neo-tab-close{font-size:18px!important;line-height:1!important;opacity:.7!important}.neo-tab-close:hover{opacity:1!important;color:hsl(var(--accent))!important}.neo-tab-new{width:36px!important;min-width:36px!important;justify-content:center!important;font-size:21px!important;padding:0!important;flex:none!important}';
    document.head.appendChild(s);
  }

  function install() {
    if (!isBrowserPage()) {
      if (tabStrip && tabStrip.isConnected) tabStrip.remove();
      tabStrip = null;
      return;
    }
    injectStyles();
    frame = findFrame();
    address = findAddress();
    if (!frame) return;

    if (!tabs.length) {
      tabs.push(makeTab(frame.getAttribute('src') || frame.src || ''));
      active = 0;
    }
    ensureStrip();
    renderTabs();

    if (!frame.__neoTabLoad) {
      frame.addEventListener('load', onFrameLoad, false);
      frame.__neoTabLoad = true;
    }

    if (address && !address.__neoAddress) {
      address.__neoAddress = true;
      address.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        navigate(address.value);
      }, true);
    }

    if (tabStrip && !tabStrip.__neoClicks) {
      tabStrip.__neoClicks = true;
      tabStrip.addEventListener('click', function (e) {
        var close = e.target && e.target.closest ? e.target.closest('.neo-tab-close') : null;
        var tab = e.target && e.target.closest ? e.target.closest('.neo-tab') : null;
        if (close && tab) {
          e.preventDefault();
          e.stopPropagation();
          closeTab(Number(tab.dataset.index));
          return;
        }
        if (tab) {
          e.preventDefault();
          e.stopPropagation();
          switchTab(Number(tab.dataset.index));
          return;
        }
        if (e.target && e.target.closest && e.target.closest('.neo-tab-new')) {
          e.preventDefault();
          e.stopPropagation();
          newTab();
        }
      }, true);
    }
  }

  setInterval(install, 350);
  setTimeout(install, 0);
})();
