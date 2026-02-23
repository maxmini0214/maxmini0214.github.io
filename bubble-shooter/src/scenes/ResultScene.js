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

    // Floating bubbles background
    this.bubbles = [];
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const colors = [
        0xff4444, 0x44ff44, 0x4488ff, 0xffcc00, 0xff44ff, 0x44ffcc,
      ];
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];
      const circle = this.add.circle(
        x,
        y,
        Phaser.Math.Between(6, 14),
        color,
        0.12,
      );
      circle.speed = 0.15 + Math.random() * 0.3;
      circle.drift = (Math.random() - 0.5) * 0.2;
      this.bubbles.push(circle);
    }

    // Title
    const title = r.cleared ? "BOARD CLEARED!" : "GAME OVER";
    const titleColor = r.cleared ? "#44ffcc" : "#ff6644";
    this.add
      .text(width / 2, 80, title, {
        fontSize: "36px",
        fontFamily: "monospace",
        color: titleColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (r.isNewRecord) {
      this.add
        .text(width / 2, 125, "NEW RECORD!", {
          fontSize: "20px",
          fontFamily: "monospace",
          color: "#ffdd44",
        })
        .setOrigin(0.5);
    }

    // Score (big)
    this.add
      .text(width / 2, 210, `${r.score}`, {
        fontSize: "64px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 260, "points", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#667788",
      })
      .setOrigin(0.5);

    // Rating
    let rating, ratingColor;
    if (r.score >= 2000) {
      rating = "LEGENDARY";
      ratingColor = "#ffdd44";
    } else if (r.score >= 1000) {
      rating = "AMAZING";
      ratingColor = "#ff44ff";
    } else if (r.score >= 500) {
      rating = "GREAT";
      ratingColor = "#44ffcc";
    } else if (r.score >= 200) {
      rating = "GOOD";
      ratingColor = "#44aaff";
    } else if (r.score >= 50) {
      rating = "OK";
      ratingColor = "#aacc44";
    } else {
      rating = "TRY AGAIN";
      ratingColor = "#ff6644";
    }

    this.add
      .text(width / 2, 340, rating, {
        fontSize: "28px",
        fontFamily: "monospace",
        color: ratingColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (r.cleared) {
      this.add
        .text(width / 2, 385, "+500 clear bonus!", {
          fontSize: "16px",
          fontFamily: "monospace",
          color: "#44ffcc",
        })
        .setOrigin(0.5);
    }

    // Best score
    const best = localStorage.getItem("bubbleshooter-highscore") || "0";
    this.add
      .text(width / 2, 430, `Best: ${best}`, {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#555577",
      })
      .setOrigin(0.5);

    // Buttons
    const retryBtn = this.add
      .text(width / 2 - 80, 530, "RETRY", {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#44aaff",
        backgroundColor: "#112244",
        padding: { x: 20, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retryBtn.on("pointerover", () => retryBtn.setAlpha(0.7));
    retryBtn.on("pointerout", () => retryBtn.setAlpha(1));
    retryBtn.on("pointerdown", () => this.scene.start("GameScene"));

    const menuBtn = this.add
      .text(width / 2 + 80, 530, "MENU", {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#aacc44",
        backgroundColor: "#112244",
        padding: { x: 20, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    menuBtn.on("pointerover", () => menuBtn.setAlpha(0.7));
    menuBtn.on("pointerout", () => menuBtn.setAlpha(1));
    menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));
  }

  update() {
    const { height } = this.scale;
    for (const b of this.bubbles) {
      b.y -= b.speed;
      b.x += b.drift;
      if (b.y < -20) {
        b.y = height + 20;
        b.x = Phaser.Math.Between(0, this.scale.width);
      }
    }
  }
}
