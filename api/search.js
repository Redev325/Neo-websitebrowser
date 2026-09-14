module.exports = async function handler(req, res) {
  const q = typeof req.query?.q === "string" ? req.query.q.trim().slice(0, 499) : "";
  if (!q) return res.status(400).send("Missing ?q=");

  // Do not scrape/proxy DuckDuckGo search results. Send Neo searches to the
  // real DuckDuckGo web-search URL so DDG's own JavaScript, cookies and
  // anti-bot/session handling can run normally in the user's browser.
  const target = "https://duckduckgo.com/?q=" + encodeURIComponent(q);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", target);
  return res.status(302).end();
};