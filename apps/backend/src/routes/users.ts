import { Router } from "express";
import { pgPool } from "../db/client";

const router = Router();

router.get("/user/:fid/stats", async (req, res, next) => {
  const fid = Number(req.params.fid);
  if (!fid) {
    res.status(400).json({ message: "Invalid Farcaster ID" });
    return;
  }

  try {
    const result = await pgPool.query(
      `SELECT
          u.fid,
          u.username,
          u.wallet_address as "walletAddress",
          COALESCE(SUM(s.score), 0) as "totalScore",
          COALESCE(SUM(p.amount), 0) as "totalWinnings"
        FROM users u
        LEFT JOIN scores s ON s.user_fid = u.fid
        LEFT JOIN payouts p ON p.user_fid = u.fid
        WHERE u.fid = $1
        GROUP BY u.fid, u.username, u.wallet_address`,
      [fid]
    );

    if (!result.rows[0]) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
