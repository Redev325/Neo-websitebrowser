const express = require("express");
const path = require("path");

const proxyHandler = require("./api/proxy.js");
const searchHandler = require("./api/search.js");

const app = express();

// Disable Express's own "X-Powered-By" header, matching Vercel's default.
app.disable("x-powered-by");

// --- API routes -----------------------------------------------------------
// api/proxy.js and api/search.js already export `(req, res) => {...}`
// handlers written for Vercel's Node runtime. Express's req/res objects are
// a superset of what those functions use (req.query, req.headers,
// res.status().send(), res.setHeader()), so they work unchanged here.
app.get("/api/proxy", (req, res) => proxyHandler(req, res));
app.get("/api/search", (req, res) => searchHandler(req, res));

// --- Static frontend --------------------------------------------------------
// Serves index.html, /assets, /static, etc. exactly like Vercel did.
const staticRoot = __dirname;
app.use(
  express.static(staticRoot, {
    // Don't cache index.html itself (it's small and may change on deploy),
    // but let hashed asset filenames (assets/xxx-HASH.js) cache long-term.
    setHeaders(res, filePath) {
      if (path.basename(filePath) === "index.html") {
        res.setHeader("Cache-Control", "no-cache");
      } else if (/\.(js|css|webp|png|woff2|svg)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  })
);

// SPA fallback: any other GET request gets index.html so client-side
// routing (if any) keeps working.
app.get("*", (req, res) => {
  res.sendFile(path.join(staticRoot, "index.html"), (err) => {
    if (err) {
      console.error("Failed to send index.html:", err.message);
      res.status(500).send("Internal Server Error");
    }
  });
});

const port = process.env.PORT || 3000;
// Railway (and most cloud platforms) require binding to 0.0.0.0 so the
// platform proxy can reach the process. Listening only on localhost fails.
app.listen(port, "0.0.0.0", () => {
  console.log(`Neo Browser listening on 0.0.0.0:${port}`);
  console.log(`Static root: ${staticRoot}`);
});
