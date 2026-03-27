import "dotenv/config";
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

const app = express();
const log = console.log;

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

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
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
    const expoDevPort = parseInt(process.env.EXPO_PORT || "8080", 10);
    log(`Dev mode: proxying web requests to Expo dev server on port ${expoDevPort}`);

    const expoProxy = createProxyMiddleware({
      target: `http://[::1]:${expoDevPort}`,
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

  const port = parseInt(process.env.PORT || "5000", 10);
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
