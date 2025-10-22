import createApp from "./lib/create-app";
import { cors } from "hono/cors";
import configureOpenAPI from "./lib/configure-open-api";
import apiKeysRouter from "./api/keys";
import projectsRouter from "./api/projects";
import analysisRouter from "./api/analysis";
import issuesRouter from "./api/issues";
import chatRouter from "./api/chat/projects";
import systemRouter from "./api/system";
import vulnerabilitiesRouter from "./api/vulnerabilities";

// Initialize the app
const app = createApp();

// Apply CORS middleware
app.use(
  "*",
  cors({
    origin: "*", // Specific origin, not array
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie", "X-API-KEY"],
    exposeHeaders: ["Set-Cookie"],
  })
);
configureOpenAPI(app);

app.route("/api/keys", apiKeysRouter);
app.route("/api/projects", projectsRouter);
app.route("/api/analysis", analysisRouter);
app.route("/api/issues", issuesRouter);
app.route("/api/chat/projects", chatRouter);
app.route("/api/system", systemRouter);
app.route("/api/vulnerabilities", vulnerabilitiesRouter);


app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
