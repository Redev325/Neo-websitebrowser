import * as BunnySDK from "@bunny.net/edgescript-sdk";

/**
 * Neo Browser proxy for Bunny Edge Scripting.
 *
 * Required Bunny script variable:
 *   ALLOWED_PROXY_HOSTS = comma-separated hostnames you are allowed to access.
 * Example for a domain you own: example.com,static.example.com
 *
 * Do not use this as an unrestricted/open proxy. Any redirect destination must
 * also match the allow-list. Attach this as a Standalone Edge Script.
 */

function allowedRoots() {
  const raw = Deno.env.get("ALLOWED_PROXY_HOSTS") || "";
  return raw.split(",").map(x => x.trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
}

function permitted(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  if (!host || host === "localhost" || host.endsWith(".local") ||
      host.endsWith(".internal") || host === "metadata.google.internal") return false;
  if (/^(?:127\.|10\.|192\.168\.|169\.254\.)/.test(host) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(host) || host === "0.0.0.0") return false;
  return allowedRoots().some(root => host === root || host.endsWith("." + root));
}

function parseTarget(raw, base) {
  try {
    const u = new URL(raw, base);
    if (!["http:", "https:"].includes(u.protocol) || !permitted(u.hostname)) return null;
    u.username = "";
    u.password = "";
    return u;
  } catch { return null; }
}

function toProxy(origin, target) {
  return origin + "/api/proxy?url=" + encodeURIComponent(target.href);
}

function rewriteUrl(raw, base, origin) {
  const value = String(raw || "").trim();
  if (!value || /^(?:data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(value)) return raw;
  try {
    const target = new URL(value, base);
    if (!["http:", "https:"].includes(target.protocol)) return raw;
    return toProxy(origin, target);
  } catch { return raw; }
}

function rewriteAttrs(tag, attrs, base, origin) {
  for (const attr of attrs) {
    const re = new RegExp("(" + attr + "\\s*=\\s*)(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i");
    tag = tag.replace(re, (all, prefix, dq, sq, bare) => {
      const raw = dq !== undefined ? dq : sq !== undefined ? sq : bare;
      if (raw === undefined) return all;
      const next = rewriteUrl(raw, base, origin);
      if (next === raw) return all;
      if (dq !== undefined) return prefix + "\"" + next + "\"";
      if (sq !== undefined) return prefix + "'" + next + "'";
      return prefix + next;
    });
  }
  return tag;
}

function rewriteHtml(html, base, origin) {
  html = html.replace(/<base\b[^>]*>/gi, "");
  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']content-security-policy(?:-report-only)?["'][^>]*>/gi, "");
  html = html.replace(/<(?:img|script|source|video|audio|track|embed|object|iframe)\b[^>]*>/gi,
    tag => rewriteAttrs(tag, ["src", "data-src", "poster", "data"], base, origin));
  html = html.replace(/<link\b[^>]*>/gi, tag => rewriteAttrs(tag, ["href"], base, origin));
  html = html.replace(/<a\b[^>]*>/gi, tag => rewriteAttrs(tag, ["href"], base, origin));
  html = html.replace(/<form\b[^>]*>/gi, tag => rewriteAttrs(tag, ["action"], base, origin));
  html = html.replace(/(\bstyle\s*=\s*)(["'])(.*?)\2/gi, (all, prefix, q, css) =>
    prefix + q + css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (full, quote, raw) => {
      const next = rewriteUrl(raw, base, origin);
      return next === raw ? full : 'url("' + next + '")';
    }) + q);

  const bridge = '<script>(function(){if(window.__neoBunnyProxy)return;window.__neoBunnyProxy=1;' +
    'var P=' + JSON.stringify(origin) + ',B=' + JSON.stringify(base) + ';' +
    'function px(v){try{if(!v||/^(data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(String(v)))return null;var u=new URL(String(v),B||location.href);if(u.protocol!=="http:"&&u.protocol!=="https:")return null;return P+"/api/proxy?url="+encodeURIComponent(u.href)}catch(_){return null}}' +
    'var f=window.fetch;if(f)window.fetch=function(input,init){try{var raw=typeof input==="string"?input:(input&&input.url)||"";var p=px(raw);if(p){if(typeof Request!=="undefined"&&input instanceof Request)input=new Request(p,input);else input=p}}catch(_){}return f.call(this,input,init)};' +
    'var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){try{arguments[1]=px(u)||u}catch(_){}return xo.apply(this,arguments)};' +
    'document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var p=px(a.getAttribute("href"));if(!p)return;e.preventDefault();e.stopImmediatePropagation();location.href=p},{capture:true});' +
    '})();</script>';
  return /<head\b[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, x => x + bridge) : bridge + html;
}

BunnySDK.net.http.serve(async (request: Request): Promise<Response> => {
  const incoming = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Max-Age": "86400"
    }});
  }
  if (!/^\/api\/proxy\/?$/.test(incoming.pathname)) {
    return new Response("Neo Bunny proxy is ready. Use /api/proxy?url=... and configure ALLOWED_PROXY_HOSTS.", {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Only GET and HEAD are supported by this initial proxy.", {
      status: 405, headers: { "Allow": "GET, HEAD", "Cache-Control": "no-store" }
    });
  }
  const raw = incoming.searchParams.get("url");
  if (!raw) return new Response("Missing ?url=", { status: 400 });
  let target = parseTarget(raw);
  if (!target) return new Response("Target is not permitted. Configure ALLOWED_PROXY_HOSTS for an authorized domain.", {
    status: 403, headers: { "Cache-Control": "no-store" }
  });

  try {
    let response: Response | undefined;
    for (let hop = 0; hop <= 5; hop++) {
      const headers = new Headers();
      for (const key of ["accept", "accept-language", "range", "if-range", "if-none-match", "if-modified-since"]) {
        const value = request.headers.get(key);
        if (value) headers.set(key, value);
      }
      headers.set("User-Agent", "Mozilla/5.0 (compatible; NeoBrowser/1.0)");
      response = await fetch(target.href, { method: request.method, headers, redirect: "manual" });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      if (!location) break;
      const next = parseTarget(location, target.href);
      if (!next) return new Response("Redirect destination is not permitted by ALLOWED_PROXY_HOSTS.", {
        status: 403, headers: { "Cache-Control": "no-store" }
      });
      target = next;
    }
    if (!response) return new Response("No response from target.", { status: 502 });

    const headers = new Headers(response.headers);
    for (const key of ["content-security-policy", "content-security-policy-report-only", "x-frame-options",
      "content-length", "content-encoding", "set-cookie"]) headers.delete(key);
    headers.set("Cache-Control", "no-store");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    headers.set("Referrer-Policy", "unsafe-url");
    headers.set("Permissions-Policy", "fullscreen=*, autoplay=*, gamepad=*, pointer-lock=*");

    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (type.includes("text/html") || type.includes("application/xhtml+xml")) {
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 2_000_000) return new Response("Page too large for HTML rewriting.", { status: 413 });
      headers.set("Content-Type", "text/html; charset=utf-8");
      const html = rewriteHtml(new TextDecoder().decode(bytes), target.href, incoming.origin);
      return new Response(request.method === "HEAD" ? null : html, { status: response.status, headers });
    }
    if (type.includes("text/css")) {
      const css = new TextDecoder().decode(await response.arrayBuffer()).replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
        (all, q, raw) => {
          const next = rewriteUrl(raw, target.href, incoming.origin);
          return next === raw ? all : 'url("' + next + '")';
        });
      headers.set("Content-Type", "text/css; charset=utf-8");
      return new Response(request.method === "HEAD" ? null : css, { status: response.status, headers });
    }
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
  } catch (error) {
    return new Response("Bunny proxy error: " + String(error && (error as Error).message || error).slice(0, 180), {
      status: 502, headers: { "Cache-Control": "no-store" }
    });
  }
});
