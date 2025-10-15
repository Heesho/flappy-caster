"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type PhaserNamespace from "phaser";
import { Button } from "../components/ui/button";
import { formatCountdown, formatCurrency } from "../lib/utils";

const SAMPLE_LEADERBOARD = [
  { fid: 1, username: "@dwr.eth", walletAddress: "0x1234...abcd", score: 15430 },
  { fid: 2, username: "@fuzzhead.eth", walletAddress: "0xUSER...ADDR", score: 12100 },
  { fid: 3, username: "@gako", walletAddress: "0x9abc...ijkl", score: 11500 },
  { fid: 4, username: "@linda", walletAddress: "0xdef0...mnop", score: 9800 },
  { fid: 5, username: "@v.eth", walletAddress: "0xgh12...qrst", score: 8500 },
  { fid: 6, username: "@cameron", walletAddress: "0xjk34...uvwx", score: 7200 },
  { fid: 7, username: "@dave", walletAddress: "0xlm56...yzab", score: 6100 }
];

type LeaderboardEntry = (typeof SAMPLE_LEADERBOARD)[number];

type ActiveTab = "play" | "stats" | "notifications";

type GameState = "idle" | "starting" | "running" | "complete";

const DAILY_PAYOUT_SPLITS = [0.5, 0.3, 0.2];

function useCountdown(initialSeconds: number) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    setSecondsRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return secondsRemaining;
}

function computePayout(rank: number, totalPot: number) {
  const split = DAILY_PAYOUT_SPLITS[rank - 1];
  return split ? totalPot * split : 0;
}

function requestFullscreen(element: HTMLElement | null) {
  if (!element) return;
  if (document.fullscreenElement) return;

  const request =
    element.requestFullscreen ||
    (element as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen;

  if (request) {
    void request.call(element);
  }
}

function exitFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  }
}

type GameViewportProps = {
  isActive: boolean;
  onGameOver: (score: number) => void;
};

