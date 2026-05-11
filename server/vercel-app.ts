import "dotenv/config";
import "./aws-sdk-env";
import express from "express";
import type { NextFunction, Request, Response } from "express";
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
  LP_APP_ORIGIN_PLACEHOLDER,
} from "../lib/brand";

function canonicalAppOriginFromReq(req: Request): string {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host") || "rawstock.live";
  return `${protocol}://${host}`;
}

function injectLpMarketingHtml(html: string, canonicalUrl: string, req: Request): string {
  const appOrigin = canonicalAppOriginFromReq(req);
  let out = html
    .split(RAWSTOCK_LOGO_URL_PLACEHOLDER).join(RAWSTOCK_LOGO_URL)
    .split(RAWSTOCK_HERO_VIDEO_URL_PLACEHOLDER).join(RAWSTOCK_HERO_VIDEO_URL)
    .split(RAWSTOCK_HERO_POSTER_URL_PLACEHOLDER).join(RAWSTOCK_HERO_POSTER_URL)
    .split(LP_CANONICAL_URL_PLACEHOLDER).join(canonicalUrl)
    .split(LP_APP_ORIGIN_PLACEHOLDER).join(appOrigin)
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

const LP_HTML_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";

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
  const lpStandalonePath = path.resolve(process.cwd(), "public/lp-standalone.html");
  const lpViteRoot = path.resolve(process.cwd(), "dist", "lp");
  const lpViteIndex = path.join(lpViteRoot, "index.html");
  const hasLpViteApp = fs.existsSync(lpViteIndex);

  function serveLpStandalone(req: Request, res: Response, canonicalPath: string) {
    if (!fs.existsSync(lpStandalonePath)) {
      return res.status(404).send("lp-standalone.html not found");
    }
    const raw = fs.readFileSync(lpStandalonePath, "utf-8");
    const html = injectLpMarketingHtml(raw, canonicalPageUrlFromReq(req, canonicalPath), req);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", LP_HTML_CACHE_CONTROL);
    return res.status(200).send(html);
  }

  if (hasLpViteApp) {
    app.use(
      "/lp",
      express.static(lpViteRoot, {
        index: "index.html",
        setHeaders(res, filePath) {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", LP_HTML_CACHE_CONTROL);
          }
        },
      }),
    );
    app.use("/lp", (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      res.setHeader("Cache-Control", LP_HTML_CACHE_CONTROL);
      return res.sendFile(path.join(lpViteRoot, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }

  /** `/lp` — without Vite build, serve standalone HTML (no redirect). */
  if (!hasLpViteApp) {
    app.get("/lp", (req: Request, res: Response) => {
      return serveLpStandalone(req, res, "/lp");
    });
  }

  // Canonicalize legacy LP paths to `/lp` so only one source is visible.
  app.get("/lp-standalone.html", (req: Request, res: Response) => {
    return res.redirect(302, "/lp");
  });
  app.get("/lp-static", (req: Request, res: Response) => {
    return res.redirect(302, "/lp");
  });

  const teamzPath = path.resolve(process.cwd(), "public/teamz.html");
  app.get("/teamz", (req: Request, res: Response) => {
    if (!fs.existsSync(teamzPath)) {
      return res.status(404).send("teamz.html not found");
    }
    const raw = fs.readFileSync(teamzPath, "utf-8");
    const html = injectLpMarketingHtml(raw, canonicalPageUrlFromReq(req, "/teamz"), req);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", LP_HTML_CACHE_CONTROL);
    res.status(200).send(html);
  });

  await registerRoutes(app);

  setupErrorHandler(app);

  appCache = app;
  return app;
}
