const express = require("express");
const path = require("path");
const fs = require("fs");

const proxyHandler = require("./api/browser-proxy.js");
const searchHandler = require("./api/search.js");

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

// Real browser routes. The browser proxy handles GET/POST/etc. so sites that
// build their UI with forms, fetch, XHR and client-side navigation can keep
// working inside Neo instead of falling back to Neo's own SPA routes.
app.all("/api/proxy", (req, res) => proxyHandler(req, res));
app.all("/api/search", (req, res) => searchHandler(req, res));

const APP_ID = "6a83d89cecbce69b361331b1";

app.get("/api/public/prod/public-settings/by-id/:id", (req, res) => {
  res.json({ id: req.params.id || APP_ID, appName: "Neo", theme: "dark", accent: "0 80% 55%", features: {} });
});

app.get("/api/apps/:appId/entities/:entity", (req, res) => res.json([]));
app.get("/api/apps/:appId/entities/:entity/:id", (req, res) => res.json(null));
app.get("/api/apps/:appId", (req, res) => res.json({ id: req.params.appId || APP_ID, name: "Neo", slug: "neo" }));
app.post("/api/apps/:appId/analytics/track/batch", (req, res) => res.status(204).end());
app.post("/api/apps/:appId/analytics/*", (req, res) => res.status(204).end());
app.post("/api/app-logs/:appId/*", (req, res) => res.status(204).end());
app.all("/api/*", (req, res) => {
  console.log(`[api-mock] ${req.method} ${req.path}`);
  if (req.method === "GET") res.json([]); else res.status(204).end();
});

// If a proxied page accidentally resolves a relative navigation against Neo's
// origin, reconstruct the destination from the proxy URL in its Referer.
app.use((req, res, next) => {
  if (!["GET", "HEAD"].includes(req.method)) return next();
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

// Browser-only enhancement script. Keeping this outside the compiled React
// bundle means tabs/address-bar fixes can be developed without replacing the
// fragile minified frontend build.
app.get("/Browser", (req, res) => {
  try {
    let html = fs.readFileSync(path.join(staticRoot, "index.html"), "utf8");
    const tag = '<script src="/browser-enhancer.js" defer></script>';
    if (!html.includes("/browser-enhancer.js")) html = html.replace(/<\/body>/i, tag + "</body>");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    return res.send(html);
  } catch (e) {
    console.error("Failed to serve Browser page:", e.message);
    return res.status(500).send("Internal Server Error");
  }
});

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
