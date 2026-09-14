const express = require("express");
const path = require("path");

const proxyHandler = require("./api/proxy.js");
const searchHandler = require("./api/search.js");

const app = express();

// Disable Express's own "X-Powered-By" header, matching Vercel's default.
app.disable("x-powered-by");

// Parse JSON bodies for any future POST handlers
app.use(express.json({ limit: "1mb" }));

// --- Real API routes (proxy + search) ---------------------------------------
app.get("/api/proxy", (req, res) => proxyHandler(req, res));
app.get("/api/search", (req, res) => searchHandler(req, res));

// --- Base44-compatible mocks ------------------------------------------------
// The exported frontend was built on Base44 and expects these endpoints.
// Without them the React app receives HTML (from the SPA fallback) and crashes
// with "u.map is not a function". Returning empty/safe JSON lets the UI render.

const APP_ID = "6a83d89cecbce69b361331b1";

// Public settings
app.get("/api/public/prod/public-settings/by-id/:id", (req, res) => {
  res.json({
    id: req.params.id || APP_ID,
    appName: "Neo",
    theme: "dark",
    accent: "0 80% 55%",
    features: {},
  });
});

// Generic entity list / single entity – return empty array or empty object
app.get("/api/apps/:appId/entities/:entity", (req, res) => {
  // Most Base44 list endpoints expect an array
  res.json([]);
});

app.get("/api/apps/:appId/entities/:entity/:id", (req, res) => {
  res.json(null);
});

// App metadata
app.get("/api/apps/:appId", (req, res) => {
  res.json({
    id: req.params.appId || APP_ID,
    name: "Neo",
    slug: "neo",
  });
});

// Analytics / tracking – just accept and ignore
app.post("/api/apps/:appId/analytics/track/batch", (req, res) => {
  res.status(204).end();
});

app.post("/api/apps/:appId/analytics/*", (req, res) => {
  res.status(204).end();
});

// App logs
app.post("/api/app-logs/:appId/*", (req, res) => {
  res.status(204).end();
});

// Catch-all for any other /api/* that we don't implement yet
// (prevents the SPA fallback from returning HTML to the frontend)
app.all("/api/*", (req, res) => {
  console.log(`[api-mock] ${req.method} ${req.path}`);
  if (req.method === "GET") {
    // Prefer empty array – many list calls call .map()
    res.json([]);
  } else {
    res.status(204).end();
  }
});

// --- Static frontend --------------------------------------------------------
const staticRoot = __dirname;
app.use(
  express.static(staticRoot, {
    setHeaders(res, filePath) {
      if (path.basename(filePath) === "index.html") {
        res.setHeader("Cache-Control", "no-cache");
      } else if (/\.(js|css|webp|png|woff2|svg)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  })
);

// SPA fallback
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
