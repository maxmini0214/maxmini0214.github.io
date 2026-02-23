import Phaser from "phaser";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { width, height } = this.scale;
    const r = this.result;

    // Background
    const bg = this.add.graphics();
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const rv = Math.floor(8 + t * 12);
      const gv = Math.floor(6 + t * 14);
      const bv = Math.floor(25 + t * 35);
      const color = (rv << 16) | (gv << 8) | bv;
      bg.fillStyle(color, 1);
      bg.fillRect(0, (i / steps) * height, width, height / steps + 1);
    }

    // Stars
    this.floaters = [];
    for (let i = 0; i < 20; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        0.5 + Math.random() * 1.5,
        0xffffff,
        0.15 + Math.random() * 0.3,
      );
      star.speed = 0.1 + Math.random() * 0.2;
      this.floaters.push(star);
    }

    // Title
    this.add
      .text(width / 2, 70, "GAME OVER", {
        fontSize: "38px",
        fontFamily: "monospace",
        color: "#ff6644",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (r.isNewRecord) {
      const nrt = this.add
        .text(width / 2, 115, "NEW RECORD!", {
          fontSize: "20px",
          fontFamily: "monospace",
          color: "#ffdd44",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: nrt,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });
    }

    // Total score
    this.add
      .text(width / 2, 185, `${r.totalScore}`, {
        fontSize: "60px",
        fontFamily: "monospace",
        color: "#44ffaa",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 225, "total score", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#667788",
      })
      .setOrigin(0.5);

    // Breakdown
    this.add
      .text(width / 2, 280, `Distance: ${r.distance} pts`, {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#aabbcc",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 308, `Coins: ${r.coins} (+${r.coinScore} pts)`, {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#ffdd44",
      })
      .setOrigin(0.5);

    // Rating
    let rating, ratingColor;
    if (r.totalScore >= 150) {
      rating = "LEGENDARY";
      ratingColor = "#ffdd44";
    } else if (r.totalScore >= 80) {
      rating = "AMAZING";
      ratingColor = "#ff44ff";
    } else if (r.totalScore >= 40) {
      rating = "GREAT";
      ratingColor = "#44ffaa";
    } else if (r.totalScore >= 15) {
      rating = "GOOD";
      ratingColor = "#44aaff";
    } else if (r.totalScore >= 5) {
      rating = "OK";
      ratingColor = "#aacc44";
    } else {
      rating = "TRY AGAIN";
      ratingColor = "#ff6644";
    }

    this.add
      .text(width / 2, 370, rating, {
        fontSize: "26px",
        fontFamily: "monospace",
        color: ratingColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Best
    const best = localStorage.getItem("gravityflip-highscore") || "0";
    this.add
      .text(width / 2, 410, `Best: ${best}`, {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#556677",
      })
      .setOrigin(0.5);

    // Dead player
    this.drawDeadPlayer(width / 2, 480);

    // Buttons
    const retryBtn = this.add
      .text(width / 2 - 80, 560, "RETRY", {
        fontSize: "22px",
        fontFamily: "monospace",
        color: "#44aaff",
        backgroundColor: "#1a2a3a",
        padding: { x: 18, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retryBtn.on("pointerover", () => retryBtn.setAlpha(0.7));
    retryBtn.on("pointerout", () => retryBtn.setAlpha(1));
    retryBtn.on("pointerdown", () => this.scene.start("GameScene"));

    const menuBtn = this.add
      .text(width / 2 + 80, 560, "MENU", {
        fontSize: "22px",
        fontFamily: "monospace",
        color: "#aacc44",
        backgroundColor: "#1a2a3a",
        padding: { x: 18, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    menuBtn.on("pointerover", () => menuBtn.setAlpha(0.7));
    menuBtn.on("pointerout", () => menuBtn.setAlpha(1));
    menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));
  }

  drawDeadPlayer(x, y) {
    const g = this.add.graphics();
    const s = 14;
    g.fillStyle(0x44ffaa, 0.4);
    g.fillRoundedRect(x - s, y - s, s * 2, s * 2, 5);
    // X eyes
    g.lineStyle(2, 0x111111, 0.6);
    g.lineBetween(x - 7, y - 6, x - 1, y);
    g.lineBetween(x - 1, y - 6, x - 7, y);
    g.lineBetween(x + 1, y - 6, x + 7, y);
    g.lineBetween(x + 7, y - 6, x + 1, y);
    // Sad mouth
    g.lineStyle(1.5, 0x228866, 0.5);
    g.beginPath();
    g.arc(x, y + 10, 4, Math.PI, 0, false);
    g.strokePath();
  }

  update() {
    const { width } = this.scale;
    for (const f of this.floaters) {
      f.x -= f.speed;
      if (f.x < -5) {
        f.x = width + 5;
      }
    }
  }
}
