const http = require("http");
const fs = require("fs");
const path = require("path");
// Zero-dependency SPA dev server with HTML5 history fallback.
// __filename / __dirname are provided by CommonJS runtime.
const root = __dirname;
const indexFile = path.join(root, "index.html");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const safePath = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  return path.normalize(clean);
};

const serveFile = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  res.setHeader("Cache-Control", "no-cache");
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    res.statusCode = 500;
    res.end("500");
  });
  stream.pipe(res);
};

const server = http.createServer((req, res) => {
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  const cleanPath = safePath(req.url);
  let filePath = path.join(root, cleanPath);

  try {
    const stat = fs.existsSync(filePath) && fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (stat && stat.isFile()) {
      res.statusCode = 200;
      return serveFile(res, filePath);
    }
  } catch (err) {
    // fall back to index
  }

  // SPA fallback for deep links
  if (fs.existsSync(indexFile)) {
    res.statusCode = 200;
    return serveFile(res, indexFile);
  }

  res.statusCode = 404;
  res.end("Not Found");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Frontend dev server running at http://localhost:${PORT}`);
});
