module.exports = async function handler(req, res) {
  const q = typeof req.query?.q === "string" ? req.query.q.trim().slice(0, 499) : "";
  if (!q) return res.status(400).send("Missing ?q=");

  // NEO Search is part of the Neo site. Keep browser searches inside Neo
  // instead of redirecting them to Bing or another external search engine.
  const target = "/Explore?q=" + encodeURIComponent(q);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", target);
  return res.status(302).end();
};
