import Phaser from "phaser";
import { playSlide, playMerge } from "../../../../common/audio.js";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  init(data) {
    this.win = data.win;
    this.stage = data.stage;
    this.score = data.score;
    this.stockBonus = data.stockBonus || 0;
    this.nextStage = data.nextStage || 1;
    this.cardsLeft = data.cardsLeft || 0;
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const gfx = this.add.graphics();
    gfx.fillGradientStyle(0x1b2838, 0x1b2838, 0x2a475e, 0x2a475e, 1);
    gfx.fillRect(0, 0, width, height);

    if (this.win) {
      this.createWinScreen(width, height);
    } else {
      this.createLoseScreen(width, height);
    }
  }

  createWinScreen(width, height) {
    // Title
    this.add
      .text(width / 2, 100, "Stage Clear!", {
        fontSize: "48px",
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        color: "#4fc3f7",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 155, `Stage ${this.stage} completed`, {
        fontSize: "20px",
        fontFamily: "Arial, sans-serif",
        color: "#c7d5e0",
      })
      .setOrigin(0.5);

    // Score breakdown
    const baseScore = this.score - this.stockBonus;
    const lines = [
      `Base Score: ${baseScore}`,
      `Stock Bonus: +${this.stockBonus}`,
      `Total Score: ${this.score}`,
    ];

    lines.forEach((line, i) => {
      const isBold = i === lines.length - 1;
      this.add
        .text(width / 2, 210 + i * 30, line, {
          fontSize: isBold ? "22px" : "18px",
          fontFamily: "Arial, sans-serif",
          fontStyle: isBold ? "bold" : "normal",
          color: isBold ? "#ffd54f" : "#8b9bb0",
        })
        .setOrigin(0.5);
    });

    // Animated cards celebration
    this.createCardParticles(width, height);

    // Next stage button
    this.createButton(width / 2, 380, "Next Stage", () => {
      playMerge();
      this.scene.start("GameScene", {
        stage: this.nextStage,
        score: this.score,
      });
    });

    // Menu button
    this.createButton(width / 2, 450, "Menu", () => {
      playSlide();
      this.scene.start("MenuScene");
    });
  }

  createLoseScreen(width, height) {
    // Title
    this.add
      .text(width / 2, 100, "Game Over", {
        fontSize: "48px",
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        color: "#e74c3c",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 155, `Reached Stage ${this.stage}`, {
        fontSize: "20px",
        fontFamily: "Arial, sans-serif",
        color: "#c7d5e0",
      })
      .setOrigin(0.5);

    // Stats
    const lines = [
      `Cards Remaining: ${this.cardsLeft}`,
      `Final Score: ${this.score}`,
    ];

    lines.forEach((line, i) => {
      this.add
        .text(width / 2, 210 + i * 30, line, {
          fontSize: "18px",
          fontFamily: "Arial, sans-serif",
          color: "#8b9bb0",
        })
        .setOrigin(0.5);
    });

    // Best records
    const best = localStorage.getItem("solitaireTowerBest") || "0";
    const highScore = localStorage.getItem("solitaireTowerHighScore") || "0";
    this.add
      .text(
        width / 2,
        300,
        `Best Stage: ${best}  |  High Score: ${highScore}`,
        {
          fontSize: "16px",
          fontFamily: "Arial, sans-serif",
          color: "#4fc3f7",
        },
      )
      .setOrigin(0.5);

    // Retry button
    this.createButton(width / 2, 380, "Try Again", () => {
      playMerge();
      this.scene.start("GameScene", { stage: 1 });
    });

    // Menu button
    this.createButton(width / 2, 450, "Menu", () => {
      playSlide();
      this.scene.start("MenuScene");
    });
  }

  createCardParticles(width, height) {
    const suits = ["\u2665", "\u2666", "\u2663", "\u2660"];
    const colors = ["#e74c3c", "#e74c3c", "#c7d5e0", "#c7d5e0"];

    for (let i = 0; i < 12; i++) {
      const si = i % 4;
      const txt = this.add
        .text(
          Phaser.Math.Between(50, width - 50),
          Phaser.Math.Between(-50, -200),
          suits[si],
          {
            fontSize: `${Phaser.Math.Between(20, 36)}px`,
            fontFamily: "Arial, sans-serif",
            color: colors[si],
          },
        )
        .setOrigin(0.5)
        .setAlpha(0.6);

      this.tweens.add({
        targets: txt,
        y: height + 50,
        x: txt.x + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1000),
        ease: "Sine.easeIn",
      });
    }
  }

  createButton(x, y, label, callback) {
    const w = 220;
    const h = 50;
    const gfx = this.add.graphics();

    gfx.fillStyle(0x2a475e, 1);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    gfx.lineStyle(2, 0x4fc3f7, 0.6);
    gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);

    this.add
      .text(x, y, label, {
        fontSize: "22px",
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        color: "#c7d5e0",
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(x, y, w, h)
      .setInteractive({ useHandCursor: true });

    zone.on("pointerover", () => {
      gfx.clear();
      gfx.fillStyle(0x3d6478, 1);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      gfx.lineStyle(2, 0x4fc3f7, 1);
      gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    });

    zone.on("pointerout", () => {
      gfx.clear();
      gfx.fillStyle(0x2a475e, 1);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      gfx.lineStyle(2, 0x4fc3f7, 0.6);
      gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    });

    zone.on("pointerdown", callback);
  }
}
