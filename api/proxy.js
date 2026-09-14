const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "169.254.169.254", "metadata.google.internal"
]);

function isPrivateIPv4(host) {
  const p = host.split(".").map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) return false;
  const [a,b] = p;
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
  } catch { return null; }
}

const prox = u => "/api/proxy?url=" + encodeURIComponent(u.toString());

// Shared bridge injected into every proxied HTML document. Hides the native
// cursor and forwards pointer coordinates to the parent Neo Browser shell so
// the custom cursor keeps tracking over proxied content.
const CURSOR_BRIDGE = `<style id="neo-proxy-cursor-style">html,body,*{cursor:none!important}#neo-proxy-cursor{display:none!important}</style><script id="neo-proxy-cursor-script">(function(){
if(window.__neoProxyCursor)return;window.__neoProxyCursor=1;
function screenPoint(e){var x=e.clientX,y=e.clientY;try{var f=window.frameElement;if(f){var r=f.getBoundingClientRect();x+=r.left;y+=r.top}}catch(_){}return{x:x,y:y}}
function send(e,click){var p=screenPoint(e);parent.postMessage({source:'neo-browser-cursor',x:p.x,y:p.y,click:!!click},'*')}
document.addEventListener('mousemove',function(e){send(e,false)},{passive:true});
document.addEventListener('mousedown',function(e){send(e,true)},{passive:true});
document.addEventListener('mouseleave',function(){parent.postMessage({source:'neo-browser-cursor',leave:true},'*')},{passive:true});
})();</script>`;

function rewriteAttr(tag, attr, base) {
  const re = new RegExp("(" + attr + "\\s*=\\s*[\\\"'])([^\\\"']+)([\\\"'])", "i");
  return tag.replace(re, (all, a, raw, b) => {
    if (!raw || /^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(raw)) return all;
    const u = targetUrl(raw, base);
    return u ? a + prox(u) + b : all;
  });
}

