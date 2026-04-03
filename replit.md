# RawStock — Amplifying the Raw Heat

## Overview
RawStock is the underground music marketplace (Expo React Native Web / PWA) that connects artists, editors, and fans with flat 90% creator payouts. No coins/tokens — all transactions are direct Stripe credit card (JPY). Three pillars: Artists (Live), Editors (AI-Assisted), Fans (Community). Buildathon focus: "Editor x AI Assist" feature for 3-5x faster video production. Web browser only (no Expo Go). Replit Agent 4 Buildathon, March 2026.

## Architecture
- **Frontend**: Expo Router (file-based routing), Web browser only (port 8080)
- **Backend**: Express + TypeScript (port 5000, proxies to Expo)
- **Database**: Replit PostgreSQL + Drizzle ORM
- **State Management**: AsyncStorage + React Context
- **Data Fetching**: @tanstack/react-query
- **Real-time**: In-memory EventEmitter event bus for SSE (no Redis required); optionally Upstash Redis for multi-instance

## Replit Environment
- **Workflows**: 
  - `Start Backend`: `npm run server:dev` (port 5000, webview)
  - `Start Frontend`: `npx expo start --web --port 8080 --localhost` (port 8080, console)
- **Proxy**: Expo binds to IPv6 `::1` only, so backend proxy target is `http://[::1]:8080` (`EXPO_PORT` env var, default 8080)
- **SSR**: `public/index.html` renamed to `.bak` so Metro performs SSR HTML rendering
- **Environment variables**: `DATABASE_URL`, `SESSION_SECRET` set in Replit Secrets
- **Dynamic URLs**: All OAuth callbacks and redirects use `REPLIT_DOMAINS` / `REPLIT_DEV_DOMAIN` dynamically — no hardcoded Vercel URLs
- **Missing optional secrets**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_API_KEY`, `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- **Seed**: `node seed.js` populates communities, videos, creators, users, booking sessions

## Global Jukebox (Key Feature)
- `app/jukebox/[id].tsx` — Full jukebox screen with YouTube IFrame API player, queue, chat
- `components/GlobalJukeboxPlayer.tsx` — Mini-player bar (UI only, no audio)
- `server/redis.ts` — In-memory event bus (EventEmitter) + optional Upstash Redis
- SSE endpoint: `GET /api/jukebox/:communityId/stream` — real-time state/queue/chat updates
- PostgreSQL tables: `jukebox_state`, `jukebox_queue`, `jukebox_chat`, `jukebox_request_counts`
- Coin economy: first 3 requests/day free, 4th+ costs 1 coin (¥30)
- Server-authoritative playback: `startedAt` + `elapsedSecs` for sync

## Upload Feature
- `app/upload.tsx` — Activity recording screen
  - Photo (optional) + text (required) posting
  - Web: file picker for photo selection

## Screen Structure

### Tab Screens
- `app/(tabs)/index.tsx` — Home (videos, live streams, mentors)
- `app/(tabs)/community.tsx` — Communities (search, categories)
- `app/(tabs)/live.tsx` — Live (NOW LIVE/BOOKING, start modal)
- `app/(tabs)/dm.tsx` — DM (following feed, communities)
- `app/(tabs)/profile.tsx` — My Page (profile, revenue, posts)

### Detail Screens
- `app/community/[id].tsx` — Community detail
- `app/video/[id].tsx` — Video detail/purchase
- `app/jukebox/[id].tsx` — Global Jukebox room
- `app/live/[id].tsx` — Live stream viewer
- `app/user/[id].tsx` — User profile

## Color Palette
- Background: `#1B2838` (dark navy)
- Surface: `#1E3045`
- Accent: `#29B6CF` (teal)
- Live badge: `#E53935` (red)
- Ranking: `#FF8B00` (orange)

## Key Files
- `constants/colors.ts` — Color constants
- `server/schema.ts` — All DB table definitions (Drizzle)
- `server/routes.ts` — All API endpoints
- `server/redis.ts` — SSE event bus
- `server/db.ts` — PostgreSQL connection (Replit native)
- `lib/query-client.ts` — React Query + API helpers
- `lib/auth.tsx` — AuthContext

## Backend API
- **DB**: PostgreSQL + Drizzle ORM (`server/schema.ts`, `server/db.ts`)
- **Routes**: `server/routes.ts`
- Auth: `/api/auth/me|register|login|profile|line|google`
- Videos: `/api/videos|videos/ranked`
- Communities: `/api/communities`
- Live: `/api/live-streams`
- Jukebox: `/api/jukebox/:id|stream|add|next|chat`
- Revenue: `/api/revenue/summary|earnings|withdrawals|withdraw`
- Coins: `/api/coins/balance|purchase|use-for-jukebox`
- DM: `/api/dm-messages|dm-conversations`

## Auth System
- JWT auth (SESSION_SECRET, 90-day expiry), bcryptjs
- LINE OAuth + Google OAuth
- Demo: `demo@livestage.jp` / `password`

## Revenue System
- `app/revenue.tsx` — Balance card, 6-month SVG bar chart, withdrawal
- `earnings`, `withdrawals`, `coin_balances`, `coin_transactions` tables

## UI Language

All hardcoded user-facing strings (labels, placeholders, buttons, alerts, validation messages, default names) **must be written in English**, regardless of the language used in task descriptions or planning documents. This rule applies to every screen in the `app/` directory. Developer-only code comments and the `vite-app/` internal tool are exempt.

## DB Tables
`users`, `communities`, `community_members`, `community_moderators`, `videos`, `video_comments`, `video_editors`, `live_streams`, `live_stream_chat`, `creators`, `booking_sessions`, `mentor_bookings`, `dm_messages`, `dm_conversation_messages`, `dm_conversations`, `notifications`, `earnings`, `withdrawals`, `coin_balances`, `coin_transactions`, `jukebox_state`, `jukebox_queue`, `jukebox_chat`, `jukebox_request_counts`, `announcements`, `banner_ads`, `daily_logins`, `concert_events`, `concert_staff`
