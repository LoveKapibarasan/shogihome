import { parseUSIPV } from "@/common/game/usi";
import { Player, SearchHandler } from "@/renderer/players/player";
import { PlayerSetting } from "@/common/settings/player";
import { ImmutablePosition, Move } from "electron-shogi-core";
import { TimeStates } from "@/common/game/time";

export type MoveWithOption = {
  usi: string;
  info?: {
    score?: number; // 先手から見た評価値
    mate?: number; // 先手勝ちの場合に正の値、後手勝ちの場合に負の値
    pv?: string[];
  };
};

export function createMockPlayer(moves: { [usi: string]: MoveWithOption }) {
  return {
    isEngine(): boolean {
      return false;
    },
    readyNewGame: vi.fn(() => Promise.resolve()),
    startSearch: vi.fn((p: ImmutablePosition, usi: string, t: TimeStates, h: SearchHandler) => {
      const m = moves[usi];
      if (m.usi === "no-reply") {
        // eslint-disable-next-line  @typescript-eslint/no-empty-function
        return new Promise<void>(() => {});
      }
      if (m.usi === "resign") {
        h.onResign();
        return Promise.resolve();
      }
      if (m.usi === "win") {
        h.onWin();
        return Promise.resolve();
      }
      const move = p.createMoveByUSI(m.usi) as Move;
      h.onMove(
        move,
        m.info && {
          usi,
          score: m.info?.score,
          mate: m.info?.mate,
          pv: m.info?.pv && parseUSIPV(p, [m.usi].concat(...m.info.pv)).slice(1),
        },
      );
      return Promise.resolve();
    }),
    startPonder: vi.fn(() => Promise.resolve()),
    startMateSearch: vi.fn(() => Promise.resolve()),
    stop: vi.fn(() => Promise.resolve()),
    gameover: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  };
}

export function createMockPlayerBuilder(playerMap: { [uri: string]: Player }) {
  return {
    build: vi.fn().mockImplementation((playerSetting: PlayerSetting) => {
      const player = playerMap[playerSetting.uri];
      if (!player) {
        throw new Error("unexpected player URI");
      }
      return new Promise<Player>((resolve) => resolve(player));
    }),
  };
}
