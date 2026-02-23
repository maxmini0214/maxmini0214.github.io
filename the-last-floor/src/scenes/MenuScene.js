import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // Title with flicker effect
    this.titleText = this.add
      .text(400, 200, "THE LAST FLOOR", {
        fontFamily: "Courier New, monospace",
        fontSize: "48px",
        color: "#cc2222",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.subtitleText = this.add
      .text(400, 260, "You shouldn't have stayed late.", {
        fontFamily: "Courier New, monospace",
        fontSize: "16px",
        color: "#666666",
      })
      .setOrigin(0.5);

    // Flicker timer
    this.flickerTimer = this.time.addEvent({
      delay: 3000 + Math.random() * 4000,
      callback: this.flickerTitle,
      callbackScope: this,
      loop: true,
    });

    // Start prompt
    this.startText = this.add
      .text(400, 420, "[ CLICK TO BEGIN ]", {
        fontFamily: "Courier New, monospace",
        fontSize: "20px",
        color: "#444444",
      })
      .setOrigin(0.5);

    // Pulse animation on start text
    this.tweens.add({
      targets: this.startText,
      alpha: { from: 0.3, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });

    // Warning text
    this.add
      .text(400, 520, "This game contains horror elements.\nBest played with headphones in the dark.", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        color: "#333333",
        align: "center",
      })
      .setOrigin(0.5);

    // Click to start
    this.input.once("pointerdown", () => {
      this.cameras.main.fadeOut(1500, 0, 0, 0);
      this.time.delayedCall(1500, () => {
        this.scene.start("Game");
      });
    });
  }

  flickerTitle() {
    const count = 2 + Math.floor(Math.random() * 3);
    let i = 0;
    const flick = () => {
      if (i >= count * 2) {
        this.titleText.setAlpha(1);
        return;
      }
      this.titleText.setAlpha(i % 2 === 0 ? 0.1 : 1);
      i++;
      this.time.delayedCall(50 + Math.random() * 80, flick);
    };
    flick();
  }
}
