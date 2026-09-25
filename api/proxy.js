const { Readable } = require("stream");

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
  "metadata.google.internal"
]);

function isPrivateIPv4(host) {
  const parts = String(host).split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a, b] = parts;
  return a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168);
}

function isBlockedHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  return BLOCKED_HOSTS.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    isPrivateIPv4(host);
}

function parseTarget(raw, base) {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (isBlockedHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function proxyUrl(proxyOrigin, target) {
  return proxyOrigin + "/api/proxy?url=" + encodeURIComponent(target.toString());
}

function cookieKey(hostname) {
  return "neo_" + Buffer.from(String(hostname).toLowerCase()).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "_") + "_";
}

function cookiesForTarget(header, hostname) {
  const prefix = cookieKey(hostname);
  return String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq < 1) return null;
      const name = part.slice(0, eq);
      if (!name.startsWith(prefix)) return null;
      return name.slice(prefix.length) + part.slice(eq);
    })
    .filter(Boolean)
    .join("; ");
}

function rewriteSetCookies(setCookies, hostname) {
  const prefix = cookieKey(hostname);

  return setCookies.map((cookie) => {
    const parts = String(cookie).split(";");
    const first = parts.shift() || "";
    const eq = first.indexOf("=");
    if (eq < 1) return cookie;

    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1);
    const attrs = [];
    let hasPath = false;

    for (const rawAttr of parts) {
      const attr = rawAttr.trim();
      if (!attr) continue;
      if (/^domain=/i.test(attr)) continue;
      if (/^path=/i.test(attr)) {
        attrs.push("Path=/api/proxy");
        hasPath = true;
        continue;
      }
      if (/^samesite=/i.test(attr)) {
        attrs.push("SameSite=Lax");
        continue;
      }
      attrs.push(attr);
    }

    if (!hasPath) attrs.push("Path=/api/proxy");
    return prefix + name + "=" + value + (attrs.length ? "; " + attrs.join("; ") : "");
  });
}

function mapReferer(value, proxyOrigin) {
  const raw = String(value || "");
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.origin !== proxyOrigin || url.pathname !== "/api/proxy") return raw;
    const target = url.searchParams.get("url");
    return target ? new URL(target).toString() : "";
  } catch {
    return "";
  }
}

function mapOrigin(value, referer, proxyOrigin) {
  const raw = String(value || "");
  if (!raw) return "";
  try {
    const origin = new URL(raw);
    if (origin.origin !== proxyOrigin) return raw;
    const mapped = mapReferer(referer, proxyOrigin);
    return mapped ? new URL(mapped).origin : "";
  } catch {
    return "";
  }
}

