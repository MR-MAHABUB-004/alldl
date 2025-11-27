const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

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

app.get("/stream/:file", (req, res) => {
    const fileName = req.params.file;
    const filePath = path.join(CACHE_DIR, fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
});

app.get("/api/dl", async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.json({ error: "Missing ?url=" });

    try {
        const remoteApi = `https://mahabub-aldl.vercel.app/api/dl?url=${encodeURIComponent(videoUrl)}`;
        const { data } = await axios.get(remoteApi);

        const sd = data.sd;
        const hd = data.hd;

        let sdLocal = null;
        let hdLocal = null;

        if (sd) {
            const sdPath = await downloadToCache(sd);
            sdLocal = `${req.protocol}://${req.get("host")}/stream/${path.basename(sdPath)}`;
        }

        if (hd) {
            const hdPath = await downloadToCache(hd);
            hdLocal = `${req.protocol}://${req.get("host")}/stream/${path.basename(hdPath)}`;
        }

        const finalResponse = {
            ...data,
            sd: sdLocal || null,
            hd: hdLocal || null,
        };

        return res.json(finalResponse);

    } catch (err) {
        console.log(err);
        return res.json({ error: "Something went wrong", detail: err.message });
    }
});

app.listen(PORT, () => console.log("Server running on port " + PORT));


// --- Auto clear cache every 30 minutes ---
setInterval(() => {
    fs.readdir(CACHE_DIR, (err, files) => {
        if (err) return console.log("Error reading cache folder:", err);

        for (const file of files) {
            const filePath = path.join(CACHE_DIR, file);
            fs.unlink(filePath, (err) => {
                if (err) console.log("Error deleting file:", file, err);
                else console.log("Deleted cached file:", file);
            });
        }
    });
}, 30 * 60 * 1000); 
