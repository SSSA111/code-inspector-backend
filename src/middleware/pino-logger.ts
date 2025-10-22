import { pinoLogger as logger } from "hono-pino";
import pino from "pino";
import pretty from "pino-pretty";


export function pinoLogger() {
  // Map the environment to a proper log level
  let logLevel = "info"; // Default level
  
  if (process.env?.Environment) {
    // Map environment values to valid log levels
    switch (process.env.Environment) {
      case "development":
        logLevel = "debug";
        break;
      case "test":
        logLevel = "warn";
        break;
      case "production":
        logLevel = "info";
        break;
      default:
        logLevel = "info";
    }
  }
  
  return logger({
    pino: pino(
      {
        transport: {
          target: "pino/file",
          options: {
            destination: "./logs/app.log",
          },
        },
        level: logLevel, // Use the mapped level
      },
      process.env.Environment === "production" ? undefined : pretty(),
    ),
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
}