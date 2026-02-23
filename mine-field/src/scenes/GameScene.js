import {
  playSlide,
  playMerge,
  playGameOver,
} from "../../../../common/audio.js";

const DIFFICULTIES = {
  beginner: { cols: 9, rows: 9, mines: 10 },
  intermediate: { cols: 16, rows: 16, mines: 40 },
  expert: { cols: 30, rows: 16, mines: 99 },
};

const NUM_COLORS = {
  1: "#4fc3f7",
  2: "#66bb6a",
  3: "#ef5350",
  4: "#ab47bc",
  5: "#ff7043",
  6: "#26c6da",
  7: "#333333",
  8: "#888888",
};

const CELL_HIDDEN = 0;
const CELL_REVEALED = 1;
const CELL_FLAGGED = 2;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init(data) {
    this.difficulty = data.difficulty || "beginner";
    const cfg = DIFFICULTIES[this.difficulty];
    this.gridCols = cfg.cols;
    this.gridRows = cfg.rows;
    this.totalMines = cfg.mines;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    const W = 800;
    const H = 600;

    // Calculate cell size to fit the grid
    const headerHeight = 60;
    const footerHeight = 30;
    const padding = 10;
    const availW = W - padding * 2;
    const availH = H - headerHeight - footerHeight - padding;
    this.cellSize = Math.floor(
      Math.min(availW / this.gridCols, availH / this.gridRows),
    );
    if (this.cellSize < 16) this.cellSize = 16;
    if (this.cellSize > 40) this.cellSize = 40;

    const gridW = this.gridCols * this.cellSize;
    const gridH = this.gridRows * this.cellSize;
    this.offsetX = Math.floor((W - gridW) / 2);
    this.offsetY =
      headerHeight + Math.floor((H - headerHeight - footerHeight - gridH) / 2);

    // State arrays
    this.mineGrid = [];
    this.numberGrid = [];
    this.stateGrid = [];
    this.firstClick = true;
    this.gameOver = false;
    this.gameWon = false;
    this.revealedCount = 0;
    this.flagCount = 0;
    this.elapsed = 0;
    this.timerStarted = false;
    this.hitMineRow = -1;
    this.hitMineCol = -1;

    for (let r = 0; r < this.gridRows; r++) {
      this.mineGrid[r] = [];
      this.numberGrid[r] = [];
      this.stateGrid[r] = [];
      for (let c = 0; c < this.gridCols; c++) {
        this.mineGrid[r][c] = false;
        this.numberGrid[r][c] = 0;
        this.stateGrid[r][c] = CELL_HIDDEN;
      }
    }

    // Graphics layers
    this.gridGfx = this.add.graphics();
    this.cellTexts = [];

    // Header: mine counter, face button, timer
    this.mineCounterText = this.add
      .text(this.offsetX, 20, this.formatCount(this.totalMines), {
        fontSize: "28px",
        fontFamily: "monospace",
        color: "#e94560",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.timerText = this.add
      .text(this.offsetX + gridW, 20, "000", {
        fontSize: "28px",
        fontFamily: "monospace",
        color: "#e94560",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);

    // Face/reset button
    const faceX = W / 2;
    const faceY = 20;
    this.faceGfx = this.add.graphics();
    this.drawFace(faceX, faceY, "normal");
    const faceZone = this.add
      .zone(faceX, faceY, 36, 36)
      .setInteractive({ useHandCursor: true });
    faceZone.on("pointerdown", () => {
      playSlide();
      this.scene.restart({ difficulty: this.difficulty });
    });

    // Draw initial grid
    this.drawGrid();

    // Input: interactive zone over grid
    const gridZone = this.add
      .zone(this.offsetX + gridW / 2, this.offsetY + gridH / 2, gridW, gridH)
      .setInteractive({ useHandCursor: false });

    // Right-click context menu prevention
    this.input.mouse.disableContextMenu();

    // Long press for mobile flag
    this.longPressTimer = null;
    this.longPressTriggered = false;
    this.longPressRow = -1;
    this.longPressCol = -1;

    gridZone.on("pointerdown", (pointer) => {
      if (this.gameOver) return;
      const col = Math.floor((pointer.x - this.offsetX) / this.cellSize);
      const row = Math.floor((pointer.y - this.offsetY) / this.cellSize);
      if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows)
        return;

      if (pointer.rightButtonDown()) {
        this.toggleFlag(row, col);
        return;
      }

      // Start long press detection
      this.longPressRow = row;
      this.longPressCol = col;
      this.longPressTriggered = false;
      this.longPressTimer = this.time.delayedCall(500, () => {
        this.longPressTriggered = true;
        this.toggleFlag(row, col);
      });
    });

    gridZone.on("pointerup", (pointer) => {
      if (this.longPressTimer) {
        this.longPressTimer.destroy();
        this.longPressTimer = null;
      }
      if (this.gameOver) return;
      if (this.longPressTriggered) {
        this.longPressTriggered = false;
        return;
      }
      if (pointer.rightButtonReleased()) return;

      const col = Math.floor((pointer.x - this.offsetX) / this.cellSize);
      const row = Math.floor((pointer.y - this.offsetY) / this.cellSize);
      if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows)
        return;

      this.revealCell(row, col);
    });

    gridZone.on("pointermove", (pointer) => {
      if (this.longPressTimer) {
        const col = Math.floor((pointer.x - this.offsetX) / this.cellSize);
        const row = Math.floor((pointer.y - this.offsetY) / this.cellSize);
        if (col !== this.longPressCol || row !== this.longPressRow) {
          this.longPressTimer.destroy();
          this.longPressTimer = null;
        }
      }
    });

    // Back button
    const backBtn = this.add
      .text(W / 2, H - 12, "[ MENU ]", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#666688",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn.on("pointerover", () => backBtn.setColor("#e94560"));
    backBtn.on("pointerout", () => backBtn.setColor("#666688"));
    backBtn.on("pointerdown", () => {
      playSlide();
      this.scene.start("MenuScene");
    });
  }

  update(time, delta) {
    if (this.timerStarted && !this.gameOver) {
      this.elapsed += delta / 1000;
      const secs = Math.min(999, Math.floor(this.elapsed));
      this.timerText.setText(String(secs).padStart(3, "0"));
    }
  }

  formatCount(n) {
    const v = Math.max(-99, Math.min(999, n));
    if (v < 0) return "-" + String(Math.abs(v)).padStart(2, "0");
    return String(v).padStart(3, "0");
  }

  placeMines(safeRow, safeCol) {
    // Safe zone: first clicked cell and its neighbors
    const safeCells = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = safeRow + dr;
        const nc = safeCol + dc;
        if (nr >= 0 && nr < this.gridRows && nc >= 0 && nc < this.gridCols) {
          safeCells.add(nr * this.gridCols + nc);
        }
      }
    }

    let placed = 0;
    while (placed < this.totalMines) {
      const r = Phaser.Math.Between(0, this.gridRows - 1);
      const c = Phaser.Math.Between(0, this.gridCols - 1);
      const idx = r * this.gridCols + c;
      if (!this.mineGrid[r][c] && !safeCells.has(idx)) {
        this.mineGrid[r][c] = true;
        placed++;
      }
    }

    // Calculate adjacent mine numbers
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        if (this.mineGrid[r][c]) {
          this.numberGrid[r][c] = -1;
          continue;
        }
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (
              nr >= 0 &&
              nr < this.gridRows &&
              nc >= 0 &&
              nc < this.gridCols &&
              this.mineGrid[nr][nc]
            ) {
              count++;
            }
          }
        }
        this.numberGrid[r][c] = count;
      }
    }
  }

  revealCell(row, col) {
    if (this.gameOver) return;
    if (this.stateGrid[row][col] === CELL_FLAGGED) return;
    if (this.stateGrid[row][col] === CELL_REVEALED) return;

    if (this.firstClick) {
      this.firstClick = false;
      this.timerStarted = true;
      this.placeMines(row, col);
    }

    if (this.mineGrid[row][col]) {
      this.stateGrid[row][col] = CELL_REVEALED;
      this.hitMineRow = row;
      this.hitMineCol = col;
      this.doGameOver(false);
      return;
    }

    this.floodReveal(row, col);
    playSlide();
    this.drawGrid();
    this.checkWin();
  }

  floodReveal(row, col) {
    const stack = [[row, col]];
    while (stack.length > 0) {
      const [r, c] = stack.pop();
      if (r < 0 || r >= this.gridRows || c < 0 || c >= this.gridCols) continue;
      if (this.stateGrid[r][c] === CELL_REVEALED) continue;
      if (this.stateGrid[r][c] === CELL_FLAGGED) continue;

      this.stateGrid[r][c] = CELL_REVEALED;
      this.revealedCount++;

      if (this.numberGrid[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            stack.push([r + dr, c + dc]);
          }
        }
      }
    }
  }

  toggleFlag(row, col) {
    if (this.gameOver) return;
    if (this.stateGrid[row][col] === CELL_REVEALED) return;

    if (this.stateGrid[row][col] === CELL_FLAGGED) {
      this.stateGrid[row][col] = CELL_HIDDEN;
      this.flagCount--;
    } else {
      this.stateGrid[row][col] = CELL_FLAGGED;
      this.flagCount++;
    }
    playSlide();
    this.mineCounterText.setText(
      this.formatCount(this.totalMines - this.flagCount),
    );
    this.drawGrid();
  }

  checkWin() {
    const totalSafe = this.gridRows * this.gridCols - this.totalMines;
    if (this.revealedCount >= totalSafe) {
      this.doGameOver(true);
    }
  }

  doGameOver(won) {
    this.gameOver = true;
    this.gameWon = won;

    if (won) {
      playMerge();
      for (let r = 0; r < this.gridRows; r++) {
        for (let c = 0; c < this.gridCols; c++) {
          if (this.mineGrid[r][c] && this.stateGrid[r][c] !== CELL_FLAGGED) {
            this.stateGrid[r][c] = CELL_FLAGGED;
          }
        }
      }
      this.flagCount = this.totalMines;
      this.mineCounterText.setText("000");
    } else {
      playGameOver();
      for (let r = 0; r < this.gridRows; r++) {
        for (let c = 0; c < this.gridCols; c++) {
          if (this.mineGrid[r][c]) {
            this.stateGrid[r][c] = CELL_REVEALED;
          }
          // Show wrongly placed flags
          if (!this.mineGrid[r][c] && this.stateGrid[r][c] === CELL_FLAGGED) {
            this.stateGrid[r][c] = CELL_REVEALED;
            this.numberGrid[r][c] = -2; // Mark as wrong flag
          }
        }
      }
    }

    this.drawGrid();
    this.drawFace(400, 20, won ? "win" : "dead");

    this.time.delayedCall(1200, () => {
      this.scene.start("ResultScene", {
        won,
        difficulty: this.difficulty,
        time: Math.floor(this.elapsed),
      });
    });
  }

  drawFace(x, y, state) {
    const g = this.faceGfx;
    g.clear();

    g.fillStyle(0xffdd57, 1);
    g.fillCircle(x, y, 16);
    g.lineStyle(2, 0xccaa00);
    g.strokeCircle(x, y, 16);

    g.fillStyle(0x333333, 1);
    if (state === "dead") {
      g.lineStyle(2, 0x333333);
      g.lineBetween(x - 7, y - 5, x - 3, y - 1);
      g.lineBetween(x - 7, y - 1, x - 3, y - 5);
      g.lineBetween(x + 3, y - 5, x + 7, y - 1);
      g.lineBetween(x + 3, y - 1, x + 7, y - 5);
    } else {
      g.fillCircle(x - 5, y - 3, 2);
      g.fillCircle(x + 5, y - 3, 2);
    }

    if (state === "win") {
      g.lineStyle(2, 0x333333);
      g.beginPath();
      g.arc(x, y + 2, 7, 0.2, Math.PI - 0.2, false);
      g.strokePath();
    } else if (state === "dead") {
      g.lineStyle(2, 0x333333);
      g.beginPath();
      g.arc(x, y + 10, 5, Math.PI + 0.3, -0.3, false);
      g.strokePath();
    } else {
      g.lineStyle(2, 0x333333);
      g.lineBetween(x - 4, y + 5, x + 4, y + 5);
    }
  }

  drawGrid() {
    const g = this.gridGfx;
    g.clear();

    this.cellTexts.forEach((t) => t.destroy());
    this.cellTexts = [];

    const cs = this.cellSize;
    const border = Math.max(1, Math.floor(cs / 16));

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const x = this.offsetX + c * cs;
        const y = this.offsetY + r * cs;
        const state = this.stateGrid[r][c];

        if (state === CELL_REVEALED) {
          g.fillStyle(0x0f0f23, 1);
          g.fillRect(x + border, y + border, cs - border * 2, cs - border * 2);

          if (this.mineGrid[r][c]) {
            const isHit = this.hitMineRow === r && this.hitMineCol === c;
            if (isHit) {
              g.fillStyle(0xe94560, 1);
              g.fillRect(
                x + border,
                y + border,
                cs - border * 2,
                cs - border * 2,
              );
            }
            this.drawMine(g, x + cs / 2, y + cs / 2, cs);
          } else if (this.numberGrid[r][c] === -2) {
            // Wrong flag: show X over mine
            this.drawMine(g, x + cs / 2, y + cs / 2, cs);
            g.lineStyle(2, 0xe94560);
            g.lineBetween(x + 3, y + 3, x + cs - 3, y + cs - 3);
            g.lineBetween(x + cs - 3, y + 3, x + 3, y + cs - 3);
          } else if (this.numberGrid[r][c] > 0) {
            const num = this.numberGrid[r][c];
            const fontSize = Math.max(10, Math.floor(cs * 0.55));
            const txt = this.add
              .text(x + cs / 2, y + cs / 2, String(num), {
                fontSize: fontSize + "px",
                fontFamily: "monospace",
                color: NUM_COLORS[num] || "#ffffff",
                fontStyle: "bold",
              })
              .setOrigin(0.5);
            this.cellTexts.push(txt);
          }
        } else if (state === CELL_FLAGGED) {
          this.drawHiddenCell(g, x, y, cs, border);
          this.drawFlag(g, x + cs / 2, y + cs / 2, cs);
        } else {
          this.drawHiddenCell(g, x, y, cs, border);
        }

        g.lineStyle(1, 0x333355, 0.5);
        g.strokeRect(x, y, cs, cs);
      }
    }
  }

  drawMine(g, cx, cy, cs) {
    const mr = Math.max(3, cs / 5);
    g.fillStyle(0x333333, 1);
    g.fillCircle(cx, cy, mr);
    g.lineStyle(Math.max(1, cs / 16), 0x333333);
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 4;
      g.lineBetween(
        cx + Math.cos(angle) * mr * 0.5,
        cy + Math.sin(angle) * mr * 0.5,
        cx + Math.cos(angle) * mr * 1.6,
        cy + Math.sin(angle) * mr * 1.6,
      );
    }
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - mr * 0.3, cy - mr * 0.3, Math.max(1, mr * 0.25));
  }

  drawFlag(g, cx, cy, cs) {
    const fs = Math.max(3, cs / 4);
    g.lineStyle(Math.max(1, cs / 16), 0x333333);
    g.lineBetween(cx, cy - fs, cx, cy + fs);
    g.fillStyle(0xe94560, 1);
    g.fillTriangle(cx, cy - fs, cx, cy, cx + fs, cy - fs / 2);
  }

  drawHiddenCell(g, x, y, cs, border) {
    g.fillStyle(0x2a2a4e, 1);
    g.fillRect(x + border, y + border, cs - border * 2, cs - border * 2);

    // Highlight (top-left)
    g.fillStyle(0x3a3a6e, 1);
    g.fillRect(x + border, y + border, cs - border * 2, border);
    g.fillRect(x + border, y + border, border, cs - border * 2);

    // Shadow (bottom-right)
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(x + border, y + cs - border * 2, cs - border * 2, border);
    g.fillRect(x + cs - border * 2, y + border, border, cs - border * 2);
  }
}
