# API ルート突合表（自動生成）

生成: `node scripts/audit-api-routes.mjs`

## 凡例

- **参照あり（パス文字列一致）**: クライアント側ソースにルート文字列そのものが含まれる。
- **参照あり（プレフィックス／部分一致）**: `:id` 等を除いた断片がヒット。テンプレートリテラル分割や queryKey でもヒットしうる。**同一プレフィックスの別API**（例: `/api/banner/checkout-session` のコードが `/api/banner/checkout` を参照あり扱いにする）による**誤判定**があり得ます。
- **参照なし（要確認）**: 上記いずれも不可。**外部Cron・別リポジトリ・手動curl・Stripeリダイレクト**などで使われている可能性あり。安易な削除禁止。

## スキャン対象ディレクトリ

- `app/`
- `lib/`
- `components/`
- `vite-app/`
- `api/`
- `scripts/`

## サマリ

| 分類 | 件数 |
|------|------|
| パス文字列一致 | 89 |
| プレフィックス／部分一致 | 122 |
| 参照なし（要確認） | 10 |
| **合計** | **221** |

## 参照なし（要確認）一覧 — デッドAPI候補

件数: **10**

| Method | Path | routes.ts 付近 | 検索に使った断片 |
|--------|------|----------------|------------------|
| POST | `/api/lp/leads` | L732 | /api/lp/leads \| /api/lp |
| POST | `/api/webhook/stripe` | L1363 | /api/webhook/stripe \| /api/webhook |
| POST | `/api/genre-owners/assign` | L3577 | /api/genre-owners/assign \| /api/genre-owners |
| POST | `/api/cron/update-genre-owners` | L4081 | /api/cron/update-genre-owners \| /api/cron |
| GET | `/api/creators` | L4714 | /api/creators |
| POST | `/api/debug/cf-stream-test` | L5351 | /api/debug/cf-stream-test \| /api/debug |
| POST | `/api/seed` | L7146 | /api/seed |
| POST | `/api/seed-editors` | L7152 | /api/seed-editors |
| POST | `/api/webhooks/templated` | L8236 | /api/webhooks/templated \| /api/webhooks |
| GET | `/api/cron/ai-edit-process` | L8475 | /api/cron/ai-edit-process \| /api/cron |

## 全ルート一覧

