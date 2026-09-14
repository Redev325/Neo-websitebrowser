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

function rewriteAttr(tag, attr, base) {
  const re = new RegExp("(" + attr + "\\s*=\\s*[\"'])([^\"']+)([\"'])", "i");
  return tag.replace(re, (all, a, raw, b) => {
    if (!raw || /^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(raw)) return all;
    const u = targetUrl(raw, base);
    return u ? a + prox(u) + b : all;
  });
}

function rewriteHtml(html, base) {
  // Resource-bearing tags. We intentionally do not rewrite ordinary <a href>
  // because doing so can break sites that use client-side routing.
  html = html.replace(/<(img|script|source|video|audio|track|iframe|embed|object)\b[^>]*>/gi,
    tag => {
      let out = tag;
      for (const a of ["src", "data-src", "poster"]) out = rewriteAttr(out, a, base);
      return out;
    });

  // Stylesheets/icons/preloads regardless of attribute ordering.
  html = html.replace(/<link\b[^>]*>/gi, tag => {
    const rel = (tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] || "").toLowerCase();
    if (!/(stylesheet|icon|preload|modulepreload)/.test(rel)) return tag;
    return rewriteAttr(tag, "href", base);
  });

  // srcset is common on images.
  html = html.replace(/\b(srcset)\s*=\s*(["'])(.*?)\2/gi, (all, attr, q, value) => {
    const parts = value.split(",").map(part => {
      const m = part.trim().match(/^(\S+)(\s+.*)?$/);
      if (!m) return part;
      const u = targetUrl(m[1], base);
      return u ? prox(u) + (m[2] || "") : part;
    });
    return `${attr}=${q}${parts.join(", ")}${q}`;
  });

  // CSS-style URLs occasionally appear inline in style attributes.
  html = html.replace(/\bstyle\s*=\s*(["'])(.*?)\1/gi, (all, q, value) => {
    const rewritten = value.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (x, qq, raw) => {
      const u = targetUrl(raw.trim(), base);
      return u ? `url("${prox(u)}")` : x;
    });
    return `style=${q}${rewritten}${q}`;
  });

  // The main Neo cursor lives in the top document, but an iframe is its own
  // browsing context. The top document cannot receive the iframe's pointer
  // movement directly. Since this HTML is served from our own proxy origin,
  // install the same visual cursor inside the proxied document as well.
  // This makes the flare visibly continue through the Browser box while
  // preserving normal interaction with the embedded page.
  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']content-security-policy["'][^>]*>/gi, "");
  html = html.replace(/<meta\b[^>]*content-security-policy[^>]*>/gi, "");

  const bridge = `<style id="neo-proxy-cursor-style">
html,body{cursor:none!important}
#neo-proxy-cursor{position:fixed;left:0;top:0;width:58px;height:58px;margin:-29px 0 0 -29px;pointer-events:none;z-index:2147483647;display:none;background-repeat:no-repeat;background-position:center;background-size:contain;filter:drop-shadow(0 0 5px rgba(255,40,55,.95)) drop-shadow(0 0 14px rgba(255,40,55,.6)) drop-shadow(0 0 28px rgba(255,40,55,.38))}
#neo-proxy-cursor .r{position:absolute;top:50%;left:50%;width:26px;height:26px;margin:-13px;border-radius:50%;border:1.5px solid var(--neo-cursor);box-shadow:0 0 10px var(--neo-cursor);opacity:0;animation:neo-halo 2.6s ease-out infinite}
#neo-proxy-cursor .r.r2{animation-delay:.87s}#neo-proxy-cursor .r.r3{animation-delay:1.74s}
@keyframes neo-halo{0%{transform:scale(.3);opacity:0}14%{opacity:.8}100%{transform:scale(3.2);opacity:0}}
.neo-proxy-trail{position:fixed;width:5px;height:5px;border-radius:50%;pointer-events:none;z-index:2147483646;background:var(--neo-cursor);box-shadow:0 0 7px var(--neo-cursor);transform:translate(-50%,-50%);animation:neo-trail .45s ease-out forwards}
@keyframes neo-trail{0%{opacity:.9;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(.25)}}
.neo-proxy-burst{position:fixed;pointer-events:none;z-index:2147483646;transform:translate(-50%,-50%);border-radius:50%}
@keyframes neo-burst{0%{opacity:1;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.7)}}
</style><script id="neo-proxy-cursor-script">(function(){
if(window.__neoProxyCursor)return;window.__neoProxyCursor=1;
var color='#ff3344';var cursor, trails=[];var lastTrail=0;
function make(){
  if(cursor)return;
  cursor=document.createElement('div');cursor.id='neo-proxy-cursor';
  cursor.innerHTML='<span class="r r1"></span><span class="r r2"></span><span class="r r3"></span>';
  document.documentElement.appendChild(cursor);
  cursor.style.setProperty('--neo-cursor',color);
}
function setColor(v){if(!v)return;color=v;make();cursor.style.setProperty('--neo-cursor',color);cursor.style.filter='drop-shadow(0 0 5px '+color+') drop-shadow(0 0 14px '+color+') drop-shadow(0 0 28px '+color+')'}
function trail(x,y){var n=Date.now();if(n-lastTrail<45)return;lastTrail=n;var d=document.createElement('div');d.className='neo-proxy-trail';d.style.left=x+'px';d.style.top=y+'px';document.documentElement.appendChild(d);trails.push(d);if(trails.length>14){var old=trails.shift();if(old&&old.remove)old.remove()}setTimeout(function(){if(d&&d.remove)d.remove()},450)}
function burst(x,y){var d=document.createElement('div');d.className='neo-proxy-burst';d.style.left=x+'px';d.style.top=y+'px';d.style.width='12px';d.style.height='12px';d.style.background='radial-gradient(circle,#fff 0%, '+color+' 45%, transparent 100%)';d.style.boxShadow='0 0 18px '+color+',0 0 35px '+color;d.style.animation='neo-burst .4s ease-out forwards';document.documentElement.appendChild(d);setTimeout(function(){if(d.remove)d.remove()},450)}
function move(e){make();cursor.style.display='block';cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';trail(e.clientX,e.clientY);parent.postMessage({source:'neo-browser-cursor',x:e.clientX,y:e.clientY,click:false},'*')}
function down(e){make();cursor.style.display='block';burst(e.clientX,e.clientY);parent.postMessage({source:'neo-browser-cursor',x:e.clientX,y:e.clientY,click:true},'*')}
function boot(){make();document.addEventListener('mousemove',move,{passive:true});document.addEventListener('mousedown',down,{passive:true});window.addEventListener('message',function(e){if(e.data&&e.data.source==='neo-browser-accent')setColor(e.data.color)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, bridge + "</body>");
  else html += bridge;
  return html;
}

function rewriteCss(css, base) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (all, q, raw) => {
    const u = targetUrl(raw.trim(), base);
    return u ? `url("${prox(u)}")` : all;
  });
}

function charsetOf(contentType) {
  const m = contentType.match(/charset=([^;]+)/i);
  return m ? m[1].trim().replace(/^["']|["']$/g,"") : "utf-8";
}

async function fetchChecked(start, req) {
  let current = start;
  for (let i=0; i<6; i++) {
    const r = await fetch(current.toString(), {
      redirect:"manual",
      headers:{
        "accept": req.headers.accept || "*/*",
        "accept-language": req.headers["accept-language"] || "en-US,en;q=0.9",
        "user-agent": req.headers["user-agent"] || "NeoBrowser/1.0"
      }
    });
    if (!(r.status >= 300 && r.status < 400)) return {r,current};
    const loc=r.headers.get("location");
    if(!loc) return {r,current};
    const next=targetUrl(loc,current);
    if(!next) return {blocked:true};
    current=next;
  }
  return {tooMany:true};
}

function neoErrorPage(title, message, target) {
  const safeTarget = String(target || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
html,body{margin:0;background:#030305;color:#f5f5f5;font:15px/1.5 system-ui,sans-serif}
.neo{max-width:820px;margin:70px auto;padding:32px}
h1{font-size:26px;margin:0 0 12px}.muted{opacity:.65}
a{color:#ff4657;text-decoration:none}.box{margin-top:22px;padding:18px;border:1px solid #27272d;border-radius:16px;background:#0a0a0e}
</style></head><body><main class="neo"><h1>${title}</h1><p class="muted">${message}</p>
<div class="box">The requested page returned an error before it could be displayed inside Neo Browser.</div>
<p><a href="${safeTarget}" target="_top" rel="noreferrer">Open the original page</a></p></main></body></html>`;
}

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

    // Upstream frame/CSP headers can prevent the proxied page from rendering.
    // We intentionally do not forward those headers to our same-origin iframe.
    if(type.toLowerCase().includes("text/html")){
      const text=new TextDecoder(charsetOf(type)).decode(body);
      const lower=text.toLowerCase();
      if (r.status >= 400 || (current.hostname.includes("duckduckgo.com") &&
          (lower.includes("failed to get search results") ||
           lower.includes("if this persists, please email us") ||
           lower.includes("anonymized error code")))) {
        res.setHeader("Content-Type","text/html; charset=utf-8");
        return res.status(200).send(neoErrorPage(
          "Search temporarily unavailable",
          "DuckDuckGo did not return usable results to the server. Neo Browser will not display the provider's raw error page.",
          current.toString()
        ));
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