function GameViewport({ isActive, onGameOver }: GameViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<PhaserNamespace.Game | null>(null);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  useEffect(() => {
    let cancelled = false;

    if (!isActive || !containerRef.current) {
      return () => {};
    }

    let resizeHandler: (() => void) | null = null;

    (async () => {
      const Phaser = await import("phaser");

      class RunnerScene extends Phaser.Scene {
        private laneCount = 3;
        private laneWidth = 0;
        private player!: Phaser.GameObjects.Arc;
        private playerLane = 1;
        private obstacles!: Phaser.GameObjects.Group;
        private speed = 250;
        private spawnTimer = 0;
        private score = 0;
        private scoreText!: Phaser.GameObjects.Text;
        private isOver = false;

        constructor() {
          super("runner");
        }

        create() {
          const { width, height } = this.scale;
          this.laneWidth = width / this.laneCount;

          this.cameras.main.setBackgroundColor("#0f172a");

          this.scoreText = this.add
            .text(width / 2, 24, "0", {
              fontFamily: "VT323",
              fontSize: "32px",
              color: "#ffffff"
            })
            .setOrigin(0.5, 0);

          this.player = this.add.circle(width / 2, height - 80, 18, 0xffffff);
          this.physics.add.existing(this.player);
          const body = this.player.body as Phaser.Physics.Arcade.Body;
          body.setCollideWorldBounds(true);
          body.setCircle(18);
          body.setOffset(-18, -18);

          this.obstacles = this.physics.add.group();
          this.physics.add.overlap(
            this.player,
            this.obstacles,
            () => this.finish(),
            undefined,
            this
          );

          this.input.keyboard?.on("keydown-LEFT", () => this.movePlayer(-1));
          this.input.keyboard?.on("keydown-RIGHT", () => this.movePlayer(1));
          this.input.keyboard?.on("keydown-A", () => this.movePlayer(-1));
          this.input.keyboard?.on("keydown-D", () => this.movePlayer(1));

          this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (this.isOver) return;
            const lane = Math.floor(pointer.x / this.laneWidth);
            this.setLane(Phaser.Math.Clamp(lane, 0, this.laneCount - 1));
          });
        }

        private movePlayer(direction: -1 | 1) {
          if (this.isOver) return;
          this.setLane(this.playerLane + direction);
        }

        private setLane(lane: number) {
          const normalized = Phaser.Math.Clamp(lane, 0, this.laneCount - 1);
          this.playerLane = normalized;
          const targetX = this.laneWidth * normalized + this.laneWidth / 2;
          this.tweens.add({
            targets: this.player,
            x: targetX,
            duration: 120,
            ease: "Sine.easeOut"
          });
        }

        private spawnObstacle() {
          const lane = Phaser.Math.Between(0, this.laneCount - 1);
          const width = this.laneWidth * 0.6;
          const x = this.laneWidth * lane + this.laneWidth / 2;
          const rect = this.add.rectangle(x, -20, width, 28, 0xc026d3);
          this.physics.add.existing(rect);
          const body = rect.body as Phaser.Physics.Arcade.Body;
          body.setVelocityY(this.speed);
          body.setImmovable(true);
          body.setAllowGravity(false);
          this.obstacles.add(rect);
        }

        update(_time: number, delta: number) {
          if (this.isOver) return;

          this.spawnTimer += delta;
          if (this.spawnTimer > 600) {
            this.spawnObstacle();
            this.spawnTimer = 0;
            this.speed = Math.min(this.speed + 6, 480);
          }

          this.obstacles.children.each((child) => {
            const sprite = child as Phaser.GameObjects.Rectangle;
            if (sprite.y > this.scale.height + 40) {
              sprite.destroy();
              this.incrementScore(10);
            }
          });
        }

        private incrementScore(amount: number) {
          this.score += amount;
          this.scoreText.setText(`${this.score}`);
        }

        private finish() {
          if (this.isOver) return;
          this.isOver = true;
          this.player.setFillStyle(0xff4d6d);
          this.physics.pause();
          const finalScore = this.score;
          setTimeout(() => {
            onGameOverRef.current(finalScore);
          }, 120);
        }
      }

      if (cancelled) return;

      const parent = containerRef.current;
      if (!parent) return;

      parent.innerHTML = "";

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        backgroundColor: "#000000",
        scale: {
          parent,
          mode: Phaser.Scale.RESIZE,
          width: parent.clientWidth,
          height: parent.clientHeight
        },
        parent,
        scene: RunnerScene,
        physics: {
          default: "arcade",
          arcade: {
            debug: false
          }
        }
      };

      gameRef.current = new Phaser.Game(config);

      resizeHandler = () => {
        const game = gameRef.current;
        if (!game) return;
        const width = parent.clientWidth;
        const height = parent.clientHeight;
        game.scale.resize(width, height);
      };

      window.addEventListener("resize", resizeHandler);
    })();

    return () => {
      cancelled = true;
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [isActive]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

export default function Page() {
  const [tab, setTab] = useState<ActiveTab>("play");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(SAMPLE_LEADERBOARD);
  const [prizePot, setPrizePot] = useState(125);
  const [userBest, setUserBest] = useState(12100);
  const [userSpent, setUserSpent] = useState(12);
  const [userEarned, setUserEarned] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [isPaidRun, setIsPaidRun] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const lobbyRef = useRef<HTMLDivElement | null>(null);
  const secondsRemaining = useCountdown(60 * 60 * 18 + 23 * 60 + 59);

  useEffect(() => {
    const onChange = () => {
      /* placeholder for future fullscreen side effects */
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const updateEarnings = useCallback(
    (score: number) => {
      setLeaderboard((prev) => {
        const updated = prev.some((entry) => entry.walletAddress === "0xUSER...ADDR")
          ? prev.map((entry) =>
              entry.walletAddress === "0xUSER...ADDR"
                ? { ...entry, score: Math.max(entry.score, score) }
                : entry
            )
          : [...prev, { fid: 2, username: "@fuzzhead.eth", walletAddress: "0xUSER...ADDR", score }];

        updated.sort((a, b) => b.score - a.score);
        const rank = updated.findIndex((entry) => entry.walletAddress === "0xUSER...ADDR") + 1;
        setUserEarned(computePayout(rank, prizePot));
        return [...updated];
      });
      setUserBest((prev) => Math.max(prev, score));
    },
    [prizePot]
  );

  const handleGameOver = useCallback(
    (score: number) => {
      setGameState("complete");
      exitFullscreen();
      updateEarnings(score);
      if (isPaidRun) {
        setPrizePot((prev) => prev + 1 * 0.9);
      }
    },
    [isPaidRun, updateEarnings]
  );

  const startRun = useCallback(
    (paid: boolean) => {
      setIsPaidRun(paid);
      setGameState("starting");
      setTimeout(() => {
        if (paid) {
          setUserSpent((prev) => prev + 1);
        }
        requestFullscreen(lobbyRef.current);
        setGameState("running");
      }, paid ? 600 : 0);
    },
    []
  );

  const miniLeaderboard = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-6 px-4">
      <div
        ref={lobbyRef}
        className="relative w-full max-w-md bg-black border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-6 pb-4">
          <h1 className="text-3xl font-pixel">FlappyCaster</h1>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <div className="w-10 h-10 rounded-full bg-slate-700 grid place-items-center">
              <span className="text-lg">F</span>
            </div>
            <span>@fuzzhead.eth</span>
          </div>
        </header>

        {/* Lobby / Game container */}
        <main className="relative flex flex-col h-[640px]">
          <section className="relative flex-1">
            <video
              className="absolute inset-0 w-full h-full object-cover opacity-70"
              autoPlay
              playsInline
              loop
              muted
              poster="/images/lobby-poster.jpg"
            >
              <source src="/videos/gameplay-loop.webm" type="video/webm" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
            {gameState === "running" && (
              <div className="absolute inset-0 z-20 bg-black">
                <GameViewport isActive onGameOver={handleGameOver} />
              </div>
            )}
            <div className="relative z-10 flex flex-col justify-end h-full p-6 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Prize Pot</p>
                  <p className="text-4xl font-pixel text-brand-500 drop-shadow-[0_0_15px_rgba(217,70,239,0.55)]">
                    {formatCurrency(prizePot)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Ends In</p>
                  <p className="text-3xl font-pixel">{formatCountdown(secondsRemaining)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="muted"
                  size="lg"
                  onClick={() => startRun(false)}
                  disabled={gameState === "running"}
                >
                  <span className="flex flex-col leading-tight">
                    <span className="text-base font-semibold">Play for Fun</span>
                    <span className="text-2xl font-bold">Free</span>
                  </span>
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    setShowPaymentModal(true);
                    setIsPaidRun(true);
                  }}
                  disabled={gameState === "running"}
                >
                  <span className="flex flex-col leading-tight">
                    <span className="text-base font-semibold">Play for Prize</span>
                    <span className="text-2xl font-bold">$1</span>
                  </span>
                </Button>
              </div>

              <div className="bg-black/60 border border-slate-800 rounded-2xl p-4 backdrop-blur">
                <div className="flex justify-between items-center text-xs text-slate-400 font-semibold pb-2">
                  <span className="w-2/5">Player</span>
                  <span className="w-2/5 text-right">Est. Payout</span>
                  <span className="w-1/5 text-right">Score</span>
                </div>
                <div className="space-y-2">
                  {miniLeaderboard.map((entry, index) => {
                    const rank = ["🥇", "🥈", "🥉"][index] ?? `${index + 1}.`;
                    const payout = computePayout(index + 1, prizePot);
                    return (
                      <div key={entry.fid} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 w-2/5">
                          <span className="w-5 text-lg">{rank}</span>
                          <span className="truncate text-slate-200">{entry.username}</span>
                        </div>
                        <span className="w-2/5 text-right font-pixel text-xl text-brand-500">
                          {payout > 0 ? formatCurrency(payout) : ""}
                        </span>
                        <span className="w-1/5 text-right font-pixel text-lg text-white">
                          {entry.score}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between text-sm bg-slate-900/60 rounded-xl px-3 py-2">
                    <span className="w-2/5 text-slate-300">Your Best</span>
                    <span className="w-2/5 text-right font-pixel text-xl text-brand-500">
                      {userEarned > 0 ? formatCurrency(userEarned) : "--"}
                    </span>
                    <span className="w-1/5 text-right font-pixel text-lg">{userBest}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation */}
          <nav className="grid grid-cols-3 gap-2 border-t border-slate-800 bg-black/90 p-3">
            {([
              { key: "play", label: "Play", icon: "▶" },
              { key: "stats", label: "Stats", icon: "📊" },
              { key: "notifications", label: "Alerts", icon: "🔔" }
            ] as const).map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex flex-col items-center justify-center rounded-xl py-2 text-xs font-semibold transition-colors ${
                  tab === item.key ? "bg-brand-600 text-white" : "bg-slate-900 text-slate-400"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </main>

        {/* Panels */}
        {tab === "stats" && (
          <section className="px-6 pb-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs text-slate-400 uppercase">You've Spent</p>
                <p className="text-3xl font-pixel">{formatCurrency(userSpent)}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs text-slate-400 uppercase">You've Earned</p>
                <p className="text-3xl font-pixel text-brand-500">
                  {userEarned > 0 ? formatCurrency(userEarned) : "$0.00"}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl max-h-80 overflow-y-auto">
              <div className="sticky top-0 bg-black/90 backdrop-blur border-b border-slate-800 px-4 py-3 text-xs text-slate-400 flex justify-between">
                <span className="w-2/5">Player</span>
                <span className="w-2/5 text-right">Est. Payout</span>
                <span className="w-1/5 text-right">Score</span>
              </div>
              <div className="divide-y divide-slate-800">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const payout = computePayout(rank, prizePot);
                  const isUser = entry.walletAddress === "0xUSER...ADDR";
                  return (
                    <div
                      key={entry.walletAddress}
                      className={`flex items-center justify-between px-4 py-3 text-sm ${
                        isUser ? "bg-brand-600/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 w-2/5">
                        <span className="w-6 text-center font-pixel text-lg">
                          {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `${rank}.`}
                        </span>
                        <span className="truncate text-slate-200">{entry.username}</span>
                      </div>
                      <span className="w-2/5 text-right font-pixel text-xl text-brand-500">
                        {payout > 0 ? formatCurrency(payout) : "--"}
                      </span>
                      <span className="w-1/5 text-right font-pixel text-lg text-white">
                        {entry.score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {tab === "notifications" && (
          <section className="px-6 pb-10">
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-950/90 py-12 gap-4 text-slate-500">
              <span className="text-4xl">🔔</span>
              <p className="text-sm">No new notifications. You're all caught up!</p>
            </div>
          </section>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-30 grid place-items-center bg-black/70 px-6">
            <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 text-center">
              <h3 className="text-xl font-semibold">Confirm Payment</h3>
              <p className="text-sm text-slate-300">
                You're about to pay <span className="font-bold text-white">$1.00</span> to enter today's contest.
              </p>
              <p className="text-xs text-slate-500">This simulation does not move real funds.</p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="muted"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setIsPaidRun(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowPaymentModal(false);
                    startRun(true);
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Game overlay state messages */}
        {(gameState === "starting" || gameState === "complete") && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
            <div className="text-center space-y-3">
              {gameState === "starting" && (
                <>
                  <p className="text-sm text-slate-300">Preparing your run...</p>
                  {isPaidRun && <p className="text-xs text-slate-500">Waiting for transaction confirmation</p>}
                </>
              )}
              {gameState === "complete" && (
                <>
                  <h2 className="text-4xl font-pixel text-brand-500">Game Over</h2>
                  <Button
                    onClick={() => {
                      setGameState("idle");
                      setIsPaidRun(false);
                    }}
                  >
                    Back to Lobby
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
