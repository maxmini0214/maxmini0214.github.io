import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    // Title
    this.add
      .text(width / 2, 120, "BEAT RUSH", {
        fontSize: "64px",
        fontFamily: "monospace",
        color: "#00ffcc",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(width / 2, 180, "4-Lane Rhythm Game", {
        fontSize: "20px",
        fontFamily: "monospace",
        color: "#666688",
      })
      .setOrigin(0.5);

    // Lane preview (decorative)
    const laneColors = [0xff4466, 0x44aaff, 0x44ff88, 0xffaa44];
    const laneWidth = 80;
    const startX = width / 2 - laneWidth * 2;
    for (let i = 0; i < 4; i++) {
      const x = startX + i * laneWidth + laneWidth / 2;
      this.add.rectangle(x, 310, laneWidth - 4, 100, laneColors[i], 0.15);
      const keys = ["D", "F", "J", "K"];
      this.add
        .text(x, 310, keys[i], {
          fontSize: "32px",
          fontFamily: "monospace",
          color: "#" + laneColors[i].toString(16).padStart(6, "0"),
        })
        .setOrigin(0.5);
    }

    // Difficulty buttons
    const difficulties = [
      { name: "EASY", bpm: 90, noteCount: 40, color: "#44ff88" },
      { name: "NORMAL", bpm: 120, noteCount: 70, color: "#44aaff" },
      { name: "HARD", bpm: 150, noteCount: 110, color: "#ff4466" },
    ];

    difficulties.forEach((diff, i) => {
      const y = 420 + i * 55;
      const btn = this.add
        .text(width / 2, y, `${diff.name}  (${diff.bpm} BPM)`, {
          fontSize: "24px",
          fontFamily: "monospace",
          color: diff.color,
          backgroundColor: "#1a1a2e",
          padding: { x: 30, y: 8 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on("pointerover", () => btn.setAlpha(0.7));
      btn.on("pointerout", () => btn.setAlpha(1));
      btn.on("pointerdown", () => {
        this.scene.start("GameScene", {
          bpm: diff.bpm,
          noteCount: diff.noteCount,
          difficulty: diff.name,
        });
      });
    });

    // High score
    const highScore = localStorage.getItem("beatrush-highscore") || 0;
    if (highScore > 0) {
      this.add
        .text(width / 2, height - 30, `High Score: ${highScore}`, {
          fontSize: "16px",
          fontFamily: "monospace",
          color: "#555577",
        })
        .setOrigin(0.5);
    }
  }
}
