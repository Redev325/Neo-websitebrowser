const express = require("express");
const path = require("path");
const fs = require("fs");

const proxyHandler = require("./api/proxy.js");
const searchHandler = require("./api/search.js");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.all("/api/proxy", (req, res) => {
  try {
    let raw = req.query && typeof req.query.url === "string" ? req.query.url : "";
    const requestHost = String(req.headers.host || "").split(":")[0].toLowerCase();
    for (let i = 0; i < 8 && raw; i++) {
      const u = new URL(raw);
      const host = u.hostname.toLowerCase();
      const sameHost = requestHost && (host === requestHost || host === "localhost" || host === "127.0.0.1");
      if (!sameHost || u.pathname !== "/api/proxy") break;
      const nested = u.searchParams.get("url");
      if (!nested) break;
      raw = nested;
    }
    if (raw && req.query) req.query.url = raw;
  } catch (_) {}
  return proxyHandler(req, res);
});
app.all("/api/search", (req, res) => searchHandler(req, res));

app.get("/results", (req, res, next) => {
  const q = typeof req.query?.search_query === "string" ? req.query.search_query.trim() : "";
  const referer = String(req.headers.referer || "");
  if (!q || !/youtube\.com/i.test(referer)) return next();
  const target = "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  return res.redirect(307, "/api/proxy?url=" + encodeURIComponent(target));
});

const APP_ID = "6a83d89cecbce69b361331b1";
app.get("/api/public/prod/public-settings/by-id/:id", (req, res) => res.json({ id: req.params.id || APP_ID, appName: "Neo", theme: "dark", accent: "0 80% 55%", features: {} }));
app.get("/api/apps/:appId/entities/:entity", (req, res) => res.json([]));
app.get("/api/apps/:appId/entities/:entity/:id", (req, res) => res.json(null));
app.get("/api/apps/:appId", (req, res) => res.json({ id: req.params.appId || APP_ID, name: "Neo", slug: "neo" }));
app.post("/api/apps/:appId/analytics/track/batch", (req, res) => res.status(204).end());
app.post("/api/apps/:appId/analytics/*", (req, res) => res.status(204).end());
app.post("/api/app-logs/:appId/*", (req, res) => res.status(204).end());
app.all("/api/*", (req, res) => { if (req.method === "GET") res.json([]); else res.status(204).end(); });

function sendIndexWithBrowserEnhancer(req, res, next) {
  const indexPath = path.join(__dirname, "index.html");
  fs.readFile(indexPath, "utf8", (err, html) => {
    if (err) return next(err);
    const scripts = '<script src="/browser-freeze-fix.js?v=3"></script><script src="/browser-enhancer.js?v=6"></script><script src="/explore-card-override.js?v=14"></script>';
    const injected = html.includes('/explore-card-override.js')
      ? html.replace(/<script[^>]+explore-card-override\.js[^>]*><\/script>/gi, '<script src="/explore-card-override.js?v=14"></script>')
      : html.replace(/<\/body>/i, scripts + '</body>');
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.type("html").send(injected);
  });
}

app.get("/", sendIndexWithBrowserEnhancer);
app.get("/Browser", sendIndexWithBrowserEnhancer);

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/api/") || req.path.startsWith("/assets/") || req.path.startsWith("/static/")) return next();
  const referer = req.headers.referer || "";
  const marker = "/api/proxy?url=";
  const idx = referer.indexOf(marker);
  if (idx === -1) return next();
  try {
    const encoded = referer.slice(idx + marker.length).split("&")[0];
    const originalUrl = new URL(decodeURIComponent(encoded));
    const escapedUrl = new URL(req.originalUrl, originalUrl.origin);
    return res.redirect(307, "/api/proxy?url=" + encodeURIComponent(escapedUrl.toString()));
  } catch (_) { return next(); }
});

const staticRoot = __dirname;
app.use(express.static(staticRoot, { setHeaders(res, filePath) {
  if (path.basename(filePath) === "index.html") res.setHeader("Cache-Control", "no-cache");
  else if (/\.(js|css|webp|png|woff2|svg)$/i.test(filePath)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
} }));

app.get("*", sendIndexWithBrowserEnhancer);

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Neo Browser listening on 0.0.0.0:${port}`);
  console.log(`Static root: ${staticRoot}`);
});