function rewriteUrl(raw, base, proxyOrigin) {
  if (!raw || /^(data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(String(raw).trim())) {
    return raw;
  }

  try {
    const target = new URL(String(raw).trim(), base);
    if (target.protocol !== "http:" && target.protocol !== "https:") return raw;
    return proxyUrl(proxyOrigin, target);
  } catch {
    return raw;
  }
}

function isSnokidoGamePage(base) {
  try {
    const url = new URL(base);
    return /^(?:www\.)?snokido\.(?:com|fr)$/i.test(url.hostname) &&
      /^\/game(?:\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
}

function shouldKeepIframeDirect(raw, base) {
  try {
    const target = new URL(String(raw), base);
    if (/^(?:www\.)?snokido\.(?:com|fr)$/i.test(target.hostname)) return true;
    if (/(?:kbhgames|wgplayer|crazygames|poki|y8|itch)\.io?$|(?:kbhgames|wgplayer|crazygames|poki|y8|itch)\.com$/i.test(target.hostname)) return true;
    if (/\/embed\//i.test(target.pathname)) return true;
    return false;
  } catch {
    return false;
  }
}

function rewriteTagAttr(tag, attr, base, proxyOrigin, options) {
  const re = new RegExp(
    "(" + attr + "\\s*=\\s*)(?:\"([^\"]+)\"|'([^']+)'|([^\\s>]+))",
    "i"
  );

  return tag.replace(re, (all, prefix, doubleValue, singleValue, bareValue) => {
    const raw = doubleValue !== undefined
      ? doubleValue
      : singleValue !== undefined
        ? singleValue
        : bareValue;

    if (!raw) return all;

    if (options && options.iframe && options.keepDirect) {
      return all;
    }

    const rewritten = rewriteUrl(raw, base, proxyOrigin);
    if (rewritten === raw) return all;

    if (doubleValue !== undefined) return prefix + "\"" + rewritten + "\"";
    if (singleValue !== undefined) return prefix + "'" + rewritten + "'";
    return prefix + rewritten;
  });
}

function rewriteSrcset(tag, base, proxyOrigin) {
  const re = /(<(?:img|source)\b[^>]*\bsrcset\s*=\s*)(?:"([^"]+)"|'([^']+)')/i;
  return tag.replace(re, (all, prefix, doubleValue, singleValue) => {
    const raw = doubleValue !== undefined ? doubleValue : singleValue;
    const value = raw.split(",").map((part) => {
      const bits = part.trim().split(/\s+/);
      if (!bits[0]) return part;
      const rewritten = rewriteUrl(bits[0], base, proxyOrigin);
      return bits.length > 1 ? rewritten + " " + bits.slice(1).join(" ") : rewritten;
    }).join(", ");

    return prefix + (doubleValue !== undefined ? "\"" + value + "\"" : "'" + value + "'");
  });
}

function buildBridge(proxyOrigin, pageBase) {
  const O = JSON.stringify(proxyOrigin);
  const B = JSON.stringify(pageBase);
  const snokidoGame = isSnokidoGamePage(pageBase);

  return (
    '<style id="neo-proxy-style">html,body,*{cursor:none!important}html,body{margin:0;}</style>' +
    '<script id="neo-proxy-bridge">(function(){' +
    'if(window.__neoProxyBridge)return;window.__neoProxyBridge=1;' +
    'var P=' + O + ';' +
    'var B=' + B + ';' +
    'var S=' + JSON.stringify(snokidoGame) + ';' +
    'function px(v){try{if(!v)return null;var s=String(v);if(/^(data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(s))return null;var u=new URL(s,B||location.href);if(u.protocol!=="http:"&&u.protocol!=="https:")return null;if(u.origin===P&&u.pathname==="/api/proxy")return null;return P+"/api/proxy?url="+encodeURIComponent(u.toString())}catch(e){return null}}' +
    'function nativeCursor(){return!!(document.pointerLockElement||document.fullscreenElement||document.webkitFullscreenElement)}' +
    'function sendCursor(e,click){if(nativeCursor())return;try{var r=e.clientX,t=e.clientY,f=window.frameElement;if(f){var b=f.getBoundingClientRect();r+=b.left;t+=b.top}parent.postMessage({source:"neo-browser-cursor",x:r,y:t,click:!!click},"*")}catch(_){}}' +
    'document.addEventListener("mousemove",function(e){sendCursor(e,false)},{passive:true});' +
    'document.addEventListener("mousedown",function(e){sendCursor(e,true)},{passive:true});' +
    'document.addEventListener("pointerlockchange",function(){},false);' +
    'var oldFetch=window.fetch;window.fetch=function(input,init){try{var raw=typeof input==="string"?input:(input&&input.url)||"";var p=px(raw);if(p){if(typeof Request!=="undefined"&&input instanceof Request)input=new Request(p,input);else input=p;}}catch(_){}return oldFetch.call(this,input,init)};' +
    'var oldOpen=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url){try{var p=px(url);if(p)arguments[1]=p}catch(_){}return oldOpen.apply(this,arguments)};' +
    'try{var NativeEventSource=window.EventSource;if(NativeEventSource){window.EventSource=function(url,opts){return new NativeEventSource(px(url)||url,opts)};window.EventSource.prototype=NativeEventSource.prototype}}catch(_){}' +
    'try{var beacon=navigator.sendBeacon&&navigator.sendBeacon.bind(navigator);if(beacon){navigator.sendBeacon=function(url,data){return beacon(px(url)||url,data)}}}catch(_){}' +
    'try{var desc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,"src");if(desc&&desc.set){var os=desc.set,og=desc.get;Object.defineProperty(HTMLIFrameElement.prototype,"src",{configurable:true,get:og,set:function(v){try{var u=new URL(String(v),B||location.href);if(!S&&/^(?:www\\.)?snokido\\.(?:com|fr)$/i.test(u.hostname))v=v;else if(/\/embed\//i.test(u.pathname))v=v;else v=px(v)||v}catch(_){}return os.call(this,v)}})}}catch(_){}' +
    'document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var href=a.getAttribute("href");if(!href||/^(#|javascript:|mailto:|tel:|data:|blob:)/i.test(href))return;var p=px(href);if(!p)return;e.preventDefault();e.stopImmediatePropagation();location.href=p},{capture:true});' +
    'document.addEventListener("submit",function(e){var form=e.target;if(!form)return;var method=(form.getAttribute("method")||"GET").toUpperCase();if(method!=="GET")return;try{e.preventDefault();e.stopImmediatePropagation();var action=new URL(form.getAttribute("action")||B,B);var data=new URLSearchParams(new FormData(form));for(var pair of data.entries())action.searchParams.set(pair[0],pair[1]);var p=px(action.toString());if(p)location.href=p}catch(_){}},{capture:true});' +
    'try{var hp=history.pushState;var hr=history.replaceState;history.pushState=function(state,title,url){var p=px(url);return hp.call(this,state,title,p||url)};history.replaceState=function(state,title,url){var p=px(url);return hr.call(this,state,title,p||url)}}catch(_){}' +
    'try{var d=Object.getOwnPropertyDescriptor(Location.prototype,"href");if(d&&d.set){var os=d.set;Object.defineProperty(Location.prototype,"href",{configurable:true,enumerable:true,get:d.get,set:function(v){return os.call(this,px(v)||v)}})}}catch(_){}' +
    'try{parent.postMessage({source:"neo-browser-cursor",hello:true},"*")}catch(_){}' +
    '})();</script>'
  );
}

function rewriteHtml(html, base, proxyOrigin) {
  const snokidoGamePage = isSnokidoGamePage(base);

  html = html.replace(/<base\b[^>]*>/gi, "");

  html = html.replace(/<(img|script|source|video|audio|track|embed|object)\b[^>]*>/gi, (tag) => {
    let out = tag;
    for (const attr of ["src", "data-src", "poster", "data"]) {
      out = rewriteTagAttr(out, attr, base, proxyOrigin);
    }
    out = rewriteSrcset(out, base, proxyOrigin);
    return out;
  });

  html = html.replace(/<iframe\b[^>]*>/gi, (tag) => {
    return rewriteTagAttr(tag, "src", base, proxyOrigin, {
      iframe: true,
      keepDirect: shouldKeepIframeDirect(
        (tag.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i) || [])[1] ||
        (tag.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i) || [])[2] ||
        (tag.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i) || [])[3] ||
        "",
        base
      )
    });
  });

  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    let out = tag;
    out = rewriteTagAttr(out, "href", base, proxyOrigin);
    out = rewriteTagAttr(out, "imagesrcset", base, proxyOrigin);
    return out;
  });

  html = html.replace(/<a\b[^>]*>/gi, (tag) => rewriteTagAttr(tag, "href", base, proxyOrigin));
  html = html.replace(/<form\b[^>]*>/gi, (tag) => rewriteTagAttr(tag, "action", base, proxyOrigin));

  html = html.replace(/(<meta\b[^>]*http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'][^"']*\burl=)([^"' >]+)/gi,
    (all, prefix, raw) => prefix + rewriteUrl(raw, base, proxyOrigin)
  );

  html = html.replace(/(\bstyle\s*=\s*)(["'])([^"']*)\2/gi, (all, prefix, quote, css) => {
    const rewritten = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, q, raw) => {
      const next = rewriteUrl(raw, base, proxyOrigin);
      return next === raw ? full : 'url("' + next + '")';
    });
    return prefix + quote + rewritten + quote;
  });

  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']content-security-policy(?:-report-only)?["'][^>]*>/gi, "");
  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']x-frame-options["'][^>]*>/gi, "");
  html = html.replace(/<meta\b[^>]*name\s*=\s*["']referrer["'][^>]*>/gi, "");

  const bridge = buildBridge(proxyOrigin, base);
  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, (match) => match + bridge);
  } else {
    html = bridge + html;
  }

  return html;
}

