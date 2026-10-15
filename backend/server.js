"use strict";

const express = require("express");
const dns = require("node:dns").promises;
const net = require("node:net");

const app = express();
app.disable("x-powered-by");

const PORT = Number(process.env.PORT || 10000);
const MAX_HTML_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15000;

function csv(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function allowedRoots() {
  return csv(process.env.ALLOWED_PROXY_HOSTS)
    .map((host) => host.toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
}

function allowedOrigins() {
  return csv(process.env.FRONTEND_ORIGINS || "https://neosite.devs.surf")
    .map((origin) => {
      try { return new URL(origin).origin; } catch { return ""; }
    })
    .filter(Boolean);
}

function hostAllowed(hostname, roots = allowedRoots()) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  return roots.some((root) => host === root || host.endsWith("." + root));
}

function blockedAddress(address) {
  const raw = String(address || "").toLowerCase().split("%")[0];
  const family = net.isIP(raw);

  if (family === 4) {
    const [a, b, c] = raw.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100)) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224;
  }

  if (family === 6) {
    if (raw === "::" || raw === "::1" || raw.startsWith("fc") ||
        raw.startsWith("fd") || raw.startsWith("fe8") || raw.startsWith("fe9") ||
        raw.startsWith("fea") || raw.startsWith("feb") || raw.startsWith("ff")) return true;

    if (raw.startsWith("::ffff:")) {
      const mapped = raw.slice(7);
      if (net.isIP(mapped) === 4) return blockedAddress(mapped);
      return true;
    }

    const first = parseInt(raw.split(":")[0] || "0", 16);
    return !Number.isFinite(first) || (first & 0xe000) !== 0x2000;
  }

  return true;
}

async function ensurePublicDns(hostname) {
  // IP-literal targets are intentionally rejected; use an allow-listed hostname.
  if (net.isIP(String(hostname || "").replace(/^\[|\]$/g, ""))) {
    throw new Error("IP-address targets are not permitted");
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => blockedAddress(record.address))) {
    throw new Error("Target hostname does not resolve exclusively to public addresses");
  }
}

function parseTarget(raw, base, roots = allowedRoots()) {
  try {
    const target = new URL(raw, base);
    if (target.protocol !== "https:" && target.protocol !== "http:") return null;
    if (target.username || target.password) return null;
    if (!hostAllowed(target.hostname, roots)) return null;
    if (target.hostname === "localhost" || target.hostname.endsWith(".local") ||
        target.hostname.endsWith(".internal")) return null;
    return target;
  } catch {
    return null;
  }
}

function proxyUrl(origin, target) {
  return origin + "/api/proxy?url=" + encodeURIComponent(target.href);
}

function rewriteUrl(raw, base, origin, roots) {
  const value = String(raw || "").trim();
  if (!value || /^(?:data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(value)) return raw;
  const target = parseTarget(value, base, roots);
  return target ? proxyUrl(origin, target) : raw;
}

function rewriteAttr(tag, attr, base, origin, roots) {
  const re = new RegExp("(" + attr + "\\s*=\\s*)(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i");
  return tag.replace(re, (all, prefix, doubleValue, singleValue, bareValue) => {
    const raw = doubleValue !== undefined ? doubleValue
      : singleValue !== undefined ? singleValue : bareValue;
    if (raw === undefined) return all;
    const next = rewriteUrl(raw, base, origin, roots);
    if (next === raw) return all;
    if (doubleValue !== undefined) return prefix + "\"" + next + "\"";
    if (singleValue !== undefined) return prefix + "'" + next + "'";
    return prefix + next;
  });
}

function rewriteCss(css, base, origin, roots) {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (all, quote, raw) => {
    const next = rewriteUrl(raw, base, origin, roots);
    return next === raw ? all : 'url("' + next + '")';
  });
}

