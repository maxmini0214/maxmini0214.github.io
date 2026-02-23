import Phaser from "phaser";
import {
  playNoteHit,
  playNotePerfect,
  playNoteMiss,
  playComboBreak,
  startRhythmBgm,
  stopBgm,
} from "../../../../common/audio.js";

const LANE_COLORS = [0xff4466, 0x44aaff, 0x44ff88, 0xffaa44];
const LANE_KEYS_LABEL = ["D", "F", "J", "K"];
const LANE_COUNT = 4;
const LANE_WIDTH = 80;
const NOTE_HEIGHT = 20;
const HIT_Y = 520;
const JUDGE_PERFECT = 35;
const JUDGE_GOOD = 70;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init(data) {
    this.bpm = data.bpm || 120;
    this.totalNotes = data.noteCount || 70;
    this.difficulty = data.difficulty || "NORMAL";
  }

  create() {
    const { width, height } = this.scale;
    this.laneStartX = width / 2 - (LANE_COUNT * LANE_WIDTH) / 2;

    // Note fall speed: pixels per ms
    this.fallSpeed = 0.3 + (this.bpm - 90) * 0.003;

    // State
    this.notes = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfects = 0;
    this.goods = 0;
    this.misses = 0;
    this.spawnedCount = 0;
    this.songTime = 0;
    this.started = false;
    this.finished = false;

    // Generate note chart
    this.chart = this.generateChart();

    // Draw lane backgrounds
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = this.laneStartX + i * LANE_WIDTH + LANE_WIDTH / 2;
      this.add.rectangle(x, height / 2, LANE_WIDTH - 2, height, 0xffffff, 0.03);
    }

    // Hit line
    this.add.rectangle(
      width / 2,
      HIT_Y,
      LANE_WIDTH * LANE_COUNT,
      3,
      0xffffff,
      0.4,
    );

    // Lane key labels at bottom
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = this.laneStartX + i * LANE_WIDTH + LANE_WIDTH / 2;
      this.add
        .text(x, HIT_Y + 35, LANE_KEYS_LABEL[i], {
          fontSize: "24px",
          fontFamily: "monospace",
          color: "#" + LANE_COLORS[i].toString(16).padStart(6, "0"),
        })
        .setOrigin(0.5)
        .setAlpha(0.5);
    }

    // Hit flash rectangles (visual feedback)
    this.hitFlashes = [];
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = this.laneStartX + i * LANE_WIDTH + LANE_WIDTH / 2;
      const flash = this.add.rectangle(
        x,
        HIT_Y,
        LANE_WIDTH - 4,
        40,
        LANE_COLORS[i],
        0,
      );
      this.hitFlashes.push(flash);
    }

    // UI
    this.scoreText = this.add.text(20, 20, "0", {
      fontSize: "28px",
      fontFamily: "monospace",
      color: "#ffffff",
    });
    this.comboText = this.add
      .text(width / 2, 260, "", {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#00ffcc",
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.judgeText = this.add
      .text(width / 2, 300, "", {
        fontSize: "32px",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Progress bar
    this.progressBg = this.add.rectangle(width / 2, 8, width - 40, 4, 0x333355);
    this.progressBar = this.add
      .rectangle(20, 8, 0, 4, 0x00ffcc)
      .setOrigin(0, 0.5);

    // Difficulty label
    this.add
      .text(width - 20, 20, `${this.difficulty} ${this.bpm}BPM`, {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#555577",
      })
      .setOrigin(1, 0);

    // Keyboard input
    this.laneKeys = [
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
    ];

    // Touch/click input zones
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = this.laneStartX + i * LANE_WIDTH;
      const zone = this.add
        .rectangle(
          x + LANE_WIDTH / 2,
          height / 2,
          LANE_WIDTH,
          height,
          0xffffff,
          0,
        )
        .setInteractive();
      zone.on("pointerdown", () => this.hitLane(i));
    }

    // Start after short delay
    this.time.delayedCall(1000, () => {
      this.started = true;
      startRhythmBgm(this.bpm);
    });
  }

  generateChart() {
    const beatInterval = 60000 / this.bpm;
    const chart = [];
    let time = 2000; // 2 seconds lead-in

    for (let i = 0; i < this.totalNotes; i++) {
      // Random lane, avoid 3+ consecutive same lane
      let lane;
      do {
        lane = Phaser.Math.Between(0, LANE_COUNT - 1);
      } while (
        chart.length >= 2 &&
        chart[chart.length - 1].lane === lane &&
        chart[chart.length - 2].lane === lane
      );

      chart.push({ time, lane, hit: false, missed: false });

      // Vary interval for rhythm variety
      const intervals = [1, 1, 0.5, 0.5, 0.25, 2];
      const weight =
        this.difficulty === "HARD"
          ? [0.2, 0.3, 0.25, 0.15, 0.05, 0.05]
          : this.difficulty === "EASY"
            ? [0.4, 0.3, 0.1, 0.1, 0, 0.1]
            : [0.3, 0.3, 0.15, 0.15, 0.02, 0.08];

      let r = Math.random();
      let idx = 0;
      for (let w = 0; w < weight.length; w++) {
        r -= weight[w];
        if (r <= 0) {
          idx = w;
          break;
        }
      }
      time += beatInterval * intervals[idx];
    }
    return chart;
  }

  hitLane(lane) {
    if (!this.started || this.finished) return;

    // Flash feedback
    this.hitFlashes[lane].setAlpha(0.5);
    this.tweens.add({
      targets: this.hitFlashes[lane],
      alpha: 0,
      duration: 120,
    });

    // Find closest unhit note in this lane
    let closest = null;
    let closestDist = Infinity;
    for (const note of this.notes) {
      if (note.data.lane !== lane || note.data.hit || note.data.missed)
        continue;
      const dist = Math.abs(note.y - HIT_Y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = note;
      }
    }

    if (!closest || closestDist > JUDGE_GOOD) {
      // No note nearby - empty hit, no penalty
      return;
    }

    closest.data.hit = true;

    if (closestDist <= JUDGE_PERFECT) {
      this.showJudge("PERFECT", "#00ffcc");
      this.score += 300 * (1 + Math.floor(this.combo / 10) * 0.1);
      this.perfects++;
      playNotePerfect(lane);
    } else {
      this.showJudge("GOOD", "#aacc44");
      this.score += 100 * (1 + Math.floor(this.combo / 10) * 0.1);
      this.goods++;
      playNoteHit(lane);
    }

    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.updateCombo();

    // Remove note with effect
    this.tweens.add({
      targets: closest,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 0.3,
      duration: 100,
      onComplete: () => closest.destroy(),
    });
    this.notes = this.notes.filter((n) => n !== closest);
  }

  showJudge(text, color) {
    this.judgeText.setText(text).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.judgeText);
    this.tweens.add({
      targets: this.judgeText,
      alpha: 0,
      y: 280,
      duration: 400,
      onComplete: () => {
        this.judgeText.y = 300;
      },
    });
  }

  updateCombo() {
    if (this.combo >= 5) {
      this.comboText.setText(`${this.combo} COMBO`).setAlpha(1);
      this.tweens.killTweensOf(this.comboText);
      this.tweens.add({
        targets: this.comboText,
        alpha: 0.7,
        duration: 200,
        yoyo: true,
      });
    } else {
      this.comboText.setAlpha(0);
    }
  }

  update(time, delta) {
    if (!this.started || this.finished) return;
    this.songTime += delta;

    // Spawn notes
    while (
      this.spawnedCount < this.chart.length &&
      this.chart[this.spawnedCount].time - this.songTime < 2000
    ) {
      const noteData = this.chart[this.spawnedCount];
      const travelTime = (HIT_Y + 50) / this.fallSpeed; // ms to reach bottom
      const x = this.laneStartX + noteData.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const note = this.add.rectangle(
        x,
        -NOTE_HEIGHT,
        LANE_WIDTH - 12,
        NOTE_HEIGHT,
        LANE_COLORS[noteData.lane],
        0.85,
      );
      note.data = noteData;
      note.setStrokeStyle(1, 0xffffff, 0.3);
      this.notes.push(note);
      this.spawnedCount++;
    }

    // Move notes
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      note.y += this.fallSpeed * delta;

      // Miss check: passed too far below hit line
      if (note.y > HIT_Y + JUDGE_GOOD && !note.data.hit && !note.data.missed) {
        note.data.missed = true;
        this.misses++;
        if (this.combo >= 5) playComboBreak();
        else playNoteMiss();
        this.combo = 0;
        this.updateCombo();
        this.showJudge("MISS", "#ff4466");
      }

      // Remove off-screen
      if (note.y > 650) {
        note.destroy();
        this.notes.splice(i, 1);
      }
    }

    // Update score display
    this.scoreText.setText(Math.floor(this.score).toString());

    // Progress bar
    const progress =
      this.chart.length > 0
        ? (this.perfects + this.goods + this.misses) / this.chart.length
        : 0;
    this.progressBar.width = (this.scale.width - 40) * Math.min(progress, 1);

    // Keyboard input
    for (let i = 0; i < LANE_COUNT; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.laneKeys[i])) {
        this.hitLane(i);
      }
    }

    // Song end
    if (
      this.spawnedCount >= this.chart.length &&
      this.notes.length === 0 &&
      !this.finished
    ) {
      this.finished = true;
      stopBgm();

      // Save high score
      const prev = parseInt(localStorage.getItem("beatrush-highscore") || "0");
      const finalScore = Math.floor(this.score);
      if (finalScore > prev) {
        localStorage.setItem("beatrush-highscore", finalScore.toString());
      }

      this.time.delayedCall(800, () => {
        this.scene.start("ResultScene", {
          score: finalScore,
          maxCombo: this.maxCombo,
          perfects: this.perfects,
          goods: this.goods,
          misses: this.misses,
          total: this.chart.length,
          difficulty: this.difficulty,
          bpm: this.bpm,
          isNewRecord: finalScore > prev,
        });
      });
    }
  }
}
