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
| パス文字列一致 | 82 |
| プレフィックス／部分一致 | 121 |
| 参照なし（要確認） | 6 |
| **合計** | **209** |

## 参照なし（要確認）一覧 — デッドAPI候補

件数: **6**

| Method | Path | routes.ts 付近 | 検索に使った断片 |
|--------|------|----------------|------------------|
| POST | `/api/genre-owners/assign` | L2754 | /api/genre-owners/assign \| /api/genre-owners |
| POST | `/api/cron/update-genre-owners` | L3258 | /api/cron/update-genre-owners \| /api/cron |
| GET | `/api/creators` | L3847 | /api/creators |
| POST | `/api/seed` | L6198 | /api/seed |
| POST | `/api/seed-editors` | L6531 | /api/seed-editors |
| POST | `/api/webhooks/templated` | L7648 | /api/webhooks/templated \| /api/webhooks |

## 全ルート一覧

| Method | Path | 突合結果 | routes.ts |
|--------|------|----------|-----------|
| POST | `/api/auth/register` | 参照あり（パス文字列一致） | L551 |
| POST | `/api/auth/demo` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L582 |
| POST | `/api/auth/login` | 参照あり（パス文字列一致） | L586 |
| GET | `/api/auth/me` | 参照あり（パス文字列一致） | L607 |
| POST | `/api/connect/payout-terms-agree` | 参照あり（パス文字列一致） | L645 |
| POST | `/api/connect/onboard` | 参照あり（パス文字列一致） | L656 |
| GET | `/api/connect/status` | 参照あり（パス文字列一致） | L691 |
| POST | `/api/banner/checkout` | 参照あり（パス文字列一致） | L715 |
| POST | `/api/banner/confirm` | 参照あり（パス文字列一致） | L736 |
| POST | `/api/banner/checkout-session` | 参照あり（パス文字列一致） | L772 |
| POST | `/api/banner/confirm-session` | 参照あり（パス文字列一致） | L812 |
| PUT | `/api/auth/profile` | 参照あり（パス文字列一致） | L851 |
| DELETE | `/api/auth/account` | 参照あり（パス文字列一致） | L940 |
| GET | `/api/profile/by-name/:name` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L965 |
| GET | `/api/users/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L976 |
| GET | `/api/users/:id/follow-status` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1044 |
| GET | `/api/users/:id/mentor-sessions` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1057 |
| GET | `/api/users/:id/communities` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1069 |
| GET | `/api/users/:id/followers` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1092 |
| GET | `/api/users/:id/following` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1117 |
| POST | `/api/users/:id/follow` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1141 |
| DELETE | `/api/users/:id/follow` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1156 |
| GET | `/api/auth/status` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1177 |
| GET | `/api/auth/google` | 参照あり（パス文字列一致） | L1185 |
| GET | `/api/auth/google-callback` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1201 |
| GET | `/api/youtube/search` | 参照あり（パス文字列一致） | L1297 |
| GET | `/api/youtube/playlists` | 参照あり（パス文字列一致） | L1418 |
| GET | `/api/youtube/playlists/:playlistId/items` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1462 |
| GET | `/api/communities` | 参照あり（パス文字列一致） | L1549 |
| GET | `/api/communities/me` | 参照あり（パス文字列一致） | L1562 |
| GET | `/api/communities/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1585 |
| GET | `/api/communities/:id/editors` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1593 |
| GET | `/api/communities/:id/creators` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1604 |
| GET | `/api/communities/:id/staff` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1627 |
| PATCH | `/api/communities/:id/staff` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1654 |
| GET | `/api/communities/:id/members` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1685 |
| GET | `/api/communities/:id/members/me` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1707 |
| POST | `/api/communities/:id/join` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1725 |
| GET | `/api/communities/:id/threads` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1761 |
| POST | `/api/communities/:id/threads` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1798 |
| GET | `/api/communities/:id/threads/:threadId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1829 |
| DELETE | `/api/communities/:id/threads/:threadId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1856 |
| DELETE | `/api/communities/:id/threads/:threadId/posts/:postId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1875 |
| POST | `/api/communities/:id/threads/:threadId/posts` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1893 |
| GET | `/api/communities/:id/admin/jukebox-queue` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1927 |
| DELETE | `/api/communities/:id/admin/jukebox-queue/:itemId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1941 |
| GET | `/api/communities/:id/admin/ads` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1959 |
| GET | `/api/communities/:id/admin/reports` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L1979 |
| PATCH | `/api/communities/:id/admin/reports/:reportId/hide` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2012 |
| PATCH | `/api/communities/:id/admin/reports/:reportId/dismiss` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2050 |
| GET | `/api/communities/:id/polls` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2083 |
| POST | `/api/communities/:id/polls` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2109 |
| POST | `/api/communities/:id/polls/:pollId/vote` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2143 |
| GET | `/api/editors` | 参照あり（パス文字列一致） | L2169 |
| GET | `/api/editors/me` | 参照あり（パス文字列一致） | L2250 |
| GET | `/api/editors/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2257 |
| POST | `/api/editors/:id/request` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2264 |
| POST | `/api/editors` | 参照あり（パス文字列一致） | L2323 |
| PUT | `/api/editors/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2390 |
| POST | `/api/communities` | 参照あり（パス文字列一致） | L2452 |
| DELETE | `/api/communities/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2522 |
| GET | `/api/community-ads/pricing` | 参照あり（パス文字列一致） | L2572 |
| GET | `/api/community-ads/availability` | 参照あり（パス文字列一致） | L2590 |
| POST | `/api/community-ads` | 参照あり（パス文字列一致） | L2612 |
| GET | `/api/community-ads/revenue-settings/:communityId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2697 |
| PATCH | `/api/community-ads/revenue-settings/:communityId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2731 |
| POST | `/api/genre-owners/assign` | 参照なし（要確認） | L2754 |
| GET | `/api/community-ads/review` | 参照あり（パス文字列一致） | L2790 |
| PATCH | `/api/community-ads/:id/moderator-approve` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2822 |
| PATCH | `/api/community-ads/:id/approve` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2838 |
| PATCH | `/api/community-ads/:id/reject` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L2851 |
| POST | `/api/reports` | 参照あり（パス文字列一致） | L2873 |
| POST | `/api/concerts` | 参照あり（パス文字列一致） | L2927 |
| GET | `/api/concerts` | 参照あり（パス文字列一致） | L2999 |
| GET | `/api/concerts/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3008 |
| POST | `/api/concerts/:id/staff-request` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3015 |
| GET | `/api/concerts/:id/staff-requests` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3045 |
| GET | `/api/concerts/:id/staff-req` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3065 |
| PATCH | `/api/concerts/:id/staff/:staffId/approve` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3073 |
| PATCH | `/api/concerts/:id/staff/:staffId/reject` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3101 |
| POST | `/api/genre-ads` | 参照あり（パス文字列一致） | L3133 |
| GET | `/api/genre-ads/review` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3210 |
| PATCH | `/api/genre-ads/:id/approve` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3227 |
| PATCH | `/api/genre-ads/:id/reject` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3242 |
| POST | `/api/cron/update-genre-owners` | 参照なし（要確認） | L3258 |
| GET | `/api/admin/reports` | 参照あり（パス文字列一致） | L3288 |
| PATCH | `/api/admin/reports/:id/hide` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3303 |
| PATCH | `/api/admin/reports/:id/dismiss` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3322 |
| GET | `/api/admin/stats` | 参照あり（パス文字列一致） | L3334 |
| GET | `/api/admin/users` | 参照あり（パス文字列一致） | L3356 |
| PATCH | `/api/admin/users/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3375 |
| GET | `/api/admin/content` | 参照あり（パス文字列一致） | L3416 |
| PATCH | `/api/admin/content/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3437 |
| DELETE | `/api/admin/content/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3461 |
| POST | `/api/upload-url` | 参照あり（パス文字列一致） | L3479 |
| GET | `/api/videos` | 参照あり（パス文字列一致） | L3520 |
| GET | `/api/videos/my` | 参照あり（パス文字列一致） | L3550 |
| GET | `/api/videos/ranked` | 参照あり（パス文字列一致） | L3562 |
| GET | `/api/videos/saved` | 参照あり（パス文字列一致） | L3572 |
| GET | `/api/videos/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3597 |
| GET | `/api/videos/:id/comments` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3615 |
| POST | `/api/videos/:id/comments` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3635 |
| POST | `/api/videos` | 参照あり（パス文字列一致） | L3650 |
| PATCH | `/api/videos/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3708 |
| DELETE | `/api/videos/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3750 |
| POST | `/api/videos/:id/save` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3766 |
| DELETE | `/api/videos/:id/save` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3790 |
| GET | `/api/videos/:id/saved` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3802 |
| GET | `/api/users/:id/posts` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3815 |
| GET | `/api/live-streams` | 参照あり（パス文字列一致） | L3837 |
| GET | `/api/creators` | 参照なし（要確認） | L3847 |
| GET | `/api/booking-sessions` | 参照あり（パス文字列一致） | L3853 |
| POST | `/api/booking-sessions/:id/book` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3861 |
| POST | `/api/dm/open` | 参照あり（パス文字列一致） | L3875 |
| GET | `/api/dm-messages` | 参照あり（パス文字列一致） | L3906 |
| POST | `/api/dm-messages/:id/read` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L3968 |
| GET | `/api/notifications/unread-count` | 参照あり（パス文字列一致） | L4005 |
| GET | `/api/notifications` | 参照あり（パス文字列一致） | L4013 |
| POST | `/api/notifications/read-all` | 参照あり（パス文字列一致） | L4021 |
| POST | `/api/notifications/:id/read` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4026 |
| GET | `/api/live-streams/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4037 |
| GET | `/api/live-streams/:id/chat` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4044 |
| POST | `/api/live-streams/:id/chat` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4052 |
| GET | `/api/dm-messages/:id/peer` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4070 |
| GET | `/api/dm-messages/:id/conversation` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4105 |
| POST | `/api/dm-messages/:id/conversation` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4144 |
| GET | `/api/jukebox/active-sessions` | 参照あり（パス文字列一致） | L4207 |
| GET | `/api/jukebox/:communityId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4246 |
| GET | `/api/jukebox/:communityId/stream` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4385 |
| POST | `/api/stream/create` | 参照あり（パス文字列一致） | L4481 |
| GET | `/api/stream/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4652 |
| POST | `/api/stream/:id/start` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4731 |
| POST | `/api/stream/:id/end` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4755 |
| POST | `/api/stream/:id/join` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4777 |
| POST | `/api/stream/:id/join-paid` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4815 |
| POST | `/api/stream/:id/leave` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4917 |
| POST | `/api/jukebox/:communityId/add` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L4939 |
| POST | `/api/jukebox/:communityId/next` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5013 |
| PATCH | `/api/jukebox/:communityId/duration` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5099 |
| POST | `/api/jukebox/:communityId/chat` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5122 |
| DELETE | `/api/jukebox/:communityId/queue/:itemId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5145 |
| GET | `/api/mentor/session/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5179 |
| GET | `/api/availability/:userId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5196 |
| POST | `/api/mentor/bookings` | 参照あり（パス文字列一致） | L5208 |
| GET | `/api/mentor/publishable-key` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5358 |
| GET | `/api/mentor/:streamId/bookings` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5367 |
| GET | `/api/mentor/:streamId/queue-count` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5377 |
| POST | `/api/mentor/:streamId/checkout` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5386 |
| POST | `/api/mentor/confirm-payment` | 参照あり（パス文字列一致） | L5457 |
| POST | `/api/mentor/:bookingId/notify` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5546 |
| POST | `/api/mentor/:bookingId/complete` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5555 |
| POST | `/api/mentor/:bookingId/cancel` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5564 |
| GET | `/api/mentor/my-sessions` | 参照あり（パス文字列一致） | L5582 |
| POST | `/api/mentor/sessions` | 参照あり（パス文字列一致） | L5594 |
| PUT | `/api/mentor/sessions/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5616 |
| DELETE | `/api/mentor/sessions/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5640 |
| GET | `/api/mentor/creator-bookings` | 参照あり（パス文字列一致） | L5654 |
| POST | `/api/mentor/bookings/:bookingId/start` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5684 |
| GET | `/api/mentor/bookings/:bookingId/join` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5729 |
| POST | `/api/mentor/bookings/:bookingId/end` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5738 |
| POST | `/api/revenue/record` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5765 |
| GET | `/api/revenue/summary` | 参照あり（パス文字列一致） | L5783 |
| GET | `/api/revenue/earnings` | 参照あり（パス文字列一致） | L5817 |
| GET | `/api/revenue/monthly-rank` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5830 |
| GET | `/api/revenue/withdrawals` | 参照あり（パス文字列一致） | L5848 |
| POST | `/api/revenue/withdraw` | 参照あり（パス文字列一致） | L5860 |
| GET | `/api/announcements` | 参照あり（パス文字列一致） | L5927 |
| GET | `/api/livers` | 参照あり（パス文字列一致） | L5940 |
| GET | `/api/livers/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L5986 |
| GET | `/api/livers/me/level-progress` | 参照あり（パス文字列一致） | L5993 |
| POST | `/api/livers/me/streams/record` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6031 |
| GET | `/api/profile/roles` | 参照あり（パス文字列一致） | L6065 |
| POST | `/api/profile/register-role` | 参照あり（パス文字列一致） | L6076 |
| GET | `/api/livers/:id/reviews` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6129 |
| POST | `/api/livers/:id/reviews` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6137 |
| GET | `/api/livers/:id/availability` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6167 |
| POST | `/api/livers/:id/availability` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6175 |
| DELETE | `/api/livers/:id/availability/:slotId` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L6191 |
| POST | `/api/seed` | 参照なし（要確認） | L6198 |
| POST | `/api/seed-editors` | 参照なし（要確認） | L6531 |
| GET | `/api/coins/balance` | 参照あり（パス文字列一致） | L6683 |
| GET | `/api/coins/request-count` | 参照あり（パス文字列一致） | L6693 |
| POST | `/api/coins/spend-jukebox` | 参照あり（パス文字列一致） | L6712 |
| POST | `/api/coins/record-free-request` | 参照あり（パス文字列一致） | L6759 |
| POST | `/api/coins/use-revenue` | 参照あり（パス文字列一致） | L6782 |
| POST | `/api/coins/create-checkout` | 参照あり（パス文字列一致） | L6828 |
| POST | `/api/coins/verify-purchase` | 参照あり（パス文字列一致） | L6875 |
| GET | `/api/tickets/balance` | 参照あり（パス文字列一致） | L6937 |
| GET | `/api/tickets/request-count` | 参照あり（パス文字列一致） | L6946 |
| POST | `/api/tickets/record-free-request` | 参照あり（パス文字列一致） | L6965 |
| POST | `/api/tickets/spend-jukebox` | 参照あり（パス文字列一致） | L6988 |
| POST | `/api/tickets/spend` | 参照あり（パス文字列一致） | L7085 |
| GET | `/api/tickets/create-checkout` | 参照あり（パス文字列一致） | L7156 |
| POST | `/api/tickets/create-checkout` | 参照あり（パス文字列一致） | L7162 |
| POST | `/api/tickets/verify-purchase` | 参照あり（パス文字列一致） | L7202 |
| GET | `/api/tickets/packs` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7255 |
| GET | `/api/platform-banners` | 参照あり（パス文字列一致） | L7261 |
| POST | `/api/platform-banners` | 参照あり（パス文字列一致） | L7273 |
| PATCH | `/api/platform-banners/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7297 |
| DELETE | `/api/platform-banners/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7322 |
| POST | `/api/daily-login` | 参照あり（パス文字列一致） | L7337 |
| GET | `/api/daily-login/count` | 参照あり（パス文字列一致） | L7352 |
| POST | `/api/ai-edit/jobs` | 参照あり（パス文字列一致） | L7368 |
| GET | `/api/ai-edit/jobs/:id` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7484 |
| POST | `/api/ai-edit/jobs/:id/render` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7541 |
| POST | `/api/webhooks/templated` | 参照なし（要確認） | L7648 |
| POST | `/api/ai-edit/jobs/:id/approve` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7734 |
| POST | `/api/ai-edit/jobs/:id/revise` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7759 |
| POST | `/api/ai-edit/jobs/:id/deliver` | 参照あり（プレフィックス／部分一致・動的URLの可能性） | L7843 |
