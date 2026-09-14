module.exports = async function handler(req, res) {
  const q = typeof req.query?.q === "string" ? req.query.q.trim().slice(0, 499) : "";
  if (!q) return res.status(400).send("Missing ?q=");

  // Use DuckDuckGo's non-JavaScript HTML results interface (as documented
  // in the README) instead of the full JS site. The JS version needs
  // cookies/localStorage that get blocked when embedded in a third-party
  // iframe, which is what was causing "Unexpected error" in the browser
  // frame. Route it through our own proxy so it gets the same HTML
  // rewriting and cursor-bridge script injection as any other proxied
  // page (otherwise the custom cursor stops tracking once it's over the
  // results).
  const ddgTarget = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
  const target = "/api/proxy?url=" + encodeURIComponent(ddgTarget);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", target);
  return res.status(302).end();
};