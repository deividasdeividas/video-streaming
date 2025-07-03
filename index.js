const { createServer } = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const hostname = "0.0.0.0"; // listen on all interfaces
const port = process.env.PORT || 3000;

const sendError = (res, statusCode = 500, message = "Server Error") => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/plain");
  res.end(message);
};

const server = createServer((req, res) => {
  if (req.url === "/") {
    fs.readFile("index.html", (err, data) => {
      if (err) return sendError(res);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(data);
    });
  } else if (req.url === "/video") {
    const videoPath = path.join(__dirname, "vid.mp4");

    let stat;
    try {
      stat = fs.statSync(videoPath);
    } catch {
      return sendError(res, 404, "Video Not Found");
    }
    const fileSize = stat.size;

    const range = req.headers.range;
    if (!range) {
      // No range header — send entire video
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      });
      return fs.createReadStream(videoPath).pipe(res);
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.statusCode = 416; // Range Not Satisfiable
      return res.end();
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });

    fs.createReadStream(videoPath, { start, end }).pipe(res);
  } else {
    sendError(res, 404, "Not Found");
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
