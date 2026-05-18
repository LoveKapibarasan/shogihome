# 作業中パッチ メモ (2026-05-17)

## 概要

Web アプリモードで USI エンジンを使えるようにするための変更。  
ブラウザ ↔ WebSocket プロキシ ↔ USI エンジンプロセス という構成。

---

## 変更ファイル一覧

| ファイル | 種別 | 内容 |
|---|---|---|
| `package.json` | modified | 依存追加 (`ws`) |
| `package-lock.json` | modified | lockfile 更新 |
| `src/renderer/ipc/web.ts` | modified | WebSocket プロキシ経由 USI 実装 |
| `usi-proxy.js` | untracked (新規) | Node.js 製プロキシサーバー |

---

## 変更詳細

### 1. `package.json`

```diff
+    "ws": "^8.20.0",
```

`ws` を production 依存に追加（`usi-proxy.js` が使う）。

---

### 2. `src/renderer/ipc/web.ts`

#### 追加 import

```ts
import { USIEngines, emptyUSIEngine, getPredefinedUSIEngineTag } from "@/common/settings/usi.js";
import { GameResult } from "@/common/game/result.js";
```

#### 追加: USI WebSocket プロキシ状態管理ブロック

```ts
const USI_PROXY_PORT = 5174;

let usiWS: WebSocket | null = null;
let usiSessionCounter = 0;
let usiCurrentSessionID = 0;
let onUSIBestMoveCallback: ((sessionID, usi, move, ponder?) => void) | null = null;

function connectUSIProxy(): Promise<WebSocket>
```

- ポート 5174 の WebSocket サーバーに接続
- `bestmove` メッセージを受信して `onUSIBestMoveCallback` へ転送

#### 変更: `loadUSIEngines()`

空の結果を返す代わりに "Server Engine"（uri=`es://usi-engine/server`）を登録済みエンジンとして返す。  
タグは `game`（対局用）。

#### 変更: 各 USI メソッド

| メソッド | 変更前 | 変更後 |
|---|---|---|
| `getUSIEngineMetadata` | throw | `{ isShellScript: false }` を返す |
| `usiLaunch` | throw | セッション ID を発行して WebSocket 接続 |
| `usiReady` | DoNothing | `{ cmd: "ready" }` を送信 |
| `usiGo` | DoNothing | `{ cmd: "go", usi, timeStatesJSON }` を送信 |
| `usiStop` | DoNothing | `{ cmd: "stop" }` を送信 |
| `usiGameover` | DoNothing | `{ cmd: "gameover", result }` を送信 |
| `usiQuit` | DoNothing | `{ cmd: "quit" }` 送信後 WebSocket をクローズ |
| `onUSIBestMove` | DoNothing | コールバックを保存 |

---

### 3. `usi-proxy.js` (新規)

Node.js スクリプト。WebSocket サーバーとして動き、クライアント(ブラウザ)からのコマンドを USI エンジンプロセスに中継する。

#### 起動方法

```bash
USI_ENGINE_PATH=/path/to/engine node usi-proxy.js [port]
```

#### 環境変数

| 変数 | デフォルト | 説明 |
|---|---|---|
| `USI_PROXY_PORT` | `5174` | WebSocket ポート |
| `USI_ENGINE_PATH` | (必須) | USI エンジン実行ファイルパス |
| `USI_OPTIONS` | — | `setoption` コマンドをカンマ区切りで渡す例: `gpu_id=-1,batchsize=8` |

#### プロトコル (ブラウザ→プロキシ)

```jsonc
{ "cmd": "ready" }
{ "cmd": "go", "usi": "<position sfen ...>", "timeStatesJSON": "..." }
{ "cmd": "stop" }
{ "cmd": "gameover", "result": "win"|"lose"|"draw" }
{ "cmd": "quit" }
```

#### プロトコル (プロキシ→ブラウザ)

```jsonc
{ "type": "bestmove", "usi": "<position sfen ...>", "move": "7g7f", "ponder": "3c3d" }
```

#### 内部動作

1. クライアント接続時に USI エンジンを `spawn`
2. `usi` コマンド送信 → `usiok` 待機
3. `ready` 受信後に `USI_OPTIONS` + `isready` を送信
4. `go` 受信時: `position` + `go btime/wtime/byoyomi(またはinc)` に変換して送信
5. エンジンの `bestmove` 応答をブラウザへ転送
6. クライアント切断時にエンジンプロセスを kill

---

## 残課題 / TODO

- [ ] `usiGoPonder` / `usiPonderHit` は未実装 (DoNothing のまま)
- [ ] `onUSICheckmate` も未実装
- [ ] `usi-proxy.js` は `src/` 外に置かれており、ビルド対象外 → 配布方法を検討
- [ ] WebSocket 再接続ロジックは最小限 (切断後の自動再接続なし)
- [ ] セッション ID の管理が簡易 (単一セッション前提)
