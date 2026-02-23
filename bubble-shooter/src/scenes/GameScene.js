import Phaser from "phaser";
import {
  playMerge,
  playBigMerge,
  playGameOver,
} from "../../../../common/audio.js";

const W = 480;
const H = 720;
const BUBBLE_R = 16;
const BUBBLE_D = BUBBLE_R * 2;
const COLS = Math.floor(W / BUBBLE_D);
const ROW_H = BUBBLE_R * 1.73;
const TOP_OFFSET = 40;
const COLORS = [0xff4444, 0x44cc44, 0x4488ff, 0xffcc00, 0xff44ff, 0x44ddcc];
const SHOOT_SPEED = 700;
const SHOTS_PER_PUSH = 5;
const DEAD_LINE_Y = H - 120;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.score = 0;
    this.shotsFired = 0;
    this.gameOver = false;
    this.shooting = false;

    // Grid: grid[row][col] = { colorIdx, graphics } or null
    this.grid = [];
    this.gridContainer = this.add.container(0, 0);
    this.pushOffset = 0;

    this.initGrid(8);

    // Shooter
    this.shooterX = W / 2;
    this.shooterY = H - 60;

    // Next and current bubble
    this.currentColorIdx = this.randomActiveColor();
    this.nextColorIdx = this.randomActiveColor();

    // Draw UI
    this.drawUI();
    this.drawShooter();
    this.drawAimLine();

    // Flying bubble
    this.flyingBubble = null;

    // Input
    this.input.on("pointermove", (p) => {
      if (!this.gameOver && !this.shooting) {
        this.updateAimLine(p.x, p.y);
      }
    });

    this.input.on("pointerdown", (p) => {
      if (!this.gameOver && !this.shooting) {
        this.shoot(p.x, p.y);
      }
    });
  }

  initGrid(rows) {
    this.grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      const cols = r % 2 === 0 ? COLS : COLS - 1;
      for (let c = 0; c < cols; c++) {
        const colorIdx = Phaser.Math.Between(0, COLORS.length - 1);
        row.push({ colorIdx });
      }
      this.grid.push(row);
    }
    this.redrawGrid();
  }

  getGridX(row, col) {
    const offset = row % 2 === 0 ? BUBBLE_R : BUBBLE_R + BUBBLE_R;
    return offset + col * BUBBLE_D;
  }

  getGridY(row) {
    return TOP_OFFSET + row * ROW_H + this.pushOffset;
  }

  redrawGrid() {
    this.gridContainer.removeAll(true);

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const cell = this.grid[r][c];
        if (!cell) continue;
        const x = this.getGridX(r, c);
        const y = this.getGridY(r);
        this.drawBubbleAt(x, y, COLORS[cell.colorIdx], this.gridContainer);
      }
    }
  }

  drawBubbleAt(x, y, color, container) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(x, y, BUBBLE_R - 1);
    // Highlight
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(x - 4, y - 4, BUBBLE_R * 0.3);
    if (container) container.add(g);
    return g;
  }

  drawUI() {
    // Score
    this.scoreText = this.add.text(10, 8, "Score: 0", {
      fontSize: "18px",
      fontFamily: "monospace",
      color: "#ffffff",
    });

    // Deadline
    this.add
      .graphics()
      .lineStyle(1, 0xff4444, 0.3)
      .lineBetween(0, DEAD_LINE_Y, W, DEAD_LINE_Y);

    // Shots until push indicator
    this.pushText = this.add
      .text(W - 10, 8, `Push: ${SHOTS_PER_PUSH}`, {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#888888",
      })
      .setOrigin(1, 0);

    // Next bubble preview label
    this.add
      .text(W - 60, H - 35, "Next:", {
        fontSize: "12px",
        fontFamily: "monospace",
        color: "#666666",
      })
      .setOrigin(0.5);
  }

  drawShooter() {
    if (this.shooterGraphics) this.shooterGraphics.destroy();
    this.shooterGraphics = this.add.graphics();

    // Current bubble at shooter position
    this.shooterGraphics.fillStyle(COLORS[this.currentColorIdx], 1);
    this.shooterGraphics.fillCircle(this.shooterX, this.shooterY, BUBBLE_R);
    this.shooterGraphics.fillStyle(0xffffff, 0.3);
    this.shooterGraphics.fillCircle(
      this.shooterX - 4,
      this.shooterY - 4,
      BUBBLE_R * 0.3,
    );

    // Shooter base
    this.shooterGraphics.fillStyle(0x334466, 1);
    this.shooterGraphics.fillTriangle(
      this.shooterX - 20,
      this.shooterY + 20,
      this.shooterX + 20,
      this.shooterY + 20,
      this.shooterX,
      this.shooterY + 5,
    );

    // Next bubble preview
    if (this.nextPreview) this.nextPreview.destroy();
    this.nextPreview = this.add.graphics();
    this.nextPreview.fillStyle(COLORS[this.nextColorIdx], 1);
    this.nextPreview.fillCircle(W - 30, H - 20, 10);
    this.nextPreview.fillStyle(0xffffff, 0.25);
    this.nextPreview.fillCircle(W - 33, H - 23, 3);
  }

  drawAimLine() {
    if (this.aimGraphics) this.aimGraphics.destroy();
    this.aimGraphics = this.add.graphics();
  }

  updateAimLine(px, py) {
    if (!this.aimGraphics) return;
    this.aimGraphics.clear();

    let dx = px - this.shooterX;
    let dy = py - this.shooterY;

    // Only allow aiming upward
    if (dy >= -10) return;

    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;

    // Draw dotted aim line with bouncing
    this.aimGraphics.lineStyle(1, 0xffffff, 0.3);

    let sx = this.shooterX;
    let sy = this.shooterY;
    let vx = dx;
    let vy = dy;

    for (let i = 0; i < 40; i++) {
      const nx = sx + vx * 10;
      const ny = sy + vy * 10;

      // Wall bounce
      let finalX = nx;
      if (nx < BUBBLE_R) {
        finalX = BUBBLE_R;
        vx = -vx;
      } else if (nx > W - BUBBLE_R) {
        finalX = W - BUBBLE_R;
        vx = -vx;
      }

      if (ny < TOP_OFFSET) break;

      if (i % 2 === 0) {
        this.aimGraphics.beginPath();
        this.aimGraphics.moveTo(sx, sy);
        this.aimGraphics.lineTo(finalX, ny);
        this.aimGraphics.strokePath();
      }

      sx = finalX;
      sy = ny;
    }
  }

  shoot(px, py) {
    let dx = px - this.shooterX;
    let dy = py - this.shooterY;
    if (dy >= -10) return;

    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;

    this.shooting = true;
    if (this.aimGraphics) this.aimGraphics.clear();

    // Create flying bubble
    const fb = this.add.graphics();
    fb.fillStyle(COLORS[this.currentColorIdx], 1);
    fb.fillCircle(0, 0, BUBBLE_R - 1);
    fb.fillStyle(0xffffff, 0.3);
    fb.fillCircle(-4, -4, BUBBLE_R * 0.3);
    fb.x = this.shooterX;
    fb.y = this.shooterY;
    fb.vx = dx * SHOOT_SPEED;
    fb.vy = dy * SHOOT_SPEED;
    fb.colorIdx = this.currentColorIdx;
    this.flyingBubble = fb;

    // Hide shooter bubble
    if (this.shooterGraphics) this.shooterGraphics.destroy();
    this.shooterGraphics = this.add.graphics();
    this.shooterGraphics.fillStyle(0x334466, 1);
    this.shooterGraphics.fillTriangle(
      this.shooterX - 20,
      this.shooterY + 20,
      this.shooterX + 20,
      this.shooterY + 20,
      this.shooterX,
      this.shooterY + 5,
    );
  }

  update(time, delta) {
    if (this.gameOver) return;
    if (!this.flyingBubble) return;

    const dt = delta / 1000;
    const fb = this.flyingBubble;

    fb.x += fb.vx * dt;
    fb.y += fb.vy * dt;

    // Wall bouncing
    if (fb.x < BUBBLE_R) {
      fb.x = BUBBLE_R;
      fb.vx = -fb.vx;
    } else if (fb.x > W - BUBBLE_R) {
      fb.x = W - BUBBLE_R;
      fb.vx = -fb.vx;
    }

    // Hit ceiling
    if (fb.y < TOP_OFFSET + this.pushOffset) {
      this.snapBubble(fb);
      return;
    }

    // Check collision with grid bubbles
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        if (!this.grid[r][c]) continue;
        const gx = this.getGridX(r, c);
        const gy = this.getGridY(r);
        const dist = Phaser.Math.Distance.Between(fb.x, fb.y, gx, gy);
        if (dist < BUBBLE_D - 2) {
          this.snapBubble(fb);
          return;
        }
      }
    }

    // Off screen top
    if (fb.y < -BUBBLE_R) {
      this.snapBubble(fb);
    }
  }

  snapBubble(fb) {
    // Find the best grid position for the bubble
    let bestRow = -1;
    let bestCol = -1;
    let bestDist = Infinity;

    // Check all possible positions including a new row at the bottom
    const maxRow = this.grid.length;
    for (let r = 0; r <= maxRow; r++) {
      const cols = r % 2 === 0 ? COLS : COLS - 1;
      for (let c = 0; c < cols; c++) {
        // Skip occupied cells
        if (r < this.grid.length && this.grid[r] && this.grid[r][c]) continue;

        const gx = this.getGridX(r, c);
        const gy = this.getGridY(r);
        const dist = Phaser.Math.Distance.Between(fb.x, fb.y, gx, gy);
        if (dist < bestDist) {
          bestDist = dist;
          bestRow = r;
          bestCol = c;
        }
      }
    }

    fb.destroy();
    this.flyingBubble = null;

    if (bestRow < 0) {
      this.endGame();
      return;
    }

    // Add to grid
    while (this.grid.length <= bestRow) {
      const cols = this.grid.length % 2 === 0 ? COLS : COLS - 1;
      const newRow = new Array(cols).fill(null);
      this.grid.push(newRow);
    }

    this.grid[bestRow][bestCol] = { colorIdx: fb.colorIdx };

    // Check for matches
    const matches = this.findMatches(bestRow, bestCol);
    if (matches.length >= 3) {
      const points = matches.length * 10;
      // Remove matched
      for (const [mr, mc] of matches) {
        this.grid[mr][mc] = null;
      }
      // Find floating bubbles
      const floating = this.findFloating();
      const floatPoints = floating.length * 15;
      for (const [fr, fc] of floating) {
        this.grid[fr][fc] = null;
      }
      this.score += points + floatPoints;

      if (matches.length >= 5 || floating.length > 0) {
        playBigMerge();
      } else {
        playMerge();
      }

      // Show pop effect
      this.showPopEffect(matches, floating);
    }

    // Track shots for push
    this.shotsFired++;
    if (this.shotsFired >= SHOTS_PER_PUSH) {
      this.shotsFired = 0;
      this.pushNewRow();
    }

    // Clean up empty rows from bottom
    while (
      this.grid.length > 0 &&
      this.grid[this.grid.length - 1].every((c) => c === null)
    ) {
      this.grid.pop();
    }

    this.redrawGrid();
    this.updateUI();

    // Check game over: any bubble below deadline
    if (this.checkGameOver()) {
      this.endGame();
      return;
    }

    // Check win: all bubbles cleared
    if (this.isBoardClear()) {
      this.score += 500;
      this.updateUI();
      this.endGame(true);
      return;
    }

    // Prepare next shot
    this.currentColorIdx = this.nextColorIdx;
    this.nextColorIdx = this.randomActiveColor();
    this.drawShooter();
    this.shooting = false;
  }

  findMatches(row, col) {
    const targetColor = this.grid[row][col]?.colorIdx;
    if (targetColor === undefined || targetColor === null) return [];

    const visited = new Set();
    const matches = [];
    const queue = [[row, col]];
    visited.add(`${row},${col}`);

    while (queue.length > 0) {
      const [r, c] = queue.shift();
      matches.push([r, c]);

      const neighbors = this.getNeighbors(r, c);
      for (const [nr, nc] of neighbors) {
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (
          nr >= 0 &&
          nr < this.grid.length &&
          nc >= 0 &&
          nc < (this.grid[nr]?.length || 0)
        ) {
          if (this.grid[nr][nc] && this.grid[nr][nc].colorIdx === targetColor) {
            queue.push([nr, nc]);
          }
        }
      }
    }

    return matches;
  }

  getNeighbors(row, col) {
    // Hex grid neighbors differ based on even/odd row
    if (row % 2 === 0) {
      return [
        [row - 1, col - 1],
        [row - 1, col],
        [row, col - 1],
        [row, col + 1],
        [row + 1, col - 1],
        [row + 1, col],
      ];
    } else {
      return [
        [row - 1, col],
        [row - 1, col + 1],
        [row, col - 1],
        [row, col + 1],
        [row + 1, col],
        [row + 1, col + 1],
      ];
    }
  }

  findFloating() {
    // BFS from top row to find all connected bubbles
    const connected = new Set();
    const queue = [];

    // Start from all bubbles in row 0
    if (this.grid.length > 0) {
      for (let c = 0; c < this.grid[0].length; c++) {
        if (this.grid[0][c]) {
          queue.push([0, c]);
          connected.add(`0,${c}`);
        }
      }
    }

    while (queue.length > 0) {
      const [r, c] = queue.shift();
      const neighbors = this.getNeighbors(r, c);
      for (const [nr, nc] of neighbors) {
        const key = `${nr},${nc}`;
        if (connected.has(key)) continue;
        if (
          nr >= 0 &&
          nr < this.grid.length &&
          nc >= 0 &&
          nc < (this.grid[nr]?.length || 0)
        ) {
          if (this.grid[nr][nc]) {
            connected.add(key);
            queue.push([nr, nc]);
          }
        }
      }
    }

    // Everything not connected is floating
    const floating = [];
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c] && !connected.has(`${r},${c}`)) {
          floating.push([r, c]);
        }
      }
    }
    return floating;
  }

  pushNewRow() {
    // New row at top (row 0 = even = COLS columns)
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push({ colorIdx: Phaser.Math.Between(0, COLORS.length - 1) });
    }

    // Adjust existing rows for parity change after unshift
    for (let r = 0; r < this.grid.length; r++) {
      const wasEven = r % 2 === 0;
      const willBeEven = (r + 1) % 2 === 0;
      if (wasEven && !willBeEven) {
        if (this.grid[r].length > COLS - 1) {
          this.grid[r].pop();
        }
      } else if (!wasEven && willBeEven) {
        this.grid[r].push(null);
      }
    }

    this.grid.unshift(row);
  }

  showPopEffect(matches, floating) {
    const allPops = [...matches, ...floating];
    for (const [r, c] of allPops) {
      const x = this.getGridX(r, c);
      const y = this.getGridY(r);
      const circle = this.add.circle(x, y, BUBBLE_R, 0xffffff, 0.8);
      this.tweens.add({
        targets: circle,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 300,
        onComplete: () => circle.destroy(),
      });
    }

    // Show score text
    if (allPops.length > 0) {
      const [mr, mc] = matches[0];
      const mx = this.getGridX(mr, mc);
      const my = this.getGridY(mr);
      const pts = matches.length * 10 + floating.length * 15;
      const txt = this.add
        .text(mx, my, `+${pts}`, {
          fontSize: "20px",
          fontFamily: "monospace",
          color: "#ffdd44",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: txt,
        y: my - 40,
        alpha: 0,
        duration: 600,
        onComplete: () => txt.destroy(),
      });
    }
  }

  randomActiveColor() {
    // Only return colors that exist on the board
    const activeColors = new Set();
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c]) activeColors.add(this.grid[r][c].colorIdx);
      }
    }
    if (activeColors.size === 0)
      return Phaser.Math.Between(0, COLORS.length - 1);
    const arr = Array.from(activeColors);
    return arr[Phaser.Math.Between(0, arr.length - 1)];
  }

  checkGameOver() {
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c]) {
          const y = this.getGridY(r);
          if (y + BUBBLE_R >= DEAD_LINE_Y) return true;
        }
      }
    }
    return false;
  }

  isBoardClear() {
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c]) return false;
      }
    }
    return true;
  }

  updateUI() {
    this.scoreText.setText(`Score: ${this.score}`);
    const remaining = SHOTS_PER_PUSH - this.shotsFired;
    this.pushText.setText(`Push: ${remaining}`);
  }

  endGame(cleared = false) {
    this.gameOver = true;
    playGameOver();

    const highScore = parseInt(
      localStorage.getItem("bubbleshooter-highscore") || "0",
    );
    const isNewRecord = this.score > highScore;
    if (isNewRecord) {
      localStorage.setItem("bubbleshooter-highscore", this.score.toString());
    }

    this.time.delayedCall(800, () => {
      this.scene.start("ResultScene", {
        score: this.score,
        cleared,
        isNewRecord,
      });
    });
  }
}
