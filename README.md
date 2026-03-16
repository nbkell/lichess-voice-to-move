# lichess-voice-to-move

A Tampermonkey userscript that lets you make moves on Lichess by speaking. Uses speech-to-text (like [Superwhisper](https://superwhisper.com/)) to fill a text box on the page, shows you a preview of the move on the board, and submits it when you press Enter.

This is strictly an input method — no engine or analysis functionality.

## Prerequisites

- [Tampermonkey](https://www.tampermonkey.net/) browser extension
- A speech-to-text tool (e.g., Superwhisper) that types transcribed text into the focused field
- **Lichess "Keyboard moves" enabled** (Preferences → Game behavior → Keyboard moves)

## Installation

1. Install Tampermonkey in your browser
2. Open the [userscript file](https://raw.githubusercontent.com/nbkell/lichess-voice-to-move/main/lichess-voice-move.user.js) — Tampermonkey will prompt to install
3. Or: open Tampermonkey dashboard → "+" tab → paste the contents of `lichess-voice-move.user.js`

## How it works

1. Open a Lichess game — a text box appears at the bottom of the page
2. Speak a move (Superwhisper types it into the text box automatically)
3. The parsed move appears next to the box and the target square highlights on the board
4. Press **Enter** to submit the move, or **Esc** to clear

That's it. Speak, glance at the highlight, hit Enter.

## Supported voice commands

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
