import { Scalar } from "@scalar/hono-api-reference";


import packageJSON from "../../package.json" with { type: "json" };
import { AppOpenAPI } from "@/types";

export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: packageJSON.version,
      title: "Esnam API",
    },
  });

  app.get(
    "/reference",
    Scalar({
      theme: "deepSpace",
      layout: "modern",
      defaultHttpClient: {
        targetKey: "node",
        clientKey: "fetch",
      },
      url: "/doc",
    }),
  );
}
