import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers";
import * as routes from "./routes";

const router = createRouter();

router.openapi(routes.startAnalysis, handlers.startAnalysis);
router.openapi(routes.getAnalysisResults, handlers.getAnalysisResults);
router.openapi(routes.exportAnalysis, handlers.exportAnalysis);

export default router;