import { Pool } from "pg";
import Redis from "redis";
import { config } from "../config";

export const pgPool = new Pool({ connectionString: config.databaseUrl });

export const redisClient = Redis.createClient({ url: config.redisUrl });

redisClient.on("error", (err) => {
  console.error("Redis error", err);
});

export async function initConnections() {
  await pgPool.query("SELECT 1");
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function closeConnections() {
  await pgPool.end();
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
}
