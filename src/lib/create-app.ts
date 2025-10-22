import { OpenAPIHono } from "@hono/zod-openapi";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";

import { AppEnv, AppRouter } from "@/types";
import { pinoLogger } from "@/middleware/pino-logger";


export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const app = createRouter();
  app.use(serveEmojiFavicon("🚀"));
  app.use(pinoLogger());

  app.notFound(notFound);
  app.onError(onError);
  return app;
}

export function createTestApp<R extends AppRouter>(router: R) {
  return createApp().route("/", router);
}

