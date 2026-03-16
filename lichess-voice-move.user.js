// ==UserScript==
// @name         Lichess Voice to Move
// @namespace    https://github.com/nat/lichess-voice-to-move
// @version      0.2.0
// @description  Convert spoken chess move text into algebraic notation and submit to Lichess
// @author       nat
// @match        https://lichess.org/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // --- Move Parser ---

  const PIECE_MAP = {
    knight: 'N', night: 'N', horse: 'N',
    bishop: 'B',
    rook: 'R', tower: 'R',
    queen: 'Q',
    king: 'K',
  };

  const PROMOTIONS = { queen: 'Q', rook: 'R', bishop: 'B', knight: 'N' };
  const SQUARE_RE = /^[a-h][1-8]$/;

  function parseSpokenMove(raw) {
    const text = raw.trim().toLowerCase();

    // Castling
    if (/castle\s*king\s*side|king\s*side\s*castle|short\s*castle|castles?\s*short/.test(text)) return { san: 'O-O', squares: [] };
    if (/castle\s*queen\s*side|queen\s*side\s*castle|long\s*castle|castles?\s*long/.test(text)) return { san: 'O-O-O', squares: [] };
    if (text === 'o-o-o' || text === '0-0-0') return { san: 'O-O-O', squares: [] };
    if (text === 'o-o' || text === '0-0') return { san: 'O-O', squares: [] };

    const tokens = text.replace(/[.,!?]/g, '').split(/\s+/);

    let piece = '';
    let squares = [];
    let capture = false;
    let promotion = '';
    let checkSuffix = '';

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];

      if (PIECE_MAP[t] && piece === '' && squares.length === 0) {
        piece = PIECE_MAP[t];
      } else if (t === 'takes' || t === 'capture' || t === 'captures' || t === 'x') {
        capture = true;
      } else if (t === 'promote' || t === 'promotes' || t === 'promotion' || t === 'equals') {
        const next = tokens[i + 1];
        if (next && PROMOTIONS[next]) {
          promotion = '=' + PROMOTIONS[next];
          i++;
        }
      } else if (t === 'check') {
        checkSuffix = '+';
      } else if (t === 'checkmate' || t === 'mate') {
        checkSuffix = '#';
      } else if (SQUARE_RE.test(t)) {
        squares.push(t);
      } else {
        const next = tokens[i + 1];
        if (next && SQUARE_RE.test(t + next)) {
          squares.push(t + next);
          i++;
        }
      }
    }

    if (squares.length === 0) return null;

    let san = '';
    if (squares.length === 1) {
      san = piece + (capture ? 'x' : '') + squares[0];
    } else if (squares.length === 2) {
      san = piece + squares[0] + (capture ? 'x' : '') + squares[1];
    } else {
      const dest = squares[squares.length - 1];
      san = piece + squares.slice(0, -1).join('') + (capture ? 'x' : '') + dest;
    }

    san += promotion + checkSuffix;
    return { san, squares };
  }

  // --- Board Arrow Drawing ---

  let arrowSvg = null;

  function getOrCreateSvg() {
    if (arrowSvg && arrowSvg.parentNode) return arrowSvg;
    const board = document.querySelector('cg-board');
    if (!board) return null;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 8 8');
    svg.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 100; overflow: visible;
    `;

    // Arrow marker definition
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'voice-move-arrowhead');
    marker.setAttribute('markerWidth', '4');
    marker.setAttribute('markerHeight', '4');
    marker.setAttribute('refX', '2.5');
    marker.setAttribute('refY', '2');
    marker.setAttribute('orient', 'auto');
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M 0 0 L 4 2 L 0 4 z');
    arrowPath.setAttribute('fill', '#15781B');
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    board.appendChild(svg);
    arrowSvg = svg;
    return svg;
  }

  function clearArrows() {
    if (!arrowSvg) return;
    arrowSvg.querySelectorAll('.voice-move-arrow, .voice-move-circle').forEach(el => el.remove());
  }

  function squareToCoords(sq) {
    const isFlipped = document.querySelector('.cg-wrap.orientation-black') !== null;
    const file = sq.charCodeAt(0) - 97;
    const rank = parseInt(sq[1]) - 1;
    const x = isFlipped ? 7 - file : file;
    const y = isFlipped ? rank : 7 - rank;
    return { x: x + 0.5, y: y + 0.5 };
  }

  function drawArrow(squares) {
    clearArrows();
    const svg = getOrCreateSvg();
    if (!svg) return;

    if (squares.length === 1) {
      // Single square — draw a circle highlight on it
      const { x, y } = squareToCoords(squares[0]);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '0.4');
      circle.setAttribute('fill', 'rgba(21, 120, 27, 0.45)');
      circle.setAttribute('class', 'voice-move-circle');
      svg.appendChild(circle);
    } else if (squares.length >= 2) {
      const from = squareToCoords(squares[0]);
      const to = squareToCoords(squares[squares.length - 1]);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      line.setAttribute('stroke', '#15781B');
      line.setAttribute('stroke-width', '0.28');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('marker-end', 'url(#voice-move-arrowhead)');
      line.setAttribute('opacity', '0.8');
      line.setAttribute('class', 'voice-move-arrow');
      svg.appendChild(line);
    }
  }

  // --- Voice Input Box ---

  function createInputBox() {
    const container = document.createElement('div');
    container.id = 'voice-move-container';
    container.style.cssText = `
      position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
      z-index: 99999; display: flex; align-items: center; gap: 10px;
      background: #1a1a2e; border: 2px solid #7b61ff; border-radius: 12px;
      padding: 8px 14px; font-family: -apple-system, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;

    const label = document.createElement('span');
    label.textContent = '🎤';
    label.style.cssText = 'font-size: 18px;';

    const input = document.createElement('input');
    input.id = 'voice-move-input';
    input.type = 'text';
    input.placeholder = 'Speak or type a move…';
    input.autocomplete = 'off';
    input.style.cssText = `
      background: #2a2a3e; color: #e0e0e0; border: 1px solid #444;
      border-radius: 8px; padding: 8px 12px; font-size: 16px; width: 240px;
      outline: none; font-family: monospace;
    `;

    const parsedDisplay = document.createElement('span');
    parsedDisplay.id = 'voice-move-parsed';
    parsedDisplay.style.cssText = `
      color: #7b61ff; font-size: 20px; font-weight: bold;
      font-family: monospace; min-width: 60px; text-align: center;
    `;

    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(parsedDisplay);
    document.body.appendChild(container);

    // Live parse as user types / Superwhisper fills in
    input.addEventListener('input', () => {
      const val = input.value.trim();
      if (!val) {
        parsedDisplay.textContent = '';
        clearArrows();
        return;
      }
      const result = parseSpokenMove(val);
      if (result) {
        parsedDisplay.textContent = result.san;
        drawArrow(result.squares);
      } else {
        parsedDisplay.textContent = '?';
        clearArrows();
      }
    });

    // Enter to submit, Escape to clear
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = input.value.trim();
        if (!val) return;
        const result = parseSpokenMove(val);
        if (result) {
          submitMove(result.san);
          input.value = '';
          parsedDisplay.textContent = '';
          clearArrows();
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        input.value = '';
        parsedDisplay.textContent = '';
        clearArrows();
      }
    });

    return input;
  }

  // --- Lichess Move Submission ---

  function submitMove(san) {
    const input = document.querySelector('.keyboard-move input');
    if (!input) {
      console.warn('[Voice Move] Keyboard move input not found. Enable "Keyboard moves" in Lichess preferences.');
      return false;
    }

    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, san);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    return true;
  }

  // --- Init ---

  function init() {
    // Only activate on game pages
    if (!document.querySelector('.cg-wrap')) {
      // Retry — board may not be loaded yet
      setTimeout(init, 1000);
      return;
    }
    const inputBox = createInputBox();
    // Auto-focus the voice input so Superwhisper types into it
    inputBox.focus();
    console.log('[Voice Move] Lichess Voice to Move loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
