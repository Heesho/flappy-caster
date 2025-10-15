import { Router } from "express";
import { getLeaderboard } from "../db/leaderboard";
import { redisClient } from "../db/client";

const router = Router();

router.get("/leaderboard", async (_req, res, next) => {
  try {
    const entries = await getLeaderboard();
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

router.get("/contest-info", async (_req, res, next) => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const prizePot = Number((await redisClient.get("flappycaster:prizePot")) ?? "125");
    const secondsRemaining = Number(
      (await redisClient.get("flappycaster:secondsRemaining")) ?? 60 * 60 * 24
    );
    res.json({ prizePot, secondsRemaining });
  } catch (error) {
    next(error);
  }
});

export default router;