async function fetchBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === "string") return Buffer.from(req.body);
    if (req.body && typeof req.body === "object") return Buffer.from(JSON.stringify(req.body));
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    req.on("error", reject);
  });
}

module.exports = async function proxyHandler(req, res) {
  const raw = req.query && req.query.url;
  if (!raw || typeof raw !== "string") {
    return res.status(400).send("Missing ?url=");
  }

  const target = parseTarget(raw);
  if (!target) {
    return res.status(400).send("Invalid or blocked URL");
  }

  const xfProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const xfHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = xfHost || req.headers.host || "localhost";
  const proto = xfProto || (host.includes("localhost") ? "http" : "https");
  const proxyOrigin = proto + "://" + host;

  const method = String(req.method || "GET").toUpperCase();
  const body = await fetchBody(req);
  const incomingReferer = mapReferer(req.headers.referer, proxyOrigin);
  const incomingOrigin = mapOrigin(req.headers.origin, req.headers.referer, proxyOrigin);

  let current = target;
  let response = null;

  try {
    for (let hop = 0; hop < 8; hop++) {
      const headers = {
        accept: req.headers.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": req.headers["accept-language"] || "en-US,en;q=0.9",
        "user-agent": req.headers["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      };

      if (incomingReferer) headers.referer = incomingReferer;
      if (incomingOrigin) headers.origin = incomingOrigin;
      if (req.headers.range) headers.range = req.headers.range;
      if (req.headers["if-range"]) headers["if-range"] = req.headers["if-range"];
      if (req.headers["if-none-match"]) headers["if-none-match"] = req.headers["if-none-match"];
      if (req.headers["if-modified-since"]) headers["if-modified-since"] = req.headers["if-modified-since"];
      if (req.headers.authorization) headers.authorization = req.headers.authorization;
      if (req.headers["content-type"] && body !== undefined) headers["content-type"] = req.headers["content-type"];

      const targetCookies = cookiesForTarget(req.headers.cookie, current.hostname);
      if (targetCookies) headers.cookie = targetCookies;

      response = await fetch(current.toString(), {
        method,
        redirect: "manual",
        headers,
        body: ["GET", "HEAD"].includes(method) ? undefined : body,
        signal: AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined
      });

      if (!(response.status >= 300 && response.status < 400)) break;

      const location = response.headers.get("location");
      if (!location) break;

      const next = parseTarget(location, current);
      if (!next) return res.status(403).send("Redirect destination is blocked");

      current = next;
    }

    if (!response) return res.status(502).send("Proxy did not receive a response");

    const contentType = response.headers.get("content-type") || "";
    const lowerType = contentType.toLowerCase();

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Referrer-Policy", "unsafe-url");
    res.setHeader("Permissions-Policy", "fullscreen=*, autoplay=*, gamepad=*, pointer-lock=*");

    const noCache = !!req.headers.cookie || method !== "GET";
    res.setHeader("Cache-Control", noCache ? "private, no-cache" : "public, max-age=60, stale-while-revalidate=300");

    const setCookies = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
    if (setCookies.length) {
      res.setHeader("Set-Cookie", rewriteSetCookies(setCookies, current.hostname));
    }

    if (lowerType.includes("text/html") || lowerType.includes("application/xhtml+xml")) {
      const bytes = await response.arrayBuffer();
      let html = new TextDecoder("utf-8").decode(bytes);
      html = rewriteHtml(html, current.toString(), proxyOrigin);
      res.status(response.status);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    if (lowerType.includes("text/css")) {
      const bytes = await response.arrayBuffer();
      let css = new TextDecoder("utf-8").decode(bytes);
      css = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (all, q, rawUrl) => {
        const next = rewriteUrl(rawUrl, current.toString(), proxyOrigin);
        return next === rawUrl ? all : 'url("' + next + '")';
      });
      res.status(response.status);
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      return res.send(css);
    }

    res.setHeader("Content-Type", contentType || "application/octet-stream");
    for (const [name, source] of [
      ["Content-Range", "content-range"],
      ["Accept-Ranges", "accept-ranges"],
      ["Content-Disposition", "content-disposition"],
      ["Last-Modified", "last-modified"],
      ["ETag", "etag"]
    ]) {
      const value = response.headers.get(source);
      if (value) res.setHeader(name, value);
    }

    res.status(response.status);

    if (method === "HEAD") return res.end();

    if (response.body && typeof Readable.fromWeb === "function") {
      const stream = Readable.fromWeb(response.body);
      stream.on("error", (error) => {
        console.error("Neo proxy stream error:", error);
        if (!res.headersSent) res.status(502);
        else res.destroy();
      });
      return stream.pipe(res);
    }

    const bytes = await response.arrayBuffer();
    return res.send(Buffer.from(bytes));
  } catch (error) {
    console.error("Neo proxy error:", error);
    const timeout = error && (error.name === "TimeoutError" || error.name === "AbortError");
    return res.status(timeout ? 504 : 502).send(
      timeout
        ? "The site took too long to respond."
        : "This site could not be loaded through Neo Browser."
    );
  }
};
