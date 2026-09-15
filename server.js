const express = require("express");
const path = require("path");
const fs = require("fs");

const proxyHandler = require("./api/proxy.js");
const searchHandler = require("./api/search.js");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

// --- Real API routes ---------------------------------------------------------
// Unwrap accidental nested /api/proxy URLs before they reach the proxy.
// The injected page bridge can otherwise proxy an already-proxied request
// again, creating a request loop that makes heavy sites such as YouTube
// appear to freeze.
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

// --- Base44-compatible mocks ------------------------------------------------
const APP_ID = "6a83d89cecbce69b361331b1";

app.get("/api/public/prod/public-settings/by-id/:id", (req, res) => {
  res.json({
    id: req.params.id || APP_ID,
    appName: "Neo",
    theme: "dark",
    accent: "0 80% 55%",
    features: {},
  });
});

app.get("/api/apps/:appId/entities/:entity", (req, res) => res.json([]));
app.get("/api/apps/:appId/entities/:entity/:id", (req, res) => res.json(null));
app.get("/api/apps/:appId", (req, res) => res.json({ id: req.params.appId || APP_ID, name: "Neo", slug: "neo" }));
app.post("/api/apps/:appId/analytics/track/batch", (req, res) => res.status(204).end());
app.post("/api/apps/:appId/analytics/*", (req, res) => res.status(204).end());
app.post("/api/app-logs/:appId/*", (req, res) => res.status(204).end());
app.all("/api/*", (req, res) => {
  console.log(`[api-mock] ${req.method} ${req.path}`);
  if (req.method === "GET") res.json([]);
  else res.status(204).end();
});

function sendIndexWithBrowserEnhancer(req, res, next) {
  const indexPath = path.join(__dirname, "index.html");
  fs.readFile(indexPath, "utf8", (err, html) => {
    if (err) return next(err);
    const script = '<script src="/browser-enhancer.js"></script>';
    const injected = html.includes('/browser-enhancer.js')
      ? html
      : html.replace(/<\/body>/i, script + '</body>');
    res.setHeader("Cache-Control", "no-cache");
    return res.type("html").send(injected);
  });
}

app.get("/", sendIndexWithBrowserEnhancer);
app.get("/Browser", sendIndexWithBrowserEnhancer);

// --- Escaped-navigation safety net ------------------------------------------
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
    const target = "/api/proxy?url=" + encodeURIComponent(escapedUrl.toString());
    return res.redirect(307, target);
  } catch (e) {
    console.error("[escaped-nav] Error reconstructing URL:", e.message);
    return next();
  }
});

const staticRoot = __dirname;
app.use(express.static(staticRoot, {
  setHeaders(res, filePath) {
    if (path.basename(filePath) === "index.html") res.setHeader("Cache-Control", "no-cache");
    else if (/\.(js|css|webp|png|woff2|svg)$/i.test(filePath)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  },
}));

app.get("*", (req, res) => {
  res.sendFile(path.join(staticRoot, "index.html"), (err) => {
    if (err) {
      console.error("Failed to send index.html:", err.message);
      res.status(500).send("Internal Server Error");
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Neo Browser listening on 0.0.0.0:${port}`);
  console.log(`Static root: ${staticRoot}`);
});
