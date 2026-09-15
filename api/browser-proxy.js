const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254", "metadata.google.internal"
]);

function isPrivateIPv4(host) {
  const p = host.split(".").map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) return false;
  const [a, b] = p;
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
function blocked(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return BLOCKED_HOSTS.has(h) || h.endsWith(".local") || h.endsWith(".internal") || isPrivateIPv4(h);
}
function targetUrl(raw, base) {
  try {
    const u = new URL(raw, base);
    if (!["http:", "https:"].includes(u.protocol) || blocked(u.hostname)) return null;
    return u;
  } catch { return null; }
}
function proxyUrl(origin, u) { return origin + "/api/proxy?url=" + encodeURIComponent(u.toString()); }
function attrEscape(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function rewriteCss(css, base, origin) {
  return css.replace(/url\((\s*["']?)([^)"']+)(["']?\s*)\)/gi, (m, a, raw, b) => {
    const v = raw.trim();
    if (!v || /^(data:|blob:|https?:\/\/)/i.test(v)) return m;
    const u = targetUrl(v, base);
    return u ? `url(${a}${proxyUrl(origin, u)}${b})` : m;
  });
}

function buildBridge(origin, pageUrl) {
  const safeOrigin = JSON.stringify(origin);
  const safePage = JSON.stringify(pageUrl.toString());
  return `<script data-neo-bridge="1">(function(){
    var ORIGIN=${safeOrigin}, PAGE=${safePage};
    function prox(v){try{var u=new URL(v,PAGE);if(!/^https?:$/i.test(u.protocol))return v;return ORIGIN+'/api/proxy?url='+encodeURIComponent(u.href)}catch(e){return v}}
    function should(v){return typeof v==='string'&&!/^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(v)}
    var _fetch=window.fetch;if(_fetch)window.fetch=function(input,init){try{if(typeof input==='string'&&should(input))input=prox(input);else if(input&&input.url){input=new Request(prox(input.url),input)}}catch(e){}return _fetch.call(this,input,init)};
    var XO=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url){try{if(should(url))url=prox(url)}catch(e){}return XO.apply(this,[method,url].concat([].slice.call(arguments,2)))};
    function fix(a){try{var v=a.getAttribute('href');if(v&&should(v)&&!/^\/api\/proxy\?url=/i.test(v))a.setAttribute('href',prox(v));var act=a.getAttribute('action');if(act&&should(act)&&!/^\/api\/proxy\?url=/i.test(act))a.setAttribute('action',prox(act))}catch(e){}}
    function scan(){document.querySelectorAll('a[href],form[action]').forEach(fix)}
    document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;fix(a);if(a.target==='_blank')a.target='_self'},true);
    document.addEventListener('submit',function(e){var f=e.target;if(f&&f.action)fix(f)},true);
    var hp=history.pushState,hr=history.replaceState;
    history.pushState=function(st,t,u){if(should(u))u=prox(u);return hp.call(history,st,t,u)};
    history.replaceState=function(st,t,u){if(should(u))u=prox(u);return hr.call(history,st,t,u)};
    window.open=function(u){if(should(u))location.href=prox(u);else return null};
    scan();new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});
  })();</script>`;
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
  const origin = proto + "://" + host;
  const method = (req.method || "GET").toUpperCase();
  if (method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
    return res.status(204).end();
  }

  let current = target;
  let response;
  try {
    let body;
    if (!["GET","HEAD"].includes(method)) {
      if (Buffer.isBuffer(req.body)) body = req.body;
      else if (typeof req.body === "string") body = req.body;
      else if (req.body && typeof req.body === "object") body = JSON.stringify(req.body);
    }
    for (let hop = 0; hop < 8; hop++) {
      const headers = {
        "user-agent": req.headers["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        "accept": req.headers.accept || "*/*",
        "accept-language": req.headers["accept-language"] || "en-US,en;q=0.9",
        "accept-encoding": "identity",
        "referer": current.origin + "/",
      };
      if (req.headers.cookie) headers.cookie = req.headers.cookie;
      if (req.headers.range) headers.range = req.headers.range;
      if (body !== undefined && hop === 0) headers["content-type"] = req.headers["content-type"] || "application/octet-stream";
      response = await fetch(current.toString(), { method, headers, body: hop === 0 ? body : undefined, redirect: "manual", signal: AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined });
      if (!(response.status >= 300 && response.status < 400)) break;
      const loc = response.headers.get("location");
      if (!loc) break;
      const next = targetUrl(loc, current);
      if (!next) return res.status(403).send("Redirect destination is blocked");
      current = next;
    }
  } catch (e) {
    console.error("[neo-proxy] upstream error", e.message);
    return res.status(502).send("Website could not be loaded");
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType);
  const isCss = /text\/css/i.test(contentType);
  const buf = Buffer.from(await response.arrayBuffer());

  res.status(response.status);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "unsafe-url");

  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (cookies.length) res.setHeader("Set-Cookie", cookies.map(c => c.replace(/;\s*domain=[^;]*/ig, "").replace(/;\s*samesite=[^;]*/ig, "; SameSite=Lax")));

  if (isHtml) {
    let html = new TextDecoder().decode(buf);
    const base = current.toString();
    const rewriteAttr = (name) => {
      const re = new RegExp(`(<[^>]+\\s${name}\\s*=\\s*["'])([^"']+)(["'])`, "gi");
      html = html.replace(re, (m, pre, value, end) => {
        if (/^(#|javascript:|mailto:|tel:|data:|blob:|\/\/)/i.test(value)) return m;
        const u = targetUrl(value, base);
        return u ? pre + attrEscape(proxyUrl(origin, u)) + end : m;
      });
    };
    ["href","action","src","poster","data-src","data-href"].forEach(rewriteAttr);
    html = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (m,a,b,c)=>a+rewriteCss(b,current,origin)+c);
    html = html.replace(/(<[^>]+style\s*=\s*["'])([^"']+)(["'])/gi,(m,a,b,c)=>a+rewriteCss(b,current,origin)+c);
    const baseTag = `<base href="${attrEscape(proxyUrl(origin, current))}">`;
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + baseTag);
    else html = baseTag + html;
    const bridge = buildBridge(origin, current);
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, bridge + "</body>");
    else html += bridge;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  }
  if (isCss) {
    let css = new TextDecoder().decode(buf);
    css = rewriteCss(css,current,origin);
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    return res.send(css);
  }
  res.setHeader("Content-Type", contentType);
  return res.send(buf);
};
