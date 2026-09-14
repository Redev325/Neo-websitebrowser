module.exports = async function handler(req, res) {
  const q = typeof req.query?.q === "string" ? req.query.q.trim().slice(0, 499) : "";
  if (!q) return res.status(400).send("Missing ?q=");

  const esc = s => String(s || "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
  const attr = s => esc(s).replace(/'/g, "&#39;");
  const enc = encodeURIComponent(q);
  let results = [];

  try {
    const upstream = await fetch("https://html.duckduckgo.com/html/?q=" + enc, {
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        "referer": "https://html.duckduckgo.com/html/"
      }
    });
    const text = await upstream.text();
    if (upstream.ok) {
      const blocks = text.match(/<div[^>]+class=[\"'][^\"']*result[^\"']*[\"'][^>]*>[\s\S]*?(?=<div[^>]+class=[\"'][^\"']*result[^\"']*[\"']|<div[^>]+id=[\"']links[\"'])/gi) || [];
      for (const block of blocks.slice(0, 12)) {
        const tm = block.match(/<a[^>]+class=[\"'][^\"']*result__a[^\"']*[\"'][^>]*href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>/i);
        if (!tm) continue;
        const sm = block.match(/class=[\"'][^\"']*result__snippet[^\"']*[\"'][^>]*>([\s\S]*?)<\//i);
        const clean = s => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        let url = tm[1];
        try {
          const u = new URL(url, "https://html.duckduckgo.com/");
          const uddg = u.searchParams.get("uddg");
          if (uddg) url = uddg;
        } catch {}
        if (!/^https?:\/\//i.test(url)) continue;
        results.push({ title: clean(tm[2]), url, snippet: clean(sm ? sm[1] : "") });
      }
    }
  } catch (e) {
    console.error("Search fetch failed", e);
  }

  const cards = results.length ? results.map(r => {
    const href = "/api/proxy?url=" + encodeURIComponent(r.url);
    let host = "";
    try { host = new URL(r.url).hostname; } catch {}
    return `<article class="result"><div class="host">${esc(host)}</div><a class="title" href="${attr(href)}">${esc(r.title)}</a><div class="url">${esc(r.url)}</div><p>${esc(r.snippet)}</p></article>`;
  }).join("") : `<div class="empty"><strong>No results were returned.</strong><span>DuckDuckGo may be temporarily unavailable. Try the search again in a moment.</span></div>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(q)} - Neo Search</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}html,body{margin:0;background:#151515;color:#f5f5f7;font:15px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{min-height:100vh}.top{position:sticky;top:0;background:#151515;border-bottom:1px solid #292929;padding:18px 5vw 14px;z-index:2}.bar{display:flex;align-items:center;gap:14px;max-width:1180px;margin:auto}.logo{width:40px;height:40px;border-radius:50%;background:#ff5722;display:grid;place-items:center;font-size:22px}.search{flex:1;max-width:690px;background:#2a2a2a;border:1px solid #383838;border-radius:24px;height:42px;display:flex;align-items:center;padding:0 16px}.search input{width:100%;border:0;outline:0;background:transparent;color:#fff;font-size:16px}.tabs{max-width:1180px;margin:12px auto 0;padding-left:54px;color:#aaa;display:flex;gap:24px}.tabs b{color:#fff;border-bottom:2px solid #fff;padding-bottom:9px}.main{max-width:1180px;margin:0 auto;padding:18px 5vw 70px}.result{max-width:720px;padding:18px 0;border-bottom:1px solid #292929}.host{font-size:13px;color:#aaa;margin-bottom:4px}.title{font-size:21px;color:#8ab4ff;text-decoration:none}.title:hover{text-decoration:underline}.url{font-size:12px;color:#78b96f;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.result p{margin:7px 0 0;color:#d0d0d0}.empty{max-width:720px;margin-top:30px;padding:22px;border:1px solid #333;border-radius:14px;background:#202020;display:flex;flex-direction:column;gap:7px}.empty span{color:#aaa}.brand{font-size:12px;color:#888;margin-bottom:10px}@media(max-width:700px){.top{padding-left:14px;padding-right:14px}.main{padding-left:14px;padding-right:14px}.tabs{padding-left:54px}.logo{width:34px;height:34px}}
</style></head><body><header class="top"><div class="bar"><div class="logo">N</div><form class="search" action="/api/search" method="get"><input name="q" value="${attr(q)}" autocomplete="off" aria-label="Search"></form></div><nav class="tabs"><b>All</b><span>Images</span><span>Videos</span><span>News</span><span>More</span></nav></header><main class="main"><div class="brand">NEO SEARCH • DuckDuckGo results</div>${cards}</main></body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(html);
};
