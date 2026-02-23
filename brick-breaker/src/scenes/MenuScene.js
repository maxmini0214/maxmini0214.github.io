import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    // Particle background
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const colors = [0xff4444, 0x44ff44, 0x4488ff, 0xffaa00, 0xff44ff];
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];
      const p = this.add.circle(
        x,
        y,
        Phaser.Math.Between(1, 3),
        color,
        0.3 + Math.random() * 0.4,
      );
      p.speedY = -0.2 - Math.random() * 0.3;
      p.speedX = (Math.random() - 0.5) * 0.3;
      this.particles.push(p);
    }

    // Title
    this.add
      .text(width / 2, 100, "BRICK", {
        fontSize: "64px",
        fontFamily: "monospace",
        color: "#ff6644",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 170, "BREAKER", {
        fontSize: "64px",
        fontFamily: "monospace",
        color: "#44bbff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Decorative bricks
    this.drawDecorativeBricks(width / 2, 240);

    // Play button
    const playBtn = this.add
      .text(width / 2, 340, "PLAY", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#00ffcc",
        backgroundColor: "#112233",
        padding: { x: 60, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playBtn.on("pointerover", () => playBtn.setAlpha(0.7));
    playBtn.on("pointerout", () => playBtn.setAlpha(1));
    playBtn.on("pointerdown", () => {
      this.scene.start("GameScene");
    });

    // Controls hint
    this.add
      .text(width / 2, 420, "Arrow keys / Mouse to move paddle", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#556677",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 445, "SPACE / Click to launch ball", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#556677",
      })
      .setOrigin(0.5);

    // High score
    const highScore = localStorage.getItem("brickbreaker-highscore") || 0;
    if (highScore > 0) {
      this.add
        .text(width / 2, height - 40, `Best: ${highScore} pts`, {
          fontSize: "16px",
          fontFamily: "monospace",
          color: "#555577",
        })
        .setOrigin(0.5);
    }
  }

  drawDecorativeBricks(cx, cy) {
    const g = this.add.graphics();
    const colors = [0xff4444, 0xff8844, 0xffcc44, 0x44cc44, 0x4488ff];
    const bw = 50;
    const bh = 16;
    const gap = 4;
    const cols = 7;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < cols; col++) {
        const x = cx - (cols * (bw + gap)) / 2 + col * (bw + gap) + gap / 2;
        const y = cy + row * (bh + gap);
        const c = colors[(row + col) % colors.length];
        g.fillStyle(c, 0.6);
        g.fillRoundedRect(x, y, bw, bh, 3);
      }
    }
  }

  update() {
    const { width, height } = this.scale;
    for (const p of this.particles) {
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y < 0) {
        p.y = height;
        p.x = Phaser.Math.Between(0, width);
      }
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
    }
  }
}
