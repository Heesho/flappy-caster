import { createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import LeaderboardAbi from "../viem/Leaderboard.abi.json" assert { type: "json" };
import { config } from "../config";
import { pgPool, redisClient } from "../db/client";

const adminAccount = privateKeyToAccount(config.viem.adminPrivateKey as `0x${string}`);

const walletClient = createWalletClient({
  chain: { ...base, id: config.viem.chainId },
  transport: http(config.viem.rpcUrl),
  account: adminAccount
});

export async function settleContest() {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    const leaderboard = await client.query<{
      wallet_address: string;
      score: number;
    }>(
      `SELECT u.wallet_address, s.score
       FROM scores s
       JOIN users u ON u.fid = s.user_fid
       JOIN contests c ON c.id = s.contest_id
       WHERE c.end_date < NOW() AND c.payout_tx_hash IS NULL
       ORDER BY c.end_date DESC, s.score DESC
       LIMIT 3`
    );

    if (leaderboard.rows.length < 3) {
      await client.query("ROLLBACK");
      return { status: "skipped", reason: "Not enough winners" } as const;
    }

    const winners = leaderboard.rows.map((row) => row.wallet_address as Address);
    const prizePercents = [50, 30, 20];

    const txHash = await walletClient.writeContract({
      address: config.viem.contractAddress as Address,
      abi: LeaderboardAbi,
      functionName: "settleContest",
      args: [winners, prizePercents]
    });

    await client.query(
      `UPDATE contests SET payout_tx_hash = $1 WHERE end_date < NOW() AND payout_tx_hash IS NULL`,
      [txHash]
    );
    await client.query("COMMIT");

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await redisClient.del("flappycaster:leaderboard");

    return { status: "ok", txHash } as const;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
