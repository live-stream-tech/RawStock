/** Copy for /upload and /upload/work (ja when preferredLanguage starts with "ja"). */

import { formatPostVideoMaxDuration } from "@/lib/formatVideoTime";

export type DailyUploadStrings = {
  publishAction: string;
  postAction: string;
  missingTextTitle: string;
  missingTextBody: string;
  selectCommunityTitle: string;
  selectCommunityBody: string;
  confirmationTitle: string;
  confirmationBody: string;
  uploadFailedTitle: string;
  uploadImageFailedBody: string;
  uploadVideoFailedBody: string;
  signInRequiredTitle: string;
  signInRequiredBody: string;
  postFailedTitle: string;
  postFailedBody: string;
  invalidContentTitle: string;
  invalidContentBody: string;
  errorTitle: string;
  permissionRequired: string;
  allowPhotos: string;
  allowVideos: string;
  fileLimit: string;
  loadFileFailed: string;
  browserFileTooLarge: string;
  videoWebTooLarge: string;
  maxItems: string;
  maxOneVideo: string;
  videoDurationLimit: string;
  headerTitle: string;
  switchToWork: string;
  limitHint: string;
  placeholder: string;
  postTo: string;
  myPageOnly: string;
  community: string;
  publishFromMyPosts: string;
  linkedConcert: (concertId: number) => string;
  guidelinesPrefix: string;
  guidelinesLink: string;
  rightsConfirm: string;
  postButton: string;
  publishModalTitle: string;
  cancel: string;
  thumbnailLabel: string;
  thumbnailChange: string;
  thumbnailOptional: string;
  imagesSectionLabel: string;
  imagesOptional: string;
  videoSectionLabel: string;
  videoReady: string;
  videoAddLabel: string;
  videoAddSub: string;
  videoPricingHint: string;
  videoPricingNeedsVideo: string;
  free: string;
  paid: string;
  telemetryTitle: string;
};

export type WorkUploadStrings = DailyUploadStrings & {
  missingPhotoTitle: string;
  missingPhotoBody: string;
  workHint: string;
  reviewSectionTitle: string;
  reviewSectionSub: string;
  reviewPlaceholder: string;
  reviewPhotosLabel: string;
  addPhotoRequired: string;
  videoSectionTitle: string;
  videoSectionSub: string;
  videoPricingHint: string;
  free: string;
  paid: string;
  switchToDaily: string;
};

const DAILY_EN: DailyUploadStrings = {
  publishAction: "publish",
  postAction: "post",
  missingTextTitle: "Missing text",
  missingTextBody: "Enter text.",
  selectCommunityTitle: "Select community",
  selectCommunityBody: "Select a community.",
  confirmationTitle: "Confirmation required",
  confirmationBody: "Review and accept Guidelines and rights before posting.",
  uploadFailedTitle: "Upload failed",
  uploadImageFailedBody: "Could not upload the image. Check your connection and try again.",
  uploadVideoFailedBody: "Could not upload the video. Check your connection and try again.",
  signInRequiredTitle: "Sign in required",
  signInRequiredBody: "Sign in is required to post.",
  postFailedTitle: "Post failed",
  postFailedBody: "Could not complete your post. Please try again.",
  invalidContentTitle: "Invalid content",
  invalidContentBody: "Please review your input.",
  errorTitle: "Error",
  permissionRequired: "Permission required",
  allowPhotos: "Allow media library access to select photos.",
  allowVideos: "Allow media library access to select videos.",
  fileLimit: "",
  loadFileFailed: "Could not load the file for upload.",
  browserFileTooLarge: "File is too large to process in the browser (limit: 4 GB).",
  videoWebTooLarge:
    "Video upload to storage failed. If this keeps happening, R2 CORS may need to be configured (see docs/R2-CORS.md). Try Light quality or a shorter clip.",
  maxItems: "",
  maxOneVideo: "Only one video can be added per post.",
  videoDurationLimit: "",
  headerTitle: "Daily Post",
  switchToWork: "Post Work",
  limitHint: "",
  placeholder: "What do you want to share now?",
  postTo: "Post To",
  myPageOnly: "My Page Only",
  community: "Community",
  publishFromMyPosts: "Publish from My posts",
  linkedConcert: (id) => `Linked Concert: ${id}`,
  guidelinesPrefix: "I have read and agree to follow the",
  guidelinesLink: "Community Guidelines",
  rightsConfirm:
    "I confirm I have the rights to post this content and it does not infringe others' intellectual property or privacy.",
  postButton: "Post",
  publishModalTitle: "Select a post to publish",
  cancel: "Cancel",
  thumbnailLabel: "Thumbnail",
  thumbnailChange: "Tap to change",
  thumbnailOptional: "Optional · for listings",
  imagesSectionLabel: "Images",
  imagesOptional: "Optional",
  videoSectionLabel: "Video",
  videoReady: "Video added",
  videoAddLabel: "Add Video",
  videoAddSub: "Optional · trim & compress in browser",
  videoPricingHint: "Video viewing price",
  videoPricingNeedsVideo: "Add a video above to set free or paid viewing.",
  free: "Free",
  paid: "Paid",
  telemetryTitle: "Daily post",
};

