import Phaser from "phaser";
import {
  playSlide,
  playMerge,
  playBigMerge,
  playGameOver,
} from "../../../../common/audio.js";

// Card dimensions
const CW = 52;
const CH = 72;
const CR = 6;

// Suit symbols and colors
const SUITS = ["H", "D", "C", "S"]; // hearts, diamonds, clubs, spades
const SUIT_SYMBOLS = { H: "\u2665", D: "\u2666", C: "\u2663", S: "\u2660" };
const SUIT_COLORS = { H: "#e74c3c", D: "#e74c3c", C: "#2c3e50", S: "#2c3e50" };
const RANK_NAMES = [
  "",
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

function createDeck() {
  const deck = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 1; r <= 13; r++) {
      deck.push({ rank: r, suit: SUITS[s] });
    }
  }
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function canMatch(rank1, rank2) {
  const diff = Math.abs(rank1 - rank2);
  return diff === 1 || diff === 12; // wraps K<->A
}

// Tri-Peaks layout: 3 peaks, each is a small pyramid
// Row 0: 3 cards (peaks)
// Row 1: 6 cards
// Row 2: 9 cards
// Row 3: 10 cards (fully open)
function buildTowerLayout() {
  const positions = [];
  const coverMap = []; // which cards cover which

  // We'll use a simpler layout:
  // Peak structure (3 peaks side by side)
  // Row 0 (top): 3 cards - one per peak
  // Row 1: 6 cards - two per peak
  // Row 2: 9 cards - three per peak
  // Row 3: 10 cards - bottom row, all face-up

  const startX = 400;
  const rowOffsetY = 42;
  const baseY = 50;

  // Card spacing per row
  const rows = [
    { count: 3, spacing: 180 }, // row 0: peaks
    { count: 6, spacing: 90 }, // row 1
    { count: 9, spacing: 60 }, // row 2
    { count: 10, spacing: 54 }, // row 3: bottom
  ];

  let cardIndex = 0;
  const rowIndices = [];

  rows.forEach((row, ri) => {
    const indices = [];
    const totalW = (row.count - 1) * row.spacing;
    const rowStartX = startX - totalW / 2;
    const y = baseY + ri * rowOffsetY;

    for (let c = 0; c < row.count; c++) {
      positions.push({
        x: rowStartX + c * row.spacing,
        y: y,
        row: ri,
        col: c,
        faceUp: ri === 3, // only bottom row face up
      });
      indices.push(cardIndex);
      cardIndex++;
    }
    rowIndices.push(indices);
  });

  // Build coverage: a card is covered by cards in the row below
  // Row 0 cards (3) are covered by row 1 cards (6) - each peak card covered by 2
  // Row 1 cards (6) are covered by row 2 cards (9) - each covered by ~1-2
  // Row 2 cards (9) are covered by row 3 cards (10) - each covered by ~1

  // Peak 0: row0[0] covered by row1[0], row1[1]
  // Peak 1: row0[1] covered by row1[2], row1[3]
  // Peak 2: row0[2] covered by row1[4], row1[5]
  const covers = [];
  for (let i = 0; i < positions.length; i++) covers.push([]);

  // Row 0 -> Row 1 (3 peaks, each has 2 children)
  for (let p = 0; p < 3; p++) {
    const parentIdx = rowIndices[0][p];
    const child1 = rowIndices[1][p * 2];
    const child2 = rowIndices[1][p * 2 + 1];
    covers[parentIdx] = [child1, child2];
  }

  // Row 1 -> Row 2 (6 cards, each has 1-2 children from 9)
  // Pattern: row1[0] -> row2[0,1], row1[1] -> row2[1,2], row1[2] -> row2[3,4], ...
  for (let i = 0; i < 6; i++) {
    const parentIdx = rowIndices[1][i];
    const peak = Math.floor(i / 2);
    const local = i % 2;
    const base = peak * 3 + local;
    covers[parentIdx] = [rowIndices[2][base], rowIndices[2][base + 1]];
  }

  // Row 2 -> Row 3 (9 cards -> 10 cards)
  // Each row2 card covered by 1-2 row3 cards
  for (let i = 0; i < 9; i++) {
    const parentIdx = rowIndices[2][i];
    const peak = Math.floor(i / 3);
    const local = i % 3;
    const base = peak * 3 + local + Math.floor(peak);
    const children = [rowIndices[3][base]];
    if (base + 1 < 10) {
      children.push(rowIndices[3][base + 1]);
    }
    covers[parentIdx] = children;
  }

  return { positions, covers, totalCards: positions.length };
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init(data) {
    this.stage = data.stage || 1;
    this.score = data.score || 0;
    this.combo = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#1b2838");

    // Stage info
    this.add
      .text(15, 12, `Stage ${this.stage}`, {
        fontSize: "20px",
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        color: "#c7d5e0",
      })
      .setOrigin(0, 0);

    this.scoreText = this.add
      .text(width - 15, 12, `Score: ${this.score}`, {
        fontSize: "18px",
        fontFamily: "Arial, sans-serif",
        color: "#4fc3f7",
      })
      .setOrigin(1, 0);

    this.comboText = this.add
      .text(width / 2, 12, "", {
        fontSize: "16px",
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        color: "#ffd54f",
      })
      .setOrigin(0.5, 0);

    // Build layout
    const layout = buildTowerLayout();
    this.towerPositions = layout.positions;
    this.covers = layout.covers;

    // Create deck and deal
    const deck = shuffle(createDeck());

    // 28 cards for towers, rest for stock
    this.towerCards = [];
    this.towerContainers = [];
    this.towerAlive = [];

    for (let i = 0; i < layout.totalCards; i++) {
      const card = deck[i];
      const pos = layout.positions[i];
      this.towerCards.push(card);
      this.towerAlive.push(true);
    }

    // Wild cards for higher stages (mark some tower cards)
    this.wildCards = new Set();
    const wildCount = Math.min(Math.floor(this.stage / 2), 3);
    if (wildCount > 0) {
      // Pick random face-up (bottom row) cards as wilds
      const bottomIndices = [];
      for (let i = 0; i < layout.totalCards; i++) {
        if (layout.positions[i].row === 3) bottomIndices.push(i);
      }
      shuffle(bottomIndices);
      for (let w = 0; w < Math.min(wildCount, bottomIndices.length); w++) {
        this.wildCards.add(bottomIndices[w]);
      }
    }

    // Stock pile (remaining cards)
    this.stockCards = deck.slice(layout.totalCards);

    // Current (waste) card - draw one from stock
    this.currentCard = this.stockCards.pop();

    // Draw everything
    this.drawTower();
    this.drawBottom();

    // Check initial availability
    this.updateCardStates();
  }

  drawTower() {
    this.cardGraphics = [];
    this.cardTexts = [];
    this.cardZones = [];

    for (let i = 0; i < this.towerCards.length; i++) {
      const pos = this.towerPositions[i];
      const container = this.add.container(pos.x, pos.y);

      const gfx = this.add.graphics();
      const txt = this.add
        .text(0, 0, "", {
          fontSize: "16px",
          fontFamily: "Arial, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const suitTxt = this.add
        .text(0, 16, "", {
          fontSize: "11px",
          fontFamily: "Arial, sans-serif",
        })
        .setOrigin(0.5);

      container.add([gfx, txt, suitTxt]);

      const zone = this.add
        .zone(pos.x, pos.y, CW, CH)
        .setInteractive({ useHandCursor: true });

      zone.on("pointerdown", () => this.onTowerCardClick(i));

      this.cardGraphics.push(gfx);
      this.cardTexts.push({ rank: txt, suit: suitTxt });
      this.cardZones.push(zone);
      this.towerContainers.push(container);
    }
  }

  drawBottom() {
    const { width, height } = this.scale;
    const bottomY = height - 70;

    // Stock pile area (left side)
    this.stockGfx = this.add.graphics();
    this.stockCountText = this.add
      .text(120, bottomY, "", {
        fontSize: "14px",
        fontFamily: "Arial, sans-serif",
        color: "#8b9bb0",
      })
      .setOrigin(0.5, -1);

    this.stockZone = this.add
      .zone(120, bottomY, CW + 10, CH + 10)
      .setInteractive({ useHandCursor: true });

    this.stockZone.on("pointerdown", () => this.onStockClick());

    // Current card area (center)
    this.currentGfx = this.add.graphics();
    this.currentRankText = this.add
      .text(width / 2, bottomY, "", {
        fontSize: "22px",
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.currentSuitText = this.add
      .text(width / 2, bottomY + 18, "", {
        fontSize: "14px",
        fontFamily: "Arial, sans-serif",
      })
      .setOrigin(0.5);

    // Undo / Menu button (right)
    this.createSmallButton(width - 70, bottomY, "Menu", () => {
      this.scene.start("MenuScene");
    });

    this.drawStock();
    this.drawCurrentCard();
  }

  drawStock() {
    this.stockGfx.clear();
    if (this.stockCards.length > 0) {
      // Draw card back
      this.stockGfx.fillStyle(0x2a475e, 1);
      this.stockGfx.fillRoundedRect(
        120 - CW / 2,
        this.scale.height - 70 - CH / 2,
        CW,
        CH,
        CR,
      );
      this.stockGfx.lineStyle(2, 0x4fc3f7, 0.5);
      this.stockGfx.strokeRoundedRect(
        120 - CW / 2,
        this.scale.height - 70 - CH / 2,
        CW,
        CH,
        CR,
      );

      // Cross-hatch pattern on back
      this.stockGfx.lineStyle(1, 0x4fc3f7, 0.15);
      for (let d = -CH; d < CW + CH; d += 8) {
        this.stockGfx.lineBetween(
          120 - CW / 2 + d,
          this.scale.height - 70 - CH / 2,
          120 - CW / 2 + d - CH,
          this.scale.height - 70 + CH / 2,
        );
      }

      this.stockCountText.setText(`${this.stockCards.length}`);
    } else {
      this.stockCountText.setText("Empty");
    }
  }

  drawCurrentCard() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height - 70;

    this.currentGfx.clear();

    if (this.currentCard) {
      const card = this.currentCard;
      const color = SUIT_COLORS[card.suit];

      this.currentGfx.fillStyle(0xffffff, 1);
      this.currentGfx.fillRoundedRect(cx - CW / 2, cy - CH / 2, CW, CH, CR);
      this.currentGfx.lineStyle(2, 0xaaaaaa, 0.8);
      this.currentGfx.strokeRoundedRect(cx - CW / 2, cy - CH / 2, CW, CH, CR);

      this.currentRankText.setText(RANK_NAMES[card.rank]).setColor(color);
      this.currentSuitText.setText(SUIT_SYMBOLS[card.suit]).setColor(color);
    }
  }

  updateCardStates() {
    for (let i = 0; i < this.towerCards.length; i++) {
      if (!this.towerAlive[i]) {
        this.renderCardHidden(i);
        continue;
      }

      // Check if uncovered (all covering children are removed)
      const isFaceUp = this.isUncovered(i);
      const isPlayable =
        isFaceUp &&
        this.currentCard &&
        (this.wildCards.has(i) ||
          canMatch(this.towerCards[i].rank, this.currentCard.rank));

      this.renderCard(i, isFaceUp, isPlayable);
    }
  }

  isUncovered(index) {
    const children = this.covers[index];
    if (!children || children.length === 0) return true;
    return children.every((ci) => !this.towerAlive[ci]);
  }

  renderCard(index, faceUp, playable) {
    const gfx = this.cardGraphics[index];
    const { rank: rankTxt, suit: suitTxt } = this.cardTexts[index];
    const card = this.towerCards[index];

    gfx.clear();

    if (faceUp) {
      const isWild = this.wildCards.has(index);

      // Card face
      if (playable) {
        gfx.fillStyle(0xfffff0, 1);
        gfx.fillRoundedRect(-CW / 2, -CH / 2, CW, CH, CR);
        gfx.lineStyle(2, 0x4fc3f7, 1);
        gfx.strokeRoundedRect(-CW / 2, -CH / 2, CW, CH, CR);
      } else {
        gfx.fillStyle(0xf5f5f0, 1);
        gfx.fillRoundedRect(-CW / 2, -CH / 2, CW, CH, CR);
        gfx.lineStyle(1, 0xcccccc, 0.8);
        gfx.strokeRoundedRect(-CW / 2, -CH / 2, CW, CH, CR);
      }

      if (isWild) {
        // Star marker for wild cards
        gfx.fillStyle(0xffd54f, 0.3);
        gfx.fillRoundedRect(-CW / 2 + 2, -CH / 2 + 2, CW - 4, CH - 4, CR - 1);
      }

      const color = SUIT_COLORS[card.suit];
      rankTxt.setText(RANK_NAMES[card.rank]).setColor(color).setAlpha(1);
      suitTxt
        .setText(SUIT_SYMBOLS[card.suit] + (isWild ? " \u2605" : ""))
        .setColor(color)
        .setAlpha(1);
    } else {
      // Card back
      gfx.fillStyle(0x2a475e, 1);
      gfx.fillRoundedRect(-CW / 2, -CH / 2, CW, CH, CR);
      gfx.lineStyle(1, 0x4fc3f7, 0.3);
      gfx.strokeRoundedRect(-CW / 2, -CH / 2, CW, CH, CR);

      // Pattern
      gfx.lineStyle(1, 0x4fc3f7, 0.1);
      for (let d = -CH; d < CW + CH; d += 6) {
        const x1 = Math.max(-CW / 2, -CW / 2 + d);
        const x2 = Math.min(CW / 2, -CW / 2 + d - CH);
        gfx.lineBetween(
          Phaser.Math.Clamp(-CW / 2 + d, -CW / 2, CW / 2),
          -CH / 2,
          Phaser.Math.Clamp(-CW / 2 + d - CH, -CW / 2, CW / 2),
          CH / 2,
        );
      }

      rankTxt.setText("").setAlpha(0);
      suitTxt.setText("").setAlpha(0);
    }

    this.cardZones[index].setSize(CW, CH);
  }

  renderCardHidden(index) {
    this.cardGraphics[index].clear();
    this.cardTexts[index].rank.setText("").setAlpha(0);
    this.cardTexts[index].suit.setText("").setAlpha(0);
    this.cardZones[index].setSize(0, 0);
    this.towerContainers[index].setAlpha(0);
  }

  onTowerCardClick(index) {
    if (!this.towerAlive[index]) return;
    if (!this.isUncovered(index)) return;
    if (!this.currentCard) return;

    const card = this.towerCards[index];
    const isWild = this.wildCards.has(index);

    if (!isWild && !canMatch(card.rank, this.currentCard.rank)) {
      return;
    }

    // Remove from tower
    this.towerAlive[index] = false;

    // Animate card removal
    const container = this.towerContainers[index];
    this.tweens.add({
      targets: container,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 200,
      ease: "Power2",
    });

    // This card becomes the new current card
    this.currentCard = card;
    this.drawCurrentCard();

    // Score: base 10 + combo bonus
    this.combo++;
    const points = 10 + (this.combo - 1) * 5;
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);

    if (this.combo > 1) {
      this.comboText.setText(`Combo x${this.combo}! +${points}`);
      this.comboText.setAlpha(1);
      this.tweens.add({
        targets: this.comboText,
        alpha: 0,
        y: 2,
        duration: 1000,
        ease: "Power2",
        onComplete: () => {
          this.comboText.setY(12);
        },
      });
      playBigMerge();
    } else {
      playMerge();
    }

    // Update states
    this.updateCardStates();

    // Check win
    if (this.towerAlive.every((a) => !a)) {
      this.time.delayedCall(400, () => this.onStageClear());
    } else {
      // Check if any moves remain
      this.time.delayedCall(300, () => this.checkStuck());
    }
  }

  onStockClick() {
    if (this.stockCards.length === 0) return;

    this.currentCard = this.stockCards.pop();
    this.combo = 0; // Reset combo on draw
    this.drawCurrentCard();
    this.drawStock();
    this.updateCardStates();
    playSlide();

    // Check if stuck after drawing
    this.time.delayedCall(200, () => this.checkStuck());
  }

  checkStuck() {
    // Check if any tower card is playable
    for (let i = 0; i < this.towerCards.length; i++) {
      if (!this.towerAlive[i]) continue;
      if (!this.isUncovered(i)) continue;
      if (
        this.wildCards.has(i) ||
        canMatch(this.towerCards[i].rank, this.currentCard.rank)
      ) {
        return; // There's a playable card
      }
    }

    // No playable tower cards - check if stock has cards
    if (this.stockCards.length > 0) return; // Can still draw

    // Game over - no moves
    this.time.delayedCall(500, () => this.onGameOver());
  }

  onStageClear() {
    // Bonus for remaining stock cards
    const stockBonus = this.stockCards.length * 15;
    this.score += stockBonus;
    this.scoreText.setText(`Score: ${this.score}`);

    // Save progress
    const nextStage = this.stage + 1;
    localStorage.setItem("solitaireTowerStage", String(nextStage));

    const best = parseInt(localStorage.getItem("solitaireTowerBest") || "0");
    if (this.stage > best) {
      localStorage.setItem("solitaireTowerBest", String(this.stage));
    }

    const highScore = parseInt(
      localStorage.getItem("solitaireTowerHighScore") || "0",
    );
    if (this.score > highScore) {
      localStorage.setItem("solitaireTowerHighScore", String(this.score));
    }

    playBigMerge();

    const urlParams = new URLSearchParams(window.location.search);
    const challengeScore = urlParams.get('c') ? parseInt(urlParams.get('c'), 10) : 0;

    this.scene.start("ResultScene", {
      win: true,
      stage: this.stage,
      score: this.score,
      stockBonus: stockBonus,
      nextStage: nextStage,
      challengeScore,
    });
  }

  onGameOver() {
    const cardsLeft = this.towerAlive.filter((a) => a).length;

    const best = parseInt(localStorage.getItem("solitaireTowerBest") || "0");
    if (this.stage > best) {
      localStorage.setItem("solitaireTowerBest", String(this.stage));
    }

    const highScore = parseInt(
      localStorage.getItem("solitaireTowerHighScore") || "0",
    );
    if (this.score > highScore) {
      localStorage.setItem("solitaireTowerHighScore", String(this.score));
    }

    // Reset saved stage
    localStorage.removeItem("solitaireTowerStage");

    playGameOver();

    const urlParams2 = new URLSearchParams(window.location.search);
    const challengeScore2 = urlParams2.get('c') ? parseInt(urlParams2.get('c'), 10) : 0;

    this.scene.start("ResultScene", {
      win: false,
      stage: this.stage,
      score: this.score,
      cardsLeft: cardsLeft,
      challengeScore: challengeScore2,
    });
  }

  createSmallButton(x, y, label, callback) {
    const w = 70;
    const h = 32;
    const gfx = this.add.graphics();

    gfx.fillStyle(0x2a475e, 0.8);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    gfx.lineStyle(1, 0x4fc3f7, 0.4);
    gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    this.add
      .text(x, y, label, {
        fontSize: "14px",
        fontFamily: "Arial, sans-serif",
        color: "#8b9bb0",
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(x, y, w, h)
      .setInteractive({ useHandCursor: true });

    zone.on("pointerdown", callback);
  }
}
