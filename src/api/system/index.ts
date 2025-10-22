import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers";
import * as routes from "./routes";

const router = createRouter();

router.openapi(routes.healthCheck, handlers.healthCheck);
router.openapi(routes.getSupportedLanguages, handlers.getSupportedLanguages);
router.openapi(routes.getSystemLimits, handlers.getSystemLimits);

export default router;