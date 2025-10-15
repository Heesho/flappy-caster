import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cron from "node-cron";
import leaderboardRoutes from "./routes/leaderboard";
import scoreRoutes from "./routes/scores";
import userRoutes from "./routes/users";
import { config } from "./config";
import { initConnections } from "./db/client";
import { settleContest } from "./services/settlement";

const app = express();

app.use(helmet());
app.use(morgan("tiny"));
app.use(express.json());

app.use("/api", leaderboardRoutes);
app.use("/api", scoreRoutes);
app.use("/api", userRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

async function bootstrap() {
  await initConnections();
  app.listen(config.port, () => {
    console.log(`Backend listening on port ${config.port}`);
  });

  cron.schedule("0 0 * * *", async () => {
    try {
      const result = await settleContest();
      console.log("Daily settlement", result);
    } catch (error) {
      console.error("Settlement failed", error);
    }
  });
}

void bootstrap();
