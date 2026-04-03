# RawStock — Amplifying the Raw Heat

> *The underground music marketplace that connects artists, editors, and fans — with no middlemen, no algorithms, and flat 90% creator payouts via direct Stripe (JPY) transactions.*

**Replit Agent 4 Buildathon Entry** — March 2026

---

## Why RawStock Exists

AI can generate a million beats overnight. But the raw heat of a basement show at 2 AM — the crowd screaming every word back, the sweat, the moment the room catches fire — that can never be manufactured.

Traditional platforms take 30–50% of creator revenue, bury content under algorithmic feeds, and treat live music as disposable content. RawStock exists to fix that:

- **Minimize middleman fees** — flat 10% platform fee, 90% goes to creators
- **Connect underground music to the world directly** — Tokyo basements to Berlin warehouses to Brooklyn rooftops
- **No coins, no tokens, no virtual currency** — every transaction is a direct Stripe credit card payment in JPY

---

## The Three Pillars

### 1. Artists (Live)
Musicians, bands, DJs, and producers who perform live. They film their sets, sell the footage, and keep 90%. Revenue is automatically split between collaborators (artist, filmmaker, editor) at ratios they set themselves.

### 2. Editors (AI-Assisted)
Video editors who cut raw live footage into polished content. The **RawStock AI Edit Assistant** (Buildathon focus) uses natural language prompts to automate repetitive editing tasks — trimming, syncing, color grading — speeding up production **3–5x**. Editors focus on creative decisions while AI handles the grunt work.

### 3. Fans (Community)
Fans organize into genre communities, curated by human moderators (not algorithms). They discover music through trusted scene builders, purchase live recordings directly, and fund real-world events through community-pooled ad revenue.

---

## Buildathon Focus: RawStock AI Edit Assistant

The key differentiator we're building for the Buildathon is the **Editor x AI Assist** pipeline:

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  1. Artist uploads raw footage to Cloudflare R2              │
│     POST /api/upload-url → signed URL → R2 bucket            │
│                                                              │
│  2. Artist or editor submits a natural language prompt        │
│     "Cut the best 3 minutes, sync to the beat drops,         │
│      add concert-style color grading"                        │
│     POST /api/ai-edit/jobs                                   │
│                                                              │
│  3. AI Edit Assistant processes the request                   │
│     ┌──────────────────────────────────────────┐             │
│     │  a. Analyze video (scene detection,       │             │
│     │     audio peaks, highlight moments)        │             │
│     │  b. Generate edit decision list (EDL)      │             │
│     │     from natural language prompt            │             │
│     │  c. Apply cuts, transitions, color grade   │             │
│     │  d. Render final output                    │             │
│     └──────────────────────────────────────────┘             │
│                                                              │
│  4. Editor reviews, tweaks, and publishes                     │
│     The AI draft becomes the starting point,                  │
│     not the final product. Human taste finishes it.           │
│                                                              │
│  5. Published video goes on sale                              │
│     Stripe checkout → 90% split to artist + editor            │
└─────────────────────────────────────────────────────────────┘
```

### API Design

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai-edit/jobs` | Create edit job (videoUrl, prompt, options) |
| GET | `/api/ai-edit/jobs/:id` | Get job status and progress |
| GET | `/api/ai-edit/jobs/:id/result` | Get rendered output URL |
| POST | `/api/ai-edit/jobs/:id/approve` | Approve and publish to community |

### Prompt Examples

| Prompt | AI Action |
|--------|-----------|
| "Highlight reel, 90 seconds, focus on guitar solos" | Scene detection → extract solo segments → assemble montage |
| "Full set with beat-synced cuts" | Audio analysis → cut on beat drops → smooth transitions |
| "Vertical format for social, best 60 seconds" | Crop to 9:16 → select peak energy moments → add captions |
| "Clean up audio, reduce crowd noise, boost vocals" | Audio separation → noise reduction → vocal enhancement |

---

## Revenue Model — No Coins, Direct Stripe (JPY)

### Paid Content (Live Recordings, Edited Videos)

| Component | Split |
|-----------|-------|
| Creator side (artist + filmmaker + editor) | **90%** |
| Platform | **10%** |

