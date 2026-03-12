# 2048 AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/maitamdev/2048-ai?style=social)](https://github.com/maitamdev/2048-ai)

> An Expectimax AI that plays 2048 entirely in your browser — no server required.

The AI can reach **16384** most of the time and sometimes even reach **32768**.

![32768](logo.png)

---

## ✨ Features

- 🤖 **Expectimax AI** — Searches deep game trees to find optimal moves
- ⚡ **WebAssembly + Web Workers** — Parallel search across 4 threads for maximum speed
- 📊 **Real-time Stats** — Live moves/sec, total moves, elapsed time, and best tile display
- 🎨 **Dark/Light Theme** — Toggle between themes with localStorage persistence
- ⌨️ **Keyboard Shortcuts** — `Space` (toggle AI), `S` (one step), `N` (new game), `M` (mute)
- 📱 **Responsive Design** — Works on desktop, tablet, and mobile
- 🌐 **SEO Optimized** — Proper meta tags, Open Graph, and accessibility (ARIA)
- 🎉 **Confetti Celebrations** — Particle confetti explosions on milestone tiles (2048, 4096, 8192…)
- ✨ **Animated Tile Glow** — High-value tiles (1024+) pulsate with dynamic glow effects
- ⚡ **AI Speed Slider** — Control the delay between AI moves in real-time (0ms–500ms)
- 🏆 **Best Tile Tracker** — Tracks highest tile achieved, persisted across sessions
- 🔊 **Sound Effects** — Merge sounds & milestone chimes via Web Audio API (no files needed)
- 📜 **Game History** — Records the last 5 game sessions with score, tile, moves, and time
- 🌌 **Background Particles** — Floating glowing orbs for a cyberpunk atmosphere

---

## 🧠 Algorithm

This AI uses **Expectimax search** run in parallel on your browser without any back-end server or browser control, so you can even run it on a mobile device.

The AI uses 4 web workers, each one is a WebAssembly module compiled from C++ with Emscripten to perform the Expectimax search for each available move. The move with the highest result is chosen.

### Optimizations

| Technique | Description |
|---|---|
| **64-bit Bitboard** | Entire 4×4 board packed into one `unsigned long long` |
| **Lookup Tables** | Pre-computed tables for movement and evaluation (65,536 entries) |
| **Iterative Deepening** | Dynamically increases search depth based on position |
| **Probability Pruning** | Skips branches with very low probability |
| **Transposition Table** | 320MB Zobrist Hash table to avoid recalculating seen states |
| **Parallel Search** | 4 Web Workers search all directions simultaneously |

---

## 📈 Benchmark

> Intel® Core™ i5-8300H Processor

| Depth | Games | Avg Score | % 32768 | % 16384 | % 8192 | % 4096 | Time | Moves/s |
|-------|-------|-----------|---------|---------|--------|--------|------|---------|
| 3 ply | 1000 | 216,159 | 0.8 | 43 | 85.4 | 98.1 | 3s | 2,343 |
| 5 ply | 300 | 283,720 | 2 | 66.33 | 96 | 100 | 17s | 648 |
| 7 ply | 100 | 353,368 | 12 | 85 | 98 | 100 | 87s | 158 |

---

## 🚀 Usage

### Web Version (Recommended)

Run it locally with any static file server:

```bash
npx serve
```

Then open http://localhost:3000.

### Console Application (Benchmarking)

```bash
# Build
make

# Run
./2048 -d 3 -p    # 7-ply depth with progress
./2048 -i 100     # 100 games batch test
```

**Parameters:**
- `-d [Depth]` — Search depth (1→4). Each depth = 2 ply + initial. Default: 1 (3 ply).
- `-i [Iterations]` — Number of games for batch testing. Default: 1.
- `-p` — Show detailed progress (reduces performance).

### Compiling WebAssembly

Requires [Emscripten](https://emscripten.org/docs/getting_started/downloads.html):

```bash
make web
```

---

## 🎮 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start / Stop AI |
| `S` | Execute one AI step |
| `N` | New Game |
| `M` | Toggle Sound |
| `←↑↓→` | Manual play |
| `Esc` | Close modal |

---

## 🏗️ Project Structure

```
2048-ai/
├── index.html      # Main page
├── main.js         # Game controller & AI orchestration
├── ai.js           # WebAssembly module (compiled from C++)
├── ai.wasm         # WebAssembly binary
├── ai.css          # Styling (dark/light themes, effects)
├── cpp/            # C++ source code
│   ├── 2048.cpp       # Console application
│   ├── 2048-web.cpp   # Web worker entry point
│   ├── search.hpp     # Expectimax search algorithm
│   ├── heuristic.hpp  # Board evaluation function
│   ├── board.hpp      # Bitboard operations
│   ├── move.hpp       # Move generation
│   └── hash.hpp       # Transposition table
├── vendor/         # Original 2048 game (minified)
└── makefile        # Build configuration
```

---

## 🤝 Contributors

<a href="https://github.com/maitamdev">
  <img src="https://github.com/maitamdev.png" width="60" style="border-radius: 50%;" alt="maitamdev"/>
</a>

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

### Credits

Based on [1024 by Veewo Studio](https://itunes.apple.com/us/app/1024!/id823499224) and conceptually similar to [Threes by Asher Vollmer](http://asherv.com/threes/). AI heuristics referenced from [nneonneo/2048-ai](https://github.com/nneonneo/2048-ai).
