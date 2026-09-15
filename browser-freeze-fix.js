(function () {
  'use strict';
  if (window.__neoBrowserFreezeFix) return;
  window.__neoBrowserFreezeFix = true;

  // browser-enhancer watches the whole React document. Its own tab rendering
  // also changes that document, so without filtering its observer can react to
  // its own changes forever. Ignore mutations originating inside the tab strip.
  var NativeObserver = window.MutationObserver;
  if (!NativeObserver) return;

  window.MutationObserver = function (callback) {
    var wrapped = function (mutations, observer) {
      var filtered = mutations.filter(function (m) {
        var node = m && m.target;
        try {
          return !(node && node.closest && node.closest('.neo-browser-tabs'));
        } catch (_) {
          return true;
        }
      });
      if (filtered.length) callback(filtered, observer);
    };
    return new NativeObserver(wrapped);
  };

  window.MutationObserver.prototype = NativeObserver.prototype;
})();
