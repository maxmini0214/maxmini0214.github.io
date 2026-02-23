import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    // Background gradient effect using graphics
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative math symbols floating in background
    this.symbols = [];
    const mathChars = ["+", "-", "x", "/", "=", "1", "2", "3", "7", "9", "0"];
    for (let i = 0; i < 20; i++) {
      const sym = this.add
        .text(
          Phaser.Math.Between(20, width - 20),
          Phaser.Math.Between(20, height - 20),
          Phaser.Math.RND.pick(mathChars),
          {
            fontSize: `${Phaser.Math.Between(16, 36)}px`,
            color: "#ffffff",
            fontFamily: "monospace",
          },
        )
        .setOrigin(0.5)
        .setAlpha(0.08);
      this.symbols.push({
        text: sym,
        speed: Phaser.Math.FloatBetween(0.2, 0.6),
      });
    }

    // Title
    this.add
      .text(width / 2, 160, "MATH", {
        fontSize: "72px",
        color: "#e94560",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 235, "DASH", {
        fontSize: "72px",
        color: "#0f3460",
        fontFamily: "monospace",
        fontStyle: "bold",
        stroke: "#e94560",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(width / 2, 300, "Speed Run Arithmetic", {
        fontSize: "18px",
        color: "#a8a8a8",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Difficulty buttons
    const difficulties = [
      { label: "EASY", sublabel: "Addition only", color: 0x4ecca3, level: 1 },
      {
        label: "NORMAL",
        sublabel: "Add & Subtract",
        color: 0xf0c929,
        level: 2,
      },
      {
        label: "HARD",
        sublabel: "All operations",
        color: 0xe94560,
        level: 3,
      },
    ];

    const startY = 400;
    const btnW = 280;
    const btnH = 70;
    const gap = 85;

    difficulties.forEach((d, i) => {
      const y = startY + i * gap;
      const btn = this.add.graphics();

      // Button background
      btn.fillStyle(d.color, 0.15);
      btn.fillRoundedRect(width / 2 - btnW / 2, y - btnH / 2, btnW, btnH, 12);
      btn.lineStyle(2, d.color, 0.8);
      btn.strokeRoundedRect(width / 2 - btnW / 2, y - btnH / 2, btnW, btnH, 12);

      // Button label
      this.add
        .text(width / 2, y - 10, d.label, {
          fontSize: "24px",
          color: "#ffffff",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      this.add
        .text(width / 2, y + 16, d.sublabel, {
          fontSize: "13px",
          color: "#aaaaaa",
          fontFamily: "monospace",
        })
        .setOrigin(0.5);

      // Interactive zone
      const zone = this.add
        .zone(width / 2, y, btnW, btnH)
        .setInteractive({ useHandCursor: true });

      zone.on("pointerover", () => {
        btn.clear();
        btn.fillStyle(d.color, 0.3);
        btn.fillRoundedRect(width / 2 - btnW / 2, y - btnH / 2, btnW, btnH, 12);
        btn.lineStyle(2, d.color, 1);
        btn.strokeRoundedRect(
          width / 2 - btnW / 2,
          y - btnH / 2,
          btnW,
          btnH,
          12,
        );
      });

      zone.on("pointerout", () => {
        btn.clear();
        btn.fillStyle(d.color, 0.15);
        btn.fillRoundedRect(width / 2 - btnW / 2, y - btnH / 2, btnW, btnH, 12);
        btn.lineStyle(2, d.color, 0.8);
        btn.strokeRoundedRect(
          width / 2 - btnW / 2,
          y - btnH / 2,
          btnW,
          btnH,
          12,
        );
      });

      zone.on("pointerdown", () => {
        this.scene.start("GameScene", { difficulty: d.level });
      });
    });

    // High score display
    const best = localStorage.getItem("mathDashBest") || 0;
    if (best > 0) {
      this.add
        .text(width / 2, height - 40, `Best: ${best}`, {
          fontSize: "16px",
          color: "#666666",
          fontFamily: "monospace",
        })
        .setOrigin(0.5);
    }
  }

  update() {
    // Slowly drift symbols upward
    for (const s of this.symbols) {
      s.text.y -= s.speed;
      if (s.text.y < -20) {
        s.text.y = this.scale.height + 20;
        s.text.x = Phaser.Math.Between(20, this.scale.width - 20);
      }
    }
  }
}
