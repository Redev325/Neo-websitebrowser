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
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function clean(s) {
  return decodeEntities(stripTags(s)).replace(/\s+/g, " ").trim();
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

    const linkMatch = block.match(
      /<h2[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
    );
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
          display =
            uu.hostname.replace(/^www\./, "") +
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
  const bridge = buildBridge(proxyOrigin, "https://www.bing.com/");
  const q = escapeHtml(query);
  const items = results
    .map(
      (r) => `
      <article class="res">
        <a class="res-url" href="${escapeHtml(prox(new URL(r.url)))}">${escapeHtml(r.display)}</a>
        <a class="res-title" href="${escapeHtml(prox(new URL(r.url)))}">${escapeHtml(r.title)}</a>
        ${r.snippet ? `<p class="res-snip">${escapeHtml(r.snippet)}</p>` : ""}
      </article>`
    )
    .join("");

  const empty = `<div class="empty"><div class="empty-orb"></div><p>No results found for <strong>${q}</strong>.</p><p class="empty-sub">Try a different search or enter a full URL.</p></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${q} — Neo Search</title>
<style>
  :root{--bg:#0a0a0b;--panel:#111114;--border:#1f1f24;--text:#e7e7ea;--muted:#8a8a93;--accent:#ff2d2d;--link:#8ab4ff;}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;min-height:100%}
  .wrap{max-width:720px;margin:0 auto;padding:28px 20px 60px}
  .brand{font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);margin-bottom:18px;font-weight:700}
  .q{font-size:22px;font-weight:600;margin:0 0 6px}
  .meta{color:var(--muted);font-size:13px;margin:0 0 28px}
  .res{padding:16px 0;border-top:1px solid var(--border)}
  .res-url{display:block;font-size:12px;color:var(--muted);text-decoration:none;margin-bottom:4px;word-break:break-all}
  .res-title{display:block;font-size:18px;color:var(--link);text-decoration:none;margin-bottom:6px;line-height:1.3}
  .res-title:hover{text-decoration:underline}
  .res-snip{margin:0;font-size:14px;color:var(--muted);line-height:1.5}
  .empty{text-align:center;padding:60px 20px;color:var(--muted)}
  .empty-orb{width:48px;height:48px;border-radius:50%;margin:0 auto 16px;background:radial-gradient(circle at 30% 30%,#ff4d4d,#7a0000);box-shadow:0 0 24px rgba(255,45,45,0.35)}
  .empty-sub{font-size:13px}
</style>
${bridge}
</head>
<body>
  <div class="wrap">
    <div class="brand">Neo Search</div>
    <h1 class="q">${q}</h1>
    <p class="meta">${results.length ? results.length + " results" : "No results"}</p>
    ${results.length ? items : empty}
  </div>
</body>
</html>`;
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
    for (let i = 0; i < 6; i++) {
      const headers = {
        accept: req.headers.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": req.headers["accept-language"] || "en-US,en;q=0.9",
        "user-agent": req.headers["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        referer: current.origin + "/",
        "accept-encoding": "identity",
      };
      if (req.headers.cookie) headers.cookie = req.headers.cookie;
      if (req.headers.range) headers.range = req.headers.range;
      r = await fetch(current.toString(), {
        redirect: "manual",
        headers,
        signal: AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined,
      });
      if (!(r.status >= 300 && r.status < 400)) break;
      const loc = r.headers.get("location");
      if (!loc) break;
      const next = targetUrl(loc, current);
      if (!next) return res.status(403).send("Redirect destination is blocked");
      current = next;
    }

    const type = r.headers.get("content-type") || "";
    const body = await r.arrayBuffer();

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "no-store");

    if (type.toLowerCase().includes("text/html")) {
      let html = new TextDecoder("utf-8").decode(body);
      const query = searchQueryOf(current);
      if (query) {
        const results = parseBingResults(html);
        if (results.length) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          return res.status(200).send(renderSearchPage(query, results, proxyOrigin));
        }
      }
      const bridge = buildBridge(proxyOrigin, current.toString());
      html = rewriteLinks(html, current.toString(), proxyOrigin);
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head([^>]*)>/i, (m) => m + bridge);
      } else {
        html = bridge + html;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(r.status).send(html);
    }

    if (type.toLowerCase().includes("text/css")) {
      let css = new TextDecoder("utf-8").decode(body);
      css = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (all, q, raw) => {
        try {
          const u = new URL(raw.trim(), current.toString());
          if (u.protocol !== "http:" && u.protocol !== "https:") return all;
          return 'url("' + proxyOrigin + "/api/proxy?url=" + encodeURIComponent(u.toString()) + '")';
        } catch {
          return all;
        }
      });
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      return res.status(r.status).send(css);
    }

    res.setHeader("Content-Type", type || "application/octet-stream");
    const cr = r.headers.get("content-range");
    if (cr) res.setHeader("Content-Range", cr);
    return res.status(r.status).send(Buffer.from(body));
  } catch (e) {
    console.error(e);
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) {
      return res.status(504).send("Upstream timed out");
    }
    return res.status(502).send("Proxy request failed");
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
    'var DIRECT=/snokido\\.com$|kbhgames\\.com$|wgplayer\\.com$|crazygames\\.com$|poki\\.com$|y8\\.com$|itch\\.io$/i;' +
    'function toProxy(url){try{if(!url)return null;var s=String(url);if(/^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(s))return null;var u=new URL(s,PAGE_BASE||location.href);if(u.protocol!=="http:"&&u.protocol!=="https:")return null;if(u.href.indexOf("/api/proxy?url=")!==-1)return null;return PROXY_ORIGIN+"/api/proxy?url="+encodeURIComponent(u.toString());}catch(e){return null;}}' +
    'function shouldProxyIframe(url){try{var u=new URL(String(url),PAGE_BASE||location.href);if(DIRECT.test(u.hostname))return false;if(u.pathname.indexOf("/embed/")!==-1)return false;return true;}catch(e){return true;}}' +
    'var _f=window.fetch;window.fetch=function(input,init){try{var url=typeof input==="string"?input:(input&&input.url)||"";var p=toProxy(url);if(p){if(typeof input==="string")input=p;else if(typeof Request!=="undefined"&&input instanceof Request)input=new Request(p,input);}}catch(e){}return _f.call(this,input,init);};' +
    'var XO=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,url){try{var p=toProxy(url);if(p)arguments[1]=p;}catch(e){}return XO.apply(this,arguments);};' +
    'try{var desc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,"src");if(desc&&desc.set){var os=desc.set,og=desc.get;Object.defineProperty(HTMLIFrameElement.prototype,"src",{configurable:true,enumerable:true,get:function(){return og.call(this);},set:function(v){var u=v;if(shouldProxyIframe(v)){var p=toProxy(v);if(p)u=p;}os.call(this,u);}});}}catch(e){}' +
    'function nav(href){var p=toProxy(href);if(!p)return false;location.href=p;return true;}' +
    'document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var href=a.getAttribute("href");if(!href||href.charAt(0)==="#"||/^(javascript:|mailto:|tel:)/i.test(href))return;if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;if(a.target&&a.target!=="_self"&&a.target!=="")return;if(nav(href)){e.preventDefault();e.stopPropagation();}},true);' +
    'document.addEventListener("submit",function(e){var form=e.target;if(!form)return;try{var action=form.getAttribute("action")||PAGE_BASE;var method=(form.getAttribute("method")||"GET").toUpperCase();if(method!=="GET")return;var u=new URL(action,PAGE_BASE||location.href);var fd=new FormData(form);fd.forEach(function(v,k){u.searchParams.append(k,v);});if(nav(u.toString())){e.preventDefault();e.stopPropagation();}}catch(err){}},true);' +
    'function rewriteHistoryUrl(url){if(url==null||url==="")return null;try{var s=String(url);if(s.indexOf("/api/proxy?url=")!==-1)return null;if(s.charAt(0)==="#")return null;var u=new URL(s,PAGE_BASE||location.href);if(u.origin===location.origin&&u.pathname.indexOf("/api/proxy")!==0){u=new URL(u.pathname+u.search+u.hash,PAGE_BASE);}if(u.protocol!=="http:"&&u.protocol!=="https:")return null;return toProxy(u.href);}catch(e){return null;}}' +
    'try{var _push=history.pushState.bind(history);var _repl=history.replaceState.bind(history);history.pushState=function(state,title,url){if(url!=null){var p=rewriteHistoryUrl(url);if(p){location.href=p;return;}}return _push(state,title,url);};history.replaceState=function(state,title,url){if(url!=null){var p=rewriteHistoryUrl(url);if(p){location.href=p;return;}}return _repl(state,title,url);};}catch(e){}' +
    '})();</script>'
  );
}

function rewriteLinks(html, base, proxyOrigin) {
  const prox = (u) => proxyOrigin + "/api/proxy?url=" + encodeURIComponent(u.toString());
  function rewriteAttr(tag, attr) {
    const re = new RegExp("(" + attr + "\\s*=\\s*[\"'])([^\"']+)([\"'])", "i");
    return tag.replace(re, (all, a, raw, b) => {
      if (!raw || /^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(raw)) return all;
      try {
        const u = new URL(raw, base);
        if (u.protocol !== "http:" && u.protocol !== "https:") return all;
        const h = u.hostname;
        if (/snokido\.com$|kbhgames\.com$|wgplayer\.com$|crazygames\.com$|poki\.com$|y8\.com$|itch\.io$/i.test(h)) return all;
        if (u.pathname.indexOf("/embed/") !== -1) return all;
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
  html = html.replace(new RegExp("<iframe\\b[^>]*>", "gi"), (tag) => rewriteAttr(tag, "src"));
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
