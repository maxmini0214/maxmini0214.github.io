import { playSlide } from "../../../../common/audio.js";

const DIFF_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
};

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  init(data) {
    this.won = data.won;
    this.difficulty = data.difficulty || "beginner";
    this.time = data.time || 0;
  }

  create() {
    const W = 800;
    const H = 600;

    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Result title
    const title = this.won ? "CLEARED!" : "GAME OVER";
    const titleColor = this.won ? "#66bb6a" : "#e94560";

    this.add
      .text(W / 2, 120, title, {
        fontSize: "52px",
        fontFamily: "monospace",
        color: titleColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Stats
    this.add
      .text(W / 2, 200, DIFF_LABELS[this.difficulty], {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#aaaacc",
      })
      .setOrigin(0.5);

    if (this.won) {
      this.add
        .text(W / 2, 250, `Time: ${this.time}s`, {
          fontSize: "32px",
          fontFamily: "monospace",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      // Best time from localStorage
      const key = `minefield_best_${this.difficulty}`;
      const best = localStorage.getItem(key);
      if (!best || this.time < parseInt(best, 10)) {
        localStorage.setItem(key, String(this.time));
        this.add
          .text(W / 2, 295, "NEW BEST!", {
            fontSize: "20px",
            fontFamily: "monospace",
            color: "#ffdd57",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
      } else {
        this.add
          .text(W / 2, 295, `Best: ${best}s`, {
            fontSize: "20px",
            fontFamily: "monospace",
            color: "#888888",
          })
          .setOrigin(0.5);
      }
    }

    // Retry button
    const retryY = 380;
    this.createButton(W / 2, retryY, "PLAY AGAIN", () => {
      playSlide();
      this.scene.start("GameScene", { difficulty: this.difficulty });
    });

    // Menu button
    this.createButton(W / 2, retryY + 70, "MENU", () => {
      playSlide();
      this.scene.start("MenuScene");
    });
  }

  createButton(x, y, label, callback) {
    const g = this.add.graphics();
    const rect = new Phaser.Geom.Rectangle(x - 130, y - 25, 260, 50);

    g.fillStyle(0x16213e, 1);
    g.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 8);
    g.lineStyle(2, 0x0f3460);
    g.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 8);

    const txt = this.add
      .text(x, y, label, {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(x, y, 260, 50)
      .setInteractive({ useHandCursor: true });

    zone.on("pointerover", () => {
      g.clear();
      g.fillStyle(0x1a2744, 1);
      g.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 8);
      g.lineStyle(2, 0xe94560);
      g.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 8);
      txt.setColor("#e94560");
    });

    zone.on("pointerout", () => {
      g.clear();
      g.fillStyle(0x16213e, 1);
      g.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 8);
      g.lineStyle(2, 0x0f3460);
      g.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 8);
      txt.setColor("#ffffff");
    });

    zone.on("pointerdown", callback);
  }
}
