#!/usr/bin/env node
// ==========================================================================
// ECLIPTARA — High-Performance Zero-Dependency Static HTTP Server
// Designed for Windows PowerShell & cross-platform environments (Node.js 18+)
// ==========================================================================

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// If this server script is in root and orbit-watch folder exists, serve orbit-watch; else serve current dir
const rootDir = fs.existsSync(path.join(__dirname, "orbit-watch", "index.html"))
  ? path.join(__dirname, "orbit-watch")
  : __dirname;

const DEFAULT_PORT = parseInt(process.env.PORT || "4173", 10);
const HOST = process.env.HOST || "localhost";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
};

function startServer(port) {
  const server = http.createServer((req, res) => {
    // Enable CORS for API / font sharing
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("405 Method Not Allowed");
      return;
    }

    let reqPath = decodeURIComponent(req.url.split("?")[0]);
    if (reqPath === "/") reqPath = "/index.html";

    // Prevent directory traversal attacks
    const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, "");
    let filePath = path.join(rootDir, safePath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // If directory, try index.html
        if (stats && stats.isDirectory()) {
          filePath = path.join(filePath, "index.html");
          if (!fs.existsSync(filePath)) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 Not Found");
            return;
          }
        } else {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("404 Not Found");
          return;
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
      });

      if (req.method === "HEAD") {
        res.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("500 Internal Server Error");
        }
      });
      stream.pipe(res);
    });
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`[Ecliptara] Port ${port} is in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error("[Ecliptara] Server error:", err);
      process.exit(1);
    }
  });

  server.listen(port, HOST, () => {
    const url = `http://${HOST}:${port}/`;
    console.log("==================================================");
    console.log("☄️  ECLIPTARA — SPACE INTELLIGENCE OBSERVATORY");
    console.log("==================================================");
    console.log(`📡 Server running at: ${url}`);
    console.log(`📁 Serving directory: ${rootDir}`);
    console.log("⚡ Zero Python dependency — 100% pure Node.js");
    console.log("⌨️  Press Ctrl+C to stop");
    console.log("==================================================");
  });
}

startServer(DEFAULT_PORT);

