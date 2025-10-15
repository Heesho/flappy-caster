export type LeaderboardEntry = {
  fid: number;
  username: string;
  walletAddress: string;
  score: number;
  estimatedPayout: number;
};

export type ContestInfo = {
  prizePot: number;
  secondsRemaining: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${input}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Request failed");
  }

  return response.json() as Promise<T>;
}

export function getLeaderboard() {
  return jsonFetch<LeaderboardEntry[]>("/api/leaderboard");
}

export function getContestInfo() {
  return jsonFetch<ContestInfo>("/api/contest-info");
}

export async function submitScore(fid: number, score: number) {
  return jsonFetch("/api/score", {
    method: "POST",
    body: JSON.stringify({ fid, score })
  });
}

export function getUserStats(fid: number) {
  return jsonFetch(`/api/user/${fid}/stats`);
}
