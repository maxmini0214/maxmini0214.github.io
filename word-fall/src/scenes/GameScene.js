import Phaser from "phaser";
import {
  playNoteHit,
  playNotePerfect,
  playNoteMiss,
  playComboBreak,
  playGameOver,
} from "../../../../common/audio.js";

// Word lists by difficulty
const WORDS_EASY = [
  "cat",
  "dog",
  "run",
  "sit",
  "hat",
  "cup",
  "red",
  "sun",
  "big",
  "hot",
  "map",
  "box",
  "pen",
  "net",
  "bus",
  "fog",
  "jam",
  "lip",
  "mud",
  "pin",
  "rug",
  "tip",
  "van",
  "web",
  "zip",
  "arm",
  "bed",
  "fin",
  "gum",
  "hop",
];

const WORDS_MEDIUM = [
  "tree",
  "bird",
  "fish",
  "game",
  "word",
  "fall",
  "type",
  "fast",
  "code",
  "fire",
  "rain",
  "snow",
  "wind",
  "star",
  "moon",
  "jump",
  "walk",
  "talk",
  "play",
  "read",
  "help",
  "move",
  "find",
  "dark",
  "gold",
  "blue",
  "easy",
  "cool",
  "warm",
  "ship",
  "rock",
  "hill",
  "lake",
  "sand",
  "dust",
  "glow",
];

const WORDS_HARD = [
  "castle",
  "planet",
  "bridge",
  "rocket",
  "garden",
  "silver",
  "jungle",
  "frozen",
  "dragon",
  "purple",
  "golden",
  "stream",
  "island",
  "secret",
  "wonder",
  "crystal",
  "forest",
  "temple",
  "beacon",
  "shadow",
  "pirate",
  "knight",
  "mystic",
  "breeze",
  "launch",
  "voyage",
  "winter",
  "summer",
  "sunset",
  "cosmic",
  "galaxy",
  "nebula",
  "quartz",
  "cipher",
  "zenith",
];

