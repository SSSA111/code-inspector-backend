import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers";
import * as routes from "./routes";

const router = createRouter();

router.openapi(routes.generateApiKey, handlers.generateApiKey);
router.openapi(routes.listApiKeys, handlers.listApiKeys);
router.openapi(routes.deleteApiKey, handlers.deleteApiKey);

export default router;