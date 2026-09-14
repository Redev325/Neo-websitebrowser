module.exports = async function handler(req, res) {
  const q = typeof req.query?.q === "string" ? req.query.q.trim().slice(0, 499) : "";
  if (!q) return res.status(400).send("Missing ?q=");

  const enc = encodeURIComponent(q);
  const endpoint = "https://html.duckduckgo.com/html/";
  let upstream = null;
  let html = "";

  // DuckDuckGo's HTML search is the real DuckDuckGo results page (not Lite).
  // POST is used because the current HTML endpoint expects form submissions.
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        "referer": endpoint
      },
      body: "q=" + enc + "&b=&kl=us-en&kp=-2"
    });
    html = await upstream.text();
  } catch (e) {
    console.error("DuckDuckGo POST failed", e);
  }

  // A GET fallback keeps the search working if DuckDuckGo changes the form handling.
  if (!upstream || !upstream.ok || !/<(?:a|div)[^>]+result__/i.test(html)) {
    try {
      upstream = await fetch(endpoint + "?q=" + enc, {
        headers: {
          "accept": "text/html,application/xhtml+xml",
          "accept-language": "en-US,en;q=0.9",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          "referer": endpoint
        }
      });
      html = await upstream.text();
    } catch (e) {
      console.error("DuckDuckGo GET fallback failed", e);
    }
  }

  if (!html || !upstream?.ok) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><title>DuckDuckGo</title><style>body{margin:0;background:#151515;color:#eee;font:16px system-ui;padding:60px}a{color:#8ab4ff}</style></head><body><h2>DuckDuckGo is temporarily unavailable</h2><p>DuckDuckGo did not return a search page. Try again in a moment.</p></body></html>`);
  }

  // Keep DuckDuckGo's own results page and styling. Only rewrite the pieces
  // that must work inside Neo's iframe browser.
  const escAttr = s => String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const proxy = u => "/api/proxy?url=" + encodeURIComponent(u.toString());

  // The search form should submit back through this endpoint, while result
  // links should continue through Neo's proxy instead of breaking the iframe.
  html = html.replace(/<form\b([^>]*?)action=["'][^"']*["']([^>]*)>/gi, (all, before, after) =>
    `<form${before}action="/api/search"${after}>`
  );

  html = html.replace(/<a\b([^>]*class=["'][^"']*result__a[^"']*["'][^>]*)>/gi, (tag, attrs) => {
    return tag.replace(/\bhref=["']([^"']+)["']/i, (m, raw) => {
      try {
        const u = new URL(raw, endpoint);
        const uddg = u.searchParams.get("uddg");
        const target = uddg || u.toString();
        return `href="${escAttr(proxy(target))}"`;
      } catch {
        return m;
      }
    });
  });

  // Hide the browser's native cursor inside the iframe and report screen
  // coordinates to Neo's parent cursor. This fixes the cursor disappearing or
  // appearing offset when the mouse moves over the search-results iframe.
  const bridge = `<style id="neo-search-cursor-style">html,body,*{cursor:none!important}</style><script id="neo-search-cursor-script">(function(){
if(window.__neoSearchCursor)return;window.__neoSearchCursor=1;
function point(e){var x=e.clientX,y=e.clientY;try{var f=window.frameElement;if(f){var r=f.getBoundingClientRect();x+=r.left;y+=r.top}}catch(_){}return{x:x,y:y}}
function send(e,click){var p=point(e);parent.postMessage({source:'neo-browser-cursor',x:p.x,y:p.y,click:!!click},'*')}
document.addEventListener('mousemove',function(e){send(e,false)},{passive:true});
document.addEventListener('mousedown',function(e){send(e,true)},{passive:true});
document.addEventListener('mouseleave',function(){parent.postMessage({source:'neo-browser-cursor',leave:true},'*')},{passive:true});
})();</script>`;

  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, bridge + "</body>") : html + bridge;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(html);
};
