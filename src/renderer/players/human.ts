import { ImmutableRecord, Move } from "electron-shogi-core";
import { Player, SearchHandler } from "./player";
import { TimeStates } from "@/common/game/time";

export class HumanPlayer implements Player {
  private searchHandler?: SearchHandler;

  isEngine(): boolean {
    return false;
  }

  async readyNewGame(): Promise<void> {
    // do nothing
  }

  async startSearch(
    record: ImmutableRecord,
    timeStates: TimeStates,
    handler: SearchHandler,
  ): Promise<void> {
    this.searchHandler = handler;
  }

  async startPonder(): Promise<void> {
    // do nothing
  }

  async startMateSearch(): Promise<void> {
    // do nothing
  }

  async stop(): Promise<void> {
    // do nothing
  }

  async gameover(): Promise<void> {
    // do nothing
  }

  async close(): Promise<void> {
    this.searchHandler = undefined;
  }

  doMove(move: Move) {
    const searchHandler = this.searchHandler;
    this.searchHandler = undefined;
    if (searchHandler) {
      searchHandler.onMove(move);
    }
  }

  resign() {
    const searchHandler = this.searchHandler;
    this.searchHandler = undefined;
    if (searchHandler) {
      searchHandler.onResign();
    }
  }

  win() {
    const searchHandler = this.searchHandler;
    this.searchHandler = undefined;
    if (searchHandler) {
      searchHandler.onWin();
    }
  }
}

export const humanPlayer = new HumanPlayer();
