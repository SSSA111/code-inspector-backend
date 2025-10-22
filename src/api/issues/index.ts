import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers";
import * as routes from "./routes";

const router = createRouter();

router.openapi(routes.listIssues, handlers.listIssues);
router.openapi(routes.getIssue, handlers.getIssue);
router.openapi(routes.resolveIssue, handlers.resolveIssue);
router.openapi(routes.markFalsePositive, handlers.markFalsePositive);
router.openapi(routes.bulkUpdateIssues, handlers.bulkUpdateIssues);
router.openapi(routes.getIssueStats, handlers.getIssueStats);

export default router;