const DAILY_JA: DailyUploadStrings = {
  ...DAILY_EN,
  publishAction: "公開",
  postAction: "投稿",
  missingTextTitle: "本文が未入力です",
  missingTextBody: "テキストを入力してください。",
  selectCommunityTitle: "コミュニティを選択",
  selectCommunityBody: "コミュニティを選択してください。",
  confirmationTitle: "確認が必要です",
  confirmationBody: "投稿前にガイドラインと権利確認に同意してください。",
  uploadFailedTitle: "アップロードに失敗しました",
  uploadImageFailedBody: "画像をアップロードできませんでした。通信状況を確認して、もう一度お試しください。",
  uploadVideoFailedBody: "動画をアップロードできませんでした。通信状況を確認して、もう一度お試しください。",
  signInRequiredTitle: "サインインが必要です",
  signInRequiredBody: "投稿するにはサインインが必要です。",
  postFailedTitle: "投稿に失敗しました",
  postFailedBody: "投稿を完了できませんでした。もう一度お試しください。",
  invalidContentTitle: "内容を確認してください",
  invalidContentBody: "入力内容を見直してください。",
  errorTitle: "エラー",
  permissionRequired: "権限が必要です",
  allowPhotos: "写真を選択するにはメディアライブラリへのアクセスを許可してください。",
  allowVideos: "動画を選択するにはメディアライブラリへのアクセスを許可してください。",
  loadFileFailed: "アップロード用のファイルを読み込めませんでした。",
  browserFileTooLarge: "ブラウザで処理できる上限（4 GB）を超えています。",
  videoWebTooLarge:
    "ストレージへのアップロードに失敗しました。続く場合は R2 の CORS 設定が必要なことがあります（docs/R2-CORS.md）。「軽量」または短いクリップでお試しください。",
  maxOneVideo: "1回の投稿に追加できる動画は1本までです。",
  headerTitle: "日常投稿",
  switchToWork: "作品投稿",
  placeholder: "いま何をシェアしますか？",
  postTo: "投稿先",
  myPageOnly: "マイページのみ",
  community: "コミュニティ",
  publishFromMyPosts: "マイ投稿から公開",
  linkedConcert: (id) => `連携コンサート: ${id}`,
  guidelinesPrefix: "コミュニティガイドラインを読み、遵守することに同意します。",
  guidelinesLink: "コミュニティガイドライン",
  rightsConfirm:
    "このコンテンツを投稿する権利を有しており、他者の知的財産権やプライバシーを侵害しないことを確認します。",
  postButton: "投稿する",
  publishModalTitle: "公開する投稿を選択",
  cancel: "キャンセル",
  thumbnailLabel: "サムネイル",
  thumbnailChange: "タップして変更",
  thumbnailOptional: "任意 · 一覧用",
  imagesSectionLabel: "画像",
  imagesOptional: "任意",
  videoSectionLabel: "動画",
  videoReady: "動画を追加済み",
  videoAddLabel: "動画を追加",
  videoAddSub: "任意 · ブラウザでトリミング・圧縮",
  videoPricingHint: "動画の視聴料金",
  videoPricingNeedsVideo: "上で動画を追加すると、無料／有料を選べます。",
  free: "無料",
  paid: "有料",
  telemetryTitle: "日常投稿",
};

