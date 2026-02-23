import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    // Falling letter particles for background
    this.letters = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 30; i++) {
      const char = chars[Phaser.Math.Between(0, 25)];
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-height, height);
      const letter = this.add
        .text(x, y, char, {
          fontSize: `${Phaser.Math.Between(14, 28)}px`,
          fontFamily: "monospace",
          color: "#1a2a4a",
        })
        .setOrigin(0.5);
      letter.speed = 0.3 + Math.random() * 0.7;
      this.letters.push(letter);
    }

    // Title
    this.add
      .text(width / 2, 160, "WORD", {
        fontSize: "64px",
        fontFamily: "monospace",
        color: "#44ddff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 230, "FALL", {
        fontSize: "64px",
        fontFamily: "monospace",
        color: "#ff8844",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(width / 2, 290, "Type the falling words before they land!", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#556677",
      })
      .setOrigin(0.5);

    // Decorative falling word preview
    this.drawFallingWordPreview(width / 2, 380);

    // Play button
    const playBtn = this.add
      .text(width / 2, 490, "PLAY", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#44ffaa",
        backgroundColor: "#112233",
        padding: { x: 60, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playBtn.on("pointerover", () => playBtn.setAlpha(0.7));
    playBtn.on("pointerout", () => playBtn.setAlpha(1));
    playBtn.on("pointerdown", () => {
      this.scene.start("GameScene");
    });

    // Controls
    this.add
      .text(width / 2, 570, "Keyboard: type to destroy words", {
        fontSize: "13px",
        fontFamily: "monospace",
        color: "#445566",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 595, "Mobile: tap the words to select, type below", {
        fontSize: "13px",
        fontFamily: "monospace",
        color: "#445566",
      })
      .setOrigin(0.5);

    // High score
    const highScore = localStorage.getItem("wordfall-highscore") || 0;
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

  drawFallingWordPreview(cx, cy) {
    const g = this.add.graphics();
    const words = ["hello", "type", "fast"];
    const colors = [0x44ddff, 0xff8844, 0x44ffaa];

    words.forEach((word, i) => {
      const x = cx - 80 + i * 80;
      const y = cy - 20 + i * 25;
      const w = word.length * 14 + 16;

      g.fillStyle(colors[i], 0.15);
      g.fillRoundedRect(x - w / 2, y - 12, w, 28, 6);
      g.lineStyle(1, colors[i], 0.4);
      g.strokeRoundedRect(x - w / 2, y - 12, w, 28, 6);

      this.add
        .text(x, y, word, {
          fontSize: "16px",
          fontFamily: "monospace",
          color: `#${colors[i].toString(16).padStart(6, "0")}`,
        })
        .setOrigin(0.5);
    });
  }

  update() {
    const { height, width } = this.scale;
    for (const letter of this.letters) {
      letter.y += letter.speed;
      if (letter.y > height + 20) {
        letter.y = -20;
        letter.x = Phaser.Math.Between(0, width);
      }
    }
  }
}
