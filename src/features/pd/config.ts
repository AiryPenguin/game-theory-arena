import type { Player } from '../../core/types';
import { PD_BOTS, type PDBotId } from '../../games/pd/bots';
import type { PDParams } from '../../games/pd/params';

export type SeatConfig = { kind: 'human'; name: string } | { kind: 'bot'; botId: PDBotId; secret: boolean };

export interface PDMatchConfig {
  params: PDParams;
  seats: [SeatConfig, SeatConfig];
  learning: boolean;
  seed: number;
}

export const PREDICTION_BONUS = 10;
export const DETECTIVE_BONUS = 15;

export function seatName(seat: SeatConfig, revealed = false): string {
  if (seat.kind === 'human') return seat.name;
  const bot = PD_BOTS[seat.botId];
  return seat.secret && !revealed ? '❓ Geheimer Gegner' : `${bot.emoji} ${bot.name}`;
}

export const humanSeats = (c: PDMatchConfig): Player[] => ([0, 1] as Player[]).filter((p) => c.seats[p].kind === 'human');
