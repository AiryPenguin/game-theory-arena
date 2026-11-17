/** Hot-seat session leaderboard. Points = game payoff + bonus for correct predictions. */
export interface LeaderboardEntry {
  name: string;
  points: number;
  matches: number;
  wins: number;
}

export type Leaderboard = LeaderboardEntry[];

export interface MatchResult {
  name: string;
  points: number;
  won: boolean;
}

export const normName = (n: string) => n.trim().toLocaleLowerCase('de-DE');

export function recordMatch(board: Leaderboard, results: MatchResult[]): Leaderboard {
  const next = board.map((e) => ({ ...e }));
  for (const r of results) {
    const e = next.find((x) => normName(x.name) === normName(r.name));
    if (e) {
      e.points += r.points;
      e.matches += 1;
      e.wins += r.won ? 1 : 0;
    } else next.push({ name: r.name.trim(), points: r.points, matches: 1, wins: r.won ? 1 : 0 });
  }
  return sortBoard(next);
}

export const sortBoard = (b: Leaderboard): Leaderboard =>
  [...b].sort((x, y) => y.points - x.points || y.wins - x.wins || x.name.localeCompare(y.name, 'de'));

export function isLeaderboard(x: unknown): x is Leaderboard {
  return Array.isArray(x) && x.every((e) => e && typeof e.name === 'string' && typeof e.points === 'number');
}
