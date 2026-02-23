import Phaser from "phaser";
import { playMilestone } from "../../../../common/audio.js";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.maxCombo = data.combo || 0;
    this.correct = data.correct || 0;
    this.total = data.total || 0;
    this.level = data.level || 1;
    this.difficulty = data.difficulty || 1;
  }

  create() {
    const { width, height } = this.scale;

    // Check and save high score
    const prevBest = parseInt(localStorage.getItem("mathDashBest") || "0", 10);
    const isNewBest = this.finalScore > prevBest;
    if (isNewBest) {
      localStorage.setItem("mathDashBest", String(this.finalScore));
    }

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // Play milestone sound for new best
    if (isNewBest && this.finalScore > 0) {
      playMilestone();
    }

    // Title
    this.add
      .text(width / 2, 80, "GAME OVER", {
        fontSize: "40px",
        color: "#e94560",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Difficulty label
    const diffLabels = { 1: "EASY", 2: "NORMAL", 3: "HARD" };
    this.add
      .text(width / 2, 125, diffLabels[this.difficulty] || "NORMAL", {
        fontSize: "16px",
        color: "#888888",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Score display (big)
    this.add
      .text(width / 2, 200, String(this.finalScore), {
        fontSize: "64px",
        color: "#ffffff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 245, "POINTS", {
        fontSize: "16px",
        color: "#888888",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // New best badge
    if (isNewBest && this.finalScore > 0) {
      const badge = this.add
        .text(width / 2, 280, "NEW BEST!", {
          fontSize: "22px",
          color: "#f0c929",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: badge,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    // Stats panel
    const panelY = 330;
    const panelH = 200;
    const panel = this.add.graphics();
    panel.fillStyle(0x0f3460, 0.4);
    panel.fillRoundedRect(40, panelY, width - 80, panelH, 12);
    panel.lineStyle(1, 0x3282b8, 0.5);
    panel.strokeRoundedRect(40, panelY, width - 80, panelH, 12);

    const accuracy =
      this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0;

    const stats = [
      { label: "Level Reached", value: String(this.level) },
      {
        label: "Accuracy",
        value: `${accuracy}% (${this.correct}/${this.total})`,
      },
      { label: "Max Combo", value: `${this.maxCombo}x` },
      {
        label: "Best Score",
        value: String(Math.max(prevBest, this.finalScore)),
      },
    ];

    stats.forEach((stat, i) => {
      const y = panelY + 30 + i * 42;
      this.add.text(65, y, stat.label, {
        fontSize: "15px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      });
      this.add
        .text(width - 65, y, stat.value, {
          fontSize: "15px",
          color: "#ffffff",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(1, 0);
    });

    // Retry button
    const retryY = 580;
    const btnW = 200;
    const btnH = 55;
    const retryBtn = this.add.graphics();
    retryBtn.fillStyle(0x4ecca3, 0.2);
    retryBtn.fillRoundedRect(
      width / 2 - btnW / 2,
      retryY - btnH / 2,
      btnW,
      btnH,
      12,
    );
    retryBtn.lineStyle(2, 0x4ecca3, 0.8);
    retryBtn.strokeRoundedRect(
      width / 2 - btnW / 2,
      retryY - btnH / 2,
      btnW,
      btnH,
      12,
    );

    this.add
      .text(width / 2, retryY, "RETRY", {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const retryZone = this.add
      .zone(width / 2, retryY, btnW, btnH)
      .setInteractive({ useHandCursor: true });

    retryZone.on("pointerover", () => {
      retryBtn.clear();
      retryBtn.fillStyle(0x4ecca3, 0.4);
      retryBtn.fillRoundedRect(
        width / 2 - btnW / 2,
        retryY - btnH / 2,
        btnW,
        btnH,
        12,
      );
      retryBtn.lineStyle(2, 0x4ecca3, 1);
      retryBtn.strokeRoundedRect(
        width / 2 - btnW / 2,
        retryY - btnH / 2,
        btnW,
        btnH,
        12,
      );
    });

    retryZone.on("pointerout", () => {
      retryBtn.clear();
      retryBtn.fillStyle(0x4ecca3, 0.2);
      retryBtn.fillRoundedRect(
        width / 2 - btnW / 2,
        retryY - btnH / 2,
        btnW,
        btnH,
        12,
      );
      retryBtn.lineStyle(2, 0x4ecca3, 0.8);
      retryBtn.strokeRoundedRect(
        width / 2 - btnW / 2,
        retryY - btnH / 2,
        btnW,
        btnH,
        12,
      );
    });

    retryZone.on("pointerdown", () => {
      this.scene.start("GameScene", { difficulty: this.difficulty });
    });

    // Menu button
    const menuY = 650;
    const menuBtn = this.add.graphics();
    menuBtn.fillStyle(0x3282b8, 0.2);
    menuBtn.fillRoundedRect(
      width / 2 - btnW / 2,
      menuY - btnH / 2,
      btnW,
      btnH,
      12,
    );
    menuBtn.lineStyle(2, 0x3282b8, 0.8);
    menuBtn.strokeRoundedRect(
      width / 2 - btnW / 2,
      menuY - btnH / 2,
      btnW,
      btnH,
      12,
    );

    this.add
      .text(width / 2, menuY, "MENU", {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const menuZone = this.add
      .zone(width / 2, menuY, btnW, btnH)
      .setInteractive({ useHandCursor: true });

    menuZone.on("pointerover", () => {
      menuBtn.clear();
      menuBtn.fillStyle(0x3282b8, 0.4);
      menuBtn.fillRoundedRect(
        width / 2 - btnW / 2,
        menuY - btnH / 2,
        btnW,
        btnH,
        12,
      );
      menuBtn.lineStyle(2, 0x3282b8, 1);
      menuBtn.strokeRoundedRect(
        width / 2 - btnW / 2,
        menuY - btnH / 2,
        btnW,
        btnH,
        12,
      );
    });

    menuZone.on("pointerout", () => {
      menuBtn.clear();
      menuBtn.fillStyle(0x3282b8, 0.2);
      menuBtn.fillRoundedRect(
        width / 2 - btnW / 2,
        menuY - btnH / 2,
        btnW,
        btnH,
        12,
      );
      menuBtn.lineStyle(2, 0x3282b8, 0.8);
      menuBtn.strokeRoundedRect(
        width / 2 - btnW / 2,
        menuY - btnH / 2,
        btnW,
        btnH,
        12,
      );
    });

    menuZone.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}
