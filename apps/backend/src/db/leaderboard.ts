import type { PoolClient } from "pg";
import { pgPool, redisClient } from "./client";

export type LeaderboardEntry = {
  fid: number;
  username: string;
  walletAddress: string;
  score: number;
};

const LEADERBOARD_KEY = "flappycaster:leaderboard";

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  const cached = await redisClient.get(LEADERBOARD_KEY);
  if (cached) {
    return JSON.parse(cached) as LeaderboardEntry[];
  }

  const query = `
    SELECT u.fid, u.username, u.wallet_address as "walletAddress", s.score
    FROM scores s
    JOIN users u ON u.fid = s.user_fid
    JOIN contests c ON c.id = s.contest_id
    WHERE c.end_date > NOW() - INTERVAL '24 hours'
    ORDER BY s.score DESC
    LIMIT 100;
  `;
  const result = await pgPool.query<LeaderboardEntry>(query);
  await redisClient.set(LEADERBOARD_KEY, JSON.stringify(result.rows), { EX: 30 });
  return result.rows;
}

export async function recordScore(
  fid: number,
  score: number,
  contestId: number,
  client?: PoolClient
) {
  const runner = client ?? (await pgPool.connect());
  const release = client ? () => {} : () => runner.release();

  try {
    await runner.query("BEGIN");
    await runner.query(
      `INSERT INTO scores (user_fid, contest_id, score) VALUES ($1, $2, $3)`,
      [fid, contestId, score]
    );
    await runner.query("COMMIT");
    await redisClient.del(LEADERBOARD_KEY);
  } catch (error) {
    await runner.query("ROLLBACK");
    throw error;
  } finally {
    release();
  }
}