| Method | Path | 突合結果 | routes.ts |
|--------|------|----------|-----------|
| POST | `/api/lp/leads` | 参照なし（要確認） | L732 |
| POST | `/api/auth/register` | 参照あり（パス文字列一致） | L770 |
| POST | `/api/auth/demo` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L813 |
| POST | `/api/auth/login` | 参照あり（パス文字列一致） | L817 |
| GET | `/api/auth/me` | 参照あり（パス文字列一致） | L878 |
| GET | `/api/translate/preferred-language` | 参照あり（パス文字列一致） | L920 |
| PATCH | `/api/translate/preferred-language` | 参照あり（パス文字列一致） | L930 |
| POST | `/api/translate` | 参照あり（パス文字列一致） | L947 |
| POST | `/api/auth/accept-policies` | 参照あり（パス文字列一致） | L1007 |
| POST | `/api/connect/payout-terms-agree` | 参照あり（パス文字列一致） | L1031 |
| POST | `/api/connect/onboard` | 参照あり（パス文字列一致） | L1042 |
| GET | `/api/connect/status` | 参照あり（パス文字列一致） | L1077 |
| POST | `/api/banner/checkout` | 参照あり（パス文字列一致） | L1101 |
| POST | `/api/banner/confirm` | 参照あり（パス文字列一致） | L1122 |
| POST | `/api/banner/checkout-session` | 参照あり（パス文字列一致） | L1158 |
| POST | `/api/banner/confirm-session` | 参照あり（パス文字列一致） | L1198 |
| GET | `/api/two-shot/slots` | 参照あり（パス文字列一致） | L1261 |
| GET | `/api/two-shot/reservations/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1271 |
| POST | `/api/checkout/2shot` | 参照あり（パス文字列一致） | L1283 |
| POST | `/api/webhook/stripe` | 参照なし（要確認） | L1363 |
| PUT | `/api/auth/profile` | 参照あり（パス文字列一致） | L1414 |
| DELETE | `/api/auth/account` | 参照あり（パス文字列一致） | L1510 |
| GET | `/api/profile/by-name/:name` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1535 |
| GET | `/api/users/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1546 |
| GET | `/api/users/:id/follow-status` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1614 |
| GET | `/api/users/:id/mentor-sessions` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1627 |
| GET | `/api/users/:id/communities` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1639 |
| GET | `/api/users/:id/followers` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1662 |
| GET | `/api/users/:id/following` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1687 |
| POST | `/api/users/:id/follow` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1711 |
| DELETE | `/api/users/:id/follow` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1726 |
| GET | `/api/auth/status` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1747 |
| GET | `/api/auth/google` | 参照あり（パス文字列一致） | L1759 |
| GET | `/api/auth/google-callback` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1775 |
| GET | `/api/youtube/search` | 参照あり（パス文字列一致） | L1871 |
| GET | `/api/youtube/playlists` | 参照あり（パス文字列一致） | L2001 |
| GET | `/api/youtube/playlists/:playlistId/items` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2045 |
| GET | `/api/communities` | 参照あり（パス文字列一致） | L2143 |
| GET | `/api/communities/me` | 参照あり（パス文字列一致） | L2157 |
| GET | `/api/communities/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2177 |
| GET | `/api/communities/:id/editors` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2185 |
| GET | `/api/communities/:id/creators` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2196 |
| GET | `/api/communities/:id/staff` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2219 |
| PATCH | `/api/communities/:id/staff` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2246 |
| GET | `/api/communities/:id/members` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2277 |
| GET | `/api/communities/:id/members/me` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2299 |
| POST | `/api/communities/:id/join` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2317 |
| GET | `/api/communities/:id/threads` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2353 |
| GET | `/api/community-announcements/feed` | 参照あり（パス文字列一致） | L2391 |
| POST | `/api/communities/:id/threads` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2525 |
| GET | `/api/communities/:id/threads/:threadId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2566 |
| DELETE | `/api/communities/:id/threads/:threadId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2593 |
| DELETE | `/api/communities/:id/threads/:threadId/posts/:postId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2612 |
| POST | `/api/communities/:id/threads/:threadId/posts` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2630 |
| GET | `/api/communities/:id/admin/jukebox-queue` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2677 |
| DELETE | `/api/communities/:id/admin/jukebox-queue/:itemId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2691 |
| GET | `/api/communities/:id/admin/ads` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2709 |
| GET | `/api/communities/:id/admin/reports` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2729 |
| PATCH | `/api/communities/:id/admin/reports/:reportId/hide` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2762 |
| PATCH | `/api/communities/:id/admin/reports/:reportId/dismiss` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2800 |
| GET | `/api/communities/:id/polls` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2833 |
| POST | `/api/communities/:id/polls` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2859 |
| POST | `/api/communities/:id/polls/:pollId/vote` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2893 |
| GET | `/api/editors` | 参照あり（パス文字列一致） | L2919 |
| GET | `/api/editors/me` | 参照あり（パス文字列一致） | L3000 |
| GET | `/api/editors/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3007 |
| POST | `/api/editors/:id/request` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3016 |
| POST | `/api/editors` | 参照あり（パス文字列一致） | L3144 |
| PUT | `/api/editors/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3211 |
| POST | `/api/communities` | 参照あり（パス文字列一致） | L3273 |
| DELETE | `/api/communities/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3345 |
| GET | `/api/community-ads/pricing` | 参照あり（パス文字列一致） | L3395 |
| GET | `/api/community-ads/availability` | 参照あり（パス文字列一致） | L3413 |
| POST | `/api/community-ads` | 参照あり（パス文字列一致） | L3435 |
| GET | `/api/community-ads/revenue-settings/:communityId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3520 |
| PATCH | `/api/community-ads/revenue-settings/:communityId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3554 |
| POST | `/api/genre-owners/assign` | 参照なし（要確認） | L3577 |
| GET | `/api/community-ads/review` | 参照あり（パス文字列一致） | L3613 |
| PATCH | `/api/community-ads/:id/moderator-approve` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3645 |
| PATCH | `/api/community-ads/:id/approve` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3661 |
| PATCH | `/api/community-ads/:id/reject` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3674 |
| POST | `/api/reports` | 参照あり（パス文字列一致） | L3696 |
| POST | `/api/concerts` | 参照あり（パス文字列一致） | L3750 |
| GET | `/api/concerts` | 参照あり（パス文字列一致） | L3822 |
| GET | `/api/concerts/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3831 |
| POST | `/api/concerts/:id/staff-request` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3838 |
| GET | `/api/concerts/:id/staff-requests` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3868 |
| GET | `/api/concerts/:id/staff-req` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3888 |
| PATCH | `/api/concerts/:id/staff/:staffId/approve` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3896 |
| PATCH | `/api/concerts/:id/staff/:staffId/reject` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3924 |
| POST | `/api/genre-ads` | 参照あり（パス文字列一致） | L3956 |
| GET | `/api/genre-ads/review` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4033 |
| PATCH | `/api/genre-ads/:id/approve` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4050 |
| PATCH | `/api/genre-ads/:id/reject` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4065 |
| POST | `/api/cron/update-genre-owners` | 参照なし（要確認） | L4081 |
| GET | `/api/admin/reports` | 参照あり（パス文字列一致） | L4111 |
| PATCH | `/api/admin/reports/:id/hide` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4126 |
| PATCH | `/api/admin/reports/:id/dismiss` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4145 |
| GET | `/api/admin/stats` | 参照あり（パス文字列一致） | L4157 |
| GET | `/api/admin/users` | 参照あり（パス文字列一致） | L4179 |
| PATCH | `/api/admin/users/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4198 |
| GET | `/api/admin/content` | 参照あり（パス文字列一致） | L4239 |
| PATCH | `/api/admin/content/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4260 |
| DELETE | `/api/admin/content/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4284 |
| POST | `/api/upload-url` | 参照あり（パス文字列一致） | L4302 |
| GET | `/api/videos` | 参照あり（パス文字列一致） | L4377 |
| GET | `/api/videos/my` | 参照あり（パス文字列一致） | L4408 |
| GET | `/api/videos/ranked` | 参照あり（パス文字列一致） | L4420 |
| GET | `/api/videos/saved` | 参照あり（パス文字列一致） | L4430 |
| GET | `/api/videos/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4455 |
| GET | `/api/videos/:id/comments` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4474 |
| POST | `/api/videos/:id/comments` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4494 |
| POST | `/api/videos` | 参照あり（パス文字列一致） | L4509 |
| PATCH | `/api/videos/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4575 |
| DELETE | `/api/videos/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4617 |
| POST | `/api/videos/:id/save` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4633 |
| DELETE | `/api/videos/:id/save` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4657 |
| GET | `/api/videos/:id/saved` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4669 |
| GET | `/api/users/:id/posts` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4682 |
| GET | `/api/live-streams` | 参照あり（パス文字列一致） | L4704 |
| GET | `/api/creators` | 参照なし（要確認） | L4714 |
| GET | `/api/booking-sessions` | 参照あり（パス文字列一致） | L4720 |
| POST | `/api/booking-sessions/:id/book` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4728 |
| POST | `/api/dm/open` | 参照あり（パス文字列一致） | L4742 |
| GET | `/api/dm-messages` | 参照あり（パス文字列一致） | L4773 |
| POST | `/api/dm-messages/:id/read` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4835 |
| GET | `/api/notifications/unread-count` | 参照あり（パス文字列一致） | L4872 |
| GET | `/api/notifications` | 参照あり（パス文字列一致） | L4881 |
| POST | `/api/notifications/read-all` | 参照あり（パス文字列一致） | L4889 |
| POST | `/api/notifications/:id/read` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4894 |
| GET | `/api/live-streams/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4905 |
| GET | `/api/live-streams/:id/chat` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4912 |
| POST | `/api/live-streams/:id/chat` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4920 |
| GET | `/api/dm-messages/:id/peer` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4938 |
| GET | `/api/dm-messages/:id/conversation` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4973 |
| POST | `/api/dm-messages/:id/conversation` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5012 |
| GET | `/api/jukebox/active-sessions` | 参照あり（パス文字列一致） | L5077 |
| GET | `/api/jukebox/:communityId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5116 |
| GET | `/api/jukebox/:communityId/stream` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5255 |
| POST | `/api/debug/cf-stream-test` | 参照なし（要確認） | L5351 |
| POST | `/api/stream/create` | 参照あり（パス文字列一致） | L5393 |
| GET | `/api/stream/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5563 |
| POST | `/api/stream/:id/start` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5642 |
| POST | `/api/stream/:id/end` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5666 |
| POST | `/api/stream/:id/join` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5688 |
| POST | `/api/stream/:id/join-paid` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5726 |
| POST | `/api/stream/:id/leave` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5828 |
| POST | `/api/jukebox/:communityId/add` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5850 |
| POST | `/api/jukebox/:communityId/next` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5929 |
| PATCH | `/api/jukebox/:communityId/duration` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6015 |
| POST | `/api/jukebox/:communityId/chat` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6038 |
| DELETE | `/api/jukebox/:communityId/queue/:itemId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6061 |
| GET | `/api/mentor/session/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6095 |
| GET | `/api/availability/:userId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6112 |
| POST | `/api/mentor/bookings` | 参照あり（パス文字列一致） | L6124 |
| GET | `/api/mentor/publishable-key` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6270 |
| GET | `/api/mentor/:streamId/bookings` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6279 |
| GET | `/api/mentor/:streamId/queue-count` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6289 |
| POST | `/api/mentor/:streamId/checkout` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6298 |
| POST | `/api/mentor/confirm-payment` | 参照あり（パス文字列一致） | L6369 |
| POST | `/api/mentor/:bookingId/notify` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6458 |
| POST | `/api/mentor/:bookingId/complete` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6467 |
| POST | `/api/mentor/:bookingId/cancel` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6476 |
| GET | `/api/mentor/my-sessions` | 参照あり（パス文字列一致） | L6494 |
| POST | `/api/mentor/sessions` | 参照あり（パス文字列一致） | L6506 |
| PUT | `/api/mentor/sessions/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6528 |
| DELETE | `/api/mentor/sessions/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6552 |
| GET | `/api/mentor/creator-bookings` | 参照あり（パス文字列一致） | L6566 |
| POST | `/api/mentor/bookings/:bookingId/start` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6596 |
| GET | `/api/mentor/bookings/:bookingId/join` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6654 |
| POST | `/api/mentor/bookings/:bookingId/end` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6663 |
| POST | `/api/revenue/record` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6690 |
| GET | `/api/revenue/summary` | 参照あり（パス文字列一致） | L6708 |
| GET | `/api/revenue/earnings` | 参照あり（パス文字列一致） | L6743 |
| GET | `/api/revenue/monthly-rank` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6756 |
| GET | `/api/revenue/withdrawals` | 参照あり（パス文字列一致） | L6774 |
| POST | `/api/revenue/withdraw` | 参照あり（パス文字列一致） | L6786 |
| GET | `/api/announcements` | 参照あり（パス文字列一致） | L6875 |
| GET | `/api/livers` | 参照あり（パス文字列一致） | L6888 |
| GET | `/api/livers/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6934 |
| GET | `/api/livers/me/level-progress` | 参照あり（パス文字列一致） | L6941 |
| POST | `/api/livers/me/streams/record` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6979 |
| GET | `/api/profile/roles` | 参照あり（パス文字列一致） | L7013 |
| POST | `/api/profile/register-role` | 参照あり（パス文字列一致） | L7024 |
| GET | `/api/livers/:id/reviews` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7077 |
| POST | `/api/livers/:id/reviews` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7085 |
| GET | `/api/livers/:id/availability` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7115 |
| POST | `/api/livers/:id/availability` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7123 |
| DELETE | `/api/livers/:id/availability/:slotId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7139 |
| POST | `/api/seed` | 参照なし（要確認） | L7146 |
| POST | `/api/seed-editors` | 参照なし（要確認） | L7152 |
| GET | `/api/coins/balance` | 参照あり（パス文字列一致） | L7160 |
| GET | `/api/coins/request-count` | 参照あり（パス文字列一致） | L7170 |
| POST | `/api/coins/spend-jukebox` | 参照あり（パス文字列一致） | L7189 |
| POST | `/api/coins/record-free-request` | 参照あり（パス文字列一致） | L7236 |
| POST | `/api/coins/use-revenue` | 参照あり（パス文字列一致） | L7259 |
| POST | `/api/coins/create-checkout` | 参照あり（パス文字列一致） | L7305 |
| POST | `/api/coins/verify-purchase` | 参照あり（パス文字列一致） | L7352 |
| GET | `/api/tickets/balance` | 参照あり（パス文字列一致） | L7414 |
| GET | `/api/tickets/request-count` | 参照あり（パス文字列一致） | L7424 |
| POST | `/api/tickets/record-free-request` | 参照あり（パス文字列一致） | L7443 |
| POST | `/api/tickets/spend-jukebox` | 参照あり（パス文字列一致） | L7466 |
| POST | `/api/tickets/spend` | 参照あり（パス文字列一致） | L7563 |
| GET | `/api/tickets/create-checkout` | 参照あり（パス文字列一致） | L7692 |
| POST | `/api/tickets/create-checkout` | 参照あり（パス文字列一致） | L7698 |
| POST | `/api/tickets/verify-purchase` | 参照あり（パス文字列一致） | L7739 |
| GET | `/api/tickets/packs` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7770 |
| GET | `/api/platform-banners` | 参照あり（パス文字列一致） | L7776 |
| POST | `/api/platform-banners` | 参照あり（パス文字列一致） | L7788 |
| PATCH | `/api/platform-banners/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7812 |
| DELETE | `/api/platform-banners/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7837 |
| POST | `/api/daily-login` | 参照あり（パス文字列一致） | L7852 |
| GET | `/api/daily-login/count` | 参照あり（パス文字列一致） | L7867 |
| POST | `/api/ai-edit/jobs` | 参照あり（パス文字列一致） | L7984 |
| GET | `/api/ai-edit/jobs/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L8075 |
| POST | `/api/ai-edit/jobs/:id/render` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L8131 |
| POST | `/api/webhooks/templated` | 参照なし（要確認） | L8236 |
| POST | `/api/ai-edit/jobs/:id/approve` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L8322 |
| POST | `/api/ai-edit/jobs/:id/revise` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L8347 |
| POST | `/api/ai-edit/jobs/:id/deliver` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L8420 |
| GET | `/api/cron/ai-edit-process` | 参照なし（要確認） | L8475 |
