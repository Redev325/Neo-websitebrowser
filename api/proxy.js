const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "169.254.169.254", "metadata.google.internal"
]);

function isPrivateIPv4(host) {
  const p = host.split(".").map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) return false;
  const [a, b] = p;
  return a === 10 || a === 127 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function blocked(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return BLOCKED_HOSTS.has(h) || h.endsWith(".local") ||
    h.endsWith(".internal") || isPrivateIPv4(h);
}

function targetUrl(raw, base) {
  try {
    const u = new URL(raw, base);
    if (!["http:", "https:"].includes(u.protocol) || blocked(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

function makeProx(proxyOrigin) {
  return (u) => proxyOrigin + "/api/proxy?url=" + encodeURIComponent(u.toString());
}

function buildPageBridge(proxyOrigin, pageBase) {
  const originJson = JSON.stringify(proxyOrigin);
  const baseJson = JSON.stringify(pageBase);
  return `<style id=\"neo-proxy-cursor-style\">html,body,*{cursor:none!important}</style>\n<script id=\"neo-proxy-bridge\">(function(){\nif(window.__neoProxyBridge)return;window.__neoProxyBridge=1;\nvar PROXY_ORIGIN=${originJson};\nvar PAGE_BASE=${baseJson};\n\nvar DIRECT_IFRAME_HOSTS=/snokido\\.com$|wgplayer\\.com$|crazygames\\.com$|gamepix\\.com$|gamedistribution\\.com$|itch\\.io$|newgrounds\\.com$|kongregate\\.com$|poki\\.com$|y8\\.com$|coolmathgames\\.com$|html5\\.|unity3d\\.|unityusercontent\\.|kbhgames\\.com$|kbh\\./i;\n\nvar styleEl=document.getElementById('neo-proxy-cursor-style');\nfunction setNative(on){if(styleEl)styleEl.textContent=on?'html,body,*{cursor:auto!important}':'html,body,*{cursor:none!important}'}\nfunction gameCursorMode(){return !!(document.pointerLockElement||document.fullscreenElement||document.webkitFullscreenElement)}\nfunction syncCursorMode(){setNative(gameCursorMode())}\ndocument.addEventListener('pointerlockchange',syncCursorMode);\ndocument.addEventListener('fullscreenchange',syncCursorMode);\ndocument.addEventListener('webkitfullscreenchange',syncCursorMode);\nfunction screenPoint(e){var x=e.clientX,y=e.clientY;try{var f=window.frameElement;if(f){var r=f.getBoundingClientRect();x+=r.left;y+=r.top}}catch(_){}return{x:x,y:y}}\nfunction send(e,click){if(gameCursorMode())return;var p=screenPoint(e);try{parent.postMessage({source:'neo-browser-cursor',x:p.x,y:p.y,click:!!click},'*')}catch(_){}}\ndocument.addEventListener('mousemove',function(e){send(e,false)},{passive:true});\ndocument.addEventListener('mousedown',function(e){send(e,true)},{passive:true});\ndocument.addEventListener('mouseleave',function(){try{parent.postMessage({source:'neo-browser-cursor',leave:true},'*')}catch(_){}},{passive:true});\nwindow.addEventListener('message',function(e){var d=e&&e.data;if(!d||d.source!=='neo-browser-shell')return;if('nativeCursor' in d)setNative(!!d.nativeCursor||gameCursorMode())},{passive:true});\ntry{parent.postMessage({source:'neo-browser-cursor',hello:true},'*')}catch(_){}\nsyncCursorMode();\n\nfunction toProxy(url){\n  try{\n    if(url==null||url==='')return null;\n    var s=String(url);\n    if(/^(data:|blob:|javascript:|mailto:|tel:|#|about:)/i.test(s))return null;\n    var u=new URL(s,PAGE_BASE||location.href);\n    if(u.protocol!=='http:'&&u.protocol!=='https:')return null;\n    if(u.href.indexOf('/api/proxy?url=')!==-1)return null;\n    return PROXY_ORIGIN+'/api/proxy?url='+encodeURIComponent(u.toString());\n  }catch(_){return null;}\n}\n\nfunction shouldProxyIframe(url){\n  try{\n    var u=new URL(String(url),PAGE_BASE||location.href);\n    if(DIRECT_IFRAME_HOSTS.test(u.hostname))return false;\n    if(/\\/embed\\//i.test(u.pathname))return false;\n    if(/\\/games\\//i.test(u.pathname)&&/webgl|unity|html5/i.test(u.pathname))return false;\n    return true;\n  }catch(_){return true;}\n}\n\nvar _fetch=window.fetch;\nwindow.fetch=function(input,init){\n  try{\n    var url=typeof input==='string'?input:(input&&input.url)||'';\n    var proxied=toProxy(url);\n    if(proxied){\n      if(typeof input==='string')input=proxied;\n      else if(typeof Request!=='undefined'&&input instanceof Request)input=new Request(proxied,input);\n    }\n  }catch(_){}\n  return _fetch.call(this,input,init);\n};\nvar XO=XMLHttpRequest.prototype.open;\nXMLHttpRequest.prototype.open=function(method,url){\n  try{var proxied=toProxy(url);if(proxied)arguments[1]=proxied;}catch(_){}\n  return XO.apply(this,arguments);\n};\n\ntry{\n  var _Worker=window.Worker;\n  window.Worker=function(scriptURL,options){var p=toProxy(scriptURL);return new _Worker(p||scriptURL,options);};\n  window.Worker.prototype=_Worker.prototype;\n}catch(_){}\ntry{\n  if(window.SharedWorker){\n    var _SW=window.SharedWorker;\n    window.SharedWorker=function(scriptURL,options){var p=toProxy(scriptURL);return new _SW(p||scriptURL,options);};\n    window.SharedWorker.prototype=_SW.prototype;\n  }\n}catch(_){}\n\nfunction enhanceGameIframe(el){\n  try{\n    var allow=el.getAttribute('allow')||'';\n    ['autoplay','fullscreen','pointer-lock','gamepad','clipboard-write'].forEach(function(a){\n      if(allow.indexOf(a)===-1)allow+=(allow?',':'')+a;\n    });\n    el.setAttribute('allow',allow);\n    if(!el.hasAttribute('allowfullscreen'))el.setAttribute('allowfullscreen','');\n  }catch(_){}\n}\ntry{\n  var iframeProto=HTMLIFrameElement.prototype;\n  var srcDesc=Object.getOwnPropertyDescriptor(iframeProto,'src');\n  if(srcDesc&&srcDesc.set){\n    var origSrcSet=srcDesc.set,origSrcGet=srcDesc.get;\n    Object.defineProperty(iframeProto,'src',{\n      configurable:true,enumerable:true,\n      get:function(){return origSrcGet.call(this);},\n      set:function(v){\n        var finalUrl=v;\n        if(shouldProxyIframe(v)){\n          var p=toProxy(v);\n          if(p)finalUrl=p;\n        }\n        origSrcSet.call(this,finalUrl);\n        enhanceGameIframe(this);\n      }\n    });\n  }\n}catch(_){}\ntry{\n  var _setAttr=Element.prototype.setAttribute;\n  Element.prototype.setAttribute=function(name,value){\n    if(this.tagName==='IFRAME'&&name&&String(name).toLowerCase()==='src'){\n      if(shouldProxyIframe(value)){\n        var p=toProxy(value);\n        if(p)value=p;\n      }\n      enhanceGameIframe(this);\n    }\n    return _setAttr.call(this,name,value);\n  };\n}catch(_){}\n\ntry{\n  var mo=new MutationObserver(function(muts){\n    muts.forEach(function(m){\n      m.addedNodes&&m.addedNodes.forEach(function(n){\n        if(n.nodeType!==1)return;\n        var list=n.tagName==='IFRAME'?[n]:(n.querySelectorAll?n.querySelectorAll('iframe'):[]);\n        Array.prototype.forEach.call(list,function(f){\n          enhanceGameIframe(f);\n          var s=f.getAttribute('src');\n          if(!s||!shouldProxyIframe(s))return;\n          var p=toProxy(s);\n          if(p&&p!==s)f.setAttribute('src',p);\n        });\n      });\n    });\n  });\n  mo.observe(document.documentElement,{childList:true,subtree:true});\n}catch(_){}\n\nfunction proxyNavigate(href){\n  var proxied=toProxy(href);\n  if(!proxied)return false;\n  location.href=proxied;\n  return true;\n}\ndocument.addEventListener('click',function(e){\n  var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;\n  if(!a)return;\n  var href=a.getAttribute('href');\n  if(!href||href.charAt(0)==='#'||/^(javascript:|mailto:|tel:)/i.test(href))return;\n  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;\n  if(a.target&&a.target!=='_self'&&a.target!=='')return;\n  if(proxyNavigate(href)){e.preventDefault();e.stopPropagation();}\n},true);\ndocument.addEventListener('submit',function(e){\n  var form=e.target;\n  if(!form)return;\n  try{\n    var action=form.getAttribute('action')||PAGE_BASE;\n    var method=(form.getAttribute('method')||'GET').toUpperCase();\n    if(method!=='GET')return;\n    var u=new URL(action,PAGE_BASE||location.href);\n    var fd=new FormData(form);\n    fd.forEach(function(v,k){u.searchParams.append(k,v);});\n    if(proxyNavigate(u.toString())){e.preventDefault();e.stopPropagation();}\n  }catch(_){}\n},true);\ntry{\n  var _assign=Location.prototype.assign,_replace=Location.prototype.replace;\n  Location.prototype.assign=function(url){var p=toProxy(url);return _assign.call(this,p||url);};\n  Location.prototype.replace=function(url){var p=toProxy(url);return _replace.call(this,p||url);};\n}catch(_){}\n\nfunction rewriteHistoryUrl(url){\n  if(url==null||url==='')return null;\n  try{\n    var s=String(url);\n    if(s.indexOf('/api/proxy?url=')!==-1)return null;\n    if(s.charAt(0)==='#')return null;\n    var u=new URL(s,PAGE_BASE||location.href);\n    if(u.origin===location.origin && u.pathname.indexOf('/api/proxy')!==0){\n      u=new URL(u.pathname+u.search+u.hash,PAGE_BASE);\n    }\n    if(u.protocol!=='http:'&&u.protocol!=='https:')return null;\n    return toProxy(u.href);\n  }catch(_){return null;}\n}\ntry{\n  var _push=history.pushState.bind(history);\n  var _repl=history.replaceState.bind(history);\n  history.pushState=function(state,title,url){\n    if(url!=null){\n      var p=rewriteHistoryUrl(url);\n      if(p){location.href=p;return;}\n    }\n    return _push(state,title,url);\n  };\n  history.replaceState=function(state,title,url){\n    if(url!=null){\n      var p=rewriteHistoryUrl(url);\n      if(p){location.href=p;return;}\n    }\n    return _repl(state,title,url);\n  };\n}catch(_){}\n})();</script>`;
}

function rewriteAttr(tag, attr, base, prox) {
  const re = new RegExp("(" + attr + "\\s*=\\s*[\\\"'])([^\\\"']+)([\\\"'])", "i");
  return tag.replace(re, (all, a, raw, b) => {
    if (!raw || /^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(raw)) return all;
    const u = targetUrl(raw, base);
    return u ? a + prox(u) + b : all;
  });
}

function rewriteHtml(html, base, proxyOrigin) {
  const prox = makeProx(proxyOrigin);
  const bridge = buildPageBridge(proxyOrigin, base);

  html = html.replace(
    /<(img|script|source|video|audio|track|embed|object)\\b[^>]*>/gi,
    (tag) => {
      let out = tag;
      for (const a of ["src", "data-src", "poster", "data"]) out = rewriteAttr(out, a, base, prox);
      return out;
    }
  );

  html = html.replace(/<iframe\\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\\bsrc\\s*=\\s*[\\\"']([^\\\"']+)[\\\"']/i);
    if (srcMatch) {
      try {
        const u = new URL(srcMatch[1], base);
        if (/snokido\\.com$|wgplayer\\.com$|crazygames\\.com$|gamepix\\.com$|gamedistribution\\.com$|itch\\.io$|poki\\.com$|y8\\.com$|kbhgames\\.com$/i.test(u.hostname)) {
          return tag;
        }
        if (/\\/embed\\//i.test(u.pathname)) return tag;
      } catch {}
    }
    return rewriteAttr(tag, "src", base, prox);
  });

  html = html.replace(/<link\\b[^>]*>/gi, (tag) => {
    const rel = (tag.match(/\\brel\\s*=\\s*[\\\"']([^\\\"']+)[\\\"']/i)?.[1] || "").toLowerCase();
    if (!/(stylesheet|icon|preload|modulepreload|apple-touch-icon)/.test(rel)) return tag;
    return rewriteAttr(tag, "href", base, prox);
  });

  html = html.replace(/<a\\b[^>]*>/gi, (tag) => rewriteAttr(tag, "href", base, prox));
  html = html.replace(/<form\\b[^>]*>/gi, (tag) => rewriteAttr(tag, "action", base, prox));

  html = html.replace(/\\b(srcset)\\s*=\\s*([\\\"'])(.*?)\\2/gi, (all, attr, q, value) => {
    const parts = value.split(",").map((part) => {
      const m = part.trim().match(/^(\\S+)(\\s+.*)?$/);
      if (!m) return part;
      const u = targetUrl(m[1], base);
      return u ? prox(u) + (m[2] || "") : part;
    });
    return `${attr}=${q}${parts.join(", ")}${q}`;
  });

  html = html.replace(/\\bstyle\\s*=\\s*([\\\"'])(.*?)\\1/gi, (all, q, value) => {
    const rewritten = value.replace(/url\\(\\s*(['\\\"]?)([^'\\\")]+)\\1\\s*\\)/gi, (x, qq, raw) => {
      const u = targetUrl(raw.trim(), base);
      return u ? `url(\"${prox(u)}\")` : x;
    });
    return `style=${q}${rewritten}${q}`;
  });

  html = html.replace(/<meta\\b[^>]*http-equiv\\s*=\\s*[\\\"']content-security-policy[\\\"'][^>]*>/gi, "");
  html = html.replace(/<meta\\b[^>]*content-security-policy[^>]*>/gi, "");
  html = html.replace(/<meta\\b[^>]*http-equiv\\s*=\\s*[\\\"']content-security-policy-report-only[\\\"'][^>]*>/gi, "");
  html = html.replace(/<meta\\b[^>]*http-equiv\\s*=\\s*[\\\"']x-frame-options[\\\"'][^>]*>/gi, "");

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, (m) => m + bridge);
  } else if (/<\\/body>/i.test(html)) {
    html = html.replace(/<\\/body>/i, bridge + "</body>");
  } else {
    html += bridge;
  }
  return html;
}

function rewriteCss(css, base, proxyOrigin) {
  const prox = makeProx(proxyOrigin);
  return css.replace(/url\\(\\s*(['\\\"]?)([^'\\\")]+)\\1\\s*\\)/gi, (all, q, raw) => {
    const u = targetUrl(raw.trim(), base);
    return u ? `url(\"${prox(u)}\")` : all;
  });
}

function charsetOf(contentType) {
  const m = contentType.match(/charset=([^;]+)/i);
  return m ? m[1].trim().replace(/^[\\\"']|[\\\"']$/g, "") : "utf-8";
}

function isCacheableType(type, urlPath) {
  const t = (type || "").toLowerCase();
  const p = (urlPath || "").toLowerCase();
  return (
    t.includes("image/") ||
    t.includes("font/") ||
    t.includes("text/css") ||
    t.includes("javascript") ||
    t.includes("application/javascript") ||
    t.includes("application/wasm") ||
    t.includes("application/octet-stream") ||
    t.includes("application/json") ||
    t.includes("application/font") ||
    t.includes("woff") ||
    t.includes("audio/") ||
    t.includes("video/") ||
    /\\.(wasm|data|bundle|pak|unity3d|pck|assets)(\\?|$)/i.test(p)
  );
}

function getProxyOrigin(req) {
  const xfProto = (req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const xfHost = (req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = xfHost || req.headers.host || "localhost";
  const proto = xfProto || (host.includes("localhost") ? "http" : "https");
  return proto + "://" + host;
}

async function fetchChecked(start, req) {
  let current = start;
  for (let i = 0; i < 6; i++) {
    const headers = {
      accept:
        req.headers.accept ||
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": req.headers["accept-language"] || "en-US,en;q=0.9",
      "user-agent":
        req.headers["user-agent"] ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      referer: current.origin + "/",
      "upgrade-insecure-requests": "1",
      "accept-encoding": "identity",
    };
    if (req.headers.cookie) headers.cookie = req.headers.cookie;
    if (req.headers.range) headers.range = req.headers.range;

    const r = await fetch(current.toString(), {
      redirect: "manual",
      headers,
      signal: AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined,
    });

    if (!(r.status >= 300 && r.status < 400)) return { r, current };
    const loc = r.headers.get("location");
    if (!loc) return { r, current };
    const next = targetUrl(loc, current);
    if (!next) return { blocked: true };
    current = next;
  }
  return { tooMany: true };
}

function searchQueryOf(u) {
  const host = u.hostname.toLowerCase();
  const isBing = host === "www.bing.com" || host === "bing.com";
  if (!isBing) return null;
  if (!/^\\/search\\/?$/.test(u.pathname)) return null;
  const q = u.searchParams.get("q");
  return q ? q.trim() : null;
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, "");
}

function decodeEntities(s) {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function clean(s) {
  return decodeEntities(stripTags(s)).replace(/\\s+/g, " ").trim();
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

function resolveBingLink(href) {
  const url = decodeEntities(href);
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host.endsWith("bing.com")) {
    try {
      const enc = new URL(url).searchParams.get("u");
      if (enc && enc.startsWith("a1")) {
        const real = Buffer.from(enc.slice(2), "base64url").toString("utf-8");
        if (/^https?:\\/\\//i.test(real)) return real;
      }
    } catch {}
    return null;
  }
  if (host.endsWith("microsoft.com") || host.endsWith("msn.com")) return null;
  return url;
}

function parseBingResults(html) {
  const results = [];
  const seen = new Set();
  const marker = 'class="b_algo';
  let idx = html.indexOf(marker);
  while (idx !== -1 && results.length < 15) {
    const next = html.indexOf(marker, idx + marker.length);
    const block = html.slice(idx, next === -1 ? html.length : next);

    const linkMatch = block.match(
      /<h2[^>]*>[\\s\\S]*?<a\\b[^>]*href=[\"']([^\"']+)[\"'][^>]*>([\\s\\S]*?)<\\/a>/i
    );
    if (linkMatch) {
      const url = resolveBingLink(linkMatch[1]);
      const title = clean(linkMatch[2]);
      const snipMatch = block.match(/<p\\b[^>]*>([\\s\\S]*?)<\\/p>/i);
      const snippet = snipMatch ? clean(snipMatch[1]) : "";

      if (url && title && !seen.has(url)) {
        seen.add(url);
        let display = url;
        try {
          const uu = new URL(url);
          display =
            uu.hostname.replace(/^www\\./, "") +
            (uu.pathname === "/" ? "" : uu.pathname);
        } catch {}
        results.push({ url, title, snippet, display });
      }
    }
    idx = next;
  }
  return results;
}

function renderSearchPage(query, results, proxyOrigin) {
  const prox = makeProx(proxyOrigin);
  const bridge = buildPageBridge(proxyOrigin, "https://www.bing.com/");
  const q = escapeHtml(query);
  const items = results
    .map(
      (r) => `\n      <article class=\"res\">\n        <a class=\"res-url\" href=\"${escapeHtml(prox(new URL(r.url)))}\">${escapeHtml(r.display)}</a>\n        <a class=\"res-title\" href=\"${escapeHtml(prox(new URL(r.url)))}\">${escapeHtml(r.title)}</a>\n        ${r.snippet ? `<p class=\"res-snip\">${escapeHtml(r.snippet)}</p>` : ""}\n      </article>`
    )
    .join("");

  const empty = `<div class=\"empty\"><div class=\"empty-orb\"></div><p>No results found for <strong>${q}</strong>.</p><p class=\"empty-sub\">Try a different search or enter a full URL.</p></div>`;

  return `<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>${q} — Neo Search</title>\n<style>\n  :root{--bg:#0a0a0b;--panel:#111114;--border:#1f1f24;--text:#e7e7ea;--muted:#8a8a93;--accent:#ff2d2d;--link:#8ab4ff;}\n  *{box-sizing:border-box}\n  html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;cursor:none}\n  .wrap{max-width:720px;margin:0 auto;padding:28px 24px 80px}\n  header{display:flex;align-items:center;gap:10px;padding-bottom:18px;border-bottom:1px solid var(--border);margin-bottom:24px}\n  .mark{width:38px;height:38px;object-fit:contain;flex:0 0 auto;filter:drop-shadow(0 0 10px rgba(255,45,45,.5))}\n  .wordmark{height:40px;width:auto;object-fit:contain;display:block}\n  .meta{color:var(--muted);font-size:13px;margin:0 0 20px}\n  .meta strong{color:var(--text)}\n  .res{padding:14px 0;border-bottom:1px solid rgba(255,255,255,.04)}\n  .res-url{display:block;color:var(--muted);font-size:12.5px;text-decoration:none;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n  .res-title{display:block;color:var(--link);font-size:18px;line-height:1.35;text-decoration:none}\n  .res-title:hover{text-decoration:underline}\n  .res-snip{color:#c4c4cc;font-size:14px;line-height:1.5;margin:6px 0 0}\n  .empty{text-align:center;padding:60px 0;color:var(--muted)}\n  .empty-orb{width:56px;height:56px;border-radius:50%;margin:0 auto 18px;background:radial-gradient(circle at 50% 45%,#fff 0%,#ff5a5a 30%,var(--accent) 60%,#7a0000 100%);box-shadow:0 0 26px rgba(255,45,45,.5)}\n  .empty-sub{font-size:13px;margin-top:6px}\n  footer{margin-top:34px;text-align:center;color:var(--muted);font-size:12px}\n</style>\n</head>\n<body>\n  <div class=\"wrap\">\n    <header>\n      <img class=\"mark\" src=\"/assets/neo-logo-diamond.png\" alt=\"Neo\" />\n      <img class=\"wordmark\" src=\"/assets/neo-search-wordmark.png\" alt=\"Neo Search\" />\n    </header>\n    <p class=\"meta\">Results for <strong>${q}</strong></p>\n    ${results.length ? items : empty}\n    <footer>Neo Browser · Use responsibly</footer>\n  </div>\n  ${bridge}\n</body>\n</html>`;
}

module.exports = async function handler(req, res) {
  const raw = req.query?.url;
  if (!raw || typeof raw !== "string") return res.status(400).send("Missing ?url=");
  const target = targetUrl(raw);
  if (!target) return res.status(400).send("Invalid or blocked URL");

  const proxyOrigin = getProxyOrigin(req);

  try {
    const result = await fetchChecked(target, req);
    if (result.blocked) return res.status(403).send("Redirect destination is blocked");
    if (result.tooMany) return res.status(502).send("Too many redirects");

    const { r, current } = result;
    const type = r.headers.get("content-type") || "";
    const body = await r.arrayBuffer();

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    if (isCacheableType(type, current.pathname)) {
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    } else {
      res.setHeader("Cache-Control", "no-store");
    }

    const status = r.status;

    if (type.toLowerCase().includes("text/html")) {
      const text = new TextDecoder(charsetOf(type)).decode(body);

      const query = searchQueryOf(current);
      if (query) {
        const results = parseBingResults(text);
        if (results.length) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          return res.status(200).send(renderSearchPage(query, results, proxyOrigin));
        }
      }

      const html = rewriteHtml(text, current.toString(), proxyOrigin);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(status).send(html);
    }

    if (type.toLowerCase().includes("text/css")) {
      const text = new TextDecoder(charsetOf(type)).decode(body);
      const css = rewriteCss(text, current.toString(), proxyOrigin);
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      return res.status(status).send(css);
    }

    let outType = type || "application/octet-stream";
    if (!type && /\\.wasm$/i.test(current.pathname)) outType = "application/wasm";
    res.setHeader("Content-Type", outType);

    const cr = r.headers.get("content-range");
    if (cr) res.setHeader("Content-Range", cr);
    const ar = r.headers.get("accept-ranges");
    if (ar) res.setHeader("Accept-Ranges", ar);

    return res.status(status).send(Buffer.from(body));
  } catch (e) {
    console.error(e);
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) {
      return res.status(504).send("Upstream timed out");
    }
    return res.status(502).send("Proxy request failed");
  }
};
