const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const PORT = process.env.PORT || 5173;
const ROOT = __dirname;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

const runSummarize = (url) =>
  new Promise((resolve, reject) => {
    const summarizeBin = process.env.SUMMARIZE_BIN || "summarize";
    const args = [
      url,
      "--json",
      "--format",
      "text",
      "--length",
      "medium",
    ];

    execFile(summarizeBin, args, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
      if (err) {
        reject(
          new Error(
            stderr?.trim() ||
              "Summarize failed. Install it with `npm i -g @steipete/summarize`."
          )
        );
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const summary =
          parsed.summary ||
          parsed.data?.summary ||
          parsed.output?.summary ||
          parsed.result?.summary;

        if (!summary) {
          throw new Error("No summary returned.");
        }

        resolve(summary);
      } catch (parseError) {
        reject(new Error("Failed to parse summarize output."));
      }
    });
  });

const serveFile = (filePath, res) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain" });
    res.end(data);
  });
};

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && (req.url === "/summarize" || req.url === "/api/summarize")) {
    try {
      const body = await readBody(req);
      const { url } = JSON.parse(body || "{}");
      if (!url) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing URL." }));
        return;
      }

      const summary = await runSummarize(url);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ summary }));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  const safePath = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(ROOT, safePath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  serveFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`RSVP server running on http://localhost:${PORT}`);
});
