import { Router } from "express";
import { pgPool } from "../db/client";
import { recordScore } from "../db/leaderboard";

const router = Router();

router.post("/score", async (req, res, next) => {
  const { fid, score } = req.body as { fid?: number; score?: number };
  if (!fid || typeof score !== "number") {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }

  try {
    const contest = await pgPool.query<{ id: number }>(
      `SELECT id FROM contests WHERE NOW() BETWEEN start_date AND end_date ORDER BY id DESC LIMIT 1`
    );

    if (!contest.rows[0]) {
      res.status(404).json({ message: "Active contest not found" });
      return;
    }

    await recordScore(fid, score, contest.rows[0].id);
    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

export default router;
