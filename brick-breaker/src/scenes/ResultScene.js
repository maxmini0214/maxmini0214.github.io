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

    // Falling brick particles
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      const colors = [0xff4444, 0xff8844, 0xffcc44, 0x44cc44, 0x4488ff];
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-height, 0);
      const size = Phaser.Math.Between(3, 8);
      const p = this.add.rectangle(x, y, size, size * 0.6, color, 0.4);
      p.speed = 0.3 + Math.random() * 0.8;
      p.drift = (Math.random() - 0.5) * 0.3;
      this.particles.push(p);
    }

    // Title
    this.add
      .text(width / 2, 80, "GAME OVER", {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#ff6644",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (r.isNewRecord) {
      const newRecText = this.add
        .text(width / 2, 130, "NEW HIGH SCORE!", {
          fontSize: "22px",
          fontFamily: "monospace",
          color: "#ffdd44",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: newRecText,
        alpha: 0.4,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    // Score
    this.add
      .text(width / 2, 200, `${r.score}`, {
        fontSize: "72px",
        fontFamily: "monospace",
        color: "#00ffcc",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 250, "points", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#667788",
      })
      .setOrigin(0.5);

    // Level reached
    this.add
      .text(width / 2, 300, `Level reached: ${r.level}`, {
        fontSize: "20px",
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
      .text(width / 2, 360, rating, {
        fontSize: "28px",
        fontFamily: "monospace",
        color: ratingColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Best score
    const best = localStorage.getItem("brickbreaker-highscore") || "0";
    this.add
      .text(width / 2, 410, `Best: ${best} pts`, {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#555577",
      })
      .setOrigin(0.5);

    // Buttons
    const retryBtn = this.add
      .text(width / 2 - 90, 490, "RETRY", {
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
    retryBtn.on("pointerdown", () => {
      this.scene.start("GameScene");
    });

    const menuBtn = this.add
      .text(width / 2 + 90, 490, "MENU", {
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
    menuBtn.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }

  update() {
    const { width, height } = this.scale;
    for (const p of this.particles) {
      p.y += p.speed;
      p.x += p.drift;
      if (p.y > height + 10) {
        p.y = -10;
        p.x = Phaser.Math.Between(0, width);
      }
    }
  }
}
