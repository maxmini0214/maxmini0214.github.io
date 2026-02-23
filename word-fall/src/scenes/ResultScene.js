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

    // Falling letters background
    this.letters = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 20; i++) {
      const char = chars[Phaser.Math.Between(0, 25)];
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-height, height);
      const letter = this.add
        .text(x, y, char, {
          fontSize: `${Phaser.Math.Between(14, 24)}px`,
          fontFamily: "monospace",
          color: "#1a2a4a",
        })
        .setOrigin(0.5);
      letter.speed = 0.2 + Math.random() * 0.5;
      this.letters.push(letter);
    }

    // Title
    this.add
      .text(width / 2, 80, "GAME OVER", {
        fontSize: "44px",
        fontFamily: "monospace",
        color: "#ff6644",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (r.isNewRecord) {
      this.add
        .text(width / 2, 125, "NEW RECORD!", {
          fontSize: "22px",
          fontFamily: "monospace",
          color: "#ffdd44",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    }

    // Score (big)
    this.add
      .text(width / 2, 210, `${r.score}`, {
        fontSize: "68px",
        fontFamily: "monospace",
        color: "#44ddff",
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

    // Stats
    const stats = [
      `Words cleared: ${r.wordsCleared}`,
      `Max combo: ${r.maxCombo}x`,
      `Level reached: ${r.level}`,
    ];

    stats.forEach((stat, i) => {
      this.add
        .text(width / 2, 320 + i * 32, stat, {
          fontSize: "18px",
          fontFamily: "monospace",
          color: "#aabbcc",
        })
        .setOrigin(0.5);
    });

    // Rating
    let rating, ratingColor;
    if (r.score >= 5000) {
      rating = "LEGENDARY";
      ratingColor = "#ffdd44";
    } else if (r.score >= 2000) {
      rating = "AMAZING";
      ratingColor = "#ff44ff";
    } else if (r.score >= 1000) {
      rating = "GREAT";
      ratingColor = "#44ffaa";
    } else if (r.score >= 500) {
      rating = "GOOD";
      ratingColor = "#44aaff";
    } else if (r.score >= 200) {
      rating = "OK";
      ratingColor = "#aacc44";
    } else {
      rating = "TRY AGAIN";
      ratingColor = "#ff6644";
    }

    this.add
      .text(width / 2, 440, rating, {
        fontSize: "30px",
        fontFamily: "monospace",
        color: ratingColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Best score
    const best = localStorage.getItem("wordfall-highscore") || "0";
    this.add
      .text(width / 2, 490, `Best: ${best}`, {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#555577",
      })
      .setOrigin(0.5);

    // Buttons
    const retryBtn = this.add
      .text(width / 2 - 90, 570, "RETRY", {
        fontSize: "26px",
        fontFamily: "monospace",
        color: "#44aaff",
        backgroundColor: "#112233",
        padding: { x: 24, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retryBtn.on("pointerover", () => retryBtn.setAlpha(0.7));
    retryBtn.on("pointerout", () => retryBtn.setAlpha(1));
    retryBtn.on("pointerdown", () => {
      this.scene.start("GameScene");
    });

    const menuBtn = this.add
      .text(width / 2 + 90, 570, "MENU", {
        fontSize: "26px",
        fontFamily: "monospace",
        color: "#aacc44",
        backgroundColor: "#112233",
        padding: { x: 24, y: 10 },
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
    const { height, width } = this.scale;
    for (const letter of this.letters) {
      letter.y += letter.speed;
      if (letter.y > height + 20) {
        letter.y = -20;
        letter.x = Phaser.Math.Between(0, width);
      }
    }
  }
}