export function getDailyUploadStrings(isJaUi: boolean, limits: {
  maxMediaCount: number;
  maxVideoDurationSec: number;
  maxFileSizeMB: number;
}): DailyUploadStrings {
  const base = isJaUi ? DAILY_JA : DAILY_EN;
  const durLabel = formatPostVideoMaxDuration(limits.maxVideoDurationSec, isJaUi);
  if (isJaUi) {
    return {
      ...base,
      fileLimit: `ファイルは${limits.maxFileSizeMB}MB未満にしてください。`,
      maxItems: `1回の投稿に追加できるのは最大${limits.maxMediaCount}件までです。`,
      videoDurationLimit: `動画は${durLabel}以内にしてください。`,
      limitHint: `最大${limits.maxMediaCount}件、動画は1本まで（最長${durLabel} / 最大${limits.maxFileSizeMB}MB）。`,
    };
  }
  return {
    ...base,
    fileLimit: `File must be under ${limits.maxFileSizeMB}MB`,
    maxItems: `You can add up to ${limits.maxMediaCount} items per post.`,
    videoDurationLimit: `Video must be under ${durLabel}`,
    limitHint: `Up to ${limits.maxMediaCount} items, with at most 1 video (${durLabel} max / ${limits.maxFileSizeMB}MB max).`,
  };
}

const WORK_EN_EXTRA = {
  missingPhotoTitle: "Missing photo",
  missingPhotoBody: "Add at least one photo.",
  workHint: "Share a live review with text and photos. Optionally add a video for the rest — free or paid.",
  reviewSectionTitle: "Live review",
  reviewSectionSub: "Text and photos — free",
  reviewPlaceholder: "Write your live review (required)",
  reviewPhotosLabel: "Review photos",
  addPhotoRequired: "Add photo (required)",
  videoSectionTitle: "Continue on video",
  videoSectionSub: "Optional · free or paid",
  videoPricingHint: "Viewing price",
  videoPricingNeedsVideo: "Add a continuation video above to set free or paid viewing.",
  free: "Free",
  paid: "Paid",
  switchToDaily: "Daily Post",
};

const WORK_JA_EXTRA = {
  missingPhotoTitle: "写真が未追加です",
  missingPhotoBody: "写真を1枚以上追加してください。",
  workHint: "ライブの感想を文章と写真で投稿。続きは動画で見せることもできます（無料・有料）。",
  reviewSectionTitle: "ライブレビュー",
  reviewSectionSub: "文章と写真（無料）",
  reviewPlaceholder: "ライブの感想を書いてください（必須）",
  reviewPhotosLabel: "レビュー写真",
  addPhotoRequired: "写真を追加（必須）",
  videoSectionTitle: "続きを動画で",
  videoSectionSub: "任意 · 無料または有料で公開",
  videoPricingHint: "視聴料金",
  videoPricingNeedsVideo: "上で続きの動画を追加すると、無料／有料を選べます。",
  free: "無料",
  paid: "有料",
  switchToDaily: "日常投稿",
};

export function getWorkUploadStrings(
  isJaUi: boolean,
  limits: { maxFileSizeMB: number; maxVideoDurationSec: number },
): WorkUploadStrings {
  const durLabel = formatPostVideoMaxDuration(limits.maxVideoDurationSec, isJaUi);
  const daily = getDailyUploadStrings(isJaUi, {
    maxMediaCount: 99,
    maxVideoDurationSec: limits.maxVideoDurationSec,
    maxFileSizeMB: limits.maxFileSizeMB,
  });
  const extra = isJaUi ? WORK_JA_EXTRA : WORK_EN_EXTRA;
  return {
    ...daily,
    ...extra,
    headerTitle: isJaUi ? "作品投稿" : "Post Work",
    limitHint: isJaUi
      ? `画像・動画は1ファイルあたり最大${limits.maxFileSizeMB}MB、動画は最長${durLabel}です。`
      : `File size limit: ${limits.maxFileSizeMB}MB per image/video. Videos up to ${durLabel}.`,
    telemetryTitle: isJaUi ? "作品投稿" : "Work post",
  };
}
