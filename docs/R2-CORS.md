# R2 CORS for browser video uploads

Videos longer than a few seconds are uploaded **directly from the browser to Cloudflare R2** (single PUT or multipart).  
The API only signs URLs; it does **not** proxy large files (Vercel limits request bodies to ~4.5 MB).

If CORS is missing, uploads fail with a network error or “blocked by CORS” in the browser console.

## Configure in Cloudflare dashboard

1. Open **R2** → your bucket (`rawstock20161122` or production bucket).
2. **Settings** → **CORS policy** → Add rule:

```json
[
  {
    "AllowedOrigins": [
      "https://rawstock.live",
      "https://www.rawstock.live",
      "http://localhost:8081",
      "http://127.0.0.1:8081"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

3. Save and wait a minute for propagation.

## Verify

1. Sign in on https://rawstock.live
2. Post a **work** or **daily** video (~2 minutes, Light quality in the prepare step).
3. In DevTools → Network, confirm `PUT` requests to `*.r2.cloudflarestorage.com` return **200** and include an `ETag` response header.

## Limits (app)

| Item | Value |
|------|--------|
| Daily post max clip (web prepare) | 30 seconds |
| Work post max clip (web prepare) | 3600 seconds (1 hour) |
| Max prepared / direct upload file size | 500 MB |
| Same-origin proxy (small files) | 4 MB |
| Multipart part size | 5 MB |