Creators set their own split ratios at upload time. Revenue is distributed automatically via Stripe Connect.

### Live Streaming

| Level | Agency-Affiliated | Independent |
|-------|-------------------|-------------|
| Level 4 (Top) | 95% | 75% |
| Level 3 | 90% | 70% |
| Level 2 | 80% | 60% |
| Level 1 (Entry) | 70% | 50% |

### Community Ad Revenue

| Recipient | Share |
|-----------|-------|
| Admins & Moderators | 70% |
| Event Fund | 10% |
| Platform | 20% |

### Music Tutors

Paid lessons and breakdowns are sold as content with the same 90/10 split. Tutors set their own pricing.

---

## Native live & SNOW SDK

Mobile **WHIP live broadcast** and **mentor-room WebRTC** are not enabled in-app until the **SNOW SDK** (or equivalent) and **react-native-webrtc** bridge supply a `MediaStream`. Shared WHIP logic lives in [`lib/live/whip.ts`](lib/live/whip.ts). See [`docs/SNOW_SDK_INTEGRATION.md`](docs/SNOW_SDK_INTEGRATION.md) for the checklist, Expo prebuild permissions plugin, and store privacy notes.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Replit Environment                                  │
│                                                      │
│  ┌──────────┐    proxy     ┌──────────────────────┐ │
│  │ Express  │◄────────────►│ Expo Metro Dev       │ │
│  │ :5000    │              │ :8080                │ │
│  │          │              │ (React Native Web)   │ │
│  │ REST API │              └──────────────────────┘ │
│  │ SSE      │                                        │
│  │ Stripe   │                                        │
│  └────┬─────┘                                        │
│       │                                              │
│  ┌────▼─────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Replit   │  │ Cloudflare│  │ In-Memory Event  │  │
│  │ Postgres │  │ R2       │  │ Bus (SSE)        │  │
│  │ (Drizzle)│  │ (Video)  │  └──────────────────┘  │
│  └──────────┘  └──────────┘                          │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Expo SDK 55, React Native Web, Expo Router |
| State | React Query, React Context, AsyncStorage |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL (Replit), Drizzle ORM |
| Payments | Stripe Connect (JPY, direct credit card) |
| Storage | Cloudflare R2 (video/image uploads) |
| Real-time | Server-Sent Events (SSE), Node.js EventEmitter |
| Auth | JWT, LINE OAuth, Google OAuth |

---

## Key Features

### Global Jukebox — Real-Time Synchronized Listening
Community members queue YouTube videos and watch together in perfect sync. Server-authoritative playback with SSE-powered real-time updates.

### Live Streaming
Real-time streams with chat, viewer tracking, and tiered revenue. Two-shot video call bookings with queue management.

### Genre Communities
Human-curated communities organized by music genre. Admins and moderators surface quality content — no algorithmic feeds. Banner ad revenue is split transparently (70% to community, 10% event fund, 20% platform).

### Content Sales
Upload live recordings, edited videos, and photos. Set your own price, split revenue with collaborators, and sell directly to fans via Stripe checkout.

### Music Tutors
Run paid lessons and sell technique breakdowns as premium content. Same 90/10 split.

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection (auto-configured by Replit) |
| `SESSION_SECRET` | JWT signing secret |

### Payments (Stripe)
| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Storage (Cloudflare R2)
| Variable | Description |
|----------|-------------|
| `R2_ENDPOINT` | R2 API endpoint |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |

### OAuth (Optional)
| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `YOUTUBE_API_KEY` | YouTube Data API (Jukebox search) |
| `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` / `LINE_CALLBACK_URL` | LINE OAuth |
| `FRONTEND_URL` | Frontend URL for OAuth redirects |

---

## Getting Started

Two workflows on Replit:

1. **Start Backend** — `npm run server:dev` (Express API on port 5000)
2. **Start Frontend** — `npx expo start --web --port 8080 --localhost` (Expo Metro)

Express proxies all non-API requests to the Expo dev server, providing a unified experience on port 5000.

---

## License

Private — Replit Agent 4 Buildathon 2026
# RawStock
