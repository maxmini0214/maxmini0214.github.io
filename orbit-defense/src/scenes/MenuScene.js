import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    // Starfield background
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Math.random() < 0.2 ? 2 : 1;
      const alpha = 0.2 + Math.random() * 0.6;
      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      star.speed = 0.1 + Math.random() * 0.3;
      star.baseAlpha = alpha;
      this.stars.push(star);
    }

    // Decorative planet in center
    const g = this.add.graphics();
    g.fillStyle(0x2255aa, 0.3);
    g.fillCircle(width / 2, height / 2 - 20, 60);
    g.lineStyle(2, 0x4488cc, 0.3);
    g.strokeCircle(width / 2, height / 2 - 20, 60);
    // Orbit ring
    g.lineStyle(1, 0x4488cc, 0.15);
    g.strokeCircle(width / 2, height / 2 - 20, 100);

    // Decorative orbiting ship
    this.orbitAngle = 0;
    this.orbitShip = this.add.graphics();

    // Title
    this.add
      .text(width / 2, 80, "ORBIT", {
        fontSize: "52px",
        fontFamily: "monospace",
        color: "#44aaff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 130, "DEFENSE", {
        fontSize: "52px",
        fontFamily: "monospace",
        color: "#ff6644",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 170, "Protect the planet from invaders", {
        fontSize: "13px",
        fontFamily: "monospace",
        color: "#556688",
      })
      .setOrigin(0.5);

    // Play button
    const playBtn = this.add
      .text(width / 2, 420, "PLAY", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#00ffcc",
        backgroundColor: "#112233",
        padding: { x: 50, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playBtn.on("pointerover", () => playBtn.setAlpha(0.7));
    playBtn.on("pointerout", () => playBtn.setAlpha(1));
    playBtn.on("pointerdown", () => this.scene.start("GameScene"));

    // Controls
    this.add
      .text(width / 2, 490, "Left/Right or Swipe: Change orbit direction", {
        fontSize: "11px",
        fontFamily: "monospace",
        color: "#445566",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 510, "Tap/Click: Fire weapons", {
        fontSize: "11px",
        fontFamily: "monospace",
        color: "#445566",
      })
      .setOrigin(0.5);

    // High score
    const highScore = localStorage.getItem("orbitdefense-highscore") || 0;
    if (highScore > 0) {
      this.add
        .text(width / 2, height - 30, `Best: ${highScore}`, {
          fontSize: "16px",
          fontFamily: "monospace",
          color: "#555577",
        })
        .setOrigin(0.5);
    }
  }

  update() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2 - 20;

    // Animate stars
    for (const star of this.stars) {
      star.alpha =
        star.baseAlpha + Math.sin(Date.now() * 0.001 + star.x) * 0.15;
    }

    // Animate orbiting ship
    this.orbitAngle += 0.015;
    const sx = cx + Math.cos(this.orbitAngle) * 100;
    const sy = cy + Math.sin(this.orbitAngle) * 100;
    this.orbitShip.clear();
    this.orbitShip.fillStyle(0x44ff88, 1);
    this.orbitShip.fillTriangle(
      sx + Math.cos(this.orbitAngle + Math.PI / 2) * 8,
      sy + Math.sin(this.orbitAngle + Math.PI / 2) * 8,
      sx + Math.cos(this.orbitAngle + Math.PI + 0.5) * 6,
      sy + Math.sin(this.orbitAngle + Math.PI + 0.5) * 6,
      sx + Math.cos(this.orbitAngle + Math.PI - 0.5) * 6,
      sy + Math.sin(this.orbitAngle + Math.PI - 0.5) * 6,
    );
  }
}
