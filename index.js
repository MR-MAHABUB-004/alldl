const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 5000;
const HOST = "0.0.0.0";

// ================= CACHE SETUP =================
const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

// ================= UTILS =================
function hashFile(url) {
    const ext = path.extname(new URL(url).pathname) || ".mp4";
    return crypto.createHash("md5").update(url).digest("hex") + ext;
}

async function downloadToCache(url) {
    const filename = hashFile(url);
    const filePath = path.join(CACHE_DIR, filename);

    if (fs.existsSync(filePath)) {
        return filePath;
    }

    const writer = fs.createWriteStream(filePath);
    const res = await axios({
        method: "GET",
        url,
        responseType: "stream"
    });

    res.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });

    return filePath;
}

// ================= STREAM ROUTE =================
app.get("/stream/:file", (req, res) => {
    const fileName = req.params.file;
    const filePath = path.join(CACHE_DIR, fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
});

// ================= DIRECT DOWNLOAD ROUTE =================
app.get("/direct/:file", (req, res) => {
    const fileName = req.params.file;
    const filePath = path.join(CACHE_DIR, fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    res.download(filePath);
});

// ================= MAIN API =================
app.get("/api/dl", async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.json({ error: "Missing ?url=" });

    try {
        const remoteApi = `https://mahabub-aldl.vercel.app/api/dl?url=${encodeURIComponent(videoUrl)}`;
        const { data } = await axios.get(remoteApi);

        const sd = data.sd;
        const hd = data.hd;

        let sdStream = null;
        let hdStream = null;
        let directDl = null;

        // SD
        if (sd) {
            const sdPath = await downloadToCache(sd);
            const file = path.basename(sdPath);

            sdStream = `${req.protocol}://${req.get("host")}/stream/${file}`;
            directDl = `${req.protocol}://${req.get("host")}/direct/${file}`;
        }

        // HD (priority)
        if (hd) {
            const hdPath = await downloadToCache(hd);
            const file = path.basename(hdPath);

            hdStream = `${req.protocol}://${req.get("host")}/stream/${file}`;
            directDl = `${req.protocol}://${req.get("host")}/direct/${file}`;
        }

        return res.json({
            ...data,
            sd: sdStream,
            hd: hdStream,
            backup: hdStream || sdStream || null,
            directdl: directDl
        });

    } catch (err) {
        console.error(err);
        return res.json({
            error: "Something went wrong",
            detail: err.message
        });
    }
});

// ================= AUTO CLEAR CACHE =================
setInterval(() => {
    fs.readdir(CACHE_DIR, (err, files) => {
        if (err) return console.log("Cache read error:", err);

        for (const file of files) {
            const filePath = path.join(CACHE_DIR, file);
            fs.unlink(filePath, (err) => {
                if (!err) console.log("Deleted cached file:", file);
            });
        }
    });
}, 30 * 60 * 1000);

// ================= START SERVER =================
app.listen(PORT, HOST, () => {
    console.log("✅ Server running on", HOST + ":" + PORT);
});
