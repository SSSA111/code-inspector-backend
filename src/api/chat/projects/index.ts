import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers";
import * as routes from "./routes";

const router = createRouter();

router.openapi(routes.getMessages, handlers.getMessages);
router.openapi(routes.sendMessage, handlers.sendMessage);
router.openapi(routes.clearMessages, handlers.clearMessages);

export default router;