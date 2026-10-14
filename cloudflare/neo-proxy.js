/**
 * Neo Browser Cloudflare Worker proxy.
 *
 * Install as a Worker route on neosite.devs.surf/api/proxy*
 * and configure ALLOWED_PROXY_HOSTS as a comma-separated list of permitted
 * hostnames (for example: example.com,developer.mozilla.org).
 *
 * This is deliberately allow-list based, not an unrestricted/open proxy.
 */
const BLOCKED_HOSTS = new Set([
  "localhost", "localhost.localdomain", "127.0.0.1", "0.0.0.0", "::1",
  "169.254.169.254", "metadata.google.internal"
]);
const DEFAULT_ALLOWED_HOSTS = ["example.com", "www.example.com"];
const MAX_REDIRECTS = 6;
const MAX_HTML_BYTES = 2_000_000;

function hostnameBlocked(hostname) {
  const h = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(h) || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) {
    const p = h.split(".").map(Number);
    const [a, b] = p;
    if (p.some(n => n < 0 || n > 255)) return true;
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127)) return true;
  }
  return h.includes(":") && (h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80"));
}

function allowedHosts(env) {
  const configured = String(env.ALLOWED_PROXY_HOSTS || "").split(",")
    .map(v => v.trim().toLowerCase().replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_HOSTS);
}
function isAllowed(hostname, env) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  for (const allowed of allowedHosts(env)) {
    const root = allowed.replace(/^www\./, "");
    if (host === root || host.endsWith("." + root)) return true;
  }
  return false;
}
function parseTarget(raw, base, env) {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (hostnameBlocked(u.hostname) || !isAllowed(u.hostname, env)) return null;
    u.username = "";
    u.password = "";
    return u;
  } catch (_) { return null; }
}
function proxyUrl(origin, target) {
  return origin + "/api/proxy?url=" + encodeURIComponent(target.toString());
}
function skipUrl(value) {
  return !value || /^(?:data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(String(value).trim());
}
function rewriteUrl(raw, base, origin) {
  const value = String(raw || "").trim();
  if (skipUrl(value)) return raw;
  try {
    const u = new URL(value, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return raw;
    if (u.origin === origin && u.pathname === "/api/proxy") return raw;
    return proxyUrl(origin, u);
  } catch (_) { return raw; }
}
function rewriteAttribute(tag, attr, base, origin) {
  const re = new RegExp("(" + attr + "\\s*=\\s*)(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i");
  return tag.replace(re, (all, prefix, dq, sq, bare) => {
    const raw = dq !== undefined ? dq : sq !== undefined ? sq : bare;
    if (raw === undefined) return all;
    const next = rewriteUrl(raw, base, origin);
    if (next === raw) return all;
    if (dq !== undefined) return prefix + "\"" + next + "\"";
    if (sq !== undefined) return prefix + "'" + next + "'";
    return prefix + next;
  });
}
function rewriteSrcset(value, base, origin) {
  return value.split(",").map(part => {
    const m = part.trim().match(/^(\S+)(\s+.*)?$/);
    if (!m) return part;
    return rewriteUrl(m[1], base, origin) + (m[2] || "");
  }).join(", ");
}
function cookiePrefix(hostname) {
  return "neo_" + btoa(String(hostname).toLowerCase()).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_") + "_";
}
function cookiesForHost(cookieHeader, hostname) {
  const prefix = cookiePrefix(hostname);
  return String(cookieHeader || "").split(";").map(v => v.trim()).filter(Boolean).map(part => {
    const eq = part.indexOf("=");
    if (eq < 1 || !part.slice(0, eq).startsWith(prefix)) return null;
    return part.slice(0, eq).slice(prefix.length) + part.slice(eq);
  }).filter(Boolean).join("; ");
}
function rewriteSetCookie(cookie, hostname) {
  const prefix = cookiePrefix(hostname);
  const parts = String(cookie).split(";");
  const first = parts.shift() || "";
  const eq = first.indexOf("=");
  if (eq < 1) return null;
  const name = first.slice(0, eq).trim();
  const value = first.slice(eq + 1);
  const attrs = [];
  let hasPath = false;
  for (const raw of parts) {
    const attr = raw.trim();
    if (!attr || /^domain=/i.test(attr)) continue;
    if (/^path=/i.test(attr)) { attrs.push("Path=/api/proxy"); hasPath = true; }
    else attrs.push(attr);
  }
  if (!hasPath) attrs.push("Path=/api/proxy");
  return prefix + name + "=" + value + (attrs.length ? "; " + attrs.join("; ") : "");
}
function mapReferer(value, origin) {
  try {
    const u = new URL(value);
    if (u.origin !== origin || u.pathname !== "/api/proxy") return "";
    return u.searchParams.get("url") || "";
  } catch (_) { return ""; }
}
function buildBridge(origin, pageBase) {
  return '<script id="neo-cloudflare-proxy-bridge">(function(){' +
    'if(window.__neoCfProxyBridge)return;window.__neoCfProxyBridge=1;' +
    'var P=' + JSON.stringify(origin) + ',B=' + JSON.stringify(pageBase) + ';' +
    'function px(v){try{if(!v||/^(data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(String(v)))return null;var u=new URL(String(v),B||location.href);if(u.protocol!=="http:"&&u.protocol!=="https:")return null;if(u.origin===P&&u.pathname==="/api/proxy")return null;return P+"/api/proxy?url="+encodeURIComponent(u.href)}catch(_){return null}}' +
    'var f=window.fetch;if(f)window.fetch=function(input,init){try{var raw=typeof input==="string"?input:(input&&input.url)||"";var p=px(raw);if(p){if(typeof Request!=="undefined"&&input instanceof Request)input=new Request(p,input);else input=p}}catch(_){}return f.call(this,input,init)};' +
    'var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){try{arguments[1]=px(u)||u}catch(_){}return xo.apply(this,arguments)};' +
    'document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var h=a.getAttribute("href");var p=px(h);if(!p)return;e.preventDefault();e.stopImmediatePropagation();location.href=p},{capture:true});' +
    'document.addEventListener("submit",function(e){var form=e.target;if(!form||String(form.method||"GET").toUpperCase()!=="GET")return;try{e.preventDefault();e.stopImmediatePropagation();var u=new URL(form.getAttribute("action")||B,B);var data=new URLSearchParams(new FormData(form));for(var pair of data.entries())u.searchParams.set(pair[0],pair[1]);location.href=px(u.href)||u.href}catch(_){}},{capture:true});' +
    '})();</script>';
}
function rewriteHtml(html, base, origin) {
  html = html.replace(/<base\b[^>]*>/gi, "");
  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']content-security-policy(?:-report-only)?["'][^>]*>/gi, "");
  html = html.replace(/<(img|script|source|video|audio|track|embed|object|iframe)\b[^>]*>/gi, tag => {
    let out = tag;
    for (const attr of ["src", "data-src", "poster", "data"]) out = rewriteAttribute(out, attr, base, origin);
    return out;
  });
  html = html.replace(/<link\b[^>]*>/gi, tag => {
    let out = rewriteAttribute(tag, "href", base, origin);
    out = rewriteAttribute(out, "imagesrcset", base, origin);
    return out;
  });
  html = html.replace(/<a\b[^>]*>/gi, tag => rewriteAttribute(tag, "href", base, origin));
  html = html.replace(/<form\b[^>]*>/gi, tag => rewriteAttribute(tag, "action", base, origin));
  html = html.replace(/(<(?:img|source)\b[^>]*\bsrcset\s*=\s*)(["'])([^"']*)\2/gi, (all, prefix, quote, set) =>
    prefix + quote + rewriteSrcset(set, base, origin) + quote);
  html = html.replace(/(\bstyle\s*=\s*)(["'])([^"']*)\2/gi, (all, prefix, quote, css) =>
    prefix + quote + css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (full, q, raw) => {
      const next = rewriteUrl(raw, base, origin);
      return next === raw ? full : 'url("' + next + '")';
    }) + quote);
  const bridge = buildBridge(origin, base);
  return /<head\b[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, m => m + bridge) : bridge + html;
}
function textResponse(message, status, origin) {
  return new Response(message, { status, headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin || "*",
    "X-Content-Type-Options": "nosniff"
  }});
}
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (!/^\/api\/proxy\/?$/.test(incoming.pathname)) {
      return new Response("Neo proxy worker is running. Route requests to /api/proxy?url=...", {
        status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
      });
    }
    const origin = incoming.origin;
    if (!["GET", "HEAD"].includes(request.method.toUpperCase())) {
      return textResponse("This proxy endpoint currently supports GET and HEAD requests only.", 405, origin);
    }
    const raw = incoming.searchParams.get("url");
    if (!raw) return textResponse("Missing ?url=", 400, origin);
    let current = parseTarget(raw, undefined, env);
    if (!current) return textResponse("Target is not permitted. Add its hostname to the Worker's ALLOWED_PROXY_HOSTS only when you are authorized to access it.", 403, origin);

    const mappedReferer = mapReferer(request.headers.get("referer"), origin);
    let response;
    try {
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const headers = new Headers();
        for (const key of ["accept", "accept-language", "range", "if-range", "if-none-match", "if-modified-since"]) {
          const v = request.headers.get(key);
          if (v) headers.set(key, v);
        }
        headers.set("User-Agent", "Mozilla/5.0 (compatible; NeoBrowserProxy/1.0)");
        if (mappedReferer) headers.set("Referer", mappedReferer);
        const cookies = cookiesForHost(request.headers.get("cookie"), current.hostname);
        if (cookies) headers.set("Cookie", cookies);
        response = await fetch(current.toString(), { method: request.method, headers, redirect: "manual" });
        if (response.status < 300 || response.status >= 400) break;
        const location = response.headers.get("location");
        if (!location) break;
        const next = parseTarget(location, current, env);
        if (!next) return textResponse("Redirect destination is not on ALLOWED_PROXY_HOSTS.", 403, origin);
        current = next;
      }
      if (!response) return textResponse("No response from target.", 502, origin);

      const responseHeaders = new Headers(response.headers);
      for (const key of ["content-security-policy", "content-security-policy-report-only", "x-frame-options", "content-length", "content-encoding", "set-cookie"]) {
        responseHeaders.delete(key);
      }
      responseHeaders.set("Cache-Control", "no-store");
      responseHeaders.set("X-Content-Type-Options", "nosniff");
      responseHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
      responseHeaders.set("Referrer-Policy", "unsafe-url");
      responseHeaders.set("Permissions-Policy", "fullscreen=*, autoplay=*, gamepad=*, pointer-lock=*");
      const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
      for (const cookie of setCookies) {
        const rewritten = rewriteSetCookie(cookie, current.hostname);
        if (rewritten) responseHeaders.append("Set-Cookie", rewritten);
      }
      const type = (response.headers.get("content-type") || "").toLowerCase();
      if (type.includes("text/html") || type.includes("application/xhtml+xml")) {
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > MAX_HTML_BYTES) return textResponse("HTML response exceeds Neo proxy's rewrite size limit.", 413, origin);
        const html = rewriteHtml(new TextDecoder().decode(bytes), current.toString(), origin);
        responseHeaders.set("Content-Type", "text/html; charset=utf-8");
        return new Response(request.method === "HEAD" ? null : html, { status: response.status, headers: responseHeaders });
      }
      if (type.includes("text/css")) {
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > MAX_HTML_BYTES) return textResponse("CSS response exceeds Neo proxy's rewrite size limit.", 413, origin);
        const css = new TextDecoder().decode(bytes).replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (all, q, rawUrl) => {
          const next = rewriteUrl(rawUrl, current.toString(), origin);
          return next === rawUrl ? all : 'url("' + next + '")';
        });
        return new Response(request.method === "HEAD" ? null : css, { status: response.status, headers: responseHeaders });
      }
      return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers: responseHeaders });
    } catch (err) {
      return textResponse("Neo proxy fetch failed: " + String(err && err.message || err).slice(0, 180), 502, origin);
    }
  }
};
