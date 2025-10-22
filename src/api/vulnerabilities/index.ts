import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers";
import * as routes from "./routes";

const router = createRouter();

router.openapi(routes.listVulnerabilities, handlers.listVulnerabilities);
router.openapi(routes.createVulnerability, handlers.createVulnerability);
router.openapi(routes.getVulnerability, handlers.getVulnerability);
router.openapi(routes.updateVulnerability, handlers.updateVulnerability);
router.openapi(routes.deleteVulnerability, handlers.deleteVulnerability);
router.openapi(routes.searchVulnerabilities, handlers.searchVulnerabilities);
router.openapi(routes.seedVulnerabilities, handlers.seedVulnerabilities);

export default router;