const COLORS = [
  { fill: 0x44ddff, hex: "#44ddff" },
  { fill: 0xff8844, hex: "#ff8844" },
  { fill: 0x44ffaa, hex: "#44ffaa" },
  { fill: 0xffdd44, hex: "#ffdd44" },
  { fill: 0xff44aa, hex: "#ff44aa" },
  { fill: 0xaa88ff, hex: "#aa88ff" },
];

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    const { width, height } = this.scale;

    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.maxCombo = 0;
    this.wordsCleared = 0;
    this.level = 1;
    this.typedText = "";
    this.fallingWords = [];
    this.activeWord = null;
    this.spawnTimer = 0;
    this.spawnInterval = 2500;
    this.fallSpeed = 0.4;
    this.gameOver = false;
    this.usedWords = new Set();
    this.isMobile = !this.sys.game.device.os.desktop;

    // Background grid lines
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, 0x111133, 0.3);
    for (let x = 0; x < width; x += 40) {
      gridGfx.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 40) {
      gridGfx.lineBetween(0, y, width, y);
    }

    // Danger zone at bottom
    this.dangerGfx = this.add.graphics();
    this.dangerGfx.fillStyle(0xff2222, 0.06);
    this.dangerGfx.fillRect(0, height - 80, width, 80);
    this.dangerGfx.lineStyle(2, 0xff2222, 0.3);
    this.dangerGfx.lineBetween(0, height - 80, width, height - 80);

    // Score display
    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "20px",
      fontFamily: "monospace",
      color: "#aaccee",
    });

    // Level display
    this.levelText = this.add
      .text(width - 16, 16, "Level 1", {
        fontSize: "20px",
        fontFamily: "monospace",
        color: "#aaccee",
      })
      .setOrigin(1, 0);

    // Lives display
    this.livesText = this.add.text(16, 44, "", {
      fontSize: "20px",
      fontFamily: "monospace",
      color: "#ff4444",
    });
    this.updateLivesDisplay();

    // Combo display
    this.comboText = this.add
      .text(width / 2, 16, "", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#ffdd44",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    // Current typing display at bottom
    this.typingBg = this.add.graphics();
    this.typingBg.fillStyle(0x112244, 0.9);
    this.typingBg.fillRoundedRect(width / 2 - 200, height - 55, 400, 40, 8);
    this.typingBg.lineStyle(2, 0x44ddff, 0.5);
    this.typingBg.strokeRoundedRect(width / 2 - 200, height - 55, 400, 40, 8);

    this.typingText = this.add
      .text(width / 2, height - 35, "|", {
        fontSize: "22px",
        fontFamily: "monospace",
        color: "#44ddff",
      })
      .setOrigin(0.5);

    // Blinking cursor
    this.cursorVisible = true;
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        this.updateTypingDisplay();
      },
    });

    // Keyboard input
    this.input.keyboard.on("keydown", (event) => {
      if (this.gameOver) return;
      this.handleKeyInput(event);
    });

    // Mobile input: hidden HTML input field
    if (this.isMobile) {
      this.createMobileInput();
    }

    // Spawn first word quickly
    this.spawnTimer = this.spawnInterval - 500;
  }

  createMobileInput() {
    const input = document.createElement("input");
    input.type = "text";
    input.id = "word-fall-mobile-input";
    input.autocomplete = "off";
    input.autocapitalize = "none";
    input.autocorrect = "off";
    input.spellcheck = false;
    input.style.cssText =
      "position:fixed;bottom:0;left:0;width:100%;height:50px;opacity:0;z-index:9999;font-size:16px;";
    document.body.appendChild(input);
    this.mobileInput = input;

    // Focus on tap anywhere
    this.input.on("pointerdown", () => {
      input.focus();
    });

    input.addEventListener("input", () => {
      if (this.gameOver) return;
      const val = input.value.toLowerCase();
      if (val.length > this.typedText.length) {
        const newChar = val[val.length - 1];
        if (/^[a-z]$/.test(newChar)) {
          this.addChar(newChar);
        }
      }
      input.value = this.typedText;
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        this.removeChar();
        e.preventDefault();
      } else if (e.key === "Enter") {
        this.submitWord();
        e.preventDefault();
      }
    });

    // Auto-focus
    this.time.delayedCall(300, () => input.focus());
  }

  handleKeyInput(event) {
    const key = event.key.toLowerCase();

    if (key === "backspace") {
      this.removeChar();
      event.preventDefault();
    } else if (key === "enter" || key === " ") {
      this.submitWord();
      event.preventDefault();
    } else if (key === "escape") {
      this.typedText = "";
      this.activeWord = null;
      this.updateTypingDisplay();
      this.updateWordHighlights();
    } else if (/^[a-z]$/.test(key)) {
      this.addChar(key);
    }
  }

  addChar(char) {
    this.typedText += char;
    this.updateTypingDisplay();

    // Auto-match: find a word that starts with typed text
    if (!this.activeWord || !this.activeWord.word.startsWith(this.typedText)) {
      this.activeWord = null;
      for (const fw of this.fallingWords) {
        if (fw.word.startsWith(this.typedText)) {
          this.activeWord = fw;
          break;
        }
      }
    }

    this.updateWordHighlights();

    // Auto-submit when fully typed
    if (this.activeWord && this.typedText === this.activeWord.word) {
      this.clearWord(this.activeWord);
    }
  }

  removeChar() {
    if (this.typedText.length > 0) {
      this.typedText = this.typedText.slice(0, -1);
      this.updateTypingDisplay();
      // Re-evaluate active word
      this.activeWord = null;
      if (this.typedText.length > 0) {
        for (const fw of this.fallingWords) {
          if (fw.word.startsWith(this.typedText)) {
            this.activeWord = fw;
            break;
          }
        }
      }
      this.updateWordHighlights();
    }
  }

  submitWord() {
    if (this.typedText.length === 0) return;

    const match = this.fallingWords.find((fw) => fw.word === this.typedText);
    if (match) {
      this.clearWord(match);
    } else {
      // Wrong word
      playNoteMiss();
      this.flashTypingBox(0xff4444);
      this.typedText = "";
      this.activeWord = null;
      this.updateTypingDisplay();
      this.updateWordHighlights();
    }
  }

  clearWord(fw) {
    // Calculate points
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    const comboMultiplier = Math.min(this.combo, 10);
    const wordPoints = fw.word.length * 10 * comboMultiplier;
    this.score += wordPoints;
    this.wordsCleared++;

    // Effects
    if (this.combo >= 5) {
      playNotePerfect(this.combo % 4);
    } else {
      playNoteHit(fw.word.length % 4);
    }

    this.showPointsPopup(
      fw.container.x,
      fw.container.y,
      `+${wordPoints}`,
      this.combo,
    );
    this.explodeWord(fw);

    // Remove from list
    const idx = this.fallingWords.indexOf(fw);
    if (idx !== -1) this.fallingWords.splice(idx, 1);
    fw.container.destroy();

    // Reset typing
    this.typedText = "";
    this.activeWord = null;
    this.updateTypingDisplay();
    this.updateWordHighlights();
    this.updateScoreDisplay();

    // Level up every 8 words
    const newLevel = Math.floor(this.wordsCleared / 8) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.levelText.setText(`Level ${this.level}`);
      this.spawnInterval = Math.max(800, 2500 - (this.level - 1) * 200);
      this.fallSpeed = Math.min(1.5, 0.4 + (this.level - 1) * 0.1);
      this.showLevelUp();
    }
  }

  getWordList() {
    if (this.level <= 2) return WORDS_EASY;
    if (this.level <= 4) return [...WORDS_EASY, ...WORDS_MEDIUM];
    return [...WORDS_EASY, ...WORDS_MEDIUM, ...WORDS_HARD];
  }

  pickWord() {
    const list = this.getWordList();
    // Avoid duplicate words on screen
    const available = list.filter(
      (w) => !this.fallingWords.some((fw) => fw.word === w),
    );
    if (available.length === 0)
      return list[Phaser.Math.Between(0, list.length - 1)];
    return available[Phaser.Math.Between(0, available.length - 1)];
  }

  spawnWord() {
    const { width } = this.scale;
    const word = this.pickWord();
    const colorIdx = Phaser.Math.Between(0, COLORS.length - 1);
    const color = COLORS[colorIdx];

    const container = this.add.container(0, 0);

    // Word text
    const text = this.add
      .text(0, 0, word, {
        fontSize: "20px",
        fontFamily: "monospace",
        color: color.hex,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Background box
    const padding = 10;
    const boxW = text.width + padding * 2;
    const boxH = text.height + padding;
    const bg = this.add.graphics();
    bg.fillStyle(color.fill, 0.1);
    bg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 6);
    bg.lineStyle(1.5, color.fill, 0.4);
    bg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 6);

    container.add([bg, text]);

    // Position: random x, start above screen
    const margin = boxW / 2 + 10;
    const x = Phaser.Math.Between(margin, width - margin);
    container.setPosition(x, -30);

    // Individual speed variation
    const speedVariation = 0.8 + Math.random() * 0.4;

    const fw = {
      word,
      container,
      text,
      bg,
      color,
      boxW,
      boxH,
      speed: this.fallSpeed * speedVariation,
      highlighted: false,
    };

    this.fallingWords.push(fw);
  }

  updateWordHighlights() {
    for (const fw of this.fallingWords) {
      if (this.typedText.length > 0 && fw.word.startsWith(this.typedText)) {
        // Highlight matched portion
        const matched = this.typedText;
        const remaining = fw.word.slice(matched.length);
        fw.text.setText("");
        fw.text.destroy();

        // Create new styled text
        const matchedText = this.add
          .text(-fw.word.length * 6, 0, matched, {
            fontSize: "20px",
            fontFamily: "monospace",
            color: "#ffffff",
            fontStyle: "bold",
          })
          .setOrigin(0, 0.5);

        const remainText = this.add
          .text(matchedText.x + matchedText.width, 0, remaining, {
            fontSize: "20px",
            fontFamily: "monospace",
            color: fw.color.hex,
            fontStyle: "bold",
          })
          .setOrigin(0, 0.5);

        // Center both texts
        const totalW = matchedText.width + remainText.width;
        matchedText.setX(-totalW / 2);
        remainText.setX(-totalW / 2 + matchedText.width);

        // Remove old text references from container and add new ones
        fw.container.remove(fw.text, true);
        if (fw.matchedText) fw.container.remove(fw.matchedText, true);
        if (fw.remainText) fw.container.remove(fw.remainText, true);

        fw.container.add([matchedText, remainText]);
        fw.matchedText = matchedText;
        fw.remainText = remainText;
        fw.text = matchedText; // Keep reference

        // Brighten border
        fw.bg.clear();
        fw.bg.fillStyle(0xffffff, 0.15);
        fw.bg.fillRoundedRect(-fw.boxW / 2, -fw.boxH / 2, fw.boxW, fw.boxH, 6);
        fw.bg.lineStyle(2, 0xffffff, 0.7);
        fw.bg.strokeRoundedRect(
          -fw.boxW / 2,
          -fw.boxH / 2,
          fw.boxW,
          fw.boxH,
          6,
        );
        fw.highlighted = true;
      } else if (fw.highlighted) {
        // Restore normal appearance
        if (fw.matchedText) fw.container.remove(fw.matchedText, true);
        if (fw.remainText) fw.container.remove(fw.remainText, true);
        fw.matchedText = null;
        fw.remainText = null;

        const newText = this.add
          .text(0, 0, fw.word, {
            fontSize: "20px",
            fontFamily: "monospace",
            color: fw.color.hex,
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        fw.container.add(newText);
        fw.text = newText;

        fw.bg.clear();
        fw.bg.fillStyle(fw.color.fill, 0.1);
        fw.bg.fillRoundedRect(-fw.boxW / 2, -fw.boxH / 2, fw.boxW, fw.boxH, 6);
        fw.bg.lineStyle(1.5, fw.color.fill, 0.4);
        fw.bg.strokeRoundedRect(
          -fw.boxW / 2,
          -fw.boxH / 2,
          fw.boxW,
          fw.boxH,
          6,
        );
        fw.highlighted = false;
      }
    }
  }

  updateTypingDisplay() {
    const cursor = this.cursorVisible ? "|" : "";
    if (this.typedText.length === 0) {
      this.typingText.setText(cursor);
      this.typingText.setColor("#44ddff");
    } else {
      this.typingText.setText(this.typedText + cursor);
      // Color based on match
      const hasMatch = this.fallingWords.some((fw) =>
        fw.word.startsWith(this.typedText),
      );
      this.typingText.setColor(hasMatch ? "#44ffaa" : "#ff6644");
    }
  }

  updateScoreDisplay() {
    this.scoreText.setText(`Score: ${this.score}`);
    if (this.combo >= 2) {
      this.comboText.setText(`${this.combo}x Combo!`);
      this.comboText.setAlpha(1);
    }
  }

  updateLivesDisplay() {
    let hearts = "";
    for (let i = 0; i < 3; i++) {
      hearts += i < this.lives ? "\u2665 " : "\u2661 ";
    }
    this.livesText.setText(hearts.trim());
  }

  flashTypingBox(color) {
    const { width, height } = this.scale;
    const flash = this.add.graphics();
    flash.fillStyle(color, 0.3);
    flash.fillRoundedRect(width / 2 - 200, height - 55, 400, 40, 8);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  showPointsPopup(x, y, text, combo) {
    const color = combo >= 5 ? "#ffdd44" : combo >= 3 ? "#44ffaa" : "#ffffff";
    const size = combo >= 5 ? "24px" : combo >= 3 ? "20px" : "16px";
    const popup = this.add
      .text(x, y, text, {
        fontSize: size,
        fontFamily: "monospace",
        color: color,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: y - 60,
      alpha: 0,
      duration: 800,
      ease: "Power2",
      onComplete: () => popup.destroy(),
    });
  }

  explodeWord(fw) {
    const x = fw.container.x;
    const y = fw.container.y;
    const color = fw.color.fill;

    // Particle-like explosion with letters
    for (let i = 0; i < fw.word.length; i++) {
      const letter = this.add
        .text(x + (i - fw.word.length / 2) * 14, y, fw.word[i], {
          fontSize: "18px",
          fontFamily: "monospace",
          color: fw.color.hex,
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 60;
      this.tweens.add({
        targets: letter,
        x: letter.x + Math.cos(angle) * dist,
        y: letter.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.3,
        duration: 400 + Math.random() * 200,
        ease: "Power2",
        onComplete: () => letter.destroy(),
      });
    }

    // Flash circle
    const circle = this.add.circle(x, y, 5, color, 0.6);
    this.tweens.add({
      targets: circle,
      scale: 4,
      alpha: 0,
      duration: 300,
      onComplete: () => circle.destroy(),
    });
  }

  showLevelUp() {
    const { width, height } = this.scale;
    const text = this.add
      .text(width / 2, height / 2 - 50, `LEVEL ${this.level}`, {
        fontSize: "40px",
        fontFamily: "monospace",
        color: "#ffdd44",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: { from: 0.5, to: 1.2 },
      duration: 400,
      yoyo: true,
      hold: 600,
      onComplete: () => text.destroy(),
    });
  }

  wordReachedBottom(fw) {
    this.lives--;
    this.combo = 0;
    this.comboText.setText("");
    this.updateLivesDisplay();

    playComboBreak();

    // Flash red at bottom
    const { width, height } = this.scale;
    const flash = this.add.graphics();
    flash.fillStyle(0xff0000, 0.15);
    flash.fillRect(0, 0, width, height);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    // Remove the word
    const idx = this.fallingWords.indexOf(fw);
    if (idx !== -1) this.fallingWords.splice(idx, 1);
    fw.container.destroy();

    // If the dropped word was our active one, reset typing
    if (fw === this.activeWord) {
      this.typedText = "";
      this.activeWord = null;
      this.updateTypingDisplay();
      this.updateWordHighlights();
    }

    if (this.lives <= 0) {
      this.endGame();
    }
  }

  endGame() {
    this.gameOver = true;
    playGameOver();

    // Save high score
    const prev = parseInt(
      localStorage.getItem("wordfall-highscore") || "0",
      10,
    );
    const isNewRecord = this.score > prev;
    if (isNewRecord) {
      localStorage.setItem("wordfall-highscore", this.score.toString());
    }

    // Clean up mobile input
    if (this.mobileInput) {
      this.mobileInput.remove();
      this.mobileInput = null;
    }

    this.time.delayedCall(800, () => {
      this.scene.start("ResultScene", {
        score: this.score,
        wordsCleared: this.wordsCleared,
        maxCombo: this.maxCombo,
        level: this.level,
        isNewRecord,
      });
    });
  }

  update(time, delta) {
    if (this.gameOver) return;

    const { height } = this.scale;

    // Spawn timer
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      // Spawn more words at higher levels
      const wordsToSpawn = this.level >= 6 ? 2 : 1;
      for (let i = 0; i < wordsToSpawn; i++) {
        if (this.fallingWords.length < 8 + this.level) {
          this.spawnWord();
        }
      }
    }

    // Update falling words
    for (let i = this.fallingWords.length - 1; i >= 0; i--) {
      const fw = this.fallingWords[i];
      fw.container.y += fw.speed * (delta / 16);

      // Check if reached danger zone
      if (fw.container.y >= height - 80) {
        this.wordReachedBottom(fw);
      }
    }

    // Fade combo text
    if (this.combo < 2 && this.comboText.alpha > 0) {
      this.comboText.alpha -= 0.02;
    }
  }
}
