import { playSlide } from "../../../../common/audio.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const W = 800;
    const H = 600;

    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Title
    this.add
      .text(W / 2, 80, "MINE FIELD", {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#e94560",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Mine icon (decorative circles)
    const g = this.add.graphics();
    for (let i = 0; i < 5; i++) {
      const x = 200 + i * 100;
      g.fillStyle(0x333355, 1);
      g.fillCircle(x, 140, 12);
      g.lineStyle(2, 0xe94560);
      g.strokeCircle(x, 140, 12);
    }

    // Difficulty options
    const difficulties = [
      { label: "Beginner", sub: "9 x 9  |  10 Mines", key: "beginner" },
      {
        label: "Intermediate",
        sub: "16 x 16  |  40 Mines",
        key: "intermediate",
      },
      { label: "Expert", sub: "30 x 16  |  99 Mines", key: "expert" },
    ];

    difficulties.forEach((diff, i) => {
      const y = 230 + i * 110;
      const btn = this.add.graphics();
      const btnRect = new Phaser.Geom.Rectangle(W / 2 - 180, y - 35, 360, 70);

      btn.fillStyle(0x16213e, 1);
      btn.fillRoundedRect(
        btnRect.x,
        btnRect.y,
        btnRect.width,
        btnRect.height,
        8,
      );
      btn.lineStyle(2, 0x0f3460);
      btn.strokeRoundedRect(
        btnRect.x,
        btnRect.y,
        btnRect.width,
        btnRect.height,
        8,
      );

      const label = this.add
        .text(W / 2, y - 8, diff.label, {
          fontSize: "28px",
          fontFamily: "monospace",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const sub = this.add
        .text(W / 2, y + 18, diff.sub, {
          fontSize: "16px",
          fontFamily: "monospace",
          color: "#aaaacc",
        })
        .setOrigin(0.5);

      const hitArea = this.add
        .zone(W / 2, y, 360, 70)
        .setInteractive({ useHandCursor: true });

      hitArea.on("pointerover", () => {
        btn.clear();
        btn.fillStyle(0x1a2744, 1);
        btn.fillRoundedRect(
          btnRect.x,
          btnRect.y,
          btnRect.width,
          btnRect.height,
          8,
        );
        btn.lineStyle(2, 0xe94560);
        btn.strokeRoundedRect(
          btnRect.x,
          btnRect.y,
          btnRect.width,
          btnRect.height,
          8,
        );
        label.setColor("#e94560");
      });

      hitArea.on("pointerout", () => {
        btn.clear();
        btn.fillStyle(0x16213e, 1);
        btn.fillRoundedRect(
          btnRect.x,
          btnRect.y,
          btnRect.width,
          btnRect.height,
          8,
        );
        btn.lineStyle(2, 0x0f3460);
        btn.strokeRoundedRect(
          btnRect.x,
          btnRect.y,
          btnRect.width,
          btnRect.height,
          8,
        );
        label.setColor("#ffffff");
      });

      hitArea.on("pointerdown", () => {
        playSlide();
        this.scene.start("GameScene", { difficulty: diff.key });
      });
    });

    // Instructions
    this.add
      .text(
        W / 2,
        H - 40,
        "Click to reveal  |  Right-click or long-press to flag",
        {
          fontSize: "14px",
          fontFamily: "monospace",
          color: "#666688",
        },
      )
      .setOrigin(0.5);
  }
}
