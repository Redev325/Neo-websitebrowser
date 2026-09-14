const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const proxyHandler = require("./api/proxy");
const searchHandler = require("./api/search");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

function createResponse(res) {
  let statusCode = 200;
  let sent = false;
  const response = {
    status(code) {
      statusCode = Number(code) || 200;
      return response;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return response;
    },
    end(body) {
      if (sent) return response;
      sent = true;
      res.statusCode = statusCode;
      res.end(body);
      return response;
    },
    send(body) {
      return response.end(body);
    }
  };
  return response;
}

async function runApi(handler, req, res, url) {
  const apiReq = Object.create(req);
  apiReq.query = Object.fromEntries(url.searchParams.entries());
  const apiRes = createResponse(res);
  await handler(apiReq, apiRes);
}

function safeStaticPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const full = path.resolve(ROOT, relative);
  const root = path.resolve(ROOT) + path.sep;
  if (full !== path.resolve(ROOT) && !full.startsWith(root)) return null;
  return full;
}

function serveStatic(req, res, url) {
  let filePath = safeStaticPath(url.pathname);
  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Invalid path");
    return;
  }

  // SPA fallback: the built frontend can handle client-side routes itself.
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(ROOT, "index.html");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    };

    if (filePath.startsWith(path.join(ROOT, "assets") + path.sep)) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }

    res.writeHead(200, headers);
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" || req.method === "HEAD") {
      if (url.pathname === "/api/proxy") {
        if (req.method === "HEAD") {
          res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
          return res.end("Method not allowed");
        }
        return await runApi(proxyHandler, req, res, url);
      }

      if (url.pathname === "/api/search") {
        return await runApi(searchHandler, req, res, url);
      }

      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("ok");
      }
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return serveStatic(req, res, url);
    }

    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8", "Allow": "GET, HEAD" });
    res.end("Method not allowed");
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end("Server error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Neo Browser listening on port ${PORT}`);
});