function buildBridge(origin, base, roots) {
  const p = JSON.stringify(origin);
  const b = JSON.stringify(base);
  const r = JSON.stringify(roots);

  return "<script>(function(){try{" +
    "if(window.__neoProxyV2)return;window.__neoProxyV2=true;" +
    "var P=" + p + ",B=" + b + ",R=" + r + ";" +
    "function u(v){try{var s=String(v||'');if(!s||/^(data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(s))return null;" +
    "var x=new URL(s,B||location.href);if(x.protocol!=='http:'&&x.protocol!=='https:')return null;" +
    "if(x.origin===P&&x.pathname==='/api/proxy')return null;" +
    "var h=x.hostname.toLowerCase().replace(/\\.$/,'');" +
    "if(!R.some(function(d){d=d.toLowerCase().replace(/\\.$/,'');return h===d||h.endsWith('.'+d)}))return null;" +
    "return P+'/api/proxy?url='+encodeURIComponent(x.href)}catch(_){return null}}" +
    "var f=window.fetch;if(f)window.fetch=function(input,init){try{var m=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();" +
    "if(m==='GET'||m==='HEAD'){var raw=typeof input==='string'?input:(input&&input.url)||'';var q=u(raw);if(q){" +
    "if(typeof Request!=='undefined'&&input instanceof Request)input=new Request(q,input);else input=q}}" +
    "}catch(_){}return f.call(this,input,init)};" +
    "var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,v){try{if(/^(GET|HEAD)$/i.test(String(m))){var q=u(v);if(q)arguments[1]=q}}catch(_){}return xo.apply(this,arguments)};" +
    "document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;" +
    "var q=u(a.getAttribute('href'));if(!q)return;e.preventDefault();e.stopImmediatePropagation();location.href=q},{capture:true});" +
    "}catch(_){}})();</script>";
}