function rewriteHtml(html, base) {
  html = html.replace(/<(img|script|source|video|audio|track|iframe|embed|object)\b[^>]*>/gi,
    tag => {
      let out = tag;
      for (const a of ["src", "data-src", "poster"]) out = rewriteAttr(out, a, base);
      return out;
    });

  html = html.replace(/<link\b[^>]*>/gi, tag => {
    const rel = (tag.match(/\brel\s*=\s*[\"']([^\"']+)[\"']/i)?.[1] || "").toLowerCase();
    if (!/(stylesheet|icon|preload|modulepreload)/.test(rel)) return tag;
    return rewriteAttr(tag, "href", base);
  });

  // Route in-page navigation (anchors) back through the proxy so clicks stay
  // inside the Neo Browser instead of breaking out to the real site (which
  // often refuses to be framed).
  html = html.replace(/<a\b[^>]*>/gi, tag => rewriteAttr(tag, "href", base));

  html = html.replace(/\b(srcset)\s*=\s*([\"'])(.*?)\2/gi, (all, attr, q, value) => {
    const parts = value.split(",").map(part => {
      const m = part.trim().match(/^(\S+)(\s+.*)?$/);
      if (!m) return part;
      const u = targetUrl(m[1], base);
      return u ? prox(u) + (m[2] || "") : part;
    });
    return `${attr}=${q}${parts.join(", ")}${q}`;
  });

  html = html.replace(/\bstyle\s*=\s*([\"'])(.*?)\1/gi, (all, q, value) => {
    const rewritten = value.replace(/url\(\s*(['\"]?)([^'\")]+)\1\s*\)/gi, (x, qq, raw) => {
      const u = targetUrl(raw.trim(), base);
      return u ? `url(\"${prox(u)}\")` : x;
    });
    return `style=${q}${rewritten}${q}`;
  });

  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*[\"']content-security-policy[\"'][^>]*>/gi, "");
  html = html.replace(/<meta\b[^>]*content-security-policy[^>]*>/gi, "");

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, CURSOR_BRIDGE + "</body>");
  else html += CURSOR_BRIDGE;
  return html;
}

function rewriteCss(css, base) {
  return css.replace(/url\(\s*(['\"]?)([^'\")]+)\1\s*\)/gi, (all, q, raw) => {
    const u = targetUrl(raw.trim(), base);
    return u ? `url(\"${prox(u)}\")` : all;
  });
}

function charsetOf(contentType) {
  const m = contentType.match(/charset=([^;]+)/i);
  return m ? m[1].trim().replace(/^[\"']|[\"']$/g,"") : "utf-8";
}

async function fetchChecked(start, req) {
  let current = start;
  for (let i=0; i<6; i++) {
    const headers = {
      "accept": req.headers.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": req.headers["accept-language"] || "en-US,en;q=0.9",
      "user-agent": req.headers["user-agent"] || "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
      "referer": current.origin + "/",
      "upgrade-insecure-requests": "1"
    };
    if (req.headers.cookie) headers.cookie = req.headers.cookie;

    const r = await fetch(current.toString(), { redirect:"manual", headers });
    if (!(r.status >= 300 && r.status < 400)) return {r,current};
    const loc=r.headers.get("location");
    if(!loc) return {r,current};
    const next=targetUrl(loc,current);
    if(!next) return {blocked:true};
    current=next;
  }
  return {tooMany:true};
}

/* ------------------------------------------------------------------ */
/* Search rendering                                                    */
/* ------------------------------------------------------------------ */

// A proxied Bing search URL, e.g. www.bing.com/search?q=...
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Bing wraps every organic result link in a /ck/a redirect whose real target
// is base64url-encoded in the `u` param (after an "a1" prefix). Decode it back
// to the actual destination; return null for Bing/Microsoft-internal links.
function resolveBingLink(href) {
  const url = decodeEntities(href);
  let host = "";
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
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

// Parse Bing's server-rendered organic results out of its HTML. Bing includes
// these in the initial document (inside <li class="b_algo">), so we never need
// to run Bing's client-side JavaScript.
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
        try { const uu = new URL(url); display = uu.hostname.replace(/^www\./, "") + (uu.pathname === "/" ? "" : uu.pathname); } catch {}
        results.push({ url, title, snippet, display });
      }
    }
    idx = next;
  }
  return results;
}

function renderSearchPage(query, results) {
  const q = escapeHtml(query);
  const items = results.map(r => `
      <article class="res">
        <a class="res-url" href="${escapeHtml(prox(new URL(r.url)))}">${escapeHtml(r.display)}</a>
        <a class="res-title" href="${escapeHtml(prox(new URL(r.url)))}">${escapeHtml(r.title)}</a>
        ${r.snippet ? `<p class="res-snip">${escapeHtml(r.snippet)}</p>` : ""}
      </article>`).join("");

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
  html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;cursor:none}
  .wrap{max-width:720px;margin:0 auto;padding:28px 24px 80px}
  header{display:flex;align-items:center;gap:12px;padding-bottom:18px;border-bottom:1px solid var(--border);margin-bottom:24px}
  .mark{width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 50% 45%,#fff 0%,#ff5a5a 30%,var(--accent) 60%,#7a0000 100%);box-shadow:0 0 18px rgba(255,45,45,.55);flex:0 0 auto}
  .brand{font-weight:700;letter-spacing:.3px}
  .brand span{color:var(--accent)}
  .meta{color:var(--muted);font-size:13px;margin:0 0 20px}
  .meta strong{color:var(--text)}
  .res{padding:14px 0;border-bottom:1px solid rgba(255,255,255,.04)}
  .res-url{display:block;color:var(--muted);font-size:12.5px;text-decoration:none;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .res-title{display:block;color:var(--link);font-size:18px;line-height:1.35;text-decoration:none}
  .res-title:hover{text-decoration:underline}
  .res-snip{color:#c4c4cc;font-size:14px;line-height:1.5;margin:6px 0 0}
  .empty{text-align:center;padding:60px 0;color:var(--muted)}
  .empty-orb{width:56px;height:56px;border-radius:50%;margin:0 auto 18px;background:radial-gradient(circle at 50% 45%,#fff 0%,#ff5a5a 30%,var(--accent) 60%,#7a0000 100%);box-shadow:0 0 26px rgba(255,45,45,.5)}
  .empty-sub{font-size:13px;margin-top:6px}
  footer{margin-top:34px;text-align:center;color:var(--muted);font-size:12px}
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="mark" aria-hidden="true"></div>
      <div class="brand">Neo<span>Search</span></div>
    </header>
    <p class="meta">Results for <strong>${q}</strong></p>
    ${results.length ? items : empty}
    <footer>Neo Browser · Use responsibly</footer>
  </div>
  ${CURSOR_BRIDGE}
</body>
</html>`;
}

/* ------------------------------------------------------------------ */

module.exports = async function handler(req,res){
  const raw=req.query?.url;
  if(!raw || typeof raw!=="string") return res.status(400).send("Missing ?url=");
  const target=targetUrl(raw);
  if(!target) return res.status(400).send("Invalid or blocked URL");

  try{
    const result=await fetchChecked(target,req);
    if(result.blocked) return res.status(403).send("Redirect destination is blocked");
    if(result.tooMany) return res.status(502).send("Too many redirects");

    const {r,current}=result;
    const type=r.headers.get("content-type")||"";
    const body=await r.arrayBuffer();

    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("Cache-Control","no-store");
    res.setHeader("Access-Control-Allow-Origin","*");

    if(type.toLowerCase().includes("text/html")){
      const text=new TextDecoder(charsetOf(type)).decode(body);

      // If this is a search query, render our own clean results page instead
      // of proxying the search engine's JavaScript app (which loads results
      // via XHR that would otherwise hit our own origin and 404).
      const query=searchQueryOf(current);
      if(query){
        const results=parseBingResults(text);
        // Only take over rendering when we actually recovered results; if the
        // engine returned a challenge/empty shell, fall through to raw proxy.
        if(results.length){
          res.setHeader("Content-Type","text/html; charset=utf-8");
          return res.status(200).send(renderSearchPage(query, results));
        }
      }

      const html=rewriteHtml(text,current.toString());
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(r.status).send(html);
    }
    if(type.toLowerCase().includes("text/css")){
      const text=new TextDecoder(charsetOf(type)).decode(body);
      const css=rewriteCss(text,current.toString());
      res.setHeader("Content-Type","text/css; charset=utf-8");
      return res.status(r.status).send(css);
    }

    res.setHeader("Content-Type",type||"application/octet-stream");
    return res.status(r.status).send(Buffer.from(body));
  }catch(e){
    console.error(e);
    return res.status(502).send("Proxy request failed");
  }
}
