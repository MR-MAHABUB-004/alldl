# alldl - Video Download API

## Overview
A Node.js Express API server that downloads and caches video files from URLs, providing streaming and direct download capabilities.

## Project Structure
- `index.js` - Main server file with Express routes
- `cache/` - Directory for cached video files (auto-cleared every 30 minutes)
- `package.json` - Node.js dependencies

## API Endpoints
- `GET /api/dl?url=<video_url>` - Main API to download and cache video, returns streaming URLs
- `GET /stream/:file` - Stream a cached video file
- `GET /direct/:file` - Direct download a cached file

## Running the Server
```bash
node index.js
```
Server runs on `0.0.0.0:5000`

## Dependencies
- express - Web framework
- axios - HTTP client
- fs-extra - File system utilities
- mime-types - MIME type detection
- mkdirp - Directory creation

## Recent Changes
- January 2026: Configured for Replit environment (port 5000, host 0.0.0.0)
