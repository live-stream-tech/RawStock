import "dotenv/config";
import "./aws-sdk-env";
import express from "express";
import type { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import {
  setupCors,
  setupBodyParsing,
  setupRequestLogging,
  setupErrorHandler,
} from "./middleware";
import { registerRoutes } from "./routes";
import {
  LP_CANONICAL_URL_PLACEHOLDER,
  RAWSTOCK_HERO_POSTER_URL,
  RAWSTOCK_HERO_POSTER_URL_PLACEHOLDER,
  RAWSTOCK_HERO_VIDEO_URL,
  RAWSTOCK_HERO_VIDEO_URL_PLACEHOLDER,
  RAWSTOCK_LOGO_URL,
  RAWSTOCK_LOGO_URL_PLACEHOLDER,
  RAWSTOCK_LP_FEATURE_IMG_AI_PLACEHOLDER,
  RAWSTOCK_LP_FEATURE_IMG_DISTRICT_PLACEHOLDER,
  RAWSTOCK_LP_FEATURE_IMG_GLOBAL_PLACEHOLDER,
  RAWSTOCK_LP_FEATURE_IMG_JUKE_PLACEHOLDER,
  RAWSTOCK_LP_FEATURE_IMG_LIVE_PLACEHOLDER,
  RAWSTOCK_LP_FEATURE_IMG_AI,
  RAWSTOCK_LP_FEATURE_IMG_DISTRICT,
  RAWSTOCK_LP_FEATURE_IMG_GLOBAL,
  RAWSTOCK_LP_FEATURE_IMG_JUKE,
  RAWSTOCK_LP_FEATURE_IMG_LIVE,
  RAWSTOCK_LP_STEP_IMG_EDIT,
  RAWSTOCK_LP_STEP_IMG_EDIT_PLACEHOLDER,
  RAWSTOCK_LP_STEP_IMG_PROMO,
  RAWSTOCK_LP_STEP_IMG_PROMO_PLACEHOLDER,
  RAWSTOCK_LP_STEP_IMG_SELL,
  RAWSTOCK_LP_STEP_IMG_SELL_PLACEHOLDER,
  RAWSTOCK_LP_STEP_IMG_SHOOT,
  RAWSTOCK_LP_STEP_IMG_SHOOT_PLACEHOLDER,
} from "../lib/brand";

function injectLpMarketingHtml(html: string, canonicalUrl: string): string {
  let out = html
    .split(RAWSTOCK_LOGO_URL_PLACEHOLDER).join(RAWSTOCK_LOGO_URL)
    .split(RAWSTOCK_HERO_VIDEO_URL_PLACEHOLDER).join(RAWSTOCK_HERO_VIDEO_URL)
    .split(RAWSTOCK_HERO_POSTER_URL_PLACEHOLDER).join(RAWSTOCK_HERO_POSTER_URL)
    .split(LP_CANONICAL_URL_PLACEHOLDER).join(canonicalUrl)
    .split(RAWSTOCK_LP_STEP_IMG_SHOOT_PLACEHOLDER).join(RAWSTOCK_LP_STEP_IMG_SHOOT)
    .split(RAWSTOCK_LP_STEP_IMG_EDIT_PLACEHOLDER).join(RAWSTOCK_LP_STEP_IMG_EDIT)
    .split(RAWSTOCK_LP_STEP_IMG_SELL_PLACEHOLDER).join(RAWSTOCK_LP_STEP_IMG_SELL)
    .split(RAWSTOCK_LP_STEP_IMG_PROMO_PLACEHOLDER).join(RAWSTOCK_LP_STEP_IMG_PROMO)
    .split(RAWSTOCK_LP_FEATURE_IMG_JUKE_PLACEHOLDER).join(RAWSTOCK_LP_FEATURE_IMG_JUKE)
    .split(RAWSTOCK_LP_FEATURE_IMG_AI_PLACEHOLDER).join(RAWSTOCK_LP_FEATURE_IMG_AI)
    .split(RAWSTOCK_LP_FEATURE_IMG_DISTRICT_PLACEHOLDER).join(RAWSTOCK_LP_FEATURE_IMG_DISTRICT)
    .split(RAWSTOCK_LP_FEATURE_IMG_LIVE_PLACEHOLDER).join(RAWSTOCK_LP_FEATURE_IMG_LIVE)
    .split(RAWSTOCK_LP_FEATURE_IMG_GLOBAL_PLACEHOLDER).join(RAWSTOCK_LP_FEATURE_IMG_GLOBAL);

  const weglotKey = process.env.WEGLOT_API_KEY?.trim();
  if (weglotKey) {
    out = out.replace(
      "<!--WEGLOT_INJECT-->",
      `<script type="text/javascript" src="https://cdn.weglot.com/weglot.min.js"></script><script>Weglot.initialize({ api_key: ${JSON.stringify(weglotKey)} });</script>`,
    );
  } else {
    out = out.replace("<!--WEGLOT_INJECT-->", "");
  }
  return out;
}

function canonicalPageUrlFromReq(req: Request, pathname: string): string {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host") || "rawstock.live";
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${protocol}://${host}${p}`;
}

let appCache: express.Application | null = null;

export async function createApiApp(): Promise<express.Application> {
  if (appCache) return appCache;

  const app = express();

  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  app.get("/healthcheck", (_req, res) => res.status(200).send("OK"));
  app.get("/api/healthcheck", (_req, res) => res.status(200).send("OK"));

  app.get("/lp", (req: Request, res: Response) => {
    try {
      const templatePath = path.resolve(process.cwd(), "server/templates/landing-page.html");
      const raw = fs.readFileSync(templatePath, "utf-8");
      const html = injectLpMarketingHtml(raw, canonicalPageUrlFromReq(req, "/lp"));
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(html);
    } catch (e) {
      res.status(500).send("Landing page template not found");
    }
  });

  const lpStandalonePath = path.resolve(process.cwd(), "public/lp-standalone.html");
  app.get("/lp-standalone.html", (req: Request, res: Response) => {
    if (!fs.existsSync(lpStandalonePath)) {
      return res.status(404).send("lp-standalone.html not found");
    }
    const raw = fs.readFileSync(lpStandalonePath, "utf-8");
    const html = injectLpMarketingHtml(raw, canonicalPageUrlFromReq(req, "/lp-standalone.html"));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  const teamzPath = path.resolve(process.cwd(), "public/teamz.html");
  app.get("/teamz", (req: Request, res: Response) => {
    if (!fs.existsSync(teamzPath)) {
      return res.status(404).send("teamz.html not found");
    }
    const raw = fs.readFileSync(teamzPath, "utf-8");
    const html = injectLpMarketingHtml(raw, canonicalPageUrlFromReq(req, "/teamz"));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  await registerRoutes(app);

  setupErrorHandler(app);

  appCache = app;
  return app;
}
