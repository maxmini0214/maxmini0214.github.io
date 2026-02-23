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

    // Starfield
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const star = this.add.circle(
        x,
        y,
        1,
        0xffffff,
        0.2 + Math.random() * 0.4,
      );
      star.speed = 0.1 + Math.random() * 0.3;
      this.stars.push(star);
    }

    // Destroyed planet debris
    const g = this.add.graphics();
    g.fillStyle(0x2255aa, 0.2);
    for (let i = 0; i < 6; i++) {
      const dx = Phaser.Math.Between(-40, 40);
      const dy = Phaser.Math.Between(-30, 30);
      g.fillCircle(width / 2 + dx, 180 + dy, Phaser.Math.Between(5, 15));
    }

    // Title
    this.add
      .text(width / 2, 60, "PLANET LOST", {
        fontSize: "38px",
        fontFamily: "monospace",
        color: "#ff6644",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (r.isNewRecord) {
      this.add
        .text(width / 2, 100, "NEW HIGH SCORE!", {
          fontSize: "20px",
          fontFamily: "monospace",
          color: "#ffdd44",
        })
        .setOrigin(0.5);
    }

    // Score (big)
    this.add
      .text(width / 2, 250, `${r.score}`, {
        fontSize: "64px",
        fontFamily: "monospace",
        color: "#00ffcc",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 295, "points", {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#667788",
      })
      .setOrigin(0.5);

    // Stats
    this.add
      .text(width / 2, 340, `Wave reached: ${r.wave}`, {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#aabbcc",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 370, `Enemies destroyed: ${r.kills}`, {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#aabbcc",
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
      ratingColor = "#00ffcc";
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
      .text(width / 2, 420, rating, {
        fontSize: "28px",
        fontFamily: "monospace",
        color: ratingColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Best score
    const best = localStorage.getItem("orbitdefense-highscore") || "0";
    this.add
      .text(width / 2, 460, `Best: ${best}`, {
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
        backgroundColor: "#112233",
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
        backgroundColor: "#112233",
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
    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > height) {
        star.y = 0;
        star.x = Phaser.Math.Between(0, this.scale.width);
      }
    }
  }
}
