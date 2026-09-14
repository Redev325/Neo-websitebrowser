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
  const re = new RegExp("(" + attr + "\\s*=\\s*[\\\"'])([^\\\"']+)([\\\"'])", "i");
  return tag.replace(re, (all, a, raw, b) => {
    if (!raw || /^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(raw)) return all;
    const u = targetUrl(raw, base);
    return u ? a + prox(u) + b : all;
  });
}

function rewriteHtml(html, base) {
  html = html.replace(/<(img|script|source|video|audio|track|iframe|embed|object)\\b[^>]*>/gi,
    tag => {
      let out = tag;
      for (const a of ["src", "data-src", "poster"]) out = rewriteAttr(out, a, base);
      return out;
    });

  html = html.replace(/<link\\b[^>]*>/gi, tag => {
    const rel = (tag.match(/\\brel\\s*=\\s*[\"']([^\"']+)[\"']/i)?.[1] || "").toLowerCase();
    if (!/(stylesheet|icon|preload|modulepreload)/.test(rel)) return tag;
    return rewriteAttr(tag, "href", base);
  });

  html = html.replace(/\\b(srcset)\\s*=\\s*([\"'])(.*?)\\2/gi, (all, attr, q, value) => {
    const parts = value.split(",").map(part => {
      const m = part.trim().match(/^(\\S+)(\\s+.*)?$/);
      if (!m) return part;
      const u = targetUrl(m[1], base);
      return u ? prox(u) + (m[2] || "") : part;
    });
    return `${attr}=${q}${parts.join(", ")}${q}`;
  });

  html = html.replace(/\\bstyle\\s*=\\s*([\"'])(.*?)\\1/gi, (all, q, value) => {
    const rewritten = value.replace(/url\\(\\s*(['\"]?)([^'\")]+)\\1\\s*\\)/gi, (x, qq, raw) => {
      const u = targetUrl(raw.trim(), base);
      return u ? `url(\"${prox(u)}\")` : x;
    });
    return `style=${q}${rewritten}${q}`;
  });

  html = html.replace(/<meta\\b[^>]*http-equiv\\s*=\\s*[\"']content-security-policy[\"'][^>]*>/gi, "");
  html = html.replace(/<meta\\b[^>]*content-security-policy[^>]*>/gi, "");

  // Hide the native iframe cursor and report top-level coordinates to Neo.
  // DuckDuckGo's normal page loads organic results through links.duckduckgo.com.
  // Because the page is being displayed through Neo's browser proxy, those
  // requests would otherwise originate from the Vercel iframe and can fail.
  // Route DuckDuckGo's dynamic API calls back through the same proxy so the
  // actual DuckDuckGo UI can continue to work instead of showing its error page.
  const bridge = `<style id="neo-proxy-cursor-style">html,body,*{cursor:none!important}#neo-proxy-cursor{display:none!important}</style><script id="neo-proxy-cursor-script">(function(){
if(window.__neoProxyCursor)return;window.__neoProxyCursor=1;
function screenPoint(e){var x=e.clientX,y=e.clientY;try{var f=window.frameElement;if(f){var r=f.getBoundingClientRect();x+=r.left;y+=r.top}}catch(_){}return{x:x,y:y}}
function send(e,click){var p=screenPoint(e);parent.postMessage({source:'neo-browser-cursor',x:p.x,y:p.y,click:!!click},'*')}
document.addEventListener('mousemove',function(e){send(e,false)},{passive:true});
document.addEventListener('mousedown',function(e){send(e,true)},{passive:true});
document.addEventListener('mouseleave',function(){parent.postMessage({source:'neo-browser-cursor',leave:true},'*')},{passive:true});
function shouldProxy(value){try{var u=new URL(value,location.href);return /(^|\\.)duckduckgo\\.com$/i.test(u.hostname)&&u.hostname.toLowerCase()==='links.duckduckgo.com'}catch(_){return false}}
function proxyUrl(value){try{var u=new URL(value,location.href);return '/api/proxy?url='+encodeURIComponent(u.toString())}catch(_){return value}}
var nativeFetch=window.fetch;
if(nativeFetch){window.fetch=function(input,init){try{var raw=typeof input==='string'?input:(input&&input.url)||'';if(shouldProxy(raw)){if(typeof input==='string')input=proxyUrl(raw);else input=new Request(proxyUrl(raw),input)}}catch(_){}return nativeFetch.call(this,input,init)}}
var nativeOpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url){try{if(shouldProxy(url))url=proxyUrl(url)}catch(_){}return nativeOpen.apply(this,arguments)};
})();</script>`;

  if (/<\\/body>/i.test(html)) html = html.replace(/<\\/body>/i, bridge + "</body>");
  else html += bridge;
  return html;
}

function rewriteCss(css, base) {
  return css.replace(/url\\(\\s*(['\"]?)([^'\")]+)\\1\\s*\\)/gi, (all, q, raw) => {
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
    const r = await fetch(current.toString(), {
      redirect:"manual",
      headers:{
        "accept": req.headers.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": req.headers["accept-language"] || "en-US,en;q=0.9",
        "user-agent": req.headers["user-agent"] || "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        "referer": current.hostname.endsWith("duckduckgo.com") ? "https://duckduckgo.com/" : current.origin + "/",
        "upgrade-insecure-requests": "1"
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
  const safeTarget = String(target || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>html,body{margin:0;background:#030305;color:#f5f5f5;font:15px/1.5 system-ui,sans-serif}.neo{max-width:820px;margin:70px auto;padding:32px}h1{font-size:26px;margin:0 0 12px}.muted{opacity:.65}a{color:#ff4657;text-decoration:none}.box{margin-top:22px;padding:18px;border:1px solid #27272d;border-radius:16px;background:#0a0a0e}</style></head><body><main class="neo"><h1>${title}</h1><p class="muted">${message}</p><div class="box">The requested page returned an error before it could be displayed inside Neo Browser.</div><p><a href="${safeTarget}" target="_top" rel="noreferrer">Open the original page</a></p></main></body></html>`;
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

    if(type.toLowerCase().includes("text/html")){
      const text=new TextDecoder(charsetOf(type)).decode(body);
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
