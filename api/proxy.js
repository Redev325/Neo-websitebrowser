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
