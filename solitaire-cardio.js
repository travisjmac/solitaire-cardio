/* Solitaire: Cardio for Introverts — Klondike, draw three. */
(function () {
  "use strict";

  var themeBase = new URL('./themes/', document.currentScript.src);
  var themeLink = document.createElement('link');themeLink.rel='stylesheet';themeLink.href=new URL('space.css',themeBase).href;document.head.appendChild(themeLink);
  var SUITS = [
    { id: "S", symbol: "\u2660", color: "black", name: "spades" },
    { id: "H", symbol: "\u2665", color: "red", name: "hearts" },
    { id: "D", symbol: "\u2666", color: "red", name: "diamonds" },
    { id: "C", symbol: "\u2663", color: "black", name: "clubs" }
  ];
  var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomSeed() {
    if (globalThis.crypto && typeof crypto.getRandomValues === "function") {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] || 1;
    }
    return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
  }

  function shuffle(list, rng) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function makeDeck() {
    var cards = [];
    for (var s = 0; s < SUITS.length; s++) {
      for (var rank = 0; rank < RANKS.length; rank++) {
        var suit = SUITS[s];
        cards.push({
          id: suit.id + RANKS[rank],
          suit: suit.id,
          symbol: suit.symbol,
          color: suit.color,
          name: suit.name,
          rank: rank,
          label: RANKS[rank],
          faceUp: false
        });
      }
    }
    return cards;
  }

  function copyCard(card) {
    return {
      id: card.id,
      suit: card.suit,
      symbol: card.symbol,
      color: card.color,
      name: card.name,
      rank: card.rank,
      label: card.label,
      faceUp: card.faceUp
    };
  }

  function esc(text) {
    return String(text).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  function encodeCards(cards) {
    var out = [];
    for (var i = 0; i < cards.length; i++) {
      out.push(cards[i].id + ":" + (cards[i].faceUp ? "up" : "down"));
    }
    return out.join(",");
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  /* Card and table art is drawn here as inline SVG. No image files. */
  function artSvg(viewBox, body, cls) {
    return '<svg class="' + cls + '" viewBox="' + viewBox + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + body + "</svg>";
  }

  var SUIT_MARK = {
    H: '<path d="M12 21.4C12 21.4 2.4 14.4 2.4 8.7C2.4 5.2 5 3 8 4.1C10.1 4.9 11.3 6.9 12 8.6C12.7 6.9 13.9 4.9 16 4.1C19 3 21.6 5.2 21.6 8.7C21.6 14.4 12 21.4 12 21.4Z"></path>',
    D: '<polygon points="12,1.6 22.2,12 12,22.4 1.8,12"></polygon>',
    S: '<path d="M12 2.2C12 2.2 2.2 9.6 2.2 15C2.2 18.4 5 20.6 8 19.6C9.9 18.9 11.2 17.1 12 15.4C12.8 17.1 14.1 18.9 16 19.6C19 20.6 21.8 18.4 21.8 15C21.8 9.6 12 2.2 12 2.2Z"></path><path d="M9.1 18.8h5.8l-1.3 3.6h-3.2z"></path>',
    C: '<circle cx="12" cy="7.6" r="4.3"></circle><circle cx="7.2" cy="13.4" r="4.3"></circle><circle cx="16.8" cy="13.4" r="4.3"></circle><path d="M10.4 16.2h3.2l-.7 6.2h-1.8z"></path>'
  };

  var SPACE_SUIT = {
 H:'<path d="M12 21L3 12V7L7 3H10L12 6L14 3H17L21 7V12Z"/><path d="M6 10H9L11 7L13 14L15 10H19" fill="none" stroke="#f8eedb" stroke-width="1.3"/>',
 S:'<path d="M12 2L3 13V17L6 20H9L12 17L15 20H18L21 17V13Z"/><path d="M10 17H14L15 23H9Z"/><path d="M12 6V14M8 13L12 9L16 13" fill="none" stroke="#f8eedb" stroke-width="1.2"/>',
 D:'<path d="M12 1L22 12L12 23L2 12Z"/><path d="M12 5L18 12L12 19L6 12Z M12 5V19 M6 12H18" fill="none" stroke="#f8eedb" stroke-width="1.1"/>',
 C:'<path d="M10 13H14L15 23H9Z"/><circle cx="12" cy="6" r="4.5"/><circle cx="6" cy="13" r="4.5"/><circle cx="18" cy="13" r="4.5"/><path d="M12 6V14L6 13M12 14L18 13" fill="none" stroke="#f8eedb" stroke-width="1.3"/><circle cx="12" cy="6" r="1" fill="#f8eedb"/><circle cx="6" cy="13" r="1" fill="#f8eedb"/><circle cx="18" cy="13" r="1" fill="#f8eedb"/>'
  };
  function spaceSuitSVG(suit){return artSvg('0 0 24 24',SPACE_SUIT[suit],'sc-space-symbol');}
  var ACE_FACE = {
    H: '<circle cx="9.2" cy="11" r="1.15" fill="#fffaf3"></circle><circle cx="14.8" cy="11" r="1.15" fill="#fffaf3"></circle><path d="M9.4 14.1Q12 16.2 14.6 14.1" fill="none" stroke="#fffaf3" stroke-width="1.1" stroke-linecap="round"></path>',
    D: '<circle cx="10" cy="11.2" r="1.15" fill="#fffaf3"></circle><circle cx="14" cy="11.2" r="1.15" fill="#fffaf3"></circle><path d="M10 14.4Q12 16.2 14 14.4" fill="none" stroke="#fffaf3" stroke-width="1.1" stroke-linecap="round"></path>',
    S: '<circle cx="9.4" cy="13.4" r="1.15" fill="#fffaf3"></circle><circle cx="14.6" cy="13.4" r="1.15" fill="#fffaf3"></circle><path d="M9.6 16.4Q12 18.2 14.4 16.4" fill="none" stroke="#fffaf3" stroke-width="1.1" stroke-linecap="round"></path>',
    C: '<circle cx="10.4" cy="7.4" r="1" fill="#fffaf3"></circle><circle cx="13.6" cy="7.4" r="1" fill="#fffaf3"></circle><path d="M10.6 9.3Q12 10.6 13.4 9.3" fill="none" stroke="#fffaf3" stroke-width="0.9" stroke-linecap="round"></path>'
  };

  var PIP_LAYOUT = {
    2: [[24, 16, 0], [24, 48, 1]],
    3: [[24, 14, 0], [24, 32, 0], [24, 50, 1]],
    4: [[14, 16, 0], [34, 16, 0], [14, 48, 1], [34, 48, 1]],
    5: [[14, 16, 0], [34, 16, 0], [24, 32, 0], [14, 48, 1], [34, 48, 1]],
    6: [[14, 14, 0], [34, 14, 0], [14, 32, 0], [34, 32, 0], [14, 50, 1], [34, 50, 1]],
    7: [[14, 13, 0], [34, 13, 0], [24, 24, 0], [14, 36, 0], [34, 36, 0], [14, 52, 1], [34, 52, 1]],
    8: [[14, 12, 0], [34, 12, 0], [14, 26, 0], [34, 26, 0], [14, 40, 1], [34, 40, 1], [14, 54, 1], [34, 54, 1]],
    9: [[14, 12, 0], [34, 12, 0], [14, 25, 0], [34, 25, 0], [24, 33, 0], [14, 43, 1], [34, 43, 1], [14, 54, 1], [34, 54, 1]],
    10: [[14, 11, 0], [34, 11, 0], [24, 20, 0], [14, 29, 0], [34, 29, 0], [14, 39, 1], [34, 39, 1], [24, 48, 1], [14, 56, 1], [34, 56, 1]]
  };

  function suitIcon(suit, cx, cy, size, flip, faced) {
    var spin = flip ? " rotate(180)" : "";
    var face = faced ? (ACE_FACE[suit] || "") : "";
    return '<g fill="currentColor" transform="translate(' + cx + " " + cy + ") scale(" + (size / 24) + ")" + spin + ' translate(-12 -12)">' +
      '<g class="sc-classic-suit">'+SUIT_MARK[suit]+face+'</g><g class="sc-orbital-suit">'+SPACE_SUIT[suit]+'</g></g>';
  }

  function starField() {
    return '<g fill="#7ea2e8">' +
      '<circle cx="7" cy="8" r="0.7"></circle><circle cx="41" cy="11" r="0.55"></circle>' +
      '<circle cx="44" cy="28" r="0.45"></circle><circle cx="6" cy="34" r="0.5"></circle>' +
      '<circle cx="38" cy="6" r="0.4"></circle></g>' +
      '<path d="M4 58q20-8 40 2" fill="none" stroke="#9eb6e6" stroke-width="0.6" opacity=".7"></path>';
  }

  function drawJack() {
    return '<circle cx="10" cy="12" r="1" fill="#7ea2e8"></circle><circle cx="54" cy="18" r="0.8" fill="#7ea2e8"></circle>' +
      '<rect x="14" y="50" width="8" height="20" rx="2" fill="#31425f"></rect>' +
      '<rect x="42" y="50" width="8" height="20" rx="2" fill="#31425f"></rect>' +
      '<path d="M16 70 q2 8 4 0M44 70 q2 8 4 0" fill="none" stroke="#ffb703" stroke-width="2" stroke-linecap="round"></path>' +
      '<path d="M22 48 h20 l3 26 H19 Z" fill="currentColor"></path>' +
      '<circle cx="32" cy="34" r="13" fill="#d5e4ff" stroke="#1c1917" stroke-width="1.6"></circle>' +
      '<path d="M32 21 v-7" stroke="#1c1917" stroke-width="1.4"></path>' +
      '<circle cx="32" cy="12" r="1.7" fill="#ff5d73"></circle>' +
      '<ellipse cx="32" cy="35" rx="8" ry="7" fill="#142033"></ellipse>' +
      '<ellipse cx="29" cy="33" rx="2" ry="1.1" fill="#b9e4ff"></ellipse>' +
      '<rect x="24" y="46" width="16" height="4" rx="1" fill="#d7e6ff"></rect>';
  }

  function drawQueen() {
    return '<circle cx="8" cy="16" r="0.9" fill="#7ea2e8"></circle><circle cx="56" cy="14" r="0.7" fill="#7ea2e8"></circle>' +
      '<path d="M24 30 L16 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>' +
      '<path d="M40 30 L48 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>' +
      '<circle cx="15" cy="7" r="2.3" fill="#6dffa8"></circle>' +
      '<circle cx="49" cy="7" r="2.3" fill="#6dffa8"></circle>' +
      '<path d="M18 24 A16 16 0 0 1 46 24" fill="none" stroke="#e0b56a" stroke-width="2"></path>' +
      '<ellipse cx="32" cy="36" rx="12" ry="13" fill="#b6f3c8"></ellipse>' +
      '<ellipse cx="27" cy="36" rx="2.6" ry="3.4" fill="#102018"></ellipse>' +
      '<ellipse cx="37" cy="36" rx="2.6" ry="3.4" fill="#102018"></ellipse>' +
      '<path d="M28 43 q4 3 8 0" fill="none" stroke="#102018" stroke-width="1.2" stroke-linecap="round"></path>' +
      '<path d="M18 52 h28 l-4 24 H22 Z" fill="currentColor"></path>' +
      '<circle cx="32" cy="64" r="3.2" fill="#e0b56a"></circle>';
  }

  function drawKing() {
    return '<circle cx="12" cy="10" r="0.9" fill="#7ea2e8"></circle><circle cx="52" cy="8" r="0.7" fill="#7ea2e8"></circle>' +
      '<path d="M18 28 h28 l-3 8 H21 Z" fill="#142033"></path>' +
      '<path d="M16 36 h32 v3.5 H16 Z" fill="#e0b56a"></path>' +
      '<polygon points="32,14 36,26 28,26" fill="#e0b56a"></polygon>' +
      '<circle cx="32" cy="46" r="11" fill="#f3c7a6"></circle>' +
      '<circle cx="28" cy="46" r="1.3" fill="#1c1917"></circle>' +
      '<circle cx="36" cy="46" r="1.3" fill="#1c1917"></circle>' +
      '<path d="M28 51 q4 2.6 8 0" fill="none" stroke="#1c1917" stroke-width="1.2" stroke-linecap="round"></path>' +
      '<path d="M16 58 h32 l-3 22 H19 Z" fill="currentColor"></path>' +
      '<rect x="14" y="58" width="8" height="4" fill="#e0b56a"></rect>' +
      '<rect x="42" y="58" width="8" height="4" fill="#e0b56a"></rect>' +
      '<path d="M50 34 l5-12 5 12 z" fill="#d5e4ff" stroke="#142033" stroke-width="1"></path>' +
      '<rect x="52" y="34" width="6" height="14" rx="1" fill="#31425f"></rect>' +
      '<path d="M53 48 q2 6 4 0" fill="none" stroke="#ffb703" stroke-width="1.4" stroke-linecap="round"></path>';
  }

  function pipField(suit, rank) {
    var count = rank + 1;
    var spots = PIP_LAYOUT[count];
    var size = count >= 10 ? 8 : count >= 7 ? 9.5 : 12;
    var body = starField();
    for (var i = 0; i < spots.length; i++) {
      body += suitIcon(suit, spots[i][0], spots[i][1], size, spots[i][2] === 1, false);
    }
    return artSvg("0 0 48 64", body, "sc-face-art");
  }

  function aceArt(suit) {
    var orbit = '<ellipse cx="24" cy="34" rx="18" ry="7" fill="none" stroke="#7ea2e8" stroke-width="1.3" transform="rotate(-18 24 34)"></ellipse>' +
      '<circle cx="40" cy="30" r="1.3" fill="#e0b56a"></circle>' + starField();
    return artSvg("0 0 48 64", orbit + suitIcon(suit, 24, 34, 30, false, true), "sc-face-art");
  }

  function courtArt(rank, suit) {
    var pic = rank === 10 ? drawJack() : rank === 11 ? drawQueen() : drawKing();
    var badge = suitIcon(suit, rank === 12 ? 47 : 32, rank === 12 ? 66 : 56, 12, false, false);
    return artSvg("0 0 64 86", pic + badge, "sc-face-art");
  }

  function faceArt(card) {
    if (card.rank === 0) return aceArt(card.suit);
    if (card.rank >= 10) return courtArt(card.rank, card.suit);
    return pipField(card.suit, card.rank);
  }

  function backArt() {
    return artSvg("0 0 80 112",
      '<rect width="80" height="112" rx="8" fill="#07111f"></rect>' +
      '<g fill="#d7e6ff">' +
      '<circle cx="14" cy="18" r="0.7"></circle><circle cx="26" cy="12" r="0.5"></circle>' +
      '<circle cx="62" cy="22" r="0.8"></circle><circle cx="48" cy="16" r="0.45"></circle>' +
      '<circle cx="18" cy="92" r="0.6"></circle><circle cx="66" cy="86" r="0.5"></circle>' +
      '<circle cx="12" cy="48" r="0.45"></circle><circle cx="70" cy="54" r="0.55"></circle>' +
      "</g>" +
      '<path d="M16 28 L24 22 L34 26 L46 18 L58 24" fill="none" stroke="#7ea2e8" stroke-width="0.8"></path>' +
      '<ellipse cx="40" cy="58" rx="14" ry="14" fill="#e0b56a"></ellipse>' +
      '<ellipse cx="40" cy="58" rx="26" ry="7" fill="none" stroke="#9fd4ff" stroke-width="2" transform="rotate(-16 40 58)"></ellipse>' +
      '<path d="M36 78 l4-12 4 12 z" fill="#d5e4ff"></path>' +
      '<rect x="37" y="78" width="6" height="12" rx="1" fill="#31425f"></rect>' +
      '<path d="M38 90 q2 5 4 0" fill="none" stroke="#ffb703" stroke-width="1.3" stroke-linecap="round"></path>' +
      '<rect x="6" y="6" width="68" height="100" rx="6" fill="none" stroke="#7ea2e8" stroke-width="1.6"></rect>',
      "sc-back-art");
  }

  var BACK_SVG = backArt();

  function mascotSVG() {
    return artSvg("0 0 68 64",
      '<circle cx="28" cy="28" r="14" fill="#f6c7a4"></circle>' +
      '<path d="M16 26c1-12 8-16 12-16s12 5 13 16c-3-8-7-10-13-10s-9 2-12 10z" fill="#3a2a22"></path>' +
      '<path d="M16 24c0-14 6-18 12-18s12 4 12 18" fill="none" stroke="#2a2118" stroke-width="2.5"></path>' +
      '<rect x="12" y="22" width="6" height="10" rx="2" fill="#2a2118"></rect>' +
      '<rect x="38" y="22" width="6" height="10" rx="2" fill="#2a2118"></rect>' +
      '<path d="M22 30q3 2 5 0M33 30q3 2 5 0" fill="none" stroke="#2a2118" stroke-width="1.4" stroke-linecap="round"></path>' +
      '<path d="M26 35q3 2.4 6 0" fill="none" stroke="#2a2118" stroke-width="1.2" stroke-linecap="round"></path>' +
      '<ellipse cx="22" cy="34" rx="2" ry="1.2" fill="#e8897a"></ellipse>' +
      '<ellipse cx="36" cy="34" rx="2" ry="1.2" fill="#e8897a"></ellipse>' +
      '<path d="M16 44c-2 12 4 16 12 16s14-4 12-16c-4 6-8 8-12 8s-8-2-12-8z" fill="#1f8a56"></path>' +
      '<path d="M28 52c0 0-3.2-2-3.2-4 0-1.6 1.3-2.6 2.5-1.6.6.4 1 .9 1.3 1.5.4-.6.7-1.1 1.3-1.5 1.2-1 2.5 0 2.5 1.6 0 2-3.2 4-4.4 4z" fill="#d3122a"></path>' +
      '<path d="M46 30h6l4-8 4 16 4-10 3 2" fill="none" stroke="#ffb3c2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path>',
      "sc-mascot");
  }

  function pulseSVG() {
    return artSvg("0 0 640 40",
      '<polyline points="0,24 70,24 90,24 110,8 128,34 146,24 220,24 250,24 270,10 290,34 308,24 420,24 460,24 480,8 500,34 518,24 640,24" fill="none" stroke="#ff8fab" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>',
      "sc-pulse");
  }

  function catSVG() {
    return artSvg("0 0 80 54",
      '<ellipse cx="40" cy="40" rx="26" ry="12" fill="#2a2118"></ellipse>' +
      '<circle cx="22" cy="30" r="12" fill="#2a2118"></circle>' +
      '<path d="M12 26 L16 12 L22 24Z" fill="#2a2118"></path>' +
      '<path d="M28 24 L34 12 L32 28Z" fill="#2a2118"></path>' +
      '<path d="M16 22 L18 16 L21 22Z" fill="#f6c7a4"></path>' +
      '<path d="M29 22 L31 16 L27 23Z" fill="#f6c7a4"></path>' +
      '<path d="M17 30h5M24 30h5" fill="none" stroke="#f0d48a" stroke-width="1.6" stroke-linecap="round"></path>' +
      '<path d="M58 36c8 2 10 10 4 12" fill="none" stroke="#2a2118" stroke-width="3" stroke-linecap="round"></path>' +
      '<path d="M48 16q3-6 6-1M56 14q3-6 5 0" fill="none" stroke="#f0d48a" stroke-width="1.5" stroke-linecap="round"></path>',
      "sc-cat");
  }

  function mugSVG() {
    return artSvg("0 0 56 52",
      '<path d="M44 16q3-6 1-8M36 16q3-6 1-8" fill="none" stroke="#d7f3ff" stroke-width="2" stroke-linecap="round"></path>' +
      '<rect x="14" y="16" width="26" height="30" rx="4" fill="#fffaf2" stroke="#2a2118" stroke-width="2"></rect>' +
      '<path d="M40 24h4a8 8 0 0 1 0 14h-4" fill="none" stroke="#2a2118" stroke-width="2"></path>' +
      '<path d="M27 30c0 0-4-2-4-4.2 0-1.6 1.5-2.6 2.8-1.5.6.5 1 1 1.2 1.6.3-.6.7-1.1 1.2-1.6 1.3-1.1 2.8-.1 2.8 1.5 0 2.2-4 4.2-4 4.2z" fill="#d3122a"></path>',
      "sc-mug");
  }

  function recycleArt() {
    return artSvg("0 0 64 64",
      '<path d="M34 14a20 20 0 1 1-8 38" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"></path>' +
      '<path d="M30 8 L18 20 L32 22Z" fill="currentColor"></path>' +
      '<circle cx="42" cy="36" r="7" fill="#f6c7a4"></circle>' +
      '<path d="M38 34q3 2.2 6 0" fill="none" stroke="#2a2118" stroke-width="1.4" stroke-linecap="round"></path>',
      "sc-recycle-art");
  }

  function crownArt() {
    return artSvg("0 0 40 24",
      '<path d="M4 18 L8 6 L14 14 L20 2 L26 14 L32 6 L36 18Z" fill="#f0d48a" stroke="#fff6e4" stroke-width="1" stroke-linejoin="round"></path>',
      "sc-crown");
  }

  function aceSlotArt() {
    return artSvg("0 0 36 18",
      '<path d="M4 14 Q18 2 32 14" fill="none" stroke="#fff6e4" stroke-width="2" stroke-linecap="round"></path>',
      "sc-ace-slot");
  }

  function cheerArt() {
    return artSvg("0 0 120 90",
      '<ellipse cx="60" cy="84" rx="28" ry="4" fill="#000" opacity=".12"></ellipse>' +
      '<path d="M40 48 L22 20" fill="none" stroke="#1f8a56" stroke-width="6" stroke-linecap="round"></path>' +
      '<path d="M80 48 L100 18" fill="none" stroke="#1f8a56" stroke-width="6" stroke-linecap="round"></path>' +
      '<circle cx="22" cy="16" r="5" fill="#f6c7a4"></circle>' +
      '<circle cx="100" cy="14" r="5" fill="#f6c7a4"></circle>' +
      '<path d="M44 50c-4 16 2 24 16 24s20-8 16-24c-6 8-10 10-16 10s-10-2-16-10z" fill="#1f8a56"></path>' +
      '<circle cx="60" cy="38" r="14" fill="#f6c7a4"></circle>' +
      '<path d="M48 36c1-12 8-16 12-16s12 4 13 16c-4-8-8-10-13-10s-9 2-12 10z" fill="#3a2a22"></path>' +
      '<path d="M48 34c0-14 6-16 12-16s12 3 12 16" fill="none" stroke="#2a2118" stroke-width="2.4"></path>' +
      '<rect x="44" y="32" width="6" height="9" rx="2" fill="#2a2118"></rect>' +
      '<rect x="70" y="32" width="6" height="9" rx="2" fill="#2a2118"></rect>' +
      '<circle cx="55" cy="39" r="1.4" fill="#2a2118"></circle>' +
      '<circle cx="65" cy="39" r="1.4" fill="#2a2118"></circle>' +
      '<path d="M56 44q4 3 8 0" fill="none" stroke="#2a2118" stroke-width="1.3" stroke-linecap="round"></path>' +
      '<path d="M16 46c0 0-5-3-5-6 0-2.2 2-3.6 3.6-2 .8.6 1.4 1.4 1.8 2.2.5-.8.9-1.6 1.7-2.2 1.6-1.4 3.6-.2 3.6 2 0 3-5.7 6-5.7 6z" fill="#d3122a"></path>' +
      '<path d="M98 36c0 0-4-2.4-4-4.6 0-1.8 1.6-2.8 2.8-1.6.6.4 1 1 1.3 1.6.4-.6.8-1.2 1.4-1.6 1.2-1 2.8 0 2.8 1.6 0 2.2-4.3 4.6-4.3 4.6z" fill="#d3122a"></path>',
      "sc-cheer");
  }

  function napArt() {
    return artSvg("0 0 120 90",
      '<ellipse cx="48" cy="72" rx="30" ry="10" fill="#d9c6ea"></ellipse>' +
      '<rect x="16" y="58" width="62" height="22" rx="11" fill="#6d5a8a"></rect>' +
      '<circle cx="42" cy="50" r="14" fill="#f6c7a4"></circle>' +
      '<path d="M30 48c1-12 8-16 12-16s12 4 13 16c-4-8-8-10-13-10s-9 2-12 10z" fill="#3a2a22"></path>' +
      '<path d="M30 46c0-14 6-16 12-16s12 3 12 16" fill="none" stroke="#2a2118" stroke-width="2.2"></path>' +
      '<rect x="26" y="44" width="6" height="8" rx="2" fill="#2a2118"></rect>' +
      '<rect x="52" y="44" width="6" height="8" rx="2" fill="#2a2118"></rect>' +
      '<path d="M36 52q3 2 6 0M46 52q3 2 6 0" fill="none" stroke="#2a2118" stroke-width="1.4" stroke-linecap="round"></path>' +
      '<path d="M84 34q6-8 4-2M96 26q6-10 4-2M108 18q6-8 3-1" fill="none" stroke="#6d5a8a" stroke-width="2.2" stroke-linecap="round"></path>',
      "sc-cheer");
  }

  var CSS = [
    ".sc-root{height:100%;min-height:100%;display:flex;flex-direction:column;overflow:hidden;",
    "background:#24160f;color:#f6f1e6;font-family:Georgia,'Times New Roman',serif;",
    "container-type:inline-size;user-select:none;-webkit-user-select:none;position:relative}",
    ".sc-root{--card-w:64px;--card-h:91px;--gap:8px;--row-gap:8px;--fan:20px;--up-gap:28px;--down-gap:14px}",
    ".is-compact .sc-mascot,.is-compact .sc-rule,.is-compact .sc-keys{display:none}",
    ".is-compact .sc-bar{padding:4px 8px;gap:6px}",
    ".is-compact .sc-title{font-size:16px}",
    ".is-compact .sc-foot{padding:4px 8px}",
    ".is-compact .sc-felt{margin:4px;padding:6px}",
    ".sc-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;",
    "padding:10px 14px;background:linear-gradient(#6b4423,#3e2716);border-bottom:4px solid #e0b56a;",
    "box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}",
    ".sc-brand{display:flex;align-items:center;gap:10px;min-width:0}",
    ".sc-mascot{width:58px;height:58px;flex:none;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}",
    ".sc-title{margin:0;font-size:clamp(16px,2.2cqw,28px);font-weight:700;letter-spacing:.01em;color:#fff6e4;",
    "text-shadow:0 2px 0 #2a160c}",
    ".sc-rule{margin:2px 0 0;font:600 12px/1.35 'Segoe UI',system-ui,sans-serif;color:#f0d7a8}",
    ".sc-stats{display:flex;gap:14px;font:700 13px/1 'Segoe UI',system-ui,sans-serif;color:#fff6e4}",
    ".sc-actions{display:flex;flex-wrap:wrap;gap:6px}",
    ".sc-actions button{font:700 13px/1 'Segoe UI',system-ui,sans-serif;color:#fff8ea;background:#146b45;",
    "border:2px solid #e0b56a;border-radius:999px;padding:7px 12px;cursor:pointer;box-shadow:0 2px 0 #0d3d28}",
    ".sc-actions button:hover:not(:disabled){background:#1b8054}",
    ".sc-actions button:disabled{opacity:.4;cursor:default;box-shadow:none}",
    ".sc-felt{position:relative;flex:1;min-height:0;overflow:auto;margin:8px;padding:14px 10px 24px;",
    "border:8px solid #7a4b28;border-radius:18px;",
    "box-shadow:inset 0 0 0 3px #e0b56a,inset 0 0 48px rgba(0,0,0,.22),0 7px 0 #3e2716;",
    "background:radial-gradient(circle at 12% 18%,rgba(255,255,255,.08),transparent 22%),",
    "radial-gradient(ellipse at 50% 42%,#39b07a 0%,#178453 46%,#0c4a30 100%)}",
    ".sc-doodles{position:absolute;inset:0;pointer-events:none;z-index:0}",
    ".sc-pulse{position:absolute;left:18%;width:64%;bottom:10px;height:28px;opacity:.9}",
    ".sc-cat{position:absolute;left:8px;bottom:6px;width:78px;height:54px}",
    ".sc-mug{position:absolute;right:10px;bottom:6px;width:46px;height:58px}",
    ".sc-pulse polyline{stroke-dasharray:46 14;animation:sc-dash 2.8s linear infinite}",
    "@keyframes sc-dash{to{stroke-dashoffset:-120}}",
    ".sc-row{position:relative;z-index:1;display:grid;grid-template-columns:repeat(7,var(--card-w));column-gap:var(--gap);",
    "justify-content:center;align-items:start}",
    ".sc-tab-row{margin-top:var(--row-gap)}",
    ".sc-pile{position:relative;min-height:var(--card-h);min-width:var(--card-w)}",
    ".sc-pile[data-zone=waste]{grid-column:span 2}",
    ".sc-fan{display:flex;align-items:flex-start}",
    ".sc-slot{width:var(--card-w);height:var(--card-h);box-sizing:border-box;border:2px dashed rgba(255,248,234,.5);",
    "border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;",
    "color:rgba(255,248,234,.8);background:rgba(0,0,0,.1)}",
    ".sc-slot span{font:800 calc(var(--card-w)*.26)/1 'Segoe UI',system-ui,sans-serif}",
    ".sc-slot svg{width:42%;height:auto}",
    ".sc-recycle{color:#fff6e4;border-style:solid;border-color:rgba(255,246,228,.75);background:rgba(0,0,0,.18)}",
    ".sc-recycle svg{width:64%}",
    ".sc-card{width:var(--card-w);height:var(--card-h);box-sizing:border-box;border-radius:9px;position:relative;overflow:hidden;",
    "background:radial-gradient(circle at 16% 0%,#fff 0%,transparent 36%),radial-gradient(circle at 86% 88%,rgba(126,162,232,.28),transparent 34%),linear-gradient(#f7f9ff,#e4ecf8);",
    "border:1px solid #5c739b;color:#1c1917;",
    "box-shadow:0 1px 0 rgba(255,255,255,.8) inset,0 2px 4px rgba(0,0,0,.28);",
    "font-family:'Segoe UI Symbol','Segoe UI','DejaVu Sans','Noto Sans Symbols 2',sans-serif;flex:none}",
    ".sc-card:not(.sc-back)::after{content:'';position:absolute;inset:3px;border:1.5px solid currentColor;border-radius:6px;",
    "opacity:.3;pointer-events:none;z-index:3}",
    ".sc-card.red{color:#d3122a}",
    ".sc-card.black{color:#1c1917}",
    ".sc-card.sc-back{background:#143e6b;border-color:#0b2744;color:#f6e7c1}",
    ".sc-card svg{pointer-events:none;display:block}",
    ".sc-face-art{position:absolute;left:12%;width:76%;top:20%;height:60%;z-index:1}",
    ".sc-back-art{position:absolute;inset:0;width:100%;height:100%;z-index:1}",
    ".sc-corner{position:absolute;top:2px;left:4px;z-index:4;display:flex;flex-direction:column;align-items:center;",
    "font-weight:800;line-height:.9;font-size:calc(var(--card-w)*.2);font-style:normal;",
    "background:#f7f9ff;box-shadow:0 0 0 2px #f7f9ff;border-radius:2px;padding:0 1px}",
    ".sc-corner b{font-weight:800}",
    ".sc-corner i{font-style:normal;font-size:.95em}",
    ".sc-br{top:auto;left:auto;right:4px;bottom:2px;transform:rotate(180deg)}",
    ".sc-count{position:absolute;right:3px;bottom:3px;background:#2a2118;color:#fff6e4;border:1px solid #e0b56a;",
    "font:800 11px/1 'Segoe UI',system-ui,sans-serif;padding:3px 4px;border-radius:999px;z-index:5}",
    ".is-cursor{outline:3px solid #ffe14a;outline-offset:2px;z-index:25}",
    ".is-selected{box-shadow:0 0 0 3px #7fd0ff,0 8px 16px rgba(0,0,0,.35);z-index:30}",
    ".is-span{box-shadow:inset 0 0 0 2px rgba(255,209,92,.95)}",
    ".is-hint{box-shadow:0 0 0 3px #5ee0a0;z-index:28}",
    ".is-hint-dest{box-shadow:0 0 0 3px #5ee0a0}",
    ".sc-pile.is-drop{outline:3px solid #c6ff6a;outline-offset:3px;border-radius:12px;background:rgba(198,255,106,.2);z-index:6}",
    ".is-dim{opacity:.4}",
    ".sc-foot{padding:8px 16px 10px;background:#3e2716;border-top:3px solid #e0b56a}",
    ".sc-msg{margin:0 0 4px;min-height:1.2em;font:700 14px/1.35 'Segoe UI',system-ui,sans-serif;color:#fff8ea}",
    ".sc-where{margin:0 0 4px;font:600 12px/1.3 'Segoe UI',system-ui,sans-serif;color:#f0d7a8}",
    ".sc-keys{margin:0;font:600 12px/1.45 'Segoe UI',system-ui,sans-serif;color:#f0d7a8}",
    ".sc-keys kbd{font:800 11px/1 'Segoe UI',system-ui,sans-serif;background:#146b45;border:1px solid #e0b56a;",
    "border-bottom-width:2px;border-radius:4px;padding:2px 4px;color:#fff8ea}",
    ".sc-banner{position:absolute;inset:0;z-index:40;display:grid;place-items:center;background:rgba(12,32,24,.55);",
    "text-align:center;padding:18px}",
    ".sc-banner[hidden]{display:none !important}",
    ".sc-banner-card{background:#fffaf2;color:#1c1917;border:4px solid #e0b56a;border-radius:18px;padding:12px 18px 16px;",
    "box-shadow:0 14px 0 rgba(0,0,0,.28);max-width:440px}",
    ".sc-banner-card h2{margin:4px 0 6px;font-size:clamp(26px,4cqw,42px);color:#146b45}",
    ".sc-banner-card p{margin:0;font:700 15px/1.4 'Segoe UI',system-ui,sans-serif}",
    ".sc-cheer{width:min(200px,46vw);height:auto;margin:0 auto}",
    ".sc-ghost{position:fixed;z-index:80;width:var(--card-w);margin:0;pointer-events:none;filter:drop-shadow(0 12px 10px rgba(0,0,0,.45))}",
    ".sc-credits{position:absolute;inset:0;z-index:90;display:grid;place-items:center;background:rgba(8,16,28,.62);padding:16px}",
    ".sc-credits[hidden]{display:none !important}",
    ".sc-credits-card{width:min(28rem,100%);background:#f7f9ff;color:#1c1917;border:4px solid #7ea2e8;border-radius:18px;",
    "padding:16px 18px 18px;text-align:center;box-shadow:0 14px 0 rgba(0,0,0,.28)}",
    ".sc-credits-card h2{margin:0 0 10px;font-size:clamp(22px,4cqw,32px);color:#142033}",
    ".sc-credits-name{margin:0 0 8px;font:700 1.15rem/1.3 Georgia,'Times New Roman',serif}",
    ".sc-credits-card p{margin:0 0 8px;font:600 15px/1.45 'Segoe UI',system-ui,sans-serif}",
    ".sc-credits-card a{color:#1d4ed8}",
    ".sc-credits-card button{margin-top:6px;font:700 14px/1 'Segoe UI',system-ui,sans-serif;color:#fff8ea;background:#146b45;",
    "border:2px solid #e0b56a;border-radius:999px;padding:7px 14px;cursor:pointer}",
    ".sc-card{touch-action:none}",
    "@media (prefers-reduced-motion:reduce){.sc-pulse polyline{animation:none}}"
  ].join("");

  function mount(el) {
    var saved = {
      position: el.style.position,
      height: el.style.height,
      minHeight: el.style.minHeight,
      overflow: el.style.overflow
    };
    el.replaceChildren();
    el.style.position = el.style.position && el.style.position !== "static" ? el.style.position : "relative";
    el.style.height = "100%";
    el.style.minHeight = "100%";
    el.style.overflow = "hidden";

    var root = document.createElement("div");
    root.style.setProperty('--space-scene','url("'+new URL('solitary-orbit-background.png',themeBase).href+'")');
    root.style.setProperty('--space-courts','url("'+new URL('space-courts.png',themeBase).href+'")');
    root.className = "sc-root";
    root.tabIndex = 0;
    root.setAttribute("role", "application");
    root.setAttribute("aria-label", "Solitaire: Cardio for Introverts");
    el.appendChild(root);

    root.innerHTML =
      "<style>" + CSS + "</style>" +
      '<header class="sc-bar">' +
        '<div class="sc-brand">' + mascotSVG() +
        "<div><h1 class=\"sc-title\">Solitaire: Cardio for Introverts</h1>" +
        '<p class="sc-rule">Klondike. Draw 3. Tableau down in alternating colors. Foundations up by suit, ace to king.</p></div></div>' +
        '<div class="sc-stats"><span data-home>Foundations 0/52</span><span data-moves>Moves 0</span></div>' +
        '<div class="sc-actions">' +
          '<button type="button" data-control="draw" tabindex="-1">Draw</button>' +
          '<button type="button" data-control="undo" tabindex="-1">Undo</button>' +
          '<button type="button" data-control="hint" tabindex="-1">Hint</button>' +
          '<button type="button" data-control="new" tabindex="-1">New</button>' +
          '<button type="button" data-control="restart" tabindex="-1">Restart</button>' +
          '<button type="button" data-control="credits" tabindex="-1">Credits</button>' +
        "</div></header>" +
      '<div class="sc-felt"><div class="sc-doodles" aria-hidden="true">' + pulseSVG() + catSVG() + mugSVG() + '</div>' +
      '<div class="sc-row" data-row="top"></div><div class="sc-row sc-tab-row" data-row="tab"></div>' +
      '<div class="sc-banner" data-banner hidden></div></div>' +
      '<footer class="sc-foot"><p class="sc-msg" data-msg aria-live="polite"></p>' +
      '<p class="sc-where" data-where></p>' +
      '<p class="sc-keys"><kbd>Arrows</kbd> move between piles and cards <kbd>Enter</kbd> or <kbd>Space</kbd> select, drop, or flip ' +
      "<kbd>D</kbd> draw <kbd>U</kbd> undo <kbd>H</kbd> hint <kbd>N</kbd> new <kbd>R</kbd> restart <kbd>Esc</kbd> quit</p></footer>" +
      '<div class="sc-credits" data-credits hidden>' +
        '<div class="sc-credits-card" role="dialog" aria-modal="true" aria-labelledby="sc-credits-title">' +
          '<h2 id="sc-credits-title">Credits</h2>' +
          '<p class="sc-credits-name">Travis MacDonald</p>' +
          '<p><a href="https://travisjmac.com">https://travisjmac.com</a></p>' +
          '<p><a href="mailto:travis@travisjmac.com">travis@travisjmac.com</a></p>' +
          "<p>Hope you like these. They were fun to make.</p>" +
          "<p>Use that urge to create. Building something you care about lasts longer than tearing something down. Enjoy these, then go make your own.</p>" +
          '<button type="button" data-control="credits-close">Close</button>' +
        "</div></div>";

    var themeSelect=document.createElement('select');themeSelect.className='sc-theme-picker';themeSelect.setAttribute('aria-label','Table theme');
    themeSelect.innerHTML='<option value="space">Solitary Orbit</option><option value="classic">Cardio for Introverts</option>';
    var themeLabel=document.createElement('label');themeLabel.className='sc-theme-label';themeLabel.append('Theme ',themeSelect);root.querySelector('.sc-actions').append(themeLabel);
    function applyTheme(value){root.dataset.theme=value;themeSelect.value=value;root.querySelector('.sc-title').textContent=value==='space'?'Solitary Orbit':'Solitaire: Cardio for Introverts';root.querySelector('.sc-rule').textContent=value==='space'?'In space, nobody can ask you to socialize.':'Klondike. Draw 3. Build down in alternating colours.';try{localStorage.setItem('solitaire-table-theme',value);}catch{}}
    themeSelect.addEventListener('change',function(){applyTheme(themeSelect.value);fitCards();});
    var initialTheme='space';try{initialTheme=localStorage.getItem('solitaire-table-theme')||'space';}catch{}applyTheme(initialTheme==='classic'?'classic':'space');
    var topRow = root.querySelector("[data-row=top]");
    var tabRow = root.querySelector("[data-row=tab]");
    var banner = root.querySelector("[data-banner]");
    var msgEl = root.querySelector("[data-msg]");
    var whereEl = root.querySelector("[data-where]");
    var homeEl = root.querySelector("[data-home]");
    var movesEl = root.querySelector("[data-moves]");
    var drawBtn = root.querySelector('[data-control="draw"]');
    var undoBtn = root.querySelector('[data-control="undo"]');
    var hintBtn = root.querySelector('[data-control="hint"]');
    var newBtn = root.querySelector('[data-control="new"]');
    var restartBtn = root.querySelector('[data-control="restart"]');
    var creditsEl = root.querySelector("[data-credits]");

    var seed = 1;
    var stock = [];
    var waste = [];
    var foundations = [[], [], [], []];
    var tableau = [[], [], [], [], [], [], []];
    var history = [];
    var selection = null;
    var message = "";
    var moveCount = 0;
    var won = false;
    var stopped = false;
    var currentHint = null;
    var hintList = [];
    var hintIndex = 0;
    var hintKey = "";
    var dead = false;
    var drag = null;
    var ghost = null;
    var lastClick = null;
    var creditsOpen = false;
    var audioCtx = null;
    var fitObserver = null;
    var cursor = { row: "top", top: 0, tab: 0, index: -1, backTab: 1 };

    function setStatus(text) {
      message = text;
    }

    function audio() {
      var Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctx) return null;
      if (!audioCtx) {
        try { audioCtx = new Ctx(); } catch (err) { return null; }
      }
      if (audioCtx.state === "suspended") {
        try { audioCtx.resume(); } catch (err2) { /* ignore */ }
      }
      return audioCtx;
    }

    function tone(freq, freq2, dur, vol, type) {
      var ctx = audio();
      if (!ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, t);
      if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq2), t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    function rustle(dur, vol, freq) {
      var ctx = audio();
      if (!ctx) return;
      var n = Math.max(1, Math.floor(ctx.sampleRate * dur));
      var buf = ctx.createBuffer(1, n, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq;
      var gain = ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    }

    function playClick() {
      tone(740, 420, 0.045, 0.03, "square");
    }

    function playShuffle() {
      rustle(0.16, 0.035, 1600);
      tone(240, 110, 0.14, 0.03, "triangle");
    }

    function playDraw() {
      rustle(0.07, 0.04, 2200);
      tone(480, 720, 0.08, 0.035, "sine");
    }

    function playMove() {
      tone(392, 523, 0.11, 0.04, "sine");
    }

    function fitCards() {
      if (dead) return;
      root.classList.toggle("is-compact", root.clientHeight < 560 || root.clientWidth < 780);
      var felt = root.querySelector(".sc-felt");
      if (!felt) return;
      var style = window.getComputedStyle(felt);
      var padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      var padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      var availW = felt.clientWidth - padX;
      var availH = felt.clientHeight - padY;
      if (!(availW > 30) || !(availH > 30)) return;
      var gap = Math.max(3, Math.min(10, availW * 0.012));
      var rowGap = Math.max(4, Math.min(12, availH * 0.018));
      var wFromW = (availW - 6 * gap) / 7;
      var wFromH = (availH - rowGap - 4) / (1.42 * 2.96);
      var w = Math.min(wFromW, wFromH, 96);
      if (!(w > 4)) w = 4;
      var cardH = w * 1.42;
      root.style.setProperty("--card-w", w.toFixed(2) + "px");
      root.style.setProperty("--card-h", cardH.toFixed(2) + "px");
      root.style.setProperty("--gap", gap.toFixed(2) + "px");
      root.style.setProperty("--row-gap", rowGap.toFixed(2) + "px");
      root.style.setProperty("--fan", (w * 0.32).toFixed(2) + "px");
      root.style.setProperty("--up-gap", (cardH * 0.3).toFixed(2) + "px");
      root.style.setProperty("--down-gap", (cardH * 0.16).toFixed(2) + "px");
    }

    function openCredits() {
      creditsOpen = true;
      creditsEl.hidden = false;
      playClick();
    }

    function closeCredits() {
      if (!creditsOpen) return;
      creditsOpen = false;
      creditsEl.hidden = true;
    }

    function homeCount() {
      var n = 0;
      for (var i = 0; i < foundations.length; i++) n += foundations[i].length;
      return n;
    }

    function deal(nextSeed) {
      seed = nextSeed >>> 0;
      var deck = shuffle(makeDeck(), mulberry32(seed));
      tableau = [[], [], [], [], [], [], []];
      var i = 0;
      var p;
      var c;
      for (p = 0; p < 7; p++) {
        for (c = 0; c <= p; c++) {
          var card = deck[i++];
          card.faceUp = c === p;
          tableau[p].push(card);
        }
      }
      stock = deck.slice(i);
      stock.reverse();
      for (c = 0; c < stock.length; c++) stock[c].faceUp = false;
      waste = [];
      foundations = [[], [], [], []];
    }

    function snapshot() {
      return {
        stock: stock.map(copyCard),
        waste: waste.map(copyCard),
        foundations: foundations.map(function (pile) { return pile.map(copyCard); }),
        tableau: tableau.map(function (pile) { return pile.map(copyCard); }),
        moveCount: moveCount
      };
    }

    function zoneInfo() {
      if (cursor.row === "tab") return { zone: "tableau", pile: cursor.tab };
      if (cursor.top === 0) return { zone: "stock", pile: 0 };
      if (cursor.top === 1) return { zone: "waste", pile: 0 };
      return { zone: "foundation", pile: cursor.top - 2 };
    }

    function focusable() {
      var info = zoneInfo();
      if (info.zone === "stock") return [];
      if (info.zone === "waste") return waste.length ? [waste.length - 1] : [];
      if (info.zone === "foundation") {
        var fp = foundations[info.pile];
        return fp.length ? [fp.length - 1] : [];
      }
      var pile = tableau[info.pile];
      var idxs = [];
      for (var i = 0; i < pile.length; i++) if (pile[i].faceUp) idxs.push(i);
      if (!idxs.length && pile.length) idxs.push(pile.length - 1);
      return idxs;
    }

    function defaultIndex() {
      var idxs = focusable();
      return idxs.length ? idxs[idxs.length - 1] : -1;
    }

    function clampCursor() {
      var idxs = focusable();
      if (!idxs.length) cursor.index = -1;
      else if (idxs.indexOf(cursor.index) === -1) cursor.index = idxs[idxs.length - 1];
    }

    function pileCards(zone, pile) {
      if (zone === "stock") return stock;
      if (zone === "waste") return waste;
      if (zone === "foundation") return foundations[pile];
      if (zone === "tableau") return tableau[pile];
      return [];
    }

    function canPick(zone, pile, index) {
      if (stopped || won) return false;
      if (zone === "waste") return waste.length > 0 && index === waste.length - 1;
      if (zone === "foundation") {
        var fp = foundations[pile];
        return fp.length > 0 && index === fp.length - 1;
      }
      if (zone !== "tableau") return false;
      var tp = tableau[pile];
      if (!tp[index] || !tp[index].faceUp) return false;
      for (var i = index; i < tp.length; i++) {
        if (!tp[i].faceUp) return false;
        if (i > index) {
          var prev = tp[i - 1];
          var cur = tp[i];
          if (prev.color === cur.color || cur.rank !== prev.rank - 1) return false;
        }
      }
      return true;
    }

    function peek(src) {
      if (!src || !canPick(src.zone, src.pile, src.index)) return null;
      if (src.zone === "waste") return [waste[waste.length - 1]];
      if (src.zone === "foundation") {
        var fp = foundations[src.pile];
        return [fp[fp.length - 1]];
      }
      return tableau[src.pile].slice(src.index);
    }

    function illegalReason(cards, destZone, destPile) {
      if (!cards || !cards.length) return "Nothing to move.";
      if (destZone === "foundation") {
        if (cards.length !== 1) return "Only one card can go to a foundation.";
        var card = cards[0];
        var pile = foundations[destPile];
        if (!pile.length) return card.rank === 0 ? "" : "Foundations start with an ace.";
        var top = pile[pile.length - 1];
        if (card.suit !== top.suit) return "Foundations build up by suit.";
        if (card.rank !== top.rank + 1) return "Foundations build up one rank at a time.";
        return "";
      }
      if (destZone === "tableau") {
        var lead = cards[0];
        var tp = tableau[destPile];
        if (!tp.length) return lead.rank === 12 ? "" : "Only a king can fill an empty pile.";
        var under = tp[tp.length - 1];
        if (!under.faceUp) return "That card is still face down.";
        if (lead.color === under.color) return "Tableau builds down in alternating colors.";
        if (lead.rank !== under.rank - 1) return "Tableau builds down one rank at a time.";
        return "";
      }
      if (destZone === "stock") return "The stock only deals cards.";
      if (destZone === "waste") return "Only the top waste card can be moved.";
      return "That spot won't take the cards.";
    }

    function forgetHint() {
      currentHint = null;
      hintKey = "";
      hintList = [];
      hintIndex = 0;
    }

    function placeCursorOn(src) {
      if (src.zone === "waste") {
        cursor.row = "top";
        cursor.top = 1;
        cursor.index = src.index;
      } else if (src.zone === "foundation") {
        cursor.row = "top";
        cursor.top = 2 + src.pile;
        cursor.index = src.index;
      } else if (src.zone === "tableau") {
        cursor.row = "tab";
        cursor.tab = src.pile;
        cursor.backTab = src.pile;
        cursor.index = src.index;
      }
    }

    function refreshWin() {
      won = homeCount() === 52;
    }

    function tryCommit(src, destZone, destPile) {
      if (stopped) return { ok: false, reason: "Stopped." };
      if (won) return { ok: false, reason: "Already won." };
      var cards = peek(src);
      if (!cards) return { ok: false, reason: "Nothing to pick up there." };
      if ((destZone === "tableau" || destZone === "foundation") && src.zone === destZone && src.pile === destPile) {
        return { ok: false, reason: "Those cards are already there." };
      }
      var reason = illegalReason(cards, destZone, destPile);
      if (reason) return { ok: false, reason: reason };
      var snap = snapshot();
      var moving;
      if (src.zone === "waste") moving = [waste.pop()];
      else if (src.zone === "foundation") moving = [foundations[src.pile].pop()];
      else {
        var from = tableau[src.pile];
        moving = from.splice(src.index);
        if (from.length && !from[from.length - 1].faceUp) from[from.length - 1].faceUp = true;
      }
      if (destZone === "foundation") foundations[destPile].push(moving[0]);
      else tableau[destPile].push.apply(tableau[destPile], moving);
      history.push(snap);
      if (history.length > 400) history.shift();
      moveCount += 1;
      selection = null;
      forgetHint();
      if (destZone === "foundation") {
        cursor.row = "top";
        cursor.top = 2 + destPile;
        cursor.index = foundations[destPile].length - 1;
      } else {
        cursor.row = "tab";
        cursor.tab = destPile;
        cursor.backTab = destPile;
        cursor.index = tableau[destPile].length - 1;
      }
      var lead = moving[0];
      var extra = moving.length > 1 ? " and " + (moving.length - 1) + " on it" : "";
      var destName = destZone === "foundation" ? "a foundation" : "tableau " + (destPile + 1);
      setStatus("Moved " + lead.label + lead.symbol + extra + " to " + destName + ".");
      playMove();
      refreshWin();
      if (won) setStatus("You win. All 52 cards are on the foundations.");
      render();
      return { ok: true };
    }

    function drawOrRecycle() {
      if (stopped) return;
      if (won) {
        setStatus("Already won.");
        render();
        return;
      }
      if (!stock.length && !waste.length) {
        setStatus("Nothing left to draw.");
        render();
        return;
      }
      var snap = snapshot();
      if (!stock.length) {
        stock = waste.slice().reverse();
        waste = [];
        for (var i = 0; i < stock.length; i++) stock[i].faceUp = false;
        history.push(snap);
        moveCount += 1;
        if (selection && selection.zone === "waste") selection = null;
        forgetHint();
        cursor.row = "top";
        cursor.top = 0;
        cursor.index = -1;
        setStatus("Recycled the waste into the stock.");
        playShuffle();
        render();
        return;
      }
      var n = Math.min(3, stock.length);
      var names = [];
      for (var d = 0; d < n; d++) {
        var card = stock.pop();
        card.faceUp = true;
        waste.push(card);
        names.push(card.label + card.symbol);
      }
      history.push(snap);
      if (history.length > 400) history.shift();
      moveCount += 1;
      if (selection && selection.zone === "waste") selection = null;
      forgetHint();
      cursor.row = "top";
      cursor.top = 1;
      cursor.index = waste.length - 1;
      setStatus(n === 1 ? "Drew " + names[0] + "." : "Drew " + names.join(", ") + ".");
      playDraw();
      render();
    }

    function flipTop(pileIndex) {
      var pile = tableau[pileIndex];
      if (!pile.length || pile[pile.length - 1].faceUp) return false;
      var snap = snapshot();
      var card = pile[pile.length - 1];
      card.faceUp = true;
      history.push(snap);
      moveCount += 1;
      forgetHint();
      cursor.row = "tab";
      cursor.tab = pileIndex;
      cursor.backTab = pileIndex;
      cursor.index = pile.length - 1;
      setStatus("Flipped " + card.label + card.symbol + ".");
      render();
      return true;
    }

    function undo() {
      if (stopped) return;
      if (!history.length) {
        setStatus("Nothing to undo.");
        render();
        return;
      }
      var snap = history.pop();
      stock = snap.stock;
      waste = snap.waste;
      foundations = snap.foundations;
      tableau = snap.tableau;
      moveCount = snap.moveCount;
      selection = null;
      forgetHint();
      refreshWin();
      clampCursor();
      setStatus("Undid the last move.");
      render();
    }

    function resetCursor() {
      cursor = { row: "top", top: 0, tab: 0, index: -1, backTab: 1 };
    }

    function newGame() {
      if (stopped) return;
      history = [];
      selection = null;
      forgetHint();
      moveCount = 0;
      won = false;
      lastClick = null;
      deal(randomSeed());
      resetCursor();
      setStatus("New game. Draw three from the stock.");
      playShuffle();
      render();
    }

    function restart() {
      if (stopped) return;
      history = [];
      selection = null;
      forgetHint();
      moveCount = 0;
      won = false;
      lastClick = null;
      deal(seed);
      resetCursor();
      setStatus("Restarted the same deal.");
      playShuffle();
      render();
    }

    function quit() {
      stopped = true;
      selection = null;
      forgetHint();
      endDrag();
      setStatus("Stopped.");
      render();
    }

    function isPointless(src, destZone, destPile) {
      return destZone === "tableau" && tableau[destPile].length === 0 && src.zone === "tableau" && src.index === 0;
    }

    function showHint() {
      if (stopped) return;
      if (won) {
        setStatus("Already won.");
        render();
        return;
      }
      var key = encodeCards(stock) + "|" + encodeCards(waste) + "|" +
        foundations.map(encodeCards).join("/") + "|" + tableau.map(encodeCards).join("/");
      if (key !== hintKey) {
        hintList = computeHints();
        hintIndex = 0;
        hintKey = key;
      } else if (hintList.length) {
        hintIndex = (hintIndex + 1) % hintList.length;
      }
      var hint = hintList[hintIndex];
      if (!hint) {
        currentHint = stock.length || waste.length ? { type: "draw" } : null;
        cursor.row = "top";
        cursor.top = 0;
        cursor.index = -1;
        if (stock.length) setStatus("Hint: draw from the stock.");
        else if (waste.length) setStatus("Hint: recycle the waste.");
        else setStatus("No moves left.");
        render();
        return;
      }
      currentHint = hint;
      placeCursorOn(hint.src);
      var text = hintText(hint);
      if (hintList.length > 1) text += " (" + (hintIndex + 1) + "/" + hintList.length + ")";
      setStatus(text);
      render();
    }

    function computeHints() {
      var sources = [];
      var i;
      if (waste.length) sources.push({ zone: "waste", pile: 0, index: waste.length - 1 });
      for (i = 0; i < tableau.length; i++) {
        for (var k = 0; k < tableau[i].length; k++) {
          if (canPick("tableau", i, k)) sources.push({ zone: "tableau", pile: i, index: k });
        }
      }
      for (i = 0; i < foundations.length; i++) {
        if (foundations[i].length) sources.push({ zone: "foundation", pile: i, index: foundations[i].length - 1 });
      }
      var moves = [];
      for (i = 0; i < sources.length; i++) {
        var src = sources[i];
        var cards = peek(src);
        if (!cards) continue;
        var fi;
        if (cards.length === 1) {
          for (fi = 0; fi < 4; fi++) {
            if (src.zone === "foundation" && src.pile === fi) continue;
            if (!illegalReason(cards, "foundation", fi)) {
              moves.push({ src: src, dest: { zone: "foundation", pile: fi }, cards: cards, priority: priority(src, "foundation") });
            }
          }
        }
        for (fi = 0; fi < 7; fi++) {
          if (src.zone === "tableau" && src.pile === fi) continue;
          if (isPointless(src, "tableau", fi)) continue;
          if (!illegalReason(cards, "tableau", fi)) {
            moves.push({ src: src, dest: { zone: "tableau", pile: fi }, cards: cards, priority: priority(src, "tableau") });
          }
        }
      }
      moves.sort(function (a, b) { return a.priority - b.priority || a.cards.length - b.cards.length; });
      return moves.slice(0, 8);
    }

    function priority(src, destZone) {
      var reveals = src.zone === "tableau" && src.index > 0 && !tableau[src.pile][src.index - 1].faceUp;
      if (reveals) return destZone === "tableau" ? 0 : 1;
      if (src.zone === "waste" && destZone === "foundation") return 2;
      if (src.zone === "tableau" && destZone === "foundation") return 3;
      if (src.zone === "waste") return 4;
      if (src.zone === "foundation") return 6;
      return 5;
    }

    function hintText(hint) {
      var lead = hint.cards[0];
      var name = lead.label + lead.symbol;
      var extra = hint.cards.length > 1 ? " and the " + (hint.cards.length - 1) + " on it" : "";
      if (hint.dest.zone === "foundation") {
        var fp = foundations[hint.dest.pile];
        if (!fp.length) return "Hint: start a foundation with " + name + ".";
        var top = fp[fp.length - 1];
        return "Hint: move " + name + " onto " + top.label + top.symbol + ".";
      }
      var tp = tableau[hint.dest.pile];
      if (!tp.length) return "Hint: move " + name + extra + " to an empty pile.";
      var under = tp[tp.length - 1];
      return "Hint: move " + name + extra + " onto " + under.label + under.symbol + ".";
    }

    function describeSelection() {
      var cards = peek(selection);
      if (!cards || !cards.length) return "Selected.";
      var name = cards[0].label + cards[0].symbol;
      if (cards.length === 1) return "Selected " + name + ". Enter on a pile to drop it.";
      return "Selected " + name + " and the " + (cards.length - 1) + " on it. Enter on a pile to drop.";
    }

    function sameSelection(zone, pile, index) {
      return selection && selection.zone === zone && selection.pile === pile && selection.index === index && index !== -1;
    }

    function activateAt(zone, pile, index) {
      if (stopped) return;
      if (zone === "stock") {
        drawOrRecycle();
        return;
      }
      if (won) {
        setStatus("Already won. Undo, restart, or start a new game.");
        render();
        return;
      }
      if (zone === "waste" && waste.length && index !== -1 && index !== waste.length - 1) {
        setStatus("Only the top waste card can be moved.");
        render();
        return;
      }
      if (zone === "waste" && index === -1 && waste.length) index = waste.length - 1;
      if (zone === "foundation" && index === -1 && foundations[pile].length) index = foundations[pile].length - 1;
      if (zone === "tableau" && index >= 0 && tableau[pile][index] && !tableau[pile][index].faceUp) {
        if (index === tableau[pile].length - 1) {
          flipTop(pile);
          return;
        }
        setStatus("That card is face down.");
        render();
        return;
      }
      if (sameSelection(zone, pile, index)) {
        selection = null;
        setStatus("Released.");
        render();
        return;
      }
      if (selection && (zone === "tableau" || zone === "foundation")) {
        var result = tryCommit(selection, zone, pile);
        if (result.ok) return;
        if (index !== -1 && canPick(zone, pile, index)) {
          selection = { zone: zone, pile: pile, index: index };
          setStatus(describeSelection());
          render();
          return;
        }
        setStatus(result.reason);
        render();
        return;
      }
      if (canPick(zone, pile, index)) {
        selection = { zone: zone, pile: pile, index: index };
        setStatus(describeSelection());
        render();
        return;
      }
      setStatus("Nothing to pick up there.");
      render();
    }

    function trySendKing(zone, pile, index) {
      if (!canPick(zone, pile, index)) return false;
      var src = { zone: zone, pile: pile, index: index };
      var cards = peek(src);
      if (!cards || cards[0].rank !== 12) return false;
      for (var i = 0; i < tableau.length; i++) {
        if (zone === "tableau" && pile === i) continue;
        if (!tableau[i].length) {
          tryCommit(src, "tableau", i);
          return true;
        }
      }
      return false;
    }

    function trySendHome(zone, pile, index) {
      if (!canPick(zone, pile, index)) return false;
      var src = { zone: zone, pile: pile, index: index };
      var cards = peek(src);
      if (!cards || cards.length !== 1) return false;
      for (var i = 0; i < 4; i++) {
        if (zone === "foundation" && pile === i) continue;
        if (!illegalReason(cards, "foundation", i)) {
          tryCommit(src, "foundation", i);
          return true;
        }
      }
      return false;
    }

    function activateCursor() {
      var info = zoneInfo();
      activateAt(info.zone, info.pile, cursor.index);
    }

    function ascend() {
      var tab = cursor.tab;
      cursor.backTab = tab;
      cursor.row = "top";
      if (tab === 0) cursor.top = 0;
      else if (tab <= 2) cursor.top = 1;
      else cursor.top = tab - 1;
      cursor.index = defaultIndex();
    }

    function descend() {
      var top = cursor.top;
      cursor.row = "tab";
      if (top === 0) cursor.tab = 0;
      else if (top === 1) cursor.tab = cursor.backTab === 2 ? 2 : 1;
      else cursor.tab = top + 1;
      cursor.backTab = cursor.tab;
      cursor.index = defaultIndex();
    }

    function moveCursor(dx, dy) {
      if (dx) {
        if (cursor.row === "top") {
          cursor.top = clamp(cursor.top + dx, 0, 5);
          if (cursor.top !== 1) cursor.backTab = 1;
        } else {
          cursor.tab = clamp(cursor.tab + dx, 0, 6);
          cursor.backTab = cursor.tab;
        }
        cursor.index = defaultIndex();
      } else if (dy < 0) {
        if (cursor.row === "tab") {
          var idxs = focusable();
          var pos = idxs.indexOf(cursor.index);
          if (pos > 0) cursor.index = idxs[pos - 1];
          else ascend();
        }
      } else if (cursor.row === "top") {
        descend();
      } else {
        var down = focusable();
        var at = down.indexOf(cursor.index);
        if (at !== -1 && at < down.length - 1) cursor.index = down[at + 1];
      }
      render();
    }

    function onKey(e) {
      if (dead) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var key = e.key === " " || e.code === "Space" ? " " : String(e.key || "").toLowerCase();
      var handled = {
        arrowleft: 1, arrowright: 1, arrowup: 1, arrowdown: 1,
        enter: 1, " ": 1, d: 1, u: 1, h: 1, n: 1, r: 1, escape: 1
      };
      if (!handled[key]) return;
      e.preventDefault();
      if (creditsOpen) {
        if (key === "escape") closeCredits();
        return;
      }
      if (stopped) return;
      if (e.repeat && key !== "arrowleft" && key !== "arrowright" && key !== "arrowup" && key !== "arrowdown") return;
      if (key === "escape") return quit();
      if (key === "n") return newGame();
      if (key === "r") return restart();
      if (key === "u") return undo();
      if (key === "h") return showHint();
      if (key === "d") return drawOrRecycle();
      if (key === "arrowleft") return moveCursor(-1, 0);
      if (key === "arrowright") return moveCursor(1, 0);
      if (key === "arrowup") return moveCursor(0, -1);
      if (key === "arrowdown") return moveCursor(0, 1);
      activateCursor();
    }

    function cardHTML(card, index, classes, margin) {
      var cls = "sc-card " + card.color + (card.faceUp ? "" : " sc-back") + (classes ? " " + classes : "");
      var style = "z-index:" + (index + 1);
      if (margin) style += ";" + margin;
      var attrs = ' class="' + cls + '" style="' + style + '" data-card="' + card.id + '" data-index="' + index +
        '" data-face="' + (card.faceUp ? "up" : "down") + '" data-suit="' + card.suit + '" data-rank="' + card.rank +
        '" data-color="' + card.color + '" role="button"';
      if (!card.faceUp) {
        return "<div" + attrs + ' aria-label="Face-down card">' + BACK_SVG + "</div>";
      }
      var name = esc(card.label) + " of " + card.name;
      return "<div" + attrs + ' aria-label="' + name + '" title="' + name + '">' +
        faceArt(card) + (card.rank >= 10 ? '<span class="sc-space-court" aria-hidden="true" style="background-position:' + ((card.rank-10)*50) + '% 0"></span>' : '') +
        '<span class="sc-corner" aria-hidden="true"><b>' + esc(card.label) + "</b><i>" + '<span class="sc-standard-symbol">'+card.symbol+'</span>'+spaceSuitSVG(card.suit) + "</i></span>" +
        '<span class="sc-corner sc-br" aria-hidden="true"><b>' + esc(card.label) + "</b><i>" + '<span class="sc-standard-symbol">'+card.symbol+'</span>'+spaceSuitSVG(card.suit) + "</i></span></div>";
    }

    function classesFor(zone, pile, index, cardCount) {
      var list = [];
      var info = zoneInfo();
      var onCursor = info.zone === zone && info.pile === pile && cursor.index === index;
      if (onCursor) list.push("is-cursor");
      if (selection && selection.zone === zone && selection.pile === pile && index >= selection.index && canPick(selection.zone, selection.pile, selection.index)) {
        list.push("is-selected");
      } else if (!selection && info.zone === zone && info.pile === pile && cursor.index >= 0 && index >= cursor.index && cardCount && zone === "tableau") {
        var pileCardsNow = tableau[pile];
        if (pileCardsNow[cursor.index] && pileCardsNow[cursor.index].faceUp) list.push("is-span");
      }
      if (currentHint && currentHint.src && currentHint.src.zone === zone && currentHint.src.pile === pile && index >= currentHint.src.index) {
        list.push("is-hint");
      }
      if (currentHint && currentHint.dest && currentHint.dest.zone === zone && currentHint.dest.pile === pile && index === cardCount - 1) {
        list.push("is-hint-dest");
      }
      return list.join(" ");
    }

    function slotHTML(mark, recycle) {
      if (recycle) return '<div class="sc-slot sc-recycle" aria-label="Recycle the waste">' + recycleArt() + "</div>";
      var deco = mark === "K" ? crownArt() : mark === "A" ? aceSlotArt() : "";
      return '<div class="sc-slot">' + deco + (mark ? "<span>" + mark + "</span>" : "") + "</div>";
    }

    function pileOpen(zone, pile, cards, extra) {
      var info = zoneInfo();
      var cursorPile = !cards.length && info.zone === zone && info.pile === pile;
      var hintPile = !cards.length && currentHint && currentHint.dest && currentHint.dest.zone === zone && currentHint.dest.pile === pile;
      var drawHint = zone === "stock" && currentHint && currentHint.type === "draw";
      var cls = "sc-pile" + (cursorPile || drawHint ? " is-cursor" : "") + (hintPile ? " is-hint-dest" : "") + (extra ? " " + extra : "");
      return '<div class="' + cls + '" data-zone="' + zone + '" data-pile="' + pile + '" data-cards="' + encodeCards(cards) + '">';
    }

    function renderBoard() {
      clampCursor();
      var html = [];
      var info = zoneInfo();
      html.push(pileOpen("stock", 0, stock, ""));
      if (stock.length) {
        var topStock = stock[stock.length - 1];
        var stockCursor = info.zone === "stock" ? " is-cursor" : "";
        html.push(cardHTML(topStock, stock.length - 1, stockCursor.trim(), ""));
        html.push('<span class="sc-count">' + stock.length + "</span>");
      } else {
        html.push(slotHTML("", waste.length > 0));
      }
      html.push("</div>");

      html.push(pileOpen("waste", 0, waste, ""));
      if (!waste.length) html.push(slotHTML("", false));
      else {
        html.push('<div class="sc-fan">');
        var start = Math.max(0, waste.length - 3);
        for (var w = start; w < waste.length; w++) {
          var margin = w === start ? "" : "margin-left:calc(var(--fan) - var(--card-w))";
          html.push(cardHTML(waste[w], w, classesFor("waste", 0, w, waste.length), margin));
        }
        html.push("</div>");
        if (waste.length > 3) html.push('<span class="sc-count">' + waste.length + "</span>");
      }
      html.push("</div>");

      for (var f = 0; f < 4; f++) {
        html.push(pileOpen("foundation", f, foundations[f], ""));
        if (!foundations[f].length) html.push(slotHTML("A", false));
        else {
          var topf = foundations[f][foundations[f].length - 1];
          html.push(cardHTML(topf, foundations[f].length - 1, classesFor("foundation", f, foundations[f].length - 1, foundations[f].length), ""));
        }
        html.push("</div>");
      }
      topRow.innerHTML = html.join("");

      var tab = [];
      for (var p = 0; p < 7; p++) {
        tab.push(pileOpen("tableau", p, tableau[p], ""));
        if (!tableau[p].length) tab.push(slotHTML("K", false));
        else {
          for (var i = 0; i < tableau[p].length; i++) {
            var marginTop = "";
            if (i > 0) {
              var prevUp = tableau[p][i - 1].faceUp;
              marginTop = "margin-top:calc(" + (prevUp ? "var(--up-gap)" : "var(--down-gap)") + " - var(--card-h))";
            }
            tab.push(cardHTML(tableau[p][i], i, classesFor("tableau", p, i, tableau[p].length), marginTop));
          }
        }
        tab.push("</div>");
      }
      tabRow.innerHTML = tab.join("");
    }

    function cursorLabel() {
      var info = zoneInfo();
      if (info.zone === "stock") {
        if (stock.length) return "Cursor: stock, " + stock.length + " cards";
        return waste.length ? "Cursor: empty stock, ready to recycle" : "Cursor: empty stock";
      }
      if (info.zone === "waste") {
        if (!waste.length) return "Cursor: empty waste";
        var w = waste[waste.length - 1];
        return "Cursor: waste " + w.label + w.symbol;
      }
      if (info.zone === "foundation") {
        var fp = foundations[info.pile];
        if (!fp.length) return "Cursor: foundation " + (info.pile + 1) + ", empty";
        return "Cursor: foundation " + fp[fp.length - 1].label + fp[fp.length - 1].symbol;
      }
      var tp = tableau[info.pile];
      if (!tp.length) return "Cursor: tableau " + (info.pile + 1) + ", empty";
      var idx = cursor.index >= 0 ? cursor.index : tp.length - 1;
      var card = tp[idx];
      if (!card || !card.faceUp) return "Cursor: tableau " + (info.pile + 1) + ", face down";
      var riding = tp.length - idx - 1;
      if (riding > 0) return "Cursor: tableau " + (info.pile + 1) + ", " + card.label + card.symbol + " and " + riding + " on it";
      return "Cursor: tableau " + (info.pile + 1) + ", " + card.label + card.symbol;
    }

    function render() {
      if (dead) return;
      if (selection && !canPick(selection.zone, selection.pile, selection.index)) selection = null;
      renderBoard();
      var info = zoneInfo();
      root.dataset.seed = String(seed);
      root.dataset.moves = String(moveCount);
      root.dataset.won = won ? "true" : "false";
      root.dataset.stopped = stopped ? "true" : "false";
      root.dataset.message = message;
      root.dataset.cursor = cursor.row + ":" + info.zone + ":" + info.pile + ":" + cursor.index + ":" + cursor.backTab;
      root.dataset.stock = String(stock.length);
      root.dataset.waste = String(waste.length);
      root.dataset.home = String(homeCount());
      msgEl.textContent = message;
      whereEl.textContent = cursorLabel();
      homeEl.textContent = "Foundations " + homeCount() + "/52";
      movesEl.textContent = "Moves " + moveCount;
      drawBtn.disabled = stopped || won;
      undoBtn.disabled = stopped || history.length === 0;
      hintBtn.disabled = stopped || won;
      newBtn.disabled = stopped;
      restartBtn.disabled = stopped;
      if (stopped) {
        banner.hidden = false;
        banner.innerHTML = '<div class="sc-banner-card">' + napArt() + "<h2>Stopped</h2><p>The table is closed.</p></div>";
      } else if (won) {
        banner.hidden = false;
        banner.innerHTML = '<div class="sc-banner-card">' + cheerArt() + "<h2>You win</h2><p>All 52 cards are on the foundations.</p></div>";
      } else {
        banner.hidden = true;
        banner.innerHTML = "";
      }
      var current = root.querySelector(".is-cursor");
      if (!drag && current && typeof current.scrollIntoView === "function") {
        try { current.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (err) { /* ignore */ }
      }
    }

    function endDrag() {
      if (drag && root.releasePointerCapture && drag.pointerId !== undefined && root.hasPointerCapture && root.hasPointerCapture(drag.pointerId)) {
        try { root.releasePointerCapture(drag.pointerId); } catch (err) { /* ignore */ }
      }
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;
      drag = null;
      var dimmed = root.querySelectorAll(".is-dim");
      for (var i = 0; i < dimmed.length; i++) dimmed[i].classList.remove("is-dim");
      clearDropMarks();
    }

    function clearDropMarks() {
      var drops = root.querySelectorAll(".is-drop");
      for (var j = 0; j < drops.length; j++) drops[j].classList.remove("is-drop");
    }

    function canDropOn(src, destZone, destPile) {
      if (!src || (destZone !== "tableau" && destZone !== "foundation")) return false;
      if (src.zone === destZone && src.pile === destPile) return false;
      var cards = peek(src);
      if (!cards) return false;
      return !illegalReason(cards, destZone, destPile);
    }

    function overlapArea(a, b) {
      var w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      var h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w <= 0 || h <= 0) return 0;
      return w * h;
    }

    function leadRect() {
      if (!ghost) return null;
      var card = ghost.querySelector(".sc-card");
      return card ? card.getBoundingClientRect() : ghost.getBoundingClientRect();
    }

    function bestDrop() {
      var card = leadRect();
      if (!card || !drag) return null;
      var area = card.width * card.height;
      if (!(area > 0)) return null;
      var piles = root.querySelectorAll(".sc-pile");
      var best = null;
      var bestRatio = 0.4;
      for (var i = 0; i < piles.length; i++) {
        var pileEl = piles[i];
        var zone = pileEl.dataset.zone;
        var pile = Number(pileEl.dataset.pile || 0);
        if (!canDropOn(drag, zone, pile)) continue;
        var ratio = overlapArea(card, pileEl.getBoundingClientRect()) / area;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = pileEl;
        }
      }
      return best;
    }

    function markLegalDrop() {
      clearDropMarks();
      var pileEl = bestDrop();
      if (pileEl) pileEl.classList.add("is-drop");
    }

    function placeGhost(clientX, clientY) {
      if (!ghost || !drag) return;
      var origin = root.getBoundingClientRect();
      ghost.style.left = (clientX - origin.left - drag.grabDX) + "px";
      ghost.style.top = (clientY - origin.top - drag.grabDY) + "px";
    }

    function pointCursor(zone, pile, index) {
      if (zone === "stock") {
        cursor.row = "top";
        cursor.top = 0;
        cursor.index = -1;
      } else if (zone === "waste") {
        cursor.row = "top";
        cursor.top = 1;
        if (cursor.backTab !== 2) cursor.backTab = 1;
        cursor.index = waste.length ? waste.length - 1 : -1;
      } else if (zone === "foundation") {
        cursor.row = "top";
        cursor.top = 2 + pile;
        cursor.index = foundations[pile].length ? foundations[pile].length - 1 : -1;
      } else if (zone === "tableau") {
        cursor.row = "tab";
        cursor.tab = pile;
        cursor.backTab = pile;
        var idxs = focusable();
        if (idxs.indexOf(index) !== -1) cursor.index = index;
        else cursor.index = idxs.length ? idxs[idxs.length - 1] : -1;
      }
    }

    function onPointerDown(e) {
      if (dead || stopped || won || creditsOpen) return;
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest && e.target.closest("[data-control]")) return;
      var pileEl = e.target.closest ? e.target.closest("[data-zone]") : null;
      if (!pileEl || !root.contains(pileEl)) return;
      var zone = pileEl.dataset.zone;
      var pile = Number(pileEl.dataset.pile || 0);
      var cardEl = e.target.closest("[data-card]");
      var index = cardEl ? Number(cardEl.dataset.index) : -1;
      var cardRect = cardEl ? cardEl.getBoundingClientRect() : null;
      pointCursor(zone, pile, index);
      drag = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        grabDX: cardRect ? e.clientX - cardRect.left : 0,
        grabDY: cardRect ? e.clientY - cardRect.top : 0,
        zone: zone,
        pile: pile,
        index: index,
        moved: false,
        shifted: false
      };
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerUp);
      if (e.pointerId !== undefined && root.setPointerCapture) {
        try { root.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      if (e.cancelable) e.preventDefault();
      render();
    }

    function onPointerMove(e) {
      if (!drag || (e.pointerId !== undefined && drag.pointerId !== undefined && e.pointerId !== drag.pointerId)) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      if (dx * dx + dy * dy < 36) return;
      drag.shifted = true;
      if (!drag.moved) {
        if (!canPick(drag.zone, drag.pile, drag.index)) return;
        drag.moved = true;
        var cards = peek(drag);
        if (!cards) return;
        var nodes = root.querySelectorAll('[data-zone="' + drag.zone + '"][data-pile="' + drag.pile + '"] [data-index]');
        for (var i = 0; i < nodes.length; i++) {
          if (Number(nodes[i].dataset.index) >= drag.index) nodes[i].classList.add("is-dim");
        }
        ghost = document.createElement("div");
        ghost.className = "sc-ghost";
        ghost.style.pointerEvents = "none";
        var gh = "";
        for (var c = 0; c < cards.length; c++) {
          var margin = "";
          if (c > 0) margin = "margin-top:calc(var(--up-gap) - var(--card-h))";
          gh += cardHTML(cards[c], c, "", margin);
        }
        ghost.innerHTML = gh;
        root.appendChild(ghost);
      }
      placeGhost(e.clientX, e.clientY);
      if (e.cancelable) e.preventDefault();
      markLegalDrop();
    }

    function onPointerUp(e) {
      if (!drag) return;
      var info = drag;
      var moved = info.moved;
      var shifted = info.shifted;
      var pileEl = moved ? bestDrop() : null;
      endDrag();
      if (info.zone === "stock") {
        if (!shifted) drawOrRecycle();
        else render();
        return;
      }
      if (moved) {
        var src = { zone: info.zone, pile: info.pile, index: info.index };
        var zone = pileEl ? pileEl.dataset.zone : "";
        var pile = pileEl ? Number(pileEl.dataset.pile || 0) : -1;
        if (pileEl && canDropOn(src, zone, pile)) {
          tryCommit(src, zone, pile);
          return;
        }
        selection = null;
        setStatus("Snapped back.");
        render();
        return;
      }
      if (shifted) {
        render();
        return;
      }
      var now = Date.now();
      var dbl = lastClick && lastClick.zone === info.zone && lastClick.pile === info.pile && lastClick.index === info.index && now - lastClick.t < 450;
      lastClick = { zone: info.zone, pile: info.pile, index: info.index, t: now };
      if (dbl && (trySendKing(info.zone, info.pile, info.index) || trySendHome(info.zone, info.pile, info.index))) return;
      playClick();
      activateAt(info.zone, info.pile, info.index);
    }

    function onControlClick(e) {
      if (e.target === creditsEl) {
        closeCredits();
        return;
      }
      var btn = e.target.closest ? e.target.closest("[data-control]") : null;
      if (!btn || btn.disabled) return;
      var action = btn.dataset.control;
      if (action === "credits") return openCredits();
      if (action === "credits-close") return closeCredits();
      if (creditsOpen) return;
      if (action === "draw") return drawOrRecycle();
      if (action === "new") return newGame();
      if (action === "restart") return restart();
      playClick();
      if (action === "undo") undo();
      else if (action === "hint") showHint();
    }

    function onMouseDown(e) {
      if (e.target.closest && e.target.closest("[data-control]")) e.preventDefault();
    }

    document.addEventListener("keydown", onKey);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("click", onControlClick);
    root.addEventListener("mousedown", onMouseDown);

    deal(randomSeed());
    setStatus("Draw three from the stock. Build down in alternating colors.");
    render();
    fitCards();
    if (typeof ResizeObserver === "function") {
      fitObserver = new ResizeObserver(fitCards);
      fitObserver.observe(root);
    } else {
      window.addEventListener("resize", fitCards);
    }
    if (typeof root.focus === "function") {
      try { root.focus({ preventScroll: true }); } catch (err) { root.focus(); }
    }

    return {
      destroy: function () {
        if (dead) return;
        dead = true;
        endDrag();
        closeCredits();
        if (fitObserver) fitObserver.disconnect();
        window.removeEventListener("resize", fitCards);
        if (audioCtx && audioCtx.close) {
          try { audioCtx.close(); } catch (err) { /* ignore */ }
        }
        document.removeEventListener("keydown", onKey);
        root.removeEventListener("pointerdown", onPointerDown);
        root.removeEventListener("click", onControlClick);
        root.removeEventListener("mousedown", onMouseDown);
        el.replaceChildren();
        el.style.position = saved.position;
        el.style.height = saved.height;
        el.style.minHeight = saved.minHeight;
        el.style.overflow = saved.overflow;
      }
    };
  }

  globalThis.DESKTOP_GAMES = globalThis.DESKTOP_GAMES || {};
  globalThis.DESKTOP_GAMES["solitaire-cardio"] = {
    id: "solitaire-cardio",
    title: "Solitaire: Cardio for Introverts",
    mount: mount
  };

  if (typeof document !== "undefined" && document.body && document.body.hasAttribute("data-game-player")) {
    var host = document.createElement("div");
    host.setAttribute("data-game-player-root", "solitaire-cardio");
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.width = "100%";
    host.style.height = "100%";
    host.style.overflow = "hidden";
    document.documentElement.style.margin = "0";
    document.documentElement.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.background = "#10261c";
    document.body.appendChild(host);
    mount(host);
  }
})();

