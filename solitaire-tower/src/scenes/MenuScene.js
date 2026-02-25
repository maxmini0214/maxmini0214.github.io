import Phaser from "phaser";
import {
  playSlide,
  playMerge,
  startPuzzleBgm,
  stopBgm,
  isBgmPlaying,
} from "../../../../common/audio.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    // Challenge mode
    const params = new URLSearchParams(window.location.search);
    this.challengeScore = params.get('c') ? parseInt(params.get('c'), 10) : 0;

    if (this.challengeScore > 0) {
      const bannerGfx = this.add.graphics();
      bannerGfx.fillStyle(0xff8800, 0.9);
      bannerGfx.fillRoundedRect(width / 2 - 180, 18, 360, 60, 12);
      bannerGfx.setDepth(10);
      this.add.text(width / 2, 35, '🏆 CHALLENGE', {
        fontSize: '22px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(11);
      this.add.text(width / 2, 62, `Beat ${this.challengeScore} points!`, {
        fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#fff8e0'
      }).setOrigin(0.5).setDepth(11);
    }

    // Background gradient
    const gfx = this.add.graphics();
    gfx.fillGradientStyle(0x1b2838, 0x1b2838, 0x2a475e, 0x2a475e, 1);
    gfx.fillRect(0, 0, width, height);

    // Decorative cards
    this.drawDecoCards();

    // Title
    this.add
      .text(width / 2, 80, "Solitaire Tower", {
        fontSize: "48px",
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        color: "#c7d5e0",
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(width / 2, 130, "Clear the towers by matching cards!", {
        fontSize: "16px",
        fontFamily: "Arial, sans-serif",
        color: "#8b9bb0",
      })
      .setOrigin(0.5);

    // How to play
    const rules = [
      "Select cards that are +1 or -1 of the current card",
      "K wraps to A, A wraps to K",
      "Draw from deck when stuck",
      "Clear all tower cards to win!",
    ];

    rules.forEach((rule, i) => {
      this.add
        .text(width / 2, 180 + i * 22, rule, {
          fontSize: "13px",
          fontFamily: "Arial, sans-serif",
          color: "#66808f",
        })
        .setOrigin(0.5);
    });

    // Play button
    this.createButton(width / 2, 320, "Play", () => {
      playMerge();
      this.scene.start("GameScene", { stage: 1 });
    });

    // Continue button (if saved progress)
    const saved = localStorage.getItem("solitaireTowerStage");
    if (saved && parseInt(saved) > 1) {
      this.createButton(width / 2, 395, `Continue (Stage ${saved})`, () => {
        playMerge();
        this.scene.start("GameScene", { stage: parseInt(saved) });
      });
    }

    // Best stage record
    const best = localStorage.getItem("solitaireTowerBest");
    if (best) {
      this.add
        .text(width / 2, 470, `Best: Stage ${best}`, {
          fontSize: "16px",
          fontFamily: "Arial, sans-serif",
          fontStyle: "bold",
          color: "#4fc3f7",
        })
        .setOrigin(0.5);
    }

    // High score
    const highScore = localStorage.getItem("solitaireTowerHighScore");
    if (highScore) {
      this.add
        .text(width / 2, 496, `High Score: ${highScore}`, {
          fontSize: "14px",
          fontFamily: "Arial, sans-serif",
          color: "#8b9bb0",
        })
        .setOrigin(0.5);
    }

    // Music toggle
    this.createMusicToggle(width - 50, 40);

    // Footer
    this.add
      .text(width / 2, height - 20, "Tap/Click to play", {
        fontSize: "12px",
        fontFamily: "Arial, sans-serif",
        color: "#4a6070",
      })
      .setOrigin(0.5);
  }

  drawDecoCards() {
    const gfx = this.add.graphics();
    const suits = ["#e74c3c", "#2c3e50", "#e74c3c", "#2c3e50"];
    const labels = ["A", "K", "Q", "J"];
    const positions = [
      { x: 70, y: 300 },
      { x: 730, y: 300 },
      { x: 50, y: 520 },
      { x: 750, y: 520 },
    ];

    positions.forEach((pos, i) => {
      gfx.fillStyle(0xffffff, 0.08);
      gfx.fillRoundedRect(pos.x - 22, pos.y - 30, 44, 60, 6);
      this.add
        .text(pos.x, pos.y, labels[i], {
          fontSize: "20px",
          fontFamily: "Arial, sans-serif",
          fontStyle: "bold",
          color: suits[i],
        })
        .setOrigin(0.5)
        .setAlpha(0.3);
    });
  }

  createButton(x, y, label, callback) {
    const w = 260;
    const h = 55;
    const gfx = this.add.graphics();

    gfx.fillStyle(0x2a475e, 1);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    gfx.lineStyle(2, 0x4fc3f7, 0.6);
    gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);

    this.add
      .text(x, y, label, {
        fontSize: "24px",
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

  createMusicToggle(x, y) {
    const txt = this.add
      .text(x, y, isBgmPlaying() ? "ON" : "OFF", {
        fontSize: "18px",
        fontFamily: "Arial, sans-serif",
        color: isBgmPlaying() ? "#4fc3f7" : "#555",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    txt.on("pointerdown", () => {
      if (isBgmPlaying()) {
        stopBgm();
        txt.setText("OFF").setColor("#555");
      } else {
        startPuzzleBgm();
        txt.setText("ON").setColor("#4fc3f7");
      }
      playSlide();
    });
  }
}
