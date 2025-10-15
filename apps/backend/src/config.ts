import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/flappycaster",
  viem: {
    rpcUrl: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    contractAddress: process.env.CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000",
    adminPrivateKey: process.env.ADMIN_PRIVATE_KEY ?? "0x0123456789abcdef",
    chainId: Number(process.env.CHAIN_ID ?? 8453)
  }
} as const;
