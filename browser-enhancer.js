(function () {
  'use strict';
  if (window.__neoBrowserEnhancer) return;
  window.__neoBrowserEnhancer = true;

  var tabs = [];
  var active = 0;
  var tabStrip = null;
  var frame = null;
  var address = null;
  var HOME_TOKEN = 'neo://home';
  var lastFrameSrc = '';

  function isBrowserPage() { return /^\/browser\/?$/i.test(location.pathname); }
  function findFrame() { return document.querySelector('iframe.neo-browser-frame'); }
  function findAddress() { return document.querySelector('.neo-browser-input'); }
  function isHome(url) { return !url || url === HOME_TOKEN; }

  function originalUrl(url) {
    if (isHome(url)) return '';
    try {
      var u = new URL(url, location.href);
      if (u.pathname === '/api/proxy') return decodeURIComponent(u.searchParams.get('url') || url);
      return u.href;
    } catch (_) { return url; }
  }

  function titleFor(url) {
    if (isHome(url)) return 'Home';
    try {
      var u = new URL(originalUrl(url), location.href);
      if (/^\/Explore\/?$/i.test(u.pathname)) return 'NEO Search';
      if (/^\/api\/search$/i.test(u.pathname)) return 'NEO Search';
      return u.hostname.replace(/^www\./i, '') || 'Page';
    } catch (_) { return 'Page'; }
  }

  function proxyFor(url) {
    try {
      var u = new URL(url, location.href);
      if (!/^https?:$/i.test(u.protocol)) return url;
      if (u.origin === location.origin) return u.href;
      return location.origin + '/api/proxy?url=' + encodeURIComponent(u.href);
    } catch (_) { return url; }
  }

  function makeTab(url, title) {
    return { url: isHome(url) ? HOME_TOKEN : url, title: title || titleFor(url) };
  }

  function clickNativeHome() {
    var candidates = document.querySelectorAll('button, a, [role="button"]');
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      var label = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '')).trim().toLowerCase();
      if (label === 'home' || label.indexOf('home button') !== -1 || label.indexOf('go home') !== -1) {
        try { el.click(); return true; } catch (_) {}
      }
    }
    return false;
  }

  function showHome() {
    frame = findFrame();
    address = findAddress();
    if (!frame) return;
    if (clickNativeHome()) {
      if (address) address.value = '';
      lastFrameSrc = '';
      return;
    }
    frame.removeAttribute('src');
    frame.removeAttribute('srcdoc');
    try { frame.src = 'about:blank'; } catch (_) {}
    if (address) address.value = '';
    lastFrameSrc = '';
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
      button.title = isHome(tab.url) ? 'Neo Browser home' : originalUrl(tab.url);
      var label = document.createElement('span');
      label.className = 'neo-tab-title';
      label.textContent = tab.title || 'Home';
      var close = document.createElement('span');
      close.className = 'neo-tab-close';
      close.textContent = '×';
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
    if (isHome(tabs[index].url)) {
      showHome();
    } else if (frame) {
      frame.removeAttribute('srcdoc');
      frame.src = tabs[index].url;
      if (address) address.value = originalUrl(tabs[index].url);
    }
    renderTabs();
  }

  function newTab() {
    tabs.push(makeTab(HOME_TOKEN, 'Home'));
    active = tabs.length - 1;
    showHome();
    renderTabs();
  }

  function closeTab(index) {
    if (!tabs[index]) return;
    if (tabs.length === 1) {
      tabs[0] = makeTab(HOME_TOKEN, 'Home');
      active = 0;
      showHome();
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
    if (!tabs.length) tabs.push(makeTab(HOME_TOKEN, 'Home'));

    // A pasted Neo proxy URL must stay inside the Browser iframe instead of
    // navigating the outer Neo page to /api/proxy.
    try {
      var proxyInput = new URL(value, location.href);
      if (proxyInput.origin === location.origin && proxyInput.pathname === '/api/proxy') {
        var embeddedTarget = proxyInput.searchParams.get('url') || '';
        var restoredTarget = embeddedTarget ? decodeURIComponent(embeddedTarget) : '';
        tabs[active].url = proxyInput.href;
        tabs[active].title = titleFor(proxyInput.href);
        frame = findFrame();
        address = findAddress();
        if (frame) {
          frame.removeAttribute('srcdoc');
          frame.src = proxyInput.href;
        }
        if (address) address.value = restoredTarget || proxyInput.href;
        renderTabs();
        return;
      }
    } catch (_) {}

    var looksLikeUrl = /^https?:\/\//i.test(value) || /^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(value);
    if (!looksLikeUrl) {
      var searchUrl = location.origin + '/api/search?q=' + encodeURIComponent(value);
      tabs[active].url = searchUrl;
      tabs[active].title = 'NEO Search';
      frame = findFrame();
      address = findAddress();
      if (frame) { frame.removeAttribute('srcdoc'); frame.src = searchUrl; }
      if (address) address.value = value;
      renderTabs();
      return;
    }

    var target = /^https?:\/\//i.test(value) ? value : 'https://' + value;
    var embeddedUrl = proxyFor(target);
    tabs[active].url = embeddedUrl;
    tabs[active].title = titleFor(embeddedUrl);
    frame = findFrame();
    address = findAddress();
    if (frame) {
      frame.removeAttribute('srcdoc');
      frame.src = embeddedUrl;
    }
    if (address) address.value = target;
    renderTabs();
  }

  window.__neoBrowserEnhancerNavigate = navigate;

  function navigateFrameTo(url) {
    if (!url || !frame || !tabs[active]) return;
    var proxied = proxyFor(url);
    tabs[active].url = proxied;
    tabs[active].title = titleFor(proxied);
    frame.removeAttribute('srcdoc');
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
      e.preventDefault(); e.stopImmediatePropagation();
      var target = new URL('/results', 'https://www.youtube.com/');
      target.searchParams.set('search_query', String(input.value).trim());
      navigateFrameTo(target.href);
    }, true);
  }

  // Snokido is deliberately allowed to keep its game/asset iframes direct,
  // but the proxy bridge used to cancel Snokido's normal navigation links.
  // Catch those links here and route them through Neo's proxy/tab system.
  function installSnokidoNavigation(doc) {
    if (!doc || doc.__neoSnokidoNavigation) return;
    var page = originalUrl(frame && frame.src ? frame.src : '');
    try {
      if (!/snokido\.com$/i.test(new URL(page).hostname)) return;
    } catch (_) { return; }

    doc.__neoSnokidoNavigation = true;

    doc.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || /^(#|javascript:|mailto:|tel:|data:|blob:)/i.test(href)) return;
      try {
        var target = new URL(href, page);
        if (!/snokido\.com$/i.test(target.hostname)) return;
        e.preventDefault();
        e.stopPropagation();
        navigateFrameTo(target.href);
      } catch (_) {}
    }, true);

    doc.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || !form.getAttribute) return;
      try {
        var action = new URL(form.getAttribute('action') || page, page);
        if (!/snokido\.com$/i.test(action.hostname)) return;
        var method = (form.getAttribute('method') || 'GET').toUpperCase();
        if (method !== 'GET') return;
        e.preventDefault();
        e.stopPropagation();
        var params = new URLSearchParams(new FormData(form));
        if (params.toString()) action.search = params.toString();
        navigateFrameTo(action.href);
      } catch (_) {}
    }, true);
  }

  function onFrameLoad() {
    frame = findFrame();
    address = findAddress();
    if (!frame) return;
    if (isHome(tabs[active] && tabs[active].url)) {
      if (address) address.value = '';
      return;
    }
    var src = frame.getAttribute('src') || frame.src || '';
    if (tabs[active]) {
      tabs[active].url = src || tabs[active].url;
      tabs[active].title = titleFor(tabs[active].url);
    }
    if (address) address.value = src ? originalUrl(src) : address.value;
    renderTabs();
    try { installYoutubeSearch(frame.contentDocument); } catch (_) {}
    try { installSnokidoNavigation(frame.contentDocument); } catch (_) {}
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

    // A direct /api/proxy URL is redirected to /Browser?url=... by the
    // server. Consume that target and render it inside the Browser iframe.
    if (!window.__neoBrowserInitialUrlHandled) {
      window.__neoBrowserInitialUrlHandled = true;
      try {
        var initialParam = new URL(location.href).searchParams.get('url');
        if (initialParam) {
          var initialUrl = initialParam;
          setTimeout(function () { navigate(initialUrl); }, 0);
          try {
            history.replaceState({}, '', '/Browser');
          } catch (_) {}
        }
      } catch (_) {}
    }

    injectStyles();
    frame = findFrame();
    address = findAddress();
    if (!frame) return;

    if (!tabs.length) {
      var initial = frame.getAttribute('src') || frame.src || '';
      tabs.push(makeTab(initial || HOME_TOKEN, initial ? titleFor(initial) : 'Home'));
      active = 0;
    }

    if (isHome(tabs[active].url)) {
      var current = frame.getAttribute('src') || '';
      if (current && !/^about:blank$/i.test(current)) showHome();
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
        e.preventDefault(); e.stopPropagation();
        navigate(address.value);
      }, true);
    }

    if (tabStrip && !tabStrip.__neoClicks) {
      tabStrip.__neoClicks = true;
      tabStrip.addEventListener('click', function (e) {
        var close = e.target && e.target.closest ? e.target.closest('.neo-tab-close') : null;
        var tab = e.target && e.target.closest ? e.target.closest('.neo-tab') : null;
        if (close && tab) { e.preventDefault(); e.stopPropagation(); closeTab(Number(tab.dataset.index)); return; }
        if (tab) { e.preventDefault(); e.stopPropagation(); switchTab(Number(tab.dataset.index)); return; }
        if (e.target && e.target.closest && e.target.closest('.neo-tab-new')) { e.preventDefault(); e.stopPropagation(); newTab(); }
      }, true);
    }
  }

  setInterval(install, 250);
  setTimeout(install, 0);
})();