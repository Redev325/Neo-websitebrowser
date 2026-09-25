const { Readable } = require("stream");

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

function searchQueryOf(u) {
  const host = u.hostname.toLowerCase();
  const isBing = host === "www.bing.com" || host === "bing.com";
  if (!isBing) return null;
  if (!/^\/search\/?$/.test(u.pathname)) return null;
  const q = u.searchParams.get("q");
  return q ? q.trim() : null;
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, "");
}

function decodeEntities(s) {
  return s
    .replace(new RegExp("&" + "amp;", "g"), "&")
    .replace(new RegExp("&" + "lt;", "g"), "<")
    .replace(new RegExp("&" + "gt;", "g"), ">")
    .replace(new RegExp("&" + "quot;", "g"), '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(new RegExp("&" + "nbsp;", "g"), " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function clean(s) {
  return decodeEntities(stripTags(s)).replace(/\s+/g, " ").trim();
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
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
        if (/^https?:\/\//i.test(real)) return real;
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
    const linkMatch = block.match(/<h2[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (linkMatch) {
      const url = resolveBingLink(linkMatch[1]);
      const title = clean(linkMatch[2]);
      const snipMatch = block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
      const snippet = snipMatch ? clean(snipMatch[1]) : "";
      if (url && title && !seen.has(url)) {
        seen.add(url);
        let display = url;
        try {
          const uu = new URL(url);
          display = uu.hostname.replace(/^www\./, "") + (uu.pathname === "/" ? "" : uu.pathname);
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
  const bridge = buildBridge(proxyOrigin, "https://www.bing.com/");
  const q = escapeHtml(query);
  const items = results.map((r) =>
    '<article class="res">' +
    '<a class="res-url" href="' + escapeHtml(prox(new URL(r.url))) + '">' + escapeHtml(r.display) + '</a>' +
    '<a class="res-title" href="' + escapeHtml(prox(new URL(r.url))) + '">' + escapeHtml(r.title) + '</a>' +
    (r.snippet ? '<p class="res-snip">' + escapeHtml(r.snippet) + '</p>' : '') +
    '</article>'
  ).join("");
  const empty = '<div class="empty"><div class="empty-orb"></div><p>No results found for <strong>' + q + '</strong>.</p><p class="empty-sub">Try a different search or enter a full URL.</p></div>';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + q + ' - Neo Search</title><style>' +
    ':root{--bg:#0a0a0b;--panel:#111114;--border:#1f1f24;--text:#e7e7ea;--muted:#8a8a93;--accent:#ff2d2d;--link:#8ab4ff;}' +
    '*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;min-height:100%;cursor:none!important}' +
    '.wrap{max-width:720px;margin:0 auto;padding:28px 24px 80px}' +
    'header{display:flex;align-items:center;gap:10px;padding-bottom:18px;border-bottom:1px solid var(--border);margin-bottom:24px}' +
    '.mark{width:38px;height:38px;object-fit:contain;flex:0 0 auto;filter:drop-shadow(0 0 10px rgba(255,45,45,.5))}' +
    '.wordmark{height:40px;width:auto;object-fit:contain;display:block}' +
    '.meta{color:var(--muted);font-size:13px;margin:0 0 20px}.meta strong{color:var(--text)}' +
    '.res{padding:14px 0;border-bottom:1px solid rgba(255,255,255,.04)}' +
    '.res-url{display:block;color:var(--muted);font-size:12.5px;text-decoration:none;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.res-title{display:block;color:var(--link);font-size:18px;line-height:1.35;text-decoration:none}.res-title:hover{text-decoration:underline}' +
    '.res-snip{color:#c4c4cc;font-size:14px;line-height:1.5;margin:6px 0 0}' +
    '.empty{text-align:center;padding:60px 0;color:var(--muted)}' +
    '.empty-orb{width:56px;height:56px;border-radius:50%;margin:0 auto 18px;background:radial-gradient(circle at 50% 45%,#fff 0%,#ff5a5a 30%,var(--accent) 60%,#7a0000 100%);box-shadow:0 0 26px rgba(255,45,45,.6)}' +
    '.empty-sub{font-size:13px;margin-top:6px}' +
    'footer{margin-top:34px;text-align:center;color:var(--muted);font-size:12px}' +
    '</style></head><body><div class="wrap">' +
    '<header>' +
    '<img class="mark" src="/assets/neo-logo-diamond.png" alt="Neo" />' +
    '<img class="wordmark" src="/assets/neo-search-wordmark.png" alt="Neo Search" />' +
    '</header>' +
    '<p class="meta">Results for <strong>' + q + '</strong></p>' +
    (results.length ? items : empty) +
    '<footer>Neo Browser · Use responsibly</footer>' +
    '</div>' + bridge + '</body></html>';
}

module.exports = async function handler(req, res) {
  const raw = req.query && req.query.url;
  if (!raw || typeof raw !== "string") return res.status(400).send("Missing ?url=");
  const target = targetUrl(raw);
  if (!target) return res.status(400).send("Invalid or blocked URL");

  const xfProto = (req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const xfHost = (req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = xfHost || req.headers.host || "localhost";
  const proto = xfProto || (host.includes("localhost") ? "http" : "https");
  const proxyOrigin = proto + "://" + host;

  try {
    let current = target;
    let r;
    let usedFallback = false;

    const method = (req.method || "GET").toUpperCase();
    const hasBody = !["GET", "HEAD"].includes(method);
    let outgoingBody;
    let outgoingContentType;
    if (hasBody) {
      const ct = req.headers["content-type"] || "";
      if (req.body && Buffer.isBuffer(req.body)) {
        outgoingBody = req.body;
        outgoingContentType = ct || "application/octet-stream";
      } else if (typeof req.body === "string" && req.body.length) {
        outgoingBody = req.body;
        outgoingContentType = ct || "text/plain;charset=UTF-8";
      } else if (req.body && typeof req.body === "object" && Object.keys(req.body).length) {
        outgoingBody = JSON.stringify(req.body);
        outgoingContentType = "application/json";
      }
    }

    async function tryFetch(url, useBody) {
      const headers = {
        accept: req.headers.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": req.headers["accept-language"] || "en-US,en;q=0.9",
        "user-agent": req.headers["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        referer: url.origin + "/",
        "upgrade-insecure-requests": "1",
        "accept-encoding": "gzip, deflate, br",
      };
      if (req.headers.cookie) headers.cookie = req.headers.cookie;
      if (req.headers.range) headers.range = req.headers.range;
      if (useBody && outgoingBody !== undefined) headers["content-type"] = outgoingContentType;
      return fetch(url.toString(), {
        method,
        redirect: "manual",
        headers,
        body: useBody ? outgoingBody : undefined,
        signal: AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined,
      });
    }

    try {
      for (let i = 0; i < 6; i++) {
        r = await tryFetch(current, i === 0);
        if (!(r.status >= 300 && r.status < 400)) break;
        const loc = r.headers.get("location");
        if (!loc) break;
        const next = targetUrl(loc, current);
        if (!next) return res.status(403).send("Redirect destination is blocked");
        current = next;
      }
    } catch (fetchErr) {
      if (method !== "GET") throw fetchErr;
      try {
        const fb = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(current.toString()), { signal: AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined });
        if (fb.ok) { r = fb; usedFallback = true; } else throw fetchErr;
      } catch (_) { throw fetchErr; }
    }

    if (method === "GET" && !usedFallback && r && (r.status === 403 || r.status === 503 || r.status === 520 || r.status === 521 || r.status === 522)) {
      try {
        const fb = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(current.toString()), { signal: AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined });
        if (fb.ok) { r = fb; usedFallback = true; }
      } catch (_) {}
    }

    const type = usedFallback ? (r.headers.get("content-type") || "text/html; charset=utf-8") : (r.headers.get("content-type") || "");
    const lowerType = type.toLowerCase();

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Referrer-Policy", "unsafe-url");

    const cacheableGet = method === "GET" && !req.headers.cookie;
    if (lowerType.includes("text/html")) {
      res.setHeader("Cache-Control", cacheableGet ? "public, max-age=60, stale-while-revalidate=300" : "private, no-cache");
    } else if (cacheableGet) {
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    } else {
      res.setHeader("Cache-Control", "private, no-cache");
    }

    const rawSetCookies = typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : [];
    if (rawSetCookies.length) {
      const rewritten = rawSetCookies.map((c) => c.replace(/;\s*domain=[^;]*/i, "").replace(/;\s*samesite=[^;]*/i, "; SameSite=Lax"));
      res.setHeader("Set-Cookie", rewritten);
    }

    if (lowerType.includes("text/html") || usedFallback) {
      const body = await r.arrayBuffer();
      let html = new TextDecoder("utf-8").decode(body);
      const query = searchQueryOf(current);
      if (query) {
        const results = parseBingResults(html);
        if (results.length) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          return res.status(200).send(renderSearchPage(query, results, proxyOrigin));
        }
      }
      const bridge = buildBridge(proxyOrigin, current.toString());
      html = rewriteLinks(html, current.toString(), proxyOrigin);
      html = html.replace(/<meta\b[^>]*name\s*=\s*["']referrer["'][^>]*>/gi, "");
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, (m) => m + bridge);
      else html = bridge + html;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(r.status).send(html);
    }

    if (lowerType.includes("text/css")) {
      const body = await r.arrayBuffer();
      let css = new TextDecoder("utf-8").decode(body);
      css = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (all, q, raw) => {
        try {
          const u = new URL(raw.trim(), current.toString());
          if (u.protocol !== "http:" && u.protocol !== "https:") return all;
          return "url(\"" + proxyOrigin + "/api/proxy?url=" + encodeURIComponent(u.toString()) + "\")";
        } catch { return all; }
      });
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      return res.status(r.status).send(css);
    }

    res.setHeader("Content-Type", type || "application/octet-stream");
    const cr = r.headers.get("content-range");
    if (cr) res.setHeader("Content-Range", cr);
    const ar = r.headers.get("accept-ranges");
    if (ar) res.setHeader("Accept-Ranges", ar);

    if (r.body && typeof Readable.fromWeb === "function") {
      const stream = Readable.fromWeb(r.body);
      stream.on("error", (err) => {
        console.error("Neo proxy stream error:", err);
        if (!res.headersSent) res.status(502);
        else res.destroy();
      });
      return stream.pipe(res);
    }

    const body = await r.arrayBuffer();
    return res.status(r.status).send(Buffer.from(body));
  } catch (e) {
    console.error(e);
    const msg = (e && (e.name === "TimeoutError" || e.name === "AbortError")) ? "The site took too long to respond." : "This site could not be loaded through Neo Browser.";
    const detail = (e && e.message) ? String(e.message).slice(0, 200) : "";
    const bridge = buildBridge(proxyOrigin, "https://www.bing.com/");
    const html = "<!DOCTYPE html><html><head><meta charset=utf-8><title>Neo Browser</title>" +
      "<style>html,body{margin:0;background:#0a0a0b;color:#e7e7ea;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}" +
      ".box{text-align:center;padding:40px;max-width:420px}.t{font-size:18px;margin:0 0 10px}.s{color:#8a8a93;font-size:14px;margin:0}</style>" +
      bridge + "</head><body><div class=box><p class=t>" + msg + "</p><p class=s>" + detail.replace(/</g,"") + "</p></div></body></html>";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) return res.status(504).send(html);
    return res.status(502).send(html);
  }
};

function buildBridge(proxyOrigin, pageBase) {
  const O = JSON.stringify(proxyOrigin);
  const B = JSON.stringify(pageBase);
  return (
    '<style id="neo-proxy-cursor-style">html,body,*{cursor:none!important}</style>' +
    '<script id="neo-proxy-bridge">(function(){' +
    'if(window.__neoProxyBridge)return;window.__neoProxyBridge=1;' +
    'var PROXY_ORIGIN=' + O + ';' +
    'var PAGE_BASE=' + B + ';' +
    'var SNOKIDO_PAGE=/^(?:https?:\\/\\/)?(?:www\\.)?snokido\\.(?:com|fr)\\/game(?:\\/|$)/i.test(PAGE_BASE);' +
    'var DIRECT=/kbhgames\\.com$|wgplayer\\.com$|crazygames\\.com$|poki\\.com$|y8\\.com$|itch\\.io$/i;' +
    'var styleEl=document.getElementById("neo-proxy-cursor-style");' +
    'function setNative(on){if(styleEl)styleEl.textContent=on?"html,body,*{cursor:auto!important}":"html,body,*{cursor:none!important}"}' +
    'function gameCursorMode(){return !!(document.pointerLockElement||document.fullscreenElement||document.webkitFullscreenElement)}' +
    'function syncCursorMode(){setNative(gameCursorMode())}' +
    'document.addEventListener("pointerlockchange",syncCursorMode);' +
    'document.addEventListener("fullscreenchange",syncCursorMode);' +
    'document.addEventListener("webkitfullscreenchange",syncCursorMode);' +
    'function screenPoint(e){var x=e.clientX,y=e.clientY;try{var f=window.frameElement;if(f){var r=f.getBoundingClientRect();x+=r.left;y+=r.top}}catch(_){}return{x:x,y:y}}' +
    'function send(e,click){if(gameCursorMode())return;var p=screenPoint(e);try{parent.postMessage({source:"neo-browser-cursor",x:p.x,y:p.y,click:!!click},"*")}catch(_){}}' +
    'document.addEventListener("mousemove",function(e){send(e,false)},{passive:true});' +
    'document.addEventListener("mousedown",function(e){send(e,true)},{passive:true});' +
    'document.addEventListener("mouseleave",function(){try{parent.postMessage({source:"neo-browser-cursor",leave:true},"*")}catch(_){}},{passive:true});' +
    'window.addEventListener("message",function(e){var d=e&&e.data;if(!d||d.source!=="neo-browser-shell")return;if("nativeCursor" in d)setNative(!!d.nativeCursor||gameCursorMode())},{passive:true});' +
    'try{parent.postMessage({source:"neo-browser-cursor",hello:true},"*")}catch(_){}' +
    'syncCursorMode();' +
    'function toProxy(url){try{if(!url)return null;var s=String(url);if(/^(data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(s))return null;var u=new URL(s,PAGE_BASE||location.href);if(u.protocol!=="http:"&&u.protocol!=="https:")return null;if(u.origin===PROXY_ORIGIN&&u.pathname==="/api/proxy")return null;var h=u.hostname;if(!SNOKIDO_PAGE&&/kbhgames\\.com$|wgplayer\\.com$|crazygames\\.com$|poki\\.com$|y8\\.com$|itch\\.io$/i.test(h))return null;return PROXY_ORIGIN+"/api/proxy?url="+encodeURIComponent(u.toString())}catch(e){return null}}' +
    'function shouldProxyIframe(url){try{var u=new URL(String(url),PAGE_BASE||location.href);if(u.origin===PROXY_ORIGIN&&u.pathname==="/api/proxy")return false;if(SNOKIDO_PAGE)return true;if(DIRECT.test(u.hostname))return false;if(/snokido\\.com$/i.test(u.hostname)&&u.pathname.indexOf("/game/")===0)return false;if(u.pathname.indexOf("/embed/")!==-1)return false;return true}catch(e){return true}}' +
    'var _f=window.fetch;window.fetch=function(input,init){try{var url=typeof input==="string"?input:(input&&input.url)||"";var p=toProxy(url);if(p){if(typeof input==="string")input=p;else if(typeof input==="object")input=Object.assign({},input,{url:p})}}catch(e){}return _f.apply(this,arguments)};' +
    'var XO=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,url){try{var p=toProxy(url);if(p)arguments[1]=p;}catch(e){}return XO.apply(this,arguments);};' +
    'try{var desc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,"src");if(desc&&desc.set){var os=desc.set,og=desc.get;Object.defineProperty(HTMLIFrameElement.prototype,"src",{configurable:true,get:function(){return og.call(this)},set:function(v){try{if(shouldProxyIframe(v))v=toProxy(v)||v}catch(e){}return os.call(this,v)}})}}catch(e){}' +
    'function nav(href){var p=toProxy(href);if(p){location.href=p;return true}return false}' +
    'document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var href=a.getAttribute("href");if(!href||href.charAt(0)==="#"||/^(javascript|mailto|tel|data|blob):/i.test(href))return;e.preventDefault();nav(href)},{capture:true});' +
    'document.addEventListener("submit",function(e){var form=e.target;if(!form)return;e.preventDefault();try{var action=form.getAttribute("action")||PAGE_BASE;var method=(form.getAttribute("method")||"GET").toUpperCase();if(method==="GET"){var u=new URL(action,PAGE_BASE||location.href);if(form.elements.length)u.search=new URLSearchParams(new FormData(form)).toString();var p=toProxy(u.toString());if(p){location.href=p;return}}else{var fd=new FormData(form);var req=new XMLHttpRequest();req.open(method,action);req.send(fd)}}catch(e){}},{capture:true});' +
    'function rewriteHistoryUrl(url){if(url==null||url==="")return null;try{var s=String(url);if(s.indexOf("/api/proxy?url=")!==-1)return null;if(s.charAt(0)==="#")return null;var u=new URL(s,PAGE_BASE||location.href);return PROXY_ORIGIN+"/api/proxy?url="+encodeURIComponent(u.toString())}catch(e){return null}}' +
    'try{var _push=history.pushState.bind(history);var _repl=history.replaceState.bind(history);history.pushState=function(state,title,url){if(url!=null){var p=rewriteHistoryUrl(url);if(p){arguments[2]=p}}return _push.apply(this,arguments)};history.replaceState=function(state,title,url){if(url!=null){var p=rewriteHistoryUrl(url);if(p){arguments[2]=p}}return _repl.apply(this,arguments)}}catch(e){}' +
    'try{var srcDesc=Object.getOwnPropertyDescriptor(Location.prototype,"href");if(srcDesc&&srcDesc.set){var origSet=srcDesc.set;Object.defineProperty(Location.prototype,"href",{configurable:true,enumerable:true,set:function(v){if(typeof v==="string"&&v){var proxyUrl=toProxy(v);if(proxyUrl){return origSet.call(this,proxyUrl)}}return origSet.call(this,v)}})}}catch(e){}' +
    '})();</script>'
  );
}

function rewriteLinks(html, base, proxyOrigin) {
  let snokidoPage = /^(?:www\.)?snokido\.(?:com|fr)$/i.test(bu.hostname) && /^\/game(?:\/|$)/i.test(bu.pathname);
  try {
    const bu = new URL(base);
    snokidoPage = /^(?:www\\.)?snokido\\.(?:com|fr)$/i.test(bu.hostname) && /^\\/game(?:\\/|$)/i.test(bu.pathname);
  } catch {}

  const prox = (u) => proxyOrigin + "/api/proxy?url=" + encodeURIComponent(u.toString());
  function rewriteAttr(tag, attr, force) {
    const re = new RegExp("(" + attr + "\\s*=\\s*[\"'])([^\"']+)([\"'])", "i");
    return tag.replace(re, (all, a, raw, b) => {
      if (!raw || /^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(raw)) return all;
      try {
        const u = new URL(raw, base);
        if (u.protocol !== "http:" && u.protocol !== "https:") return all;
        const h = u.hostname;
        if (!force && /kbhgames\.com$|wgplayer\.com$|crazygames\.com$|poki\.com$|y8\.com$|itch\.io$/i.test(h)) return all;
        if (!force && u.pathname.indexOf("/embed/") !== -1) return all;
        return a + prox(u) + b;
      } catch {
        return all;
      }
    });
  }
  html = html.replace(new RegExp("<(img|script|source|video|audio|track|embed|object)\\b[^>]*>", "gi"), (tag) => {
    let out = tag;
    for (const a of ["src", "data-src", "poster", "data"]) out = rewriteAttr(out, a);
    return out;
  });
  html = html.replace(new RegExp("<iframe\\b[^>]*>", "gi"), (tag) => rewriteAttr(tag, "src", snokidoPage));
  html = html.replace(new RegExp("<link\\b[^>]*>", "gi"), (tag) => {
    const relM = tag.match(new RegExp("\\brel\\s*=\\s*[\"']([^\"']+)[\"']", "i"));
    const rel = ((relM && relM[1]) || "").toLowerCase();
    if (!/(stylesheet|icon|preload|modulepreload)/.test(rel)) return tag;
    return rewriteAttr(tag, "href");
  });
  html = html.replace(new RegExp("<a\\b[^>]*>", "gi"), (tag) => rewriteAttr(tag, "href"));
  html = html.replace(new RegExp("<form\\b[^>]*>", "gi"), (tag) => rewriteAttr(tag, "action"));
  html = html.replace(new RegExp("<meta\\b[^>]*http-equiv\\s*=\\s*[\"']content-security-policy[\"'][^>]*>", "gi"), "");
  html = html.replace(new RegExp("<meta\\b[^>]*http-equiv\\s*=\\s*[\"']x-frame-options[\"'][^>]*>", "gi"), "");
  return html;
}
