/**
 * AWS SDK for JavaScript v3 は既定で PutObject 等に CRC 系チェックサムを付与する。
 * ブラウザからの presigned PUT（fetch + File）はクエリ／ヘッダを付けられず失敗し、
 * 応答に CORS ヘッダが無い場合は「CORS でブロック」と表示される。
 *
 * @see https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html
 */
if (!process.env.AWS_REQUEST_CHECKSUM_CALCULATION) {
  process.env.AWS_REQUEST_CHECKSUM_CALCULATION = "WHEN_REQUIRED";
}
if (!process.env.AWS_RESPONSE_CHECKSUM_VALIDATION) {
  process.env.AWS_RESPONSE_CHECKSUM_VALIDATION = "WHEN_REQUIRED";
}
