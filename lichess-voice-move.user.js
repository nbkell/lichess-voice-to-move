// ==UserScript==
// @name         Lichess Voice to Move
// @namespace    https://github.com/nat/lichess-voice-to-move
// @version      0.1.0
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
    rook: 'R', castle: 'R', tower: 'R',
    queen: 'Q',
    king: 'K',
  };

  const PROMOTIONS = { queen: 'Q', rook: 'R', bishop: 'B', knight: 'N' };

  const SQUARE_RE = /^[a-h][1-8]$/;

  function parseSpokenMove(raw) {
    const text = raw.trim().toLowerCase();

    // Castling
    if (/castle\s*king\s*side|king\s*side\s*castle|short\s*castle|castles?\s*short/.test(text)) return 'O-O';
    if (/castle\s*queen\s*side|queen\s*side\s*castle|long\s*castle|castles?\s*long/.test(text)) return 'O-O-O';
    if (text === 'o-o-o' || text === '0-0-0') return 'O-O-O';
    if (text === 'o-o' || text === '0-0') return 'O-O';

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
        // Try combining with next token for squares like "e 4"
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
      // Simple move: piece + optional capture + square
      san = piece + (capture ? 'x' : '') + squares[0];
    } else if (squares.length === 2) {
      // Disambiguation: piece + from + optional capture + to
      san = piece + squares[0] + (capture ? 'x' : '') + squares[1];
    } else {
      // Take last square as destination
      const dest = squares.pop();
      san = piece + squares.join('') + (capture ? 'x' : '') + dest;
    }

    san += promotion + checkSuffix;
    return san;
  }

  // --- Confirmation UI Overlay ---

  let overlayEl = null;

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'voice-move-overlay';
    overlay.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 99999;
      background: #1a1a2e; color: #e0e0e0; border: 2px solid #7b61ff;
      border-radius: 12px; padding: 16px 20px; font-family: -apple-system, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5); display: none; min-width: 200px;
      text-align: center;
    `;
    overlay.innerHTML = `
      <div style="font-size: 13px; color: #999; margin-bottom: 6px;">Voice Move</div>
      <div id="voice-move-text" style="font-size: 28px; font-weight: bold; margin-bottom: 12px; font-family: monospace;"></div>
      <div style="display: flex; gap: 8px; justify-content: center;">
        <button id="voice-move-confirm" style="
          background: #7b61ff; color: white; border: none; border-radius: 6px;
          padding: 6px 18px; cursor: pointer; font-size: 14px;
        ">Confirm ⏎</button>
        <button id="voice-move-cancel" style="
          background: #333; color: #ccc; border: 1px solid #555; border-radius: 6px;
          padding: 6px 18px; cursor: pointer; font-size: 14px;
        ">Cancel</button>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showOverlay(san, onConfirm, onCancel) {
    if (!overlayEl) overlayEl = createOverlay();

    overlayEl.querySelector('#voice-move-text').textContent = san;
    overlayEl.style.display = 'block';

    const confirmBtn = overlayEl.querySelector('#voice-move-confirm');
    const cancelBtn = overlayEl.querySelector('#voice-move-cancel');

    function cleanup() {
      overlayEl.style.display = 'none';
      confirmBtn.replaceWith(confirmBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      document.removeEventListener('keydown', keyHandler);
    }

    function keyHandler(e) {
      if (e.key === 'Enter') { e.preventDefault(); cleanup(); onConfirm(); }
      if (e.key === 'Escape') { e.preventDefault(); cleanup(); onCancel(); }
    }

    overlayEl.querySelector('#voice-move-confirm').addEventListener('click', () => { cleanup(); onConfirm(); });
    overlayEl.querySelector('#voice-move-cancel').addEventListener('click', () => { cleanup(); onCancel(); });
    document.addEventListener('keydown', keyHandler);
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

  // --- Text Input Listener ---

  function handleVoiceText(text) {
    const san = parseSpokenMove(text);
    if (!san) {
      console.log('[Voice Move] Could not parse:', text);
      return;
    }
    showOverlay(san,
      () => submitMove(san),
      () => console.log('[Voice Move] Cancelled:', san)
    );
  }

  // Listen for paste events
  document.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (text && text.trim().length > 0 && text.trim().length < 50) {
      handleVoiceText(text);
    }
  });

  // Alt+V hotkey to open a prompt
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'v') {
      e.preventDefault();
      const text = prompt('Enter move (e.g., "knight f3"):');
      if (text) handleVoiceText(text);
    }
  });

  console.log('[Voice Move] Lichess Voice to Move loaded');
})();
