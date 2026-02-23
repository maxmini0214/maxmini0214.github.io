import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    // Background gradient
    const bg = this.add.graphics();
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(8 + t * 12);
      const g = Math.floor(6 + t * 14);
      const b = Math.floor(25 + t * 35);
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, (i / steps) * height, width, height / steps + 1);
    }

    // Stars
    for (let i = 0; i < 30; i++) {
      this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        0.5 + Math.random() * 1.5,
        0xffffff,
        0.15 + Math.random() * 0.35,
      );
    }

    // Floating platforms (decorative)
    const platGfx = this.add.graphics();
    platGfx.fillStyle(0x2266aa, 0.4);
    platGfx.fillRoundedRect(60, height * 0.7, 120, 12, 4);
    platGfx.fillRoundedRect(300, height * 0.3, 100, 12, 4);
    platGfx.fillRoundedRect(180, height * 0.5, 80, 12, 4);

    // Animated player
    this.playerY = height * 0.48;
    this.playerBob = 0;
    this.playerGfx = this.add.graphics().setDepth(5);

    // Title
    this.add
      .text(width / 2, 80, "GRAVITY", {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#44ffaa",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 130, "FLIP", {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#44aaff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 175, "Reverse gravity to survive", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#667788",
      })
      .setOrigin(0.5);

    // Gravity flip arrows
    this.drawFlipArrows(width / 2, 310);

    // Play button
    const playBtn = this.add
      .text(width / 2, 400, "PLAY", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#44ffaa",
        backgroundColor: "#1a2a3a",
        padding: { x: 50, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playBtn.on("pointerover", () => playBtn.setAlpha(0.7));
    playBtn.on("pointerout", () => playBtn.setAlpha(1));
    playBtn.on("pointerdown", () => this.scene.start("GameScene"));

    // Controls hint
    this.add
      .text(width / 2, 480, "Tap / Click / Space", {
        fontSize: "13px",
        fontFamily: "monospace",
        color: "#556677",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 500, "to flip gravity", {
        fontSize: "13px",
        fontFamily: "monospace",
        color: "#556677",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 530, "Dodge spikes, collect coins!", {
        fontSize: "13px",
        fontFamily: "monospace",
        color: "#556677",
      })
      .setOrigin(0.5);

    // High score
    const hs = localStorage.getItem("gravityflip-highscore") || 0;
    if (hs > 0) {
      this.add
        .text(width / 2, height - 35, `Best: ${hs}`, {
          fontSize: "16px",
          fontFamily: "monospace",
          color: "#556677",
        })
        .setOrigin(0.5);
    }
  }

  drawFlipArrows(x, y) {
    const g = this.add.graphics();
    // Up arrow
    g.fillStyle(0x44ffaa, 0.5);
    g.fillTriangle(x, y - 28, x - 10, y - 14, x + 10, y - 14);
    g.fillRect(x - 3, y - 14, 6, 10);
    // Down arrow
    g.fillStyle(0x44aaff, 0.5);
    g.fillTriangle(x, y + 28, x - 10, y + 14, x + 10, y + 14);
    g.fillRect(x - 3, y + 4, 6, 10);
  }

  drawPlayer(g, x, y) {
    g.clear();
    const s = 14;
    g.fillStyle(0x44ffaa, 1);
    g.fillRoundedRect(x - s, y - s, s * 2, s * 2, 5);
    g.fillStyle(0x66ffcc, 0.35);
    g.fillRoundedRect(x - s + 3, y - s + 3, s * 2 - 6, s * 2 - 6, 3);
    // Eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x - 4, y - 3, 3.5);
    g.fillCircle(x + 4, y - 3, 3.5);
    g.fillStyle(0x111111, 1);
    g.fillCircle(x - 3, y - 3, 1.8);
    g.fillCircle(x + 5, y - 3, 1.8);
    // Mouth
    g.fillStyle(0x228866, 1);
    g.fillRoundedRect(x - 3, y + 4, 6, 2, 1);
  }

  update(time) {
    const { width } = this.scale;
    this.playerBob += 0.03;
    const bobY = this.playerY + Math.sin(this.playerBob) * 10;
    this.drawPlayer(this.playerGfx, width / 2, bobY);
  }
}
