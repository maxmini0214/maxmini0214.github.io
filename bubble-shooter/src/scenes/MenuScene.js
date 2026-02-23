import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    // Floating bubbles background
    this.bubbles = [];
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const r = Phaser.Math.Between(8, 20);
      const colors = [
        0xff4444, 0x44ff44, 0x4488ff, 0xffcc00, 0xff44ff, 0x44ffcc,
      ];
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];
      const circle = this.add.circle(x, y, r, color, 0.15);
      circle.speed = 0.2 + Math.random() * 0.4;
      circle.drift = (Math.random() - 0.5) * 0.3;
      this.bubbles.push(circle);
    }

    // Title
    this.add
      .text(width / 2, 130, "BUBBLE", {
        fontSize: "52px",
        fontFamily: "monospace",
        color: "#44ddff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 190, "SHOOTER", {
        fontSize: "52px",
        fontFamily: "monospace",
        color: "#ff6688",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 240, "Match 3 or more to pop!", {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#556688",
      })
      .setOrigin(0.5);

    // Decorative bubble cluster
    this.drawBubbleCluster(width / 2, 340);

    // Play button
    const playBtn = this.add
      .text(width / 2, 460, "PLAY", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#44ffcc",
        backgroundColor: "#112244",
        padding: { x: 50, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playBtn.on("pointerover", () => playBtn.setAlpha(0.7));
    playBtn.on("pointerout", () => playBtn.setAlpha(1));
    playBtn.on("pointerdown", () => this.scene.start("GameScene"));

    // Controls hint
    this.add
      .text(width / 2, 540, "Click / Touch to aim & shoot", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#445566",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 565, "Clear all bubbles for bonus!", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#445566",
      })
      .setOrigin(0.5);

    // High score
    const highScore = localStorage.getItem("bubbleshooter-highscore") || 0;
    if (highScore > 0) {
      this.add
        .text(width / 2, height - 40, `Best: ${highScore}`, {
          fontSize: "16px",
          fontFamily: "monospace",
          color: "#555577",
        })
        .setOrigin(0.5);
    }
  }

  drawBubbleCluster(cx, cy) {
    const g = this.add.graphics();
    const colors = [0xff4444, 0x44ff44, 0x4488ff, 0xffcc00, 0xff44ff, 0x44ffcc];
    const r = 18;
    const positions = [
      [-r, -r * 1.7],
      [r, -r * 1.7],
      [-r * 2, 0],
      [0, 0],
      [r * 2, 0],
      [-r, r * 1.7],
      [r, r * 1.7],
    ];
    positions.forEach((pos, i) => {
      const color = colors[i % colors.length];
      g.fillStyle(color, 0.9);
      g.fillCircle(cx + pos[0], cy + pos[1], r);
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(cx + pos[0] - 5, cy + pos[1] - 5, r * 0.3);
    });
  }

  update() {
    const { height } = this.scale;
    for (const b of this.bubbles) {
      b.y -= b.speed;
      b.x += b.drift;
      if (b.y < -20) {
        b.y = height + 20;
        b.x = Phaser.Math.Between(0, this.scale.width);
      }
    }
  }
}
