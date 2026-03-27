/** 日常投稿の1件あたりの制限 */
export const DAILY_POST_LIMITS = {
  /** メディア最大数（写真+動画合計） */
  maxMediaCount: 3,
  /** 動画は1本まで */
  maxVideoCount: 1,
  /** 1ファイル最大サイズ（MB） */
  maxFileSizeMB: 50,
  /** 動画最大長（秒） */
  maxVideoDurationSec: 60,
  /** テキスト最大文字数 */
  maxTextLength: 500,
} as const;
