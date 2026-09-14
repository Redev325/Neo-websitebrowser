module.exports = async function handler(req, res) {
  const q = typeof req.query?.q === "string" ? req.query.q.trim().slice(0, 499) : "";
  if (!q) return res.status(400).send("Missing ?q=");

  // Use Bing's HTML search results. Route it through our own proxy so it
  // gets the same HTML rewriting and cursor-bridge script injection as any
  // other proxied page (otherwise the custom cursor stops tracking once
  // it's over the results).
  const bingTarget = "https://www.bing.com/search?q=" + encodeURIComponent(q);
  const target = "/api/proxy?url=" + encodeURIComponent(bingTarget);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", target);
  return res.status(302).end();
};
