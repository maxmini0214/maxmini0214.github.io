import Phaser from "phaser";
import {
  playNoteHit,
  playNoteMiss,
  playNotePerfect,
  playComboBreak,
  playGameOver,
} from "../../../../common/audio.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init(data) {
    this.difficulty = data.difficulty || 1;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = 3;
    this.questionsAnswered = 0;
    this.correctAnswers = 0;
    this.timePerQuestion = 5000; // ms
    this.minTime = 1500;
    this.timeLeft = this.timePerQuestion;
    this.gameActive = true;
    this.level = 1;
    this.questionsPerLevel = 10;
  }

  create() {
    const { width, height } = this.scale;
    this.W = width;
    this.H = height;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // Header area
    this.drawHeader();

    // Timer bar
    this.timerBarBg = this.add.graphics();
    this.timerBarBg.fillStyle(0x333333, 1);
    this.timerBarBg.fillRoundedRect(30, 75, width - 60, 10, 5);

    this.timerBar = this.add.graphics();

    // Question display area
    this.questionText = this.add
      .text(width / 2, 200, "", {
        fontSize: "48px",
        color: "#ffffff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Level / operation indicator
    this.opText = this.add
      .text(width / 2, 140, "", {
        fontSize: "16px",
        color: "#888888",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Answer buttons (2x2 grid)
    this.buttons = [];
    this.buttonGraphics = [];
    this.buttonTexts = [];

    const btnW = 180;
    const btnH = 90;
    const gapX = 20;
    const gapY = 20;
    const gridStartX = width / 2 - btnW - gapX / 2;
    const gridStartY = 310;

    const colors = [0x4ecca3, 0xe94560, 0xf0c929, 0x3282b8];

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = gridStartX + col * (btnW + gapX) + btnW / 2;
      const y = gridStartY + row * (btnH + gapY) + btnH / 2;

      const gfx = this.add.graphics();
      this.drawButton(gfx, x, y, btnW, btnH, colors[i], 0.2);

      const txt = this.add
        .text(x, y, "", {
          fontSize: "32px",
          color: "#ffffff",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const zone = this.add
        .zone(x, y, btnW, btnH)
        .setInteractive({ useHandCursor: true });

      zone.on("pointerdown", () => this.onAnswer(i));
      zone.on("pointerover", () =>
        this.drawButton(gfx, x, y, btnW, btnH, colors[i], 0.4),
      );
      zone.on("pointerout", () =>
        this.drawButton(gfx, x, y, btnW, btnH, colors[i], 0.2),
      );

      this.buttons.push({ zone, x, y, w: btnW, h: btnH, color: colors[i] });
      this.buttonGraphics.push(gfx);
      this.buttonTexts.push(txt);
    }

    // Combo display
    this.comboText = this.add
      .text(width / 2, 560, "", {
        fontSize: "22px",
        color: "#f0c929",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Feedback text (CORRECT! / WRONG!)
    this.feedbackText = this.add
      .text(width / 2, 260, "", {
        fontSize: "28px",
        color: "#4ecca3",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Score floating text pool
    this.scoreFloaters = [];

    // Generate first question
    this.nextQuestion();

    // Timer
    this.lastTime = this.time.now;
  }

  drawHeader() {
    const { W, H } = this;

    // Score
    if (this.scoreText) this.scoreText.destroy();
    this.scoreText = this.add.text(20, 15, `Score: ${this.score}`, {
      fontSize: "20px",
      color: "#ffffff",
      fontFamily: "monospace",
    });

    // Lives
    if (this.livesText) this.livesText.destroy();
    this.livesGfx = this.livesGfx || this.add.graphics();
    this.livesGfx.clear();
    for (let i = 0; i < 3; i++) {
      const heartX = W - 30 - i * 30;
      if (i < this.lives) {
        this.livesGfx.fillStyle(0xe94560, 1);
      } else {
        this.livesGfx.fillStyle(0x444444, 1);
      }
      // Simple heart shape using circles and triangle
      this.livesGfx.fillCircle(heartX - 5, 25, 7);
      this.livesGfx.fillCircle(heartX + 5, 25, 7);
      this.livesGfx.fillTriangle(heartX - 12, 27, heartX + 12, 27, heartX, 40);
    }

    // Level indicator
    if (this.levelText) this.levelText.destroy();
    this.levelText = this.add
      .text(W / 2, 15, `Lv.${this.level}`, {
        fontSize: "18px",
        color: "#888888",
        fontFamily: "monospace",
      })
      .setOrigin(0.5, 0);
  }

  drawButton(gfx, x, y, w, h, color, alpha) {
    gfx.clear();
    gfx.fillStyle(color, alpha);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    gfx.lineStyle(2, color, alpha + 0.3);
    gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
  }

  generateQuestion() {
    // Determine available operations based on difficulty and level
    let ops = [];

    if (this.difficulty === 1) {
      // Easy: addition only, bigger numbers at higher levels
      ops = ["+"];
    } else if (this.difficulty === 2) {
      // Normal: add & subtract, multiply at higher levels
      ops = ["+", "-"];
      if (this.level >= 3) ops.push("x");
    } else {
      // Hard: all operations from start
      ops = ["+", "-", "x", "/"];
    }

    const op = Phaser.Math.RND.pick(ops);
    let a, b, answer;

    const maxNum = Math.min(12 + this.level * 3, 50);

    switch (op) {
      case "+":
        a = Phaser.Math.Between(1, maxNum);
        b = Phaser.Math.Between(1, maxNum);
        answer = a + b;
        break;
      case "-":
        a = Phaser.Math.Between(1, maxNum);
        b = Phaser.Math.Between(1, a); // ensure positive result
        answer = a - b;
        break;
      case "x":
        a = Phaser.Math.Between(2, Math.min(12, 5 + this.level));
        b = Phaser.Math.Between(2, Math.min(12, 5 + this.level));
        answer = a * b;
        break;
      case "/":
        b = Phaser.Math.Between(2, Math.min(12, 5 + this.level));
        answer = Phaser.Math.Between(1, Math.min(12, 5 + this.level));
        a = b * answer; // ensure clean division
        break;
    }

    // Generate wrong answers
    const wrongAnswers = new Set();
    while (wrongAnswers.size < 3) {
      let wrong;
      const deviation = Math.max(3, Math.floor(answer * 0.3));
      wrong = answer + Phaser.Math.Between(-deviation, deviation);
      if (wrong !== answer && wrong >= 0 && !wrongAnswers.has(wrong)) {
        wrongAnswers.add(wrong);
      }
    }

    // Place answers in random positions
    const answers = [answer, ...wrongAnswers];
    Phaser.Utils.Array.Shuffle(answers);

    return {
      text: `${a} ${op} ${b} = ?`,
      opLabel: this.getOpLabel(op),
      answers,
      correctIndex: answers.indexOf(answer),
      correctAnswer: answer,
    };
  }

  getOpLabel(op) {
    const labels = {
      "+": "Addition",
      "-": "Subtraction",
      x: "Multiplication",
      "/": "Division",
    };
    return labels[op] || "";
  }

  nextQuestion() {
    this.currentQuestion = this.generateQuestion();
    this.questionText.setText(this.currentQuestion.text);
    this.opText.setText(this.currentQuestion.opLabel);

    // Update button texts
    for (let i = 0; i < 4; i++) {
      this.buttonTexts[i].setText(String(this.currentQuestion.answers[i]));
      // Reset button appearance
      const b = this.buttons[i];
      this.drawButton(this.buttonGraphics[i], b.x, b.y, b.w, b.h, b.color, 0.2);
    }

    // Reset timer
    this.timeLeft = this.timePerQuestion;
    this.lastTime = this.time.now;
    this.answered = false;
  }

  onAnswer(index) {
    if (!this.gameActive || this.answered) return;
    this.answered = true;

    const correct = index === this.currentQuestion.correctIndex;
    this.questionsAnswered++;

    if (correct) {
      this.correctAnswers++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      // Score: base 100 + combo bonus + time bonus
      const timeBonus = Math.floor((this.timeLeft / this.timePerQuestion) * 50);
      const comboBonus = Math.min(this.combo * 10, 100);
      const points = 100 + timeBonus + comboBonus;
      this.score += points;

      // Sound
      if (this.combo >= 5) {
        playNotePerfect(index);
      } else {
        playNoteHit(index);
      }

      // Flash correct button green
      this.flashButton(index, 0x4ecca3);

      // Feedback
      const feedbackTexts =
        this.combo >= 10
          ? "UNSTOPPABLE!"
          : this.combo >= 5
            ? "AMAZING!"
            : this.combo >= 3
              ? "GREAT!"
              : "CORRECT!";
      this.showFeedback(feedbackTexts, "#4ecca3");

      // Floating score
      this.showFloatingScore(`+${points}`, this.W / 2, 260);

      // Update combo display
      if (this.combo >= 2) {
        this.comboText.setText(`${this.combo}x COMBO`).setAlpha(1);
        this.tweens.add({
          targets: this.comboText,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 100,
          yoyo: true,
        });
      }

      // Level up check
      if (this.questionsAnswered % this.questionsPerLevel === 0) {
        this.level++;
        // Decrease time slightly
        this.timePerQuestion = Math.max(
          this.minTime,
          this.timePerQuestion - 200,
        );
        this.showFeedback(`LEVEL ${this.level}!`, "#f0c929");
      }
    } else {
      // Wrong
      this.combo = 0;
      this.lives--;
      this.comboText.setAlpha(0);

      playNoteMiss();
      playComboBreak();

      // Flash wrong button red, flash correct button green
      this.flashButton(index, 0xe94560);
      this.flashButton(this.currentQuestion.correctIndex, 0x4ecca3);

      this.showFeedback("WRONG!", "#e94560");

      // Camera shake
      this.cameras.main.shake(200, 0.01);
    }

    // Update header
    this.drawHeader();

    // Check game over
    if (this.lives <= 0) {
      this.gameActive = false;
      playGameOver();
      this.time.delayedCall(800, () => {
        this.scene.start("ResultScene", {
          score: this.score,
          combo: this.maxCombo,
          correct: this.correctAnswers,
          total: this.questionsAnswered,
          level: this.level,
          difficulty: this.difficulty,
        });
      });
      return;
    }

    // Next question after delay
    this.time.delayedCall(400, () => {
      if (this.gameActive) this.nextQuestion();
    });
  }

  flashButton(index, color) {
    const b = this.buttons[index];
    const gfx = this.buttonGraphics[index];
    this.drawButton(gfx, b.x, b.y, b.w, b.h, color, 0.6);
    this.time.delayedCall(350, () => {
      if (this.gameActive) {
        this.drawButton(gfx, b.x, b.y, b.w, b.h, b.color, 0.2);
      }
    });
  }

  showFeedback(text, color) {
    this.feedbackText.setText(text).setColor(color).setAlpha(1).setScale(1);
    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      y: this.feedbackText.y - 20,
      duration: 600,
      onComplete: () => {
        this.feedbackText.y = 260;
      },
    });
  }

  showFloatingScore(text, x, y) {
    const floater = this.add
      .text(x, y + 30, text, {
        fontSize: "20px",
        color: "#4ecca3",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: floater,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => floater.destroy(),
    });
  }

  update(time) {
    if (!this.gameActive || this.answered) return;

    // Update timer
    const delta = time - this.lastTime;
    this.lastTime = time;
    this.timeLeft -= delta;

    // Draw timer bar
    this.timerBar.clear();
    const ratio = Math.max(0, this.timeLeft / this.timePerQuestion);
    const barW = (this.W - 60) * ratio;

    let barColor;
    if (ratio > 0.5) barColor = 0x4ecca3;
    else if (ratio > 0.25) barColor = 0xf0c929;
    else barColor = 0xe94560;

    this.timerBar.fillStyle(barColor, 1);
    this.timerBar.fillRoundedRect(30, 75, barW, 10, 5);

    // Time up
    if (this.timeLeft <= 0) {
      this.answered = true;
      this.questionsAnswered++;
      this.combo = 0;
      this.lives--;
      this.comboText.setAlpha(0);

      playNoteMiss();
      this.showFeedback("TIME UP!", "#e94560");
      this.flashButton(this.currentQuestion.correctIndex, 0x4ecca3);

      this.drawHeader();
      this.cameras.main.shake(200, 0.01);

      if (this.lives <= 0) {
        this.gameActive = false;
        playGameOver();
        this.time.delayedCall(800, () => {
          this.scene.start("ResultScene", {
            score: this.score,
            combo: this.maxCombo,
            correct: this.correctAnswers,
            total: this.questionsAnswered,
            level: this.level,
            difficulty: this.difficulty,
          });
        });
      } else {
        this.time.delayedCall(600, () => {
          if (this.gameActive) this.nextQuestion();
        });
      }
    }
  }
}
