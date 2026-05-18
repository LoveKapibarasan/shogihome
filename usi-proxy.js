#!/usr/bin/env node
// USI engine WebSocket proxy server
// Setup: npm install ws
// Usage: USI_ENGINE_PATH=/path/to/engine node usi-proxy.js [port]
//
// Options via environment variables:
//   USI_PROXY_PORT      WebSocket port (default: 5174)
//   USI_ENGINE_PATH     Path to USI engine executable (required)
//   USI_OPTIONS         Comma-separated setoption values, e.g. "gpu_id=-1,batchsize=8"
//   USI_ENGINE_WORKDIR  Working directory for the engine process (default: engine's directory)

import { createServer } from "http";
import { spawn } from "child_process";
import { dirname } from "path";
import { WebSocketServer } from "ws";

const PORT = parseInt(process.env.USI_PROXY_PORT || process.argv[2] || "5174", 10);
const ENGINE_PATH = process.env.USI_ENGINE_PATH;

if (!ENGINE_PATH) {
  console.error("Error: USI_ENGINE_PATH environment variable is required");
  console.error("  Example: USI_ENGINE_PATH=/usr/local/bin/engine node usi-proxy.js");
  process.exit(1);
}

// Parse USI_OPTIONS="gpu_id=-1,batchsize=8" into setoption commands
const usiOptions = (process.env.USI_OPTIONS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const eq = s.indexOf("=");
    return eq >= 0
      ? `setoption name ${s.slice(0, eq).trim()} value ${s.slice(eq + 1).trim()}`
      : null;
  })
  .filter(Boolean);

function nextColor(usi) {
  const parts = usi.trim().split(/\s+/);
  const mi = parts.indexOf("moves");
  const moveCount = mi < 0 ? 0 : parts.length - mi - 1;
  const startBlack = parts[1] !== "sfen" || parts[3] !== "w";
  return (moveCount % 2 === 0) === startBlack ? "black" : "white";
}

function buildGoCommand(usi, timeStates) {
  const color = nextColor(usi);
  const black = timeStates.black;
  const white = timeStates.white;
  const byoyomi = timeStates[color].byoyomi * 1000;
  const btime = Math.max(0, black.timeMs - black.increment * 1000);
  const wtime = Math.max(0, white.timeMs - white.increment * 1000);
  const binc = byoyomi === 0 ? black.increment * 1000 : 0;
  const winc = byoyomi === 0 ? white.increment * 1000 : 0;
  const timeStr =
    binc !== 0 || winc !== 0
      ? `btime ${btime} wtime ${wtime} binc ${binc} winc ${winc}`
      : `btime ${btime} wtime ${wtime} byoyomi ${byoyomi}`;
  return `go ${timeStr}`;
}

function appendMoveToUSI(usi, move) {
  return usi.includes(" moves ") ? `${usi} ${move}` : `${usi} moves ${move}`;
}

// Module-level game state — only one active game at a time
let activeWS = null;
const spectators = new Set();
let currentPosition = ""; // latest USI position string (updated after each move)

function broadcastToSpectators(msg) {
  for (const ws of spectators) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (_) {}
  }
}

// HTTP server handles Chrome's Private Network Access preflight before the WebSocket upgrade
const httpServer = createServer((req, res) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Private-Network": "true",
  };
  if (req.url === "/status") {
    res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" });
    res.end(JSON.stringify({ playing: activeWS !== null, usi: currentPosition || null }));
    return;
  }
  res.writeHead(req.method === "OPTIONS" ? 200 : 404, corsHeaders);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

// Chrome's Private Network Access also requires the header on the WebSocket upgrade response
wss.on("headers", (headers) => {
  headers.push("Access-Control-Allow-Private-Network: true");
  headers.push("Access-Control-Allow-Origin: *");
});

httpServer.listen(PORT);
console.log(`USI proxy listening on ws://localhost:${PORT}`);
console.log(`Engine: ${ENGINE_PATH}`);
if (usiOptions.length) console.log(`Options: ${usiOptions.join(", ")}`);

wss.on("connection", (ws) => {
  // If someone is already in session, this client watches as a spectator
  if (activeWS !== null) {
    console.log("spectator connected");
    spectators.add(ws);
    if (currentPosition) {
      ws.send(JSON.stringify({ type: "spectate", usi: currentPosition }));
    }
    ws.on("close", () => {
      spectators.delete(ws);
      console.log("spectator disconnected");
    });
    return;
  }

  console.log("client connected");
  activeWS = ws;
  let currentUsi = "";
  let buf = "";
  let usiokReceived = false;
  let pendingReady = false;
  let readyokReceived = false;
  let pendingGo = null;

  const engineCwd = process.env.USI_ENGINE_WORKDIR || dirname(ENGINE_PATH);
  const proc = spawn(ENGINE_PATH, [], { stdio: "pipe", cwd: engineCwd });

  function sendReady() {
    for (const opt of usiOptions) {
      console.log(`  > ${opt}`);
      proc.stdin.write(opt + "\n");
    }
    console.log("  > isready");
    proc.stdin.write("isready\n");
  }

  proc.stdout.on("data", (data) => {
    buf += data.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      console.log(`  < ${line}`);
      if (line === "usiok") {
        usiokReceived = true;
        if (pendingReady) {
          pendingReady = false;
          sendReady();
        }
      } else if (line === "readyok") {
        readyokReceived = true;
        if (pendingGo) {
          const { usi, goCmd } = pendingGo;
          pendingGo = null;
          console.log(`  > ${usi}`);
          console.log(`  > ${goCmd}`);
          proc.stdin.write(usi + "\n");
          proc.stdin.write(goCmd + "\n");
        }
      } else if (line.startsWith("bestmove")) {
        const p = line.split(" ");
        const move = p[1];
        if (move && move !== "resign" && move !== "win") {
          currentPosition = appendMoveToUSI(currentUsi, move);
        }
        broadcastToSpectators({ type: "move", usi: currentPosition });
        ws.send(
          JSON.stringify({
            type: "bestmove",
            usi: currentUsi,
            move,
            ponder: p[2] === "ponder" ? p[3] : undefined,
          }),
        );
      }
    }
  });

  proc.stderr.on("data", (d) => process.stderr.write(d));
  proc.on("close", () => console.log("engine process closed"));

  proc.stdin.write("usi\n");

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    switch (msg.cmd) {
      case "ready":
        if (usiokReceived) {
          sendReady();
        } else {
          pendingReady = true;
        }
        break;
      case "go": {
        currentUsi = msg.usi;
        currentPosition = msg.usi;
        const goCmd = buildGoCommand(msg.usi, JSON.parse(msg.timeStatesJSON));
        if (readyokReceived) {
          console.log(`  > ${msg.usi}`);
          console.log(`  > ${goCmd}`);
          proc.stdin.write(msg.usi + "\n");
          proc.stdin.write(goCmd + "\n");
        } else {
          pendingGo = { usi: msg.usi, goCmd };
        }
        break;
      }
      case "stop":
        console.log("  > stop");
        proc.stdin.write("stop\n");
        break;
      case "gameover":
        console.log(`  > gameover ${msg.result}`);
        proc.stdin.write(`gameover ${msg.result}\n`);
        break;
      case "quit":
        console.log("  > quit");
        proc.stdin.write("quit\n");
        break;
    }
  });

  ws.on("close", () => {
    console.log("client disconnected");
    proc.kill();
    activeWS = null;
    currentPosition = "";
    broadcastToSpectators({ type: "gameover" });
  });
});
