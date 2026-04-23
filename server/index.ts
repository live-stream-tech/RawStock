import "dotenv/config";
import "./aws-sdk-env";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer } from "node:http";
import { registerRoutes } from "./routes";
import {
  setupCors,
  setupBodyParsing,
  setupRequestLogging,
  setupErrorHandler,
} from "./middleware";
import * as fs from "fs";
import * as path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";
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

const app = express();
const log = console.log;

const LP_HTML_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";

function canonicalAppOriginFromReq(req: Request): string {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host") || "localhost";
  return `${protocol}://${host}`;
}

function injectLpMarketingHtml(html: string, canonicalUrl: string, req: Request): string {
  const appOrigin = canonicalAppOriginFromReq(req);
  let out = html
    .split(RAWSTOCK_LOGO_URL_PLACEHOLDER)
    .join(RAWSTOCK_LOGO_URL)
    .split(RAWSTOCK_HERO_VIDEO_URL_PLACEHOLDER)
    .join(RAWSTOCK_HERO_VIDEO_URL)
    .split(RAWSTOCK_HERO_POSTER_URL_PLACEHOLDER)
    .join(RAWSTOCK_HERO_POSTER_URL)
    .split(LP_CANONICAL_URL_PLACEHOLDER)
    .join(canonicalUrl)
    .split(LP_APP_ORIGIN_PLACEHOLDER)
    .join(appOrigin)
    .split(RAWSTOCK_LP_STEP_IMG_SHOOT_PLACEHOLDER)
    .join(RAWSTOCK_LP_STEP_IMG_SHOOT)
    .split(RAWSTOCK_LP_STEP_IMG_EDIT_PLACEHOLDER)
    .join(RAWSTOCK_LP_STEP_IMG_EDIT)
    .split(RAWSTOCK_LP_STEP_IMG_SELL_PLACEHOLDER)
    .join(RAWSTOCK_LP_STEP_IMG_SELL)
    .split(RAWSTOCK_LP_STEP_IMG_PROMO_PLACEHOLDER)
    .join(RAWSTOCK_LP_STEP_IMG_PROMO)
    .split(RAWSTOCK_LP_FEATURE_IMG_JUKE_PLACEHOLDER)
    .join(RAWSTOCK_LP_FEATURE_IMG_JUKE)
    .split(RAWSTOCK_LP_FEATURE_IMG_AI_PLACEHOLDER)
    .join(RAWSTOCK_LP_FEATURE_IMG_AI)
    .split(RAWSTOCK_LP_FEATURE_IMG_DISTRICT_PLACEHOLDER)
    .join(RAWSTOCK_LP_FEATURE_IMG_DISTRICT)
    .split(RAWSTOCK_LP_FEATURE_IMG_LIVE_PLACEHOLDER)
    .join(RAWSTOCK_LP_FEATURE_IMG_LIVE)
    .split(RAWSTOCK_LP_FEATURE_IMG_GLOBAL_PLACEHOLDER)
    .join(RAWSTOCK_LP_FEATURE_IMG_GLOBAL);

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
  const host = forwardedHost || req.get("host") || "localhost";
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${protocol}://${host}${path}`;
}

app.get("/healthcheck", (_req, res) => res.status(200).send("OK"));
app.get("/api/healthcheck", (_req, res) => res.status(200).send("OK"));

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const isDev = process.env.NODE_ENV === "development";

  log("Serving static Expo files with dynamic manifest routing");

  const lpStandalonePath = path.resolve(process.cwd(), "public/lp-standalone.html");
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

  /** `/lp` は常にこのHTMLを直接返す（別URLへリダイレクトしない） */
  app.get("/lp", (req: Request, res: Response) => {
    return serveLpStandalone(req, res, "/lp");
  });

  // 互換パス（内容は同一）
  app.get("/lp-standalone.html", (req: Request, res: Response) => {
    return serveLpStandalone(req, res, "/lp");
  });
  app.get("/lp-static", (req: Request, res: Response) => {
    return serveLpStandalone(req, res, "/lp");
  });

  const teamzPath = path.resolve(process.cwd(), "public/teamz.html");
  app.get("/teamz", (req: Request, res: Response) => {
    if (!fs.existsSync(teamzPath)) {
      return res.status(404).send("teamz.html not found");
    }
    const raw = fs.readFileSync(teamzPath, "utf-8");
    const html = injectLpMarketingHtml(
      raw,
      canonicalPageUrlFromReq(req, "/teamz"),
      req,
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", LP_HTML_CACHE_CONTROL);
    res.status(200).send(html);
  });

  // Serve logo asset for the landing page
  app.get("/assets/logo-200x70-v2.png", (_req: Request, res: Response) => {
    const logoPath = path.resolve(process.cwd(), "assets/logo-200x70-v2.png");
    res.sendFile(logoPath);
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    // Skip Expo manifest for LP / static marketing HTML
    if (
      req.path === "/lp" ||
      req.path === "/teamz" ||
      req.path === "/lp-static" ||
      req.path === "/lp-standalone.html"
    ) {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      if (req.path === "/" || req.path === "/manifest") {
        return serveExpoManifest(platform, res);
      }
    }

    next();
  });

  if (isDev) {
    // Metro のデフォルトは環境により 8081 になりやすい（8080 占有時など）。`EXPO_PORT` で上書き可。
    const expoDevPort = parseInt(process.env.EXPO_PORT || "8081", 10);
    log(`Dev mode: proxying web requests to Expo dev server on port ${expoDevPort}`);

    const expoProxy = createProxyMiddleware({
      // Metro は 127.0.0.1 のみ LISTEN することが多く、::1 へプロキシすると 502 になる
      target: `http://127.0.0.1:${expoDevPort}`,
      changeOrigin: true,
      ws: true,
      on: {
        proxyReq: (proxyReq: any) => {
          proxyReq.removeHeader("origin");
          proxyReq.removeHeader("referer");
        },
        error: (_err: unknown, _req: unknown, res: unknown) => {
          const r = res as Response;
          if (r && typeof r.status === "function") {
            r.status(502).send("Expo dev server not ready yet. Please wait a moment and refresh.");
          }
        },
      },
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) return next();
      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) return next();
      return (expoProxy as express.RequestHandler)(req, res, next);
    });
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      log(`Serving Expo web export from: ${distPath}`);
      app.use(express.static(distPath));
      app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith("/api")) return next();
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          next();
        }
      });
    } else {
      log("WARNING: dist/ directory not found. Run 'npx expo export --platform web' to build.");
      app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith("/api")) return next();
        res.status(404).send("Web app not built. Please run the build command.");
      });
    }
  }

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  await registerRoutes(app);

  setupErrorHandler(app);

  // Default 5001: macOS AirPlay Receiver often binds :5000 (Control Center).
  const port = parseInt(process.env.PORT || "5001", 10);
  const server = createServer(app);
  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
