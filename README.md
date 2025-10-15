# FlappyCaster

FlappyCaster is a Farcaster miniapp concept that combines an endless runner arcade game with a daily on-chain prize pool. The project is structured as a monorepo with distinct frontend, backend, and smart contract packages to mirror the production architecture described in the technical specification.

## Project Layout

```
.
├── apps
│   ├── backend        # Express + TypeScript API with PostgreSQL/Redis integrations
│   └── frontend       # Next.js 14 App Router client with Phaser-powered gameplay
├── contracts          # Solidity smart contracts (LeaderBoard.sol)
├── scripts            # Utility scripts (placeholders)
├── package.json       # pnpm workspace manifest
└── tsconfig.base.json # Shared TypeScript configuration
```

### Frontend (apps/frontend)
* **Framework:** Next.js 14 (App Router) with TypeScript.
* **Game Engine:** Phaser 3 rendered inside a fullscreen overlay when a run starts.
* **Styling:** Tailwind CSS with custom branding tokens for the neon aesthetic.
* **Features:**
  * Lobby experience with looping gameplay video, responsive layout, and tabbed navigation.
  * Payment simulation modal and transaction state messaging for paid runs.
  * Dynamic leaderboard, payout projections, countdown timer, and user stats mock data.

### Backend (apps/backend)
* **Framework:** Express.js with TypeScript and modular routing.
* **Data Stores:** PostgreSQL for persistence and Redis for the real-time leaderboard cache.
* **Web3 Integration:** Viem wallet client configured for Base mainnet to trigger `settleContest`.
* **Scheduled Jobs:** `node-cron` daily job to finalize the leaderboard and distribute prizes.
* **Environment:** `.env.example` provided with all required configuration variables.

### Smart Contract (contracts/LeaderBoard.sol)
* Handles credit purchases, treasury fee routing, prize pool accounting, and daily settlements.
* Supports admin configuration for treasury, fee percentages, and credit pricing.
* Emits rich events for off-chain indexing.

## Getting Started

> **Note:** Dependencies are defined for use with **pnpm** workspaces.

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the frontend:
   ```bash
   pnpm dev:frontend
   ```

3. Run the backend API (requires PostgreSQL and Redis instances):
   ```bash
   cd apps/backend
   cp .env.example .env
   pnpm dev
   ```

4. Deploy the smart contract using your preferred toolchain (Hardhat, Foundry, etc.) and configure the backend `.env` values (`CONTRACT_ADDRESS`, `ADMIN_PRIVATE_KEY`, etc.).

## Database Schema

The PostgreSQL schema required by the backend lives at `apps/backend/src/db/schema.sql`. It mirrors the specification's user, contest, score, and payout tables.

## Scripts & Tooling

* **Formatting:** `pnpm format`
* **Linting:** `pnpm lint`
* **Build:** `pnpm build`

## License

This repository is provided for demonstration purposes and does not include production secrets or deployment assets.
