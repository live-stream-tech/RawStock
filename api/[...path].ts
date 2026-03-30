/**
 * Vercel Serverless: /api/:path+ を Express API に転送する。
 * Vercel サーバーレス関数形式: export default (VercelRequest, VercelResponse)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getApp, normalizeReqUrl } from "./_shared";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  normalizeReqUrl(req);
  const app = await getApp();
  app(req, res);
}
