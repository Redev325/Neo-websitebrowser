(function () {
  'use strict';
  if (window.__neoBrowserEnhancer) return;
  window.__neoBrowserEnhancer = true;

  var tabs = [];
  var active = 0;
  var tabStrip = null;
  var frame = null;
  var address = null;
  var syncing = false;

  function proxyFor(url) {
    try {
      var u = new URL(url, location.href);
      if (!/^https?:$/i.test(u.protocol)) return url;
      return location.origin + '/api/proxy?url=' + encodeURIComponent(u.href);
    } catch (_) { return url; }
  }
  function originalUrl(url) {
    try {
      var u = new URL(url, location.href);
      if (u.pathname === '/api/proxy') return decodeURIComponent(u.searchParams.get('url') || url);
      return url;
    } catch (_) { return url; }
  }
  function pretty(url) {
    try {
      var u = new URL(originalUrl(url));
      return u.hostname.replace(/^www\./, '') || 'New Tab';
    } catch (_) { return 'New Tab'; }
  }
  function findFrame() { return document.querySelector('iframe.neo-browser-frame'); }
  function findAddress() { return document.querySelector('.neo-browser-input'); }
  function makeTab(url, title) { return { url: url || '', title: title || (url ? pretty(url) : 'New Tab') }; }

  function ensureTabForCurrent() {
    frame = findFrame();
    address = findAddress();
    if (!frame) return;
    var current = frame.getAttribute('src') || frame.src || '';
    if (!tabs.length) tabs.push(makeTab(current));
    if (!tabs[active]) tabs[active] = makeTab(current);
    if (current && tabs[active].url !== current) {
      tabs[active].url = current;
      tabs[active].title = pretty(current);
    }
    renderTabs();
  }

  function renderTabs() {
    if (!tabStrip) return;
    tabStrip.innerHTML = '';
    tabs.forEach(function (tab, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'neo-tab' + (index === active ? ' active' : '');
      button.title = tab.url ? originalUrl(tab.url) : 'New Tab';
      var label = document.createElement('span');
      label.className = 'neo-tab-title';
      label.textContent = tab.title || 'New Tab';
      var close = document.createElement('span');
      close.className = 'neo-tab-close';
      close.textContent = '×';
      close.setAttribute('aria-label', 'Close tab');
      button.appendChild(label);
      button.appendChild(close);
      button.addEventListener('click', function (e) {
        if (e.target === close) { closeTab(index); return; }
        switchTab(index);
      });
      tabStrip.appendChild(button);
    });
    var plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'neo-tab-new';
    plus.textContent = '+';
    plus.title = 'New tab';
    plus.addEventListener('click', newTab);
    tabStrip.appendChild(plus);
  }

  function switchTab(index) {
    if (!tabs[index]) return;
    active = index;
    frame = findFrame();
    address = findAddress();
    if (frame) {
      syncing = true;
      frame.src = tabs[index].url || 'about:blank';
      setTimeout(function () { syncing = false; }, 250);
    }
    if (address) address.value = tabs[index].url ? originalUrl(tabs[index].url) : '';
    renderTabs();
  }

  function newTab() {
    tabs.push(makeTab(''));
    active = tabs.length - 1;
    frame = findFrame();
    address = findAddress();
    if (frame) frame.src = 'about:blank';
    if (address) { address.value = ''; address.focus(); }
    renderTabs();
  }

  function closeTab(index) {
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
    if (active >= tabs.length) active = tabs.length - 1;
    if (active > index) active--;
    switchTab(active);
  }

  function navigate(url) {
    var value = (url || '').trim();
    if (!value) return;
    var target = value;
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
    var proxied = proxyFor(target);
    if (!tabs.length) tabs.push(makeTab(''));
    tabs[active].url = proxied;
    tabs[active].title = pretty(proxied);
    frame = findFrame();
    address = findAddress();
    if (frame) frame.src = proxied;
    if (address) address.value = target;
    renderTabs();
  }

  function onFrameLoad() {
    if (!frame || syncing) return;
    var src = frame.getAttribute('src') || frame.src || '';
    if (!src || src === 'about:blank') return;
    if (!tabs.length) tabs.push(makeTab(src));
    tabs[active].url = src;
    tabs[active].title = pretty(src);
    if (address) address.value = originalUrl(src);
    renderTabs();
  }

  function injectStyles() {
    if (document.getElementById('neo-browser-tab-styles')) return;
    var s = document.createElement('style');
    s.id = 'neo-browser-tab-styles';
    s.textContent = '.neo-browser-tabs{display:flex;align-items:center;gap:5px;width:min(100%,1400px);margin:8px auto 0;padding:0 5px;overflow-x:auto;scrollbar-width:none}.neo-browser-tabs::-webkit-scrollbar{display:none}.neo-tab,.neo-tab-new{height:34px;border:1px solid rgba(255,255,255,.1);background:rgba(8,9,14,.72);color:rgba(255,255,255,.68);border-radius:10px 10px 6px 6px;padding:0 9px;display:flex;align-items:center;gap:8px;white-space:nowrap;transition:.18s}.neo-tab{min-width:120px;max-width:210px;justify-content:space-between}.neo-tab:hover,.neo-tab-new:hover{color:#fff;border-color:hsl(var(--accent)/.4);background:rgba(255,255,255,.08)}.neo-tab.active{color:#fff;border-color:hsl(var(--accent)/.55);box-shadow:0 0 18px hsl(var(--accent)/.12);background:rgba(255,255,255,.1)}.neo-tab-title{overflow:hidden;text-overflow:ellipsis}.neo-tab-close{font-size:17px;line-height:1;opacity:.65}.neo-tab-close:hover{opacity:1;color:hsl(var(--accent))}.neo-tab-new{width:34px;justify-content:center;font-size:21px;padding:0;flex:none}.neo-browser-tabs + main{padding-top:10px!important}';
    document.head.appendChild(s);
  }

  function install() {
    if (location.pathname !== '/Browser') return;
    injectStyles();
    frame = findFrame();
    address = findAddress();
    if (!tabStrip) {
      tabStrip = document.createElement('div');
      tabStrip.className = 'neo-browser-tabs';
      var header = document.querySelector('header');
      if (header) header.insertAdjacentElement('afterend', tabStrip);
    }
    ensureTabForCurrent();
    frame = findFrame();
    address = findAddress();
    if (frame && !frame.__neoTabLoad) { frame.addEventListener('load', onFrameLoad); frame.__neoTabLoad = true; }
    if (address && !address.__neoAddress) {
      address.__neoAddress = true;
      address.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var v = address.value.trim();
        if (/^https?:\/\//i.test(v) || /^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(v)) {
          e.preventDefault();
          e.stopPropagation();
          navigate(v);
        }
      }, true);
    }
  }

  var observer = new MutationObserver(function () { install(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', function () { setTimeout(install, 50); });
  setInterval(install, 700);
  setTimeout(install, 0);
})();
