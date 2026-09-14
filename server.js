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
app.use(
  express.static(__dirname, {
    // Don't cache index.html itself (it's small and may change on deploy),
    // but let hashed asset filenames (assets/xxx-HASH.js) cache long-term.
    setHeaders(res, filePath) {
      if (path.basename(filePath) === "index.html") {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

// SPA fallback: any other GET request gets index.html so client-side
// routing (if any) keeps working.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Neo Browser listening on port ${port}`);
});
