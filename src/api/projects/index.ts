import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers";
import * as routes from "./routes";

const router = createRouter();

router.openapi(routes.listProjects, handlers.listProjects);
router.openapi(routes.createProject, handlers.createProject);
router.openapi(routes.getProject, handlers.getProject);
router.openapi(routes.updateProject, handlers.updateProject);
router.openapi(routes.deleteProject, handlers.deleteProject);
router.openapi(routes.getProjectHistory, handlers.getProjectHistory);

export default router;