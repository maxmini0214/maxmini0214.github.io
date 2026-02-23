import Phaser from "phaser";
import { playGameOver } from "../../../../common/audio.js";

// Game constants
const PLAYER_SIZE = 14;
const GRAVITY = 700;
const SCROLL_SPEED_START = 160;
const SCROLL_SPEED_MAX = 320;
const SPEED_RAMP_TIME = 120000;
const PLATFORM_HEIGHT = 12;
const PLATFORM_MIN_W = 70;
const PLATFORM_MAX_W = 170;
const SPIKE_SIZE = 14;
const COIN_RADIUS = 8;
const JUMP_VEL = 320;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    const { width, height } = this.scale;

    // Background gradient
    this.bgGfx = this.add.graphics();
    this.drawBackground();

    // Stars
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        0.5 + Math.random() * 1.5,
        0xffffff,
        0.15 + Math.random() * 0.35,
      );
      star.scrollSpeed = 0.1 + Math.random() * 0.3;
      this.stars.push(star);
    }

    // Ceiling/floor lines
    const lineGfx = this.add.graphics().setDepth(5);
    lineGfx.lineStyle(2, 0x44ffaa, 0.5);
    lineGfx.lineBetween(0, 0, width, 0);
    lineGfx.lineBetween(0, height, width, height);

    // Player graphics
    this.playerGfx = this.add.graphics().setDepth(10);

    // Player physics body
    this.player = this.physics.add
      .sprite(100, height / 2, null)
      .setDisplaySize(0, 0)
      .setSize(PLAYER_SIZE * 1.6, PLAYER_SIZE * 1.6)
      .setVisible(false);
    this.player.body.setAllowGravity(false);
    this.player.body.setBounce(0);

    // Groups
    this.platforms = this.physics.add.group({ allowGravity: false });
    this.spikes = this.physics.add.group({ allowGravity: false });
    this.coins = this.physics.add.group({ allowGravity: false });

    // State
    this.score = 0;
    this.coinsCollected = 0;
    this.gravityDir = 1;
    this.gameOver = false;
    this.gameTime = 0;
    this.flipCooldown = 0;
    this.distanceTraveled = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.trailTimer = 0;

    // UI
    this.scoreText = this.add
      .text(width / 2, 25, "0", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.gravIndicator = this.add
      .text(20, 20, "▼", {
        fontSize: "22px",
        fontFamily: "monospace",
        color: "#44ffaa",
      })
      .setDepth(20);

    this.coinText = this.add
      .text(width - 20, 20, "", {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#ffdd44",
      })
      .setOrigin(1, 0)
      .setDepth(20);

    // Input
    this.input.on("pointerdown", () => this.flipGravity());
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.spaceKey.on("down", () => this.flipGravity());

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(
      this.player,
      this.spikes,
      this.onHitSpike,
      null,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.coins,
      this.onCollectCoin,
      null,
      this,
    );

    // Initial platforms - starting ground
    this.createPlatform(0, height * 0.75, 300, SCROLL_SPEED_START);
    this.createPlatform(0, height * 0.25, 250, SCROLL_SPEED_START);

    // More ahead
    for (let i = 0; i < 4; i++) {
      this.spawnSection(350 + i * 220);
    }

    this.startBgm();
  }

  drawBackground() {
    const { width, height } = this.scale;
    const g = this.bgGfx;
    g.clear();
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(8 + t * 12);
      const gv = Math.floor(6 + t * 14);
      const b = Math.floor(25 + t * 35);
      const color = (r << 16) | (gv << 8) | b;
      g.fillStyle(color, 1);
      g.fillRect(0, (i / steps) * height, width, height / steps + 1);
    }
  }

  getCurrentSpeed() {
    const t = Math.min(this.gameTime / SPEED_RAMP_TIME, 1);
    return SCROLL_SPEED_START + (SCROLL_SPEED_MAX - SCROLL_SPEED_START) * t;
  }

  flipGravity() {
    if (this.gameOver) return;
    if (this.flipCooldown > 0) return;

    this.gravityDir *= -1;
    this.player.body.setVelocityY(-JUMP_VEL * this.gravityDir);
    this.gravIndicator.setText(this.gravityDir === 1 ? "▼" : "▲");
    this.flipCooldown = 120;

    this.playFlipSound();

    // Ring effect
    const ring = this.add.circle(this.player.x, this.player.y, 5, 0x44ffaa, 0.5).setDepth(8);
    this.tweens.add({
      targets: ring,
      radius: 28,
      alpha: 0,
      duration: 200,
      onComplete: () => ring.destroy(),
    });
  }

  spawnSection(x) {
    const { height } = this.scale;
    const speed = this.getCurrentSpeed();
    const difficulty = Math.min(this.gameTime / SPEED_RAMP_TIME, 1);

    // Bottom platform
    const botY = Phaser.Math.Between(
      Math.floor(height * 0.55),
      Math.floor(height * 0.85),
    );
    const botW = Phaser.Math.Between(PLATFORM_MIN_W, PLATFORM_MAX_W);
    this.createPlatform(x, botY, botW, speed);

    // Top platform
    const topY = Phaser.Math.Between(
      Math.floor(height * 0.15),
      Math.floor(height * 0.45),
    );
    const topW = Phaser.Math.Between(PLATFORM_MIN_W, PLATFORM_MAX_W);
    const topX = x + Phaser.Math.Between(-30, 30);
    this.createPlatform(topX, topY, topW, speed);

    // Spikes (difficulty increases over time)
    const spikeChance = 0.2 + difficulty * 0.35;
    if (Math.random() < spikeChance) {
      // Spike on bottom
      this.spawnSpike(
        x + Phaser.Math.Between(15, Math.max(20, botW - 15)),
        botY - SPIKE_SIZE,
        speed,
        1,
      );
    }
    if (Math.random() < spikeChance * 0.7) {
      // Spike on top (inverted)
      this.spawnSpike(
        topX + Phaser.Math.Between(15, Math.max(20, topW - 15)),
        topY + PLATFORM_HEIGHT,
        speed,
        -1,
      );
    }

    // Floating spikes (rare, high difficulty)
    if (difficulty > 0.4 && Math.random() < 0.15) {
      const midY = Phaser.Math.Between(
        Math.floor(height * 0.35),
        Math.floor(height * 0.65),
      );
      this.spawnFloatingSpike(x + botW / 2, midY, speed);
    }

    // Coins
    if (Math.random() < 0.55) {
      const coinY = Phaser.Math.Between(
        Math.floor(height * 0.3),
        Math.floor(height * 0.7),
      );
      this.spawnCoin(x + botW / 2, coinY, speed);
    }
    // Coin line
    if (this.gameTime > 15000 && Math.random() < 0.25) {
      const lineY = height / 2 + Phaser.Math.Between(-80, 80);
      for (let i = 0; i < 4; i++) {
        this.spawnCoin(x + 15 + i * 22, lineY, speed);
      }
    }
  }

  createPlatform(x, y, w, speed) {
    const gfx = this.add.graphics();
    // Platform body
    gfx.fillStyle(0x2266aa, 1);
    gfx.fillRoundedRect(0, 0, w, PLATFORM_HEIGHT, 4);
    // Highlight
    gfx.fillStyle(0x3388cc, 0.6);
    gfx.fillRoundedRect(2, 1, w - 4, 4, 2);
    // Edge glow
    gfx.lineStyle(1, 0x44aaff, 0.25);
    gfx.strokeRoundedRect(0, 0, w, PLATFORM_HEIGHT, 4);

    gfx.setPosition(x, y);
    this.physics.add.existing(gfx, true);
    gfx.body.setSize(w, PLATFORM_HEIGHT);
    gfx.body.setOffset(0, 0);
    gfx.body.immovable = true;
    gfx.platformWidth = w;
    this.platforms.add(gfx);
  }

  spawnSpike(x, y, speed, dir) {
    const gfx = this.add.graphics();
    const s = SPIKE_SIZE;
    if (dir === 1) {
      gfx.fillStyle(0xff4444, 1);
      gfx.fillTriangle(0, s, s / 2, 0, s, s);
      gfx.fillStyle(0xff6666, 0.4);
      gfx.fillTriangle(s * 0.3, s, s / 2, s * 0.3, s * 0.7, s);
    } else {
      gfx.fillStyle(0xff4444, 1);
      gfx.fillTriangle(0, 0, s / 2, s, s, 0);
      gfx.fillStyle(0xff6666, 0.4);
      gfx.fillTriangle(s * 0.3, 0, s / 2, s * 0.7, s * 0.7, 0);
    }

    gfx.setPosition(x - s / 2, y);
    this.physics.add.existing(gfx);
    gfx.body.setSize(s * 0.6, s * 0.6);
    gfx.body.setOffset(s * 0.2, s * 0.2);
    gfx.body.setAllowGravity(false);
    gfx.body.setImmovable(true);
    this.spikes.add(gfx);
  }

  spawnFloatingSpike(x, y, speed) {
    const gfx = this.add.graphics();
    const s = SPIKE_SIZE;
    // Diamond shape
    gfx.fillStyle(0xff6644, 1);
    gfx.fillTriangle(s / 2, 0, 0, s / 2, s, s / 2);
    gfx.fillTriangle(0, s / 2, s / 2, s, s, s / 2);
    gfx.fillStyle(0xff8866, 0.4);
    gfx.fillCircle(s / 2, s / 2, 3);

    gfx.setPosition(x - s / 2, y - s / 2);
    this.physics.add.existing(gfx);
    gfx.body.setSize(s * 0.5, s * 0.5);
    gfx.body.setOffset(s * 0.25, s * 0.25);
    gfx.body.setAllowGravity(false);
    gfx.body.setImmovable(true);
    this.spikes.add(gfx);
  }

  spawnCoin(x, y, speed) {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffdd44, 1);
    gfx.fillCircle(0, 0, COIN_RADIUS);
    gfx.fillStyle(0xffee88, 1);
    gfx.fillCircle(-1.5, -1.5, COIN_RADIUS - 3);
    gfx.lineStyle(1.5, 0xddaa00, 1);
    gfx.strokeCircle(0, 0, COIN_RADIUS);

    gfx.setPosition(x, y);
    this.physics.add.existing(gfx);
    gfx.body.setCircle(COIN_RADIUS, -COIN_RADIUS, -COIN_RADIUS);
    gfx.body.setAllowGravity(false);
    this.coins.add(gfx);
  }

  onHitSpike() {
    if (this.gameOver) return;
    this.die();
  }

  onCollectCoin(_player, coin) {
    if (this.gameOver) return;
    this.coinsCollected++;
    this.comboCount++;
    this.comboTimer = 1200;

    // Sparkle
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spark = this.add.circle(coin.x, coin.y, 2, 0xffdd44, 1);
      this.tweens.add({
        targets: spark,
        x: coin.x + Math.cos(angle) * 18,
        y: coin.y + Math.sin(angle) * 18,
        alpha: 0,
        duration: 200,
        onComplete: () => spark.destroy(),
      });
    }

    if (this.comboCount > 1) {
      const ct = this.add
        .text(coin.x, coin.y - 18, `x${this.comboCount}`, {
          fontSize: "16px",
          fontFamily: "monospace",
          color: "#ffdd44",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(15);
      this.tweens.add({
        targets: ct,
        y: ct.y - 25,
        alpha: 0,
        duration: 400,
        onComplete: () => ct.destroy(),
      });
    }

    this.playCoinSound();
    this.coinText.setText(`${this.coinsCollected}`);
    coin.destroy();
  }

  die() {
    this.gameOver = true;
    this.stopBgm();
    playGameOver();

    const { x, y } = this.player;

    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 70;
      const colors = [0x44ffaa, 0xff4444, 0xffffff, 0x44aaff];
      const p = this.add.circle(
        x, y,
        2 + Math.random() * 3,
        colors[Math.floor(Math.random() * colors.length)],
        1,
      );
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * spd,
        y: y + Math.sin(angle) * spd,
        alpha: 0,
        duration: 350 + Math.random() * 250,
        onComplete: () => p.destroy(),
      });
    }

    this.playerGfx.setVisible(false);
    this.player.body.enable = false;

    this.cameras.main.flash(120, 255, 50, 50);
    this.cameras.main.shake(180, 0.008);

    const distScore = Math.floor(this.distanceTraveled / 100);
    const coinScore = this.coinsCollected * 3;
    const totalScore = distScore + coinScore;

    const prev = parseInt(
      localStorage.getItem("gravityflip-highscore") || "0",
      10,
    );
    const isNewRecord = totalScore > prev;
    if (isNewRecord) {
      localStorage.setItem("gravityflip-highscore", totalScore.toString());
    }

    this.time.delayedCall(1000, () => {
      this.scene.start("ResultScene", {
        distance: distScore,
        coins: this.coinsCollected,
        coinScore,
        totalScore,
        isNewRecord,
      });
    });
  }

  drawPlayer(g, x, y, gravDir) {
    g.clear();
    const flipY = gravDir === -1;
    const s = PLAYER_SIZE;

    // Body
    g.fillStyle(0x44ffaa, 1);
    g.fillRoundedRect(x - s, y - s, s * 2, s * 2, 5);

    // Inner glow
    g.fillStyle(0x66ffcc, 0.35);
    g.fillRoundedRect(x - s + 3, y - s + 3, s * 2 - 6, s * 2 - 6, 3);

    // Eyes
    const eyeY = flipY ? y + 2 : y - 3;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x - 4, eyeY, 3.5);
    g.fillCircle(x + 4, eyeY, 3.5);
    // Pupils look right (direction of movement)
    g.fillStyle(0x111111, 1);
    g.fillCircle(x - 3, eyeY, 1.8);
    g.fillCircle(x + 5, eyeY, 1.8);

    // Mouth
    g.fillStyle(0x228866, 1);
    const mY = flipY ? y - 5 : y + 5;
    g.fillRoundedRect(x - 3, mY - 1, 6, 2, 1);

    // Direction arrow
    g.fillStyle(0xffffff, 0.25);
    if (gravDir === 1) {
      g.fillTriangle(x, y + s - 3, x - 3, y + s - 8, x + 3, y + s - 8);
    } else {
      g.fillTriangle(x, y - s + 3, x - 3, y - s + 8, x + 3, y - s + 8);
    }
  }

  playFlipSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(
        this.gravityDir === 1 ? 500 : 700,
        ctx.currentTime,
      );
      osc.frequency.exponentialRampToValueAtTime(
        this.gravityDir === 1 ? 350 : 1000,
        ctx.currentTime + 0.08,
      );
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  playCoinSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  startBgm() {
    this.bgmPlaying = true;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.bgmCtx = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.03, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const freqs = [110.0, 164.81, 196.0, 246.94, 329.63];
      const oscs = [];
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(
          0.15 + Math.random() * 0.25,
          ctx.currentTime,
        );
        lfoGain.gain.setValueAtTime(1.2, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.detune);
        lfo.start();
        osc.connect(masterGain);
        osc.start();
        oscs.push(osc, lfo);
      });

      this.bgmNodes = oscs;
    } catch {}
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmNodes) {
      this.bgmNodes.forEach((n) => {
        try { n.stop(); } catch {}
      });
      this.bgmNodes = null;
    }
    if (this.bgmCtx) {
      try { this.bgmCtx.close(); } catch {}
      this.bgmCtx = null;
    }
  }

  update(time, delta) {
    if (this.gameOver) return;

    const { width, height } = this.scale;
    this.gameTime += delta;
    this.flipCooldown = Math.max(0, this.flipCooldown - delta);

    const speed = this.getCurrentSpeed();

    // Distance
    this.distanceTraveled += speed * (delta / 1000);
    const distScore = Math.floor(this.distanceTraveled / 100);
    const totalScore = distScore + this.coinsCollected * 3;
    this.scoreText.setText(totalScore.toString());

    // Gravity
    const vy =
      this.player.body.velocity.y +
      GRAVITY * this.gravityDir * (delta / 1000);
    this.player.body.setVelocityY(vy);

    // Death check
    if (this.player.y < -15 || this.player.y > height + 15) {
      this.die();
      return;
    }

    // Draw player
    this.drawPlayer(this.playerGfx, this.player.x, this.player.y, this.gravityDir);

    // Trail
    this.trailTimer += delta;
    if (this.trailTimer > 35) {
      this.trailTimer = 0;
      const trail = this.add.circle(
        this.player.x - 8 + (Math.random() - 0.5) * 6,
        this.player.y + (Math.random() - 0.5) * 6,
        1 + Math.random() * 2,
        0x44ffaa,
        0.25,
      );
      this.tweens.add({
        targets: trail,
        x: trail.x - 22,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 180,
        onComplete: () => trail.destroy(),
      });
    }

    // Stars scroll
    for (const star of this.stars) {
      star.x -= speed * star.scrollSpeed * (delta / 1000);
      if (star.x < -5) {
        star.x = width + 5;
        star.y = Phaser.Math.Between(0, height);
      }
    }

    const dt = delta / 1000;

    // Move platforms
    this.platforms.getChildren().forEach((p) => {
      p.x -= speed * dt;
      p.body.reset(p.x, p.y);
      if (p.x + (p.platformWidth || 100) < -20) {
        p.destroy();
      }
    });

    // Move spikes
    this.spikes.getChildren().forEach((s) => {
      s.x -= speed * dt;
      s.body.reset(s.x, s.y);
      if (s.x < -40) {
        s.destroy();
      }
    });

    // Move coins
    this.coins.getChildren().forEach((c) => {
      c.x -= speed * dt;
      c.body.reset(c.x - COIN_RADIUS, c.y - COIN_RADIUS);
      if (c.x < -20) {
        c.destroy();
      }
    });

    // Spawn new sections
    const rightmost = this.getRightmostPlatformX();
    if (rightmost < width + 150) {
      this.spawnSection(rightmost + Phaser.Math.Between(140, 230));
    }

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }
  }

  getRightmostPlatformX() {
    let maxX = 0;
    this.platforms.getChildren().forEach((p) => {
      const right = p.x + (p.platformWidth || 100);
      if (right > maxX) maxX = right;
    });
    return maxX;
  }
}
