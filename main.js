const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const crypto = require("crypto");
const fsSync = require("fs");
const fs = require("fs/promises");
const http = require("http");
const path = require("path");

const staticFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/dance-core.js", "dance-core.js"],
  ["/renderer.js", "renderer.js"],
  ["/manifest.webmanifest", "manifest.webmanifest"],
  ["/assets/dancer-sprite-sheet.png", "assets/dancer-sprite-sheet.png"]
]);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".m4v": "video/x-m4v",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
};

const APP_PORT = 0;
const localMediaFiles = new Map();
let appServer;
let appUrl;

const startAppServer = () => new Promise((resolve, reject) => {
  appServer = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;

    if (pathname.startsWith("/media/")) {
      const token = pathname.slice("/media/".length);
      const mediaPath = localMediaFiles.get(token);

      if (!mediaPath) {
        response.writeHead(404);
        response.end();
        return;
      }

      try {
        const stats = await fs.stat(mediaPath);
        const range = request.headers.range;
        const type = contentTypes[path.extname(mediaPath).toLowerCase()] || "application/octet-stream";

        if (!range) {
          response.writeHead(200, {
            "Accept-Ranges": "bytes",
            "Content-Length": stats.size,
            "Content-Type": type
          });
          fsSync.createReadStream(mediaPath).pipe(response);
          return;
        }

        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match) {
          response.writeHead(416, { "Content-Range": "bytes */" + stats.size });
          response.end();
          return;
        }

        const start = Number(match[1]);
        const end = match[2] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1;
        if (start >= stats.size || end < start) {
          response.writeHead(416, { "Content-Range": "bytes */" + stats.size });
          response.end();
          return;
        }
        response.writeHead(206, {
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Content-Range": "bytes " + start + "-" + end + "/" + stats.size,
          "Content-Type": type
        });
        fsSync.createReadStream(mediaPath, { start, end }).pipe(response);
      } catch {
        response.writeHead(404);
        response.end();
      }
      return;
    }

    const fileName = staticFiles.get(pathname);

    if (!fileName) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    try {
      const filePath = path.join(__dirname, fileName);
      const content = await fs.readFile(filePath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentTypes[path.extname(fileName)]
      });
      response.end(content);
    } catch {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Unable to load application file");
    }
  });

  appServer.once("error", reject);
  appServer.listen(APP_PORT, "127.0.0.1", () => {
    appUrl = "http://127.0.0.1:" + appServer.address().port;
    resolve();
  });
});

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 780,
    backgroundColor: "#f4efe6",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadURL(appUrl);
};

app.whenReady().then(async () => {
  await startAppServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  appServer?.close();
});

ipcMain.handle("project:save", async (_, payload) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save Choreography",
    defaultPath: "choreography-chart.json",
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  return { canceled: false, filePath };
});

ipcMain.handle("project:load", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Open Choreography",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = filePaths[0];
  const content = await fs.readFile(filePath, "utf8");
  return {
    canceled: false,
    filePath,
    data: JSON.parse(content)
  };
});

ipcMain.handle("video:pick", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choose Rehearsal Video",
    properties: ["openFile"],
    filters: [
      { name: "Video", extensions: ["mp4", "mov", "m4v", "webm"] }
    ]
  });

  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = filePaths[0];
  const mediaToken = crypto.randomUUID();
  localMediaFiles.set(mediaToken, filePath);
  return {
    canceled: false,
    filePath,
    fileUrl: appUrl + "/media/" + mediaToken,
    fileName: path.basename(filePath)
  };
});
