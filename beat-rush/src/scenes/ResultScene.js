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

    // Grade calculation
    const accuracy =
      r.total > 0 ? ((r.perfects + r.goods * 0.5) / r.total) * 100 : 0;
    let grade, gradeColor;
    if (accuracy >= 95) {
      grade = "S";
      gradeColor = "#ffdd44";
    } else if (accuracy >= 85) {
      grade = "A";
      gradeColor = "#00ffcc";
    } else if (accuracy >= 70) {
      grade = "B";
      gradeColor = "#44aaff";
    } else if (accuracy >= 50) {
      grade = "C";
      gradeColor = "#aacc44";
    } else {
      grade = "D";
      gradeColor = "#ff4466";
    }

    // Grade display
    this.add
      .text(width / 2, 80, grade, {
        fontSize: "96px",
        fontFamily: "monospace",
        color: gradeColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (r.isNewRecord) {
      this.add
        .text(width / 2, 135, "NEW RECORD!", {
          fontSize: "18px",
          fontFamily: "monospace",
          color: "#ffdd44",
        })
        .setOrigin(0.5);
    }

    // Stats
    const stats = [
      `Score: ${r.score}`,
      `Max Combo: ${r.maxCombo}`,
      "",
      `Perfect: ${r.perfects}`,
      `Good: ${r.goods}`,
      `Miss: ${r.misses}`,
      "",
      `Accuracy: ${accuracy.toFixed(1)}%`,
      `${r.difficulty} ${r.bpm}BPM`,
    ];

    stats.forEach((line, i) => {
      if (line === "") return;
      const isPerfect = line.startsWith("Perfect");
      const isGood = line.startsWith("Good");
      const isMiss = line.startsWith("Miss");
      const color = isPerfect
        ? "#00ffcc"
        : isGood
          ? "#aacc44"
          : isMiss
            ? "#ff4466"
            : "#aaaacc";
      this.add
        .text(width / 2, 180 + i * 32, line, {
          fontSize: "20px",
          fontFamily: "monospace",
          color,
        })
        .setOrigin(0.5);
    });

    // Buttons
    const retryBtn = this.add
      .text(width / 2 - 100, height - 80, "RETRY", {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#44aaff",
        backgroundColor: "#1a1a2e",
        padding: { x: 20, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    retryBtn.on("pointerover", () => retryBtn.setAlpha(0.7));
    retryBtn.on("pointerout", () => retryBtn.setAlpha(1));
    retryBtn.on("pointerdown", () => {
      this.scene.start("GameScene", {
        bpm: r.bpm,
        noteCount: r.total,
        difficulty: r.difficulty,
      });
    });

    const menuBtn = this.add
      .text(width / 2 + 100, height - 80, "MENU", {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#aacc44",
        backgroundColor: "#1a1a2e",
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
}
