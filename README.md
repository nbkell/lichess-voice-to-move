# lichess-voice-to-move

A Tampermonkey userscript that converts spoken chess moves (pasted from speech-to-text tools like Superwhisper) into algebraic notation and submits them to Lichess.

This is strictly an input method — no engine or analysis functionality.

## Prerequisites

- [Tampermonkey](https://www.tampermonkey.net/) browser extension
- A speech-to-text tool (e.g., [Superwhisper](https://superwhisper.com/)) that copies transcribed text to the clipboard
- **Lichess "Keyboard moves" preference enabled** (Preferences → Game behavior → Keyboard moves)

## Installation

1. Install Tampermonkey in your browser
2. Click [lichess-voice-move.user.js](https://github.com/nat/lichess-voice-to-move/raw/main/lichess-voice-move.user.js) — Tampermonkey will prompt to install
3. Or: open Tampermonkey dashboard → "+" tab → paste the contents of `lichess-voice-move.user.js`

## Usage

1. Open a Lichess game with keyboard moves enabled
2. Use your speech-to-text tool to dictate a move (e.g., "knight f3")
3. Paste the text anywhere on the page (Cmd/Ctrl+V)
4. A confirmation overlay appears showing the parsed move (e.g., "Nf3")
5. Press **Enter** to submit or **Esc** to cancel

### Supported voice commands

| You say | Parsed as |
|---|---|
| knight f3 | Nf3 |
| bishop takes e5 | Bxe5 |
| e4 | e4 |
| castle kingside | O-O |
| castle queenside | O-O-O |
| queen d1 | Qd1 |
| rook a1 takes a8 | Ra1xa8 |
| e8 promote queen | e8=Q |

You can also press **Alt+V** to open a text prompt for typing a move manually.