function rewriteHtml(html, base, origin, roots) {
  // Keep source CSP and frame restrictions intact. Only rewrite URLs for hosts in the allow-list.
  html = html.replace(/<base\b[^>]*>/gi, "");
  html = html.replace(/<(?:img|script|source|video|audio|track|embed|object)\b[^>]*>/gi, (tag) => {
    let out = tag;
    for (const attr of ["src", "data-src", "poster", "data"]) {
      out = rewriteAttr(out, attr, base, origin, roots);
    }
    return out;
  });
  html = html.replace(/<link\b[^>]*>/gi, (tag) => rewriteAttr(tag, "href", base, origin, roots));
  html = html.replace(/<a\b[^>]*>/gi, (tag) => rewriteAttr(tag, "href", base, origin, roots));
  html = html.replace(/<form\b[^>]*>/gi, (tag) => rewriteAttr(tag, "action", base, origin, roots));
  html = html.replace(/(\bstyle\s*=\s*)(["'])(.*?)\2/gi, (all, prefix, q, css) =>
    prefix + q + rewriteCss(css, base, origin, roots) + q);

  const bridge = buildBridge(origin, base, roots);
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, (head) => head + bridge);
  return bridge + html;
}

function setCors(req, res) {
  const origin = String(req.headers.origin || "");
  if (allowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "false");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type, If-None-Match, If-Modified-Since, Range");
  res.setHeader("Access-Control-Max-Age", "600");
}

function safeResponseHeaders(upstream, res) {
  const contentType = upstream.headers.get("content-type");
  if (contentType) res.setHeader("Content-Type", contentType);
  for (const key of ["content-range", "accept-ranges", "etag", "last-modified", "content-disposition"]) {
    const value = upstream.headers.get(key);
    if (value) res.setHeader(key, value);
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

app.get("/", (_req, res) => {
  res.set("Cache-Control", "no-store").json({
    service: "Neo WebsiteBrowser proxy API",
    status: "online",
    proxyConfigured: allowedRoots().length > 0,
    endpoints: ["/healthz", "/api/proxy?url=https%3A%2F%2Fneosite.devs.surf%2F"]
  });
});

app.get("/healthz", (_req, res) => {
  res.set("Cache-Control", "no-store").json({
    status: "ok",
    proxyConfigured: allowedRoots().length > 0,
    allowedHostCount: allowedRoots().length
  });
});

app.all("/api/proxy", async (req, res) => {
  setCors(req, res);
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).send("Only GET and HEAD are supported.");
  }

  const roots = allowedRoots();
  if (!roots.length) return res.status(503).send("Proxy is not configured. Set ALLOWED_PROXY_HOSTS in the hosting environment.");

  const raw = typeof req.query.url === "string" ? req.query.url : "";
  if (!raw) return res.status(400).send("Missing ?url= parameter.");
  if (raw.length > 4096) return res.status(414).send("Target URL is too long.");

  let target = parseTarget(raw, undefined, roots);
  if (!target) return res.status(403).send("Target is not in ALLOWED_PROXY_HOSTS.");

  const configuredOrigin = String(process.env.PROXY_PUBLIC_ORIGIN || "").trim();
  let publicOrigin;
  try {
    publicOrigin = configuredOrigin ? new URL(configuredOrigin).origin : (req.protocol + "://" + req.get("host"));
    if (!/^https?:\/\//i.test(publicOrigin)) throw new Error("bad origin");
  } catch {
    return res.status(500).send("PROXY_PUBLIC_ORIGIN must be a valid public origin URL.");
  }

  try {
    let upstream;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await ensurePublicDns(target.hostname);

      const headers = new Headers();
      for (const name of ["accept", "accept-language", "range", "if-range", "if-none-match", "if-modified-since"]) {
        const value = req.get(name);
        if (value) headers.set(name, value);
      }
      // Deliberately do not forward cookies, Authorization, or client-specific headers.
      upstream = await fetch(target.href, {
        method: req.method,
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });

      if (upstream.status < 300 || upstream.status >= 400) break;
      const location = upstream.headers.get("location");
      if (!location) break;
      if (upstream.body) await upstream.body.cancel().catch(() => {});
      if (hop === MAX_REDIRECTS) return res.status(508).send("Too many redirects.");
      const next = parseTarget(location, target.href, roots);
      if (!next) return res.status(403).send("Redirect destination is not in ALLOWED_PROXY_HOSTS.");
      target = next;
    }

    safeResponseHeaders(upstream, res);
    res.status(upstream.status);

    const contentType = String(upstream.headers.get("content-type") || "").toLowerCase();
    const isRewritable = contentType.includes("text/html") ||
      contentType.includes("application/xhtml+xml") || contentType.includes("text/css");

    if (!isRewritable || req.method === "HEAD" || !upstream.body) {
      if (!upstream.body || req.method === "HEAD") return res.end();
      const { Readable } = require("node:stream");
      return Readable.fromWeb(upstream.body).pipe(res);
    }

    const length = Number(upstream.headers.get("content-length") || 0);
    if (length > MAX_HTML_BYTES) {
      if (upstream.body) await upstream.body.cancel().catch(() => {});
      return res.status(413).send("HTML/CSS is too large for safe URL rewriting.");
    }

    const reader = upstream.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_HTML_BYTES) {
        await reader.cancel().catch(() => {});
        return res.status(413).send("HTML/CSS is too large for safe URL rewriting.");
      }
      chunks.push(Buffer.from(part.value));
    }

    let body = Buffer.concat(chunks).toString("utf8");
    if (contentType.includes("text/css")) body = rewriteCss(body, target.href, publicOrigin, roots);
    else body = rewriteHtml(body, target.href, publicOrigin, roots);

    if (contentType.includes("text/html") || contentType.includes("application/xhtml+xml")) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
    } else {
      res.setHeader("Content-Type", "text/css; charset=utf-8");
    }
    return res.send(body);
  } catch (error) {
    const message = String(error && error.message || error);
    const isTimeout = /timed out|timeout/i.test(message);
    return res.status(isTimeout ? 504 : 502).send(isTimeout ? "Target request timed out." : "Unable to fetch the permitted target: " + message.slice(0, 140));
  }
});

app.all("*", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Neo proxy API listening on port " + PORT);
  console.log("Allowed hostname entries: " + allowedRoots().length);
});
