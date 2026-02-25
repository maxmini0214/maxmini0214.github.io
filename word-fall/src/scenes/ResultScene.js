import Phaser from "phaser";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  init(data) {
    this.result = data;
    this.challengeScore = data.challengeScore || 0;
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

    // Title - challenge aware
    let title, titleColor;
    if (this.challengeScore > 0 && r.score > this.challengeScore) {
      title = "🏆 CHALLENGE BEATEN!";
      titleColor = "#44ff44";
    } else {
      title = "GAME OVER";
      titleColor = "#ff6644";
    }
    this.add
      .text(width / 2, 55, title, {
        fontSize: "38px",
        fontFamily: "monospace",
        color: titleColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Challenge target miss message
    if (this.challengeScore > 0 && r.score <= this.challengeScore) {
      this.add
        .text(width / 2, 90, `Target was ${this.challengeScore} — try again!`, {
          fontSize: '16px', fontFamily: 'monospace', color: '#ff6644'
        })
        .setOrigin(0.5);
    }

    if (r.isNewRecord) {
      this.add
        .text(width / 2, 100, "NEW RECORD!", {
          fontSize: "22px",
          fontFamily: "monospace",
          color: "#ffdd44",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    }

    // Score (big)
    this.add
      .text(width / 2, 170, `${r.score}`, {
        fontSize: "60px",
        fontFamily: "monospace",
        color: "#44ddff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 215, "points", {
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
        .text(width / 2, 265 + i * 28, stat, {
          fontSize: "16px",
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
      .text(width / 2, 380, rating, {
        fontSize: "28px",
        fontFamily: "monospace",
        color: ratingColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Best score
    const best = localStorage.getItem("wordfall-highscore") || "0";
    this.add
      .text(width / 2, 420, `Best: ${best}`, {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#555577",
      })
      .setOrigin(0.5);

    // Challenge a Friend button
    const challengeBtn = this.add
      .text(width / 2, 480, "🏆 CHALLENGE A FRIEND", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#ffffff",
        backgroundColor: "#ff8800",
        padding: { x: 18, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    challengeBtn.on("pointerover", () => challengeBtn.setAlpha(0.7));
    challengeBtn.on("pointerout", () => challengeBtn.setAlpha(1));
    challengeBtn.on("pointerdown", () => {
      const url = `${window.location.origin}${window.location.pathname}?c=${r.score}`;
      const text = `I scored ${r.score} in Word Fall! 📝 Can you beat me? ${url}`;
      if (navigator.share) {
        navigator.share({ title: 'Word Fall Challenge', text }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          challengeBtn.setText('📋 LINK COPIED!');
          this.time.delayedCall(2000, () => challengeBtn.setText('🏆 CHALLENGE A FRIEND'));
        });
      }
    });

    // Buttons
    const retryBtn = this.add
      .text(width / 2 - 90, 550, "RETRY", {
        fontSize: "24px",
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
      .text(width / 2 + 90, 550, "MENU", {
        fontSize: "24px",
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
