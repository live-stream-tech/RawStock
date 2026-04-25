/**
 * Replace Japanese comments/strings in server/routes.ts with English
 * (or Unicode escapes for live-hint tokens).
 *
 * Uses scripts/_routes-jp-unique-lines.json + scripts/_routes-jp-en-column.txt (136)
 * plus TOP_PAIRS for lines above that set.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const routesPath = path.join(root, "server", "routes.ts");
const fromPath = path.join(__dirname, "_routes-jp-unique-lines.json");
const toPath = path.join(__dirname, "_routes-jp-en-column.txt");

/** Lines that appear earlier in routes.ts than the 136-line batch */
const TOP_PAIRS = [
  [
    " * Google OAuth 完了後のリダイレクト先オリジン（末尾スラッシュなし)。",
    " * Redirect origin after Google OAuth completes (no trailing slash).",
  ],
  [
    " * FRONTEND_URL を優先。未設定時は Vercel プレビュー用に VERCEL_URL、それもなければ本番。",
    " * Prefer FRONTEND_URL; else VERCEL_URL for previews; else production default.",
  ],
  [
    " * Google Cloud の「承認済みのリダイレクト URI」に",
    " * In Google Cloud add to Authorized redirect URIs:",
  ],
  [
    " * `${origin}/api/auth/google-callback` を登録すること。",
    " * Register `${origin}/api/auth/google-callback`.",
  ],
  [
    "/** Cloudflare client/v4 の errors 配列を 1 行に（デバッグ・ユーザー向け detail 用) */",
    "/** Join Cloudflare client/v4 `errors` into one string (debug / user-facing detail). */",
  ],
  [
    "/** req.params / req.query を string に正規化（Express は string | string[]) */",
    "/** Normalize req.params / req.query to string (Express may be string | string[]). */",
  ],
  [
    "/** req.query の値を string に正規化（Express の ParsedQs を string に統一) */",
    "/** Normalize a req.query value to string (unify Express ParsedQs to string). */",
  ],
  [
    "/** ISO 639-1 として許容する翻訳宛先言語（Auth・自動翻訳の両方で利用） */",
    "/** Allowed translation target languages as ISO 639-1 (auth + auto-translate). */",
  ],
  ["  // ja-JP のような BCP-47 を ISO 639-1 へ縮約", "  // Collapse BCP-47 tags like ja-JP to ISO 639-1 base language"],
  [
    "/** Accept-Language ヘッダから第一希望の言語を抽出（preferredLanguage 未指定時のフォールバック） */",
    "/** First-choice language from Accept-Language (fallback when preferredLanguage unset). */",
  ],
  [
    "/** 翻訳エンドポイントの簡易レート制限（ユーザーごと、1 分 30 リクエスト） */",
    "/** Simple per-user rate limit for translate (30 requests per minute). */",
  ],
  [
    "/** JWT 後に routes が参照するユーザー形（DB の users 行と一致） */",
    "/** User shape used by routes after JWT (matches DB users row). */",
  ],
  [
    "/** 検知できたときだけ users.last_content_lang を更新。失敗しても例外は投げない。 */",
    "/** Update users.last_content_lang only when detection succeeds; never throw. */",
  ],
  [
    "/** GET /api/auth/me 等: 条項・プライバシー同意状態（constants/legalVersions と突合) */",
    "/** GET /api/auth/me etc.: Terms/Privacy acceptance vs constants/legalVersions. */",
  ],
  [
    "/** 運営DM行が無い環境でも一覧からガイドを開けるようにする */",
    "/** Allow opening ops DM guide from list even when no ops DM row exists. */",
  ],
  ["/** システムウォレットを取得。なければ作成する */", "/** Get or create system wallet. */"],
  ["/** ユーザー用ウォレットを取得。なければ作成する */", "/** Get or create user wallet. */"],
  [
    "/** 収益を transactions に type: 'REVENUE' で記録（月末ランク集計用) */",
    "/** Record revenue as transactions type REVENUE (monthly rank aggregation). */",
  ],
  ["  let backRate = 0.9; // paid_live/mentor は常に 90%", "  let backRate = 0.9; // paid_live / mentor always 90%"],
  [
    "/** `mentor_sessions.creator_id` 等の users.id から creators 行を解決（creators.name ↔ users.displayName） */",
    "/** Resolve creators row from users.id (mentor_sessions.creator_id, etc.; creators.name ↔ users.displayName). */",
  ],
  [
    "/** 有料動画の売上分配先 users.id（videos.user_id 優先、無ければ creator 表示名で users を照会）。hidden は除外 */",
    "/** Paid video revenue recipient users.id (prefer videos.user_id; else lookup users by creator display name). Excludes hidden. */",
  ],
  [
    "    // 既存ユーザーで preferredLanguage 未設定なら、送信値 or Accept-Language で初期化",
    "    // Existing users without preferredLanguage: initialize from body or Accept-Language",
  ],
  ["      // ログインボディで明示指定された場合は上書き許可", "      // Allow override when login body explicitly sets language"],
  ["  // ── 自動翻訳（手動トリガー） ────────────────────────────────", "  // --- Auto-translate (manual trigger) ---"],
  [
    "      // 検知不能。dstLang と同じと仮定して原文返却（エンジン無駄打ち防止）",
    "      // Undetectable: assume same as dstLang and return original (skip engine)",
  ],
  [
    "  /** 現行の Terms / Privacy 版への同意を記録（条項更新後の再同意用) */",
    "  /** Record consent to current Terms/Privacy versions (re-consent after policy updates). */",
  ],
  ["  // ── Stripe Connect（出金先連携)────────────────────────────────────────", "  // --- Stripe Connect (payout accounts) ---"],
  [
    "  // ── バナー広告：決済・分配（人数×5セント×日数、最低$100)────────────────────",
    "  // --- Banner ads: checkout + revenue share (members × $0.05 × days, min $100) ---",
  ],
  ["  // コミュニティ広告バナー用 Stripe Checkout（3日間 $100)", "  // Stripe Checkout for community banner ads ($100 / 3 days)"],
  ["  /** アカウント削除（コミュニティを管理している場合は不可) */", "  /** Delete account (blocked if user owns a managed community). */"],
  [
    "  /** 投稿者名からユーザー or ライバーのプロフィールIDを取得（認証不要) */",
    "  /** Resolve profile id from poster display name (user or liver; public). */",
  ],
  ["  /** 他ユーザーの公開プロフィール取得（認証不要) */", "  /** Public profile for another user (no auth). */"],
  ["  /** ログイン中ユーザーが :id をフォローしているか（要認証) */", "  /** Whether current user follows :id (auth required). */"],
  [
    "  /** 公開: ユーザーのアクティブなメンターセッション商品（mentor_sessions) */",
    "  /** Public: active mentor session products for user (mentor_sessions). */",
  ],
  ["  /** 公開: ユーザーが参加しているコミュニティ */", "  /** Public: communities the user joined. */"],
  ["  /** フォロワー一覧（認証不要) */", "  /** Followers list (public). */"],
  ["  /** フォロー中一覧（認証不要) */", "  /** Following list (public). */"],
  [
    "        /** Web クライアント ID は公開情報。`.env` の GOOGLE_CLIENT_ID が GCP のクライアントと一致するか照合用 */",
    "        /** Web client id is public; compare .env GOOGLE_CLIENT_ID to GCP client. */",
  ],
  [
    "      // iOS Safari PWA対応: PWAのstartUrl(/)にリダイレクトしてPWA内でトークン処理",
    "      // iOS Safari PWA: redirect to PWA startUrl (/) so token handling stays inside PWA",
  ],
  ["      // videos.list で実際の動画時間（ISO 8601 duration)を取得", "      // Fetch actual duration via videos.list (ISO 8601 duration)"],
  ["        } catch { /* duration 取得失敗は無視 */ }", "        } catch { /* ignore duration fetch errors */ }"],
  ["  /** ユーザーの Google アクセストークンを取得（必要ならリフレッシュ) */", "  /** Get user's Google access token (refresh if needed). */"],
  [
    "  // ── YouTube プレイリスト（Google ログインユーザー向け)────────────────────────",
    "  // --- YouTube playlists (Google-signed-in users) ---",
  ],
  ["      // videos.list で実際の動画時間を取得", "      // Fetch actual duration via videos.list"],
  ["        } catch { /* 無視 */ }", "        } catch { /* ignore */ }"],
  [
    "  /** genreId で絞り込み: pop, rock, hiphop, edm, ai → category に含まれるかでフィルタ */",
    "  /** Filter by genreId: pop, rock, hiphop, edm, ai — match community category. */",
  ],
  ["  /** 現在ログイン中ユーザーが参加しているコミュニティ一覧 */", "  /** Communities joined by the current user. */"],
  [
    "  /** コミュニティに登録しているクリエイター一覧（動画編集者 + ライバー/クリエイター) */",
    "  /** Creators registered in community (editors + liver/creators). */",
  ],
  ["  /** コミュニティの管理人・モデレーター取得 */", "  /** List community admins and moderators. */"],
  ["  /** コミュニティの管理人・モデレーター設定（管理人または本人のみ) */", "  /** Set admins/moderators (owner or self only). */"],
  ["  /** コミュニティメンバー一覧（管理人・モデレーター選択用) */", "  /** Community members (for admin/moderator picker). */"],
  ["  /** 現在のユーザーがこのコミュニティのメンバーか */", "  /** Whether current user is a member of this community. */"],
  ["  /** コミュニティに参加（フォロー時などに呼ぶ) */", "  /** Join community (e.g. on follow). */"],
  ["  // ── コミュニティ掲示板（スレッド形式) ─────────────────────────────────", "  // --- Community board (threaded) ---"],
  [
    "  /** 全コミュニティの掲示板スレッド横断フィード（ライブ告知ハブ・公開読み取り） */",
    "  /** Cross-community board threads (live announcement hub; public read). */",
  ],
  [
    "    // liveOnly はキーワード＋フライヤー画像ありで絞るため、十分な件数を先に取る",
    "    // liveOnly filters by keyword + flyer; fetch extra rows first",
  ],
];

const from = JSON.parse(fs.readFileSync(fromPath, "utf8"));
const toRaw = fs.readFileSync(toPath, "utf8").trimEnd().split("\n");
const to = toRaw.map((line) => (line === "__EMPTY__" ? "" : line));
if (from.length !== to.length) {
  console.error(`Length mismatch: from=${from.length} to=${to.length}`);
  process.exit(1);
}

const map = new Map();
for (const [a, b] of TOP_PAIRS) map.set(a, b);
for (let i = 0; i < from.length; i++) map.set(from[i], to[i]);

let s = fs.readFileSync(routesPath, "utf8");
const entries = [...map.entries()].sort((a, b) => b[0].length - a[0].length);
for (const [jp, en] of entries) {
  const n = s.split(jp).length - 1;
  if (n < 1) {
    console.error("Missing fragment:", JSON.stringify(jp).slice(0, 100));
    process.exit(1);
  }
  s = s.split(jp).join(en);
}
fs.writeFileSync(routesPath, s);
console.log("apply-routes-jp-en: ok", map.size, "keys");
