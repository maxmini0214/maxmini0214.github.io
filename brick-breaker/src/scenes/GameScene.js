import Phaser from "phaser";
import {
  playMerge,
  playBigMerge,
  playGameOver,
  playSlide,
  playMilestone,
} from "../../../../common/audio.js";

// Brick types
const BRICK_NORMAL = 0;
const BRICK_HARD = 1;
const BRICK_METAL = 2;

// Power-up types
const PWR_MULTIBALL = 0;
const PWR_WIDE_PADDLE = 1;
const PWR_LASER = 2;
const PWR_SLOW = 3;

const BRICK_COLORS = {
  [BRICK_NORMAL]: [0xff4444, 0xff8844, 0xffcc44, 0x44cc44, 0x4488ff, 0xaa44ff],
  [BRICK_HARD]: [0xcc8866, 0xbb7755],
  [BRICK_METAL]: [0x888899],
};

const PWR_COLORS = {
  [PWR_MULTIBALL]: 0xff44ff,
  [PWR_WIDE_PADDLE]: 0x44ffcc,
  [PWR_LASER]: 0xff4444,
  [PWR_SLOW]: 0x4488ff,
};

const LEVELS = [
  // Level 1: Simple rows
  () => {
    const bricks = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        bricks.push({ row, col, type: BRICK_NORMAL, colorIdx: row });
      }
    }
    return bricks;
  },
  // Level 2: Checkerboard with hard bricks
  () => {
    const bricks = [];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 10; col++) {
        if ((row + col) % 2 === 0) {
          bricks.push({
            row,
            col,
            type: row < 2 ? BRICK_HARD : BRICK_NORMAL,
            colorIdx: row,
          });
        }
      }
    }
    return bricks;
  },
  // Level 3: Diamond shape with metal edges
  () => {
    const bricks = [];
    const centerCol = 4.5;
    for (let row = 0; row < 7; row++) {
      const halfWidth = row < 4 ? row + 1 : 7 - row;
      for (let col = 0; col < 10; col++) {
        const dist = Math.abs(col - centerCol);
        if (dist < halfWidth) {
          const isEdge = Math.abs(dist - (halfWidth - 1)) < 0.6;
          bricks.push({
            row,
            col,
            type: isEdge ? BRICK_METAL : row < 3 ? BRICK_HARD : BRICK_NORMAL,
            colorIdx: row,
          });
        }
      }
    }
    return bricks;
  },
  // Level 4: Fortress with metal walls
  () => {
    const bricks = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 10; col++) {
        const isWall = col === 0 || col === 9 || col === 4 || col === 5;
        const isTop = row === 0;
        if (isWall && !isTop) {
          bricks.push({ row, col, type: BRICK_METAL, colorIdx: 0 });
        } else {
          bricks.push({
            row,
            col,
            type: row < 2 ? BRICK_HARD : BRICK_NORMAL,
            colorIdx: col < 5 ? 2 : 4,
          });
        }
      }
    }
    return bricks;
  },
  // Level 5: Dense spiral-like pattern
  () => {
    const bricks = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 10; col++) {
        const ring = Math.min(row, col, 7 - row, 9 - col);
        if (ring % 2 === 0) {
          bricks.push({
            row,
            col,
            type:
              ring === 0 ? BRICK_METAL : row < 3 ? BRICK_HARD : BRICK_NORMAL,
            colorIdx: ring,
          });
        }
      }
    }
    return bricks;
  },
];

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init() {
    this.score = 0;
    this.lives = 3;
    this.level = 0;
    this.ballOnPaddle = true;
    this.paddleWidth = 100;
    this.normalPaddleWidth = 100;
    this.ballSpeed = 350;
    this.normalBallSpeed = 350;
    this.powerUpTimer = null;
    this.activePowerUp = null;
    this.lasers = [];
    this.extraBalls = [];
  }

  create() {
    const { width, height } = this.scale;

    this.physics.world.setBounds(0, 0, width, height);

    // HUD
    this.scoreText = this.add.text(16, 8, "Score: 0", {
      fontSize: "18px",
      fontFamily: "monospace",
      color: "#ffffff",
    });

    this.livesText = this.add
      .text(width - 16, 8, "Lives: 3", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#ff6644",
      })
      .setOrigin(1, 0);

    this.levelText = this.add
      .text(width / 2, 8, "Level 1", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#44bbff",
      })
      .setOrigin(0.5, 0);

    this.powerUpText = this.add
      .text(width / 2, height - 16, "", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#ffcc44",
      })
      .setOrigin(0.5, 1);

    // Create paddle texture
    this.createPaddleTexture();

    // Paddle
    this.paddle = this.physics.add.sprite(width / 2, height - 40, "paddle");
    this.paddle.setImmovable(true);
    this.paddle.body.allowGravity = false;
    this.paddle.setCollideWorldBounds(true);

    // Ball
    this.createBallTexture();
    this.ball = this.physics.add.sprite(width / 2, height - 60, "ball");
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(1, 1);
    this.ball.body.allowGravity = false;

    // Brick group
    this.bricks = this.physics.add.staticGroup();

    // Power-ups group
    this.powerUps = this.physics.add.group();

    // Laser group
    this.laserGroup = this.physics.add.group();

    // Create brick textures
    this.createBrickTextures();

    // Load level
    this.loadLevel(this.level);

    // Collisions
    this.physics.add.collider(
      this.ball,
      this.paddle,
      this.hitPaddle,
      null,
      this,
    );
    this.physics.add.collider(
      this.ball,
      this.bricks,
      this.hitBrick,
      null,
      this,
    );
    this.physics.add.overlap(
      this.powerUps,
      this.paddle,
      this.collectPowerUp,
      null,
      this,
    );
    this.physics.add.overlap(
      this.laserGroup,
      this.bricks,
      this.laserHitBrick,
      null,
      this,
    );

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );

    // Mouse/touch input
    this.input.on("pointermove", (pointer) => {
      this.paddle.x = Phaser.Math.Clamp(
        pointer.x,
        this.paddleWidth / 2,
        width - this.paddleWidth / 2,
      );
    });

    this.input.on("pointerdown", () => {
      if (this.ballOnPaddle) {
        this.launchBall();
      } else if (this.activePowerUp === PWR_LASER) {
        this.fireLaser();
      }
    });

    // Launch hint
    this.launchHint = this.add
      .text(width / 2, height - 80, "SPACE / Click to launch", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#556677",
      })
      .setOrigin(0.5);
  }

  createPaddleTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x44bbff, 1);
    g.fillRoundedRect(0, 0, this.paddleWidth, 14, 7);
    g.fillStyle(0x88ddff, 0.5);
    g.fillRoundedRect(4, 2, this.paddleWidth - 8, 4, 2);
    g.generateTexture("paddle", this.paddleWidth, 14);
    g.destroy();
  }

  createBallTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0xccddff, 0.6);
    g.fillCircle(6, 6, 3);
    g.generateTexture("ball", 16, 16);
    g.destroy();
  }

  createBrickTextures() {
    const bw = 68;
    const bh = 22;

    // Normal bricks
    const normalColors = BRICK_COLORS[BRICK_NORMAL];
    normalColors.forEach((color, i) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, bw, bh, 4);
      g.fillStyle(0xffffff, 0.15);
      g.fillRoundedRect(2, 2, bw - 4, bh / 2 - 2, 3);
      g.generateTexture(`brick_n${i}`, bw, bh);
      g.destroy();
    });

    // Hard bricks (2 states)
    BRICK_COLORS[BRICK_HARD].forEach((color, i) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, bw, bh, 4);
      g.lineStyle(2, 0xffffff, 0.3);
      g.strokeRoundedRect(1, 1, bw - 2, bh - 2, 4);
      g.fillStyle(0xffffff, 0.1);
      g.fillRoundedRect(2, 2, bw - 4, bh / 2 - 2, 3);
      g.generateTexture(`brick_h${i}`, bw, bh);
      g.destroy();
    });

    // Metal brick
    const gm = this.add.graphics();
    gm.fillStyle(0x888899, 1);
    gm.fillRoundedRect(0, 0, bw, bh, 4);
    gm.lineStyle(2, 0xaaaacc, 0.5);
    gm.strokeRoundedRect(1, 1, bw - 2, bh - 2, 4);
    gm.fillStyle(0xbbbbdd, 0.2);
    gm.fillRoundedRect(4, 3, 10, bh - 6, 2);
    gm.fillRoundedRect(bw - 14, 3, 10, bh - 6, 2);
    gm.generateTexture("brick_m", bw, bh);
    gm.destroy();

    // Power-up textures
    Object.entries(PWR_COLORS).forEach(([type, color]) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillCircle(10, 10, 10);
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(7, 7, 4);
      g.generateTexture(`pwr_${type}`, 20, 20);
      g.destroy();
    });

    // Laser texture
    const gl = this.add.graphics();
    gl.fillStyle(0xff4444, 1);
    gl.fillRect(0, 0, 4, 14);
    gl.fillStyle(0xffaa44, 0.6);
    gl.fillRect(1, 0, 2, 14);
    gl.generateTexture("laser", 4, 14);
    gl.destroy();
  }

  loadLevel(levelIdx) {
    this.bricks.clear(true, true);
    this.powerUps.clear(true, true);
    this.laserGroup.clear(true, true);

    const levelFn = LEVELS[levelIdx % LEVELS.length];
    const brickData = levelFn();

    const bw = 68;
    const bh = 22;
    const gap = 4;
    const offsetX = (800 - 10 * (bw + gap)) / 2 + bw / 2;
    const offsetY = 50;

    for (const bd of brickData) {
      const x = offsetX + bd.col * (bw + gap);
      const y = offsetY + bd.row * (bh + gap);

      let texKey;
      if (bd.type === BRICK_NORMAL) {
        texKey = `brick_n${bd.colorIdx % BRICK_COLORS[BRICK_NORMAL].length}`;
      } else if (bd.type === BRICK_HARD) {
        texKey = "brick_h0";
      } else {
        texKey = "brick_m";
      }

      const brick = this.bricks.create(x, y, texKey);
      brick.brickType = bd.type;
      brick.hits = bd.type === BRICK_HARD ? 2 : 1;
      brick.setSize(bw, bh);
      brick.refreshBody();
    }

    this.levelText.setText(`Level ${levelIdx + 1}`);
  }

  launchBall() {
    if (!this.ballOnPaddle) return;
    this.ballOnPaddle = false;
    this.launchHint.setVisible(false);

    const angle = Phaser.Math.Between(-60, -120);
    const rad = Phaser.Math.DegToRad(angle);
    this.ball.setVelocity(
      Math.cos(rad) * this.ballSpeed,
      Math.sin(rad) * this.ballSpeed,
    );
    playSlide();
  }

  hitPaddle(ball, paddle) {
    let diff = ball.x - paddle.x;
    const maxDiff = this.paddleWidth / 2;
    diff = Phaser.Math.Clamp(diff, -maxDiff, maxDiff);

    const angle = -90 + (diff / maxDiff) * 60;
    const rad = Phaser.Math.DegToRad(angle);
    const speed =
      Math.sqrt(ball.body.velocity.x ** 2 + ball.body.velocity.y ** 2) ||
      this.ballSpeed;

    ball.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
    playSlide();
  }

  hitBrick(ball, brick) {
    if (brick.brickType === BRICK_METAL) {
      playSlide();
      // Flash effect
      this.tweens.add({
        targets: brick,
        alpha: 0.5,
        duration: 50,
        yoyo: true,
      });
      return;
    }

    brick.hits--;

    if (brick.hits <= 0) {
      this.destroyBrick(brick);
    } else {
      // Hard brick changes appearance on hit
      brick.setTexture("brick_h1");
      brick.refreshBody();
      playSlide();
    }
  }

  destroyBrick(brick) {
    const points = brick.brickType === BRICK_HARD ? 20 : 10;
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);

    // Chance to drop power-up
    if (Math.random() < 0.15 && brick.brickType !== BRICK_METAL) {
      this.spawnPowerUp(brick.x, brick.y);
    }

    // Destroy effect
    this.createBreakEffect(brick.x, brick.y);
    brick.destroy();
    playMerge();

    // Check if level complete
    const remaining = this.bricks
      .getChildren()
      .filter((b) => b.active && b.brickType !== BRICK_METAL);
    if (remaining.length === 0) {
      this.nextLevel();
    }
  }

  createBreakEffect(x, y) {
    for (let i = 0; i < 6; i++) {
      const particle = this.add.circle(
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(-5, 5),
        Phaser.Math.Between(2, 4),
        0xffffff,
        0.8,
      );
      this.tweens.add({
        targets: particle,
        x: particle.x + Phaser.Math.Between(-30, 30),
        y: particle.y + Phaser.Math.Between(-20, 30),
        alpha: 0,
        scale: 0,
        duration: 300,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
  }

  spawnPowerUp(x, y) {
    const type = Phaser.Math.Between(0, 3);
    const pwr = this.powerUps.create(x, y, `pwr_${type}`);
    pwr.powerType = type;
    pwr.setVelocityY(120);
    pwr.body.allowGravity = false;
  }

  collectPowerUp(powerUp, paddle) {
    const type = powerUp.powerType;
    powerUp.destroy();

    // Clear previous power-up timer
    if (this.powerUpTimer) {
      this.powerUpTimer.remove();
      this.deactivatePowerUp();
    }

    this.activePowerUp = type;

    switch (type) {
      case PWR_MULTIBALL:
        this.activateMultiBall();
        this.powerUpText.setText("MULTI-BALL!");
        break;
      case PWR_WIDE_PADDLE:
        this.activateWidePaddle();
        this.powerUpText.setText("WIDE PADDLE!");
        break;
      case PWR_LASER:
        this.powerUpText.setText("LASER! (Click to fire)");
        break;
      case PWR_SLOW:
        this.activateSlowBall();
        this.powerUpText.setText("SLOW BALL!");
        break;
    }

    this.powerUpText.setColor(
      "#" + PWR_COLORS[type].toString(16).padStart(6, "0"),
    );
    playBigMerge();

    // Power-up lasts 10 seconds (except multiball)
    if (type !== PWR_MULTIBALL) {
      this.powerUpTimer = this.time.delayedCall(10000, () => {
        this.deactivatePowerUp();
      });
    }
  }

  activateMultiBall() {
    const vx = this.ball.body.velocity.x;
    const vy = this.ball.body.velocity.y;

    for (let i = 0; i < 2; i++) {
      const extra = this.physics.add.sprite(this.ball.x, this.ball.y, "ball");
      extra.setCollideWorldBounds(true);
      extra.setBounce(1, 1);
      extra.body.allowGravity = false;

      const angle = (i === 0 ? -30 : 30) * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      extra.setVelocity(vx * cos - vy * sin, vx * sin + vy * cos);

      this.physics.add.collider(extra, this.paddle, this.hitPaddle, null, this);
      this.physics.add.collider(extra, this.bricks, this.hitBrick, null, this);
      this.extraBalls.push(extra);
    }
  }

  activateWidePaddle() {
    this.paddleWidth = 160;
    this.updatePaddleTexture();
  }

  activateSlowBall() {
    const factor = 0.6;
    this.ball.setVelocity(
      this.ball.body.velocity.x * factor,
      this.ball.body.velocity.y * factor,
    );
    for (const extra of this.extraBalls) {
      if (extra.active) {
        extra.setVelocity(
          extra.body.velocity.x * factor,
          extra.body.velocity.y * factor,
        );
      }
    }
  }

  fireLaser() {
    if (this.activePowerUp !== PWR_LASER) return;

    const l1 = this.laserGroup.create(
      this.paddle.x - 15,
      this.paddle.y - 10,
      "laser",
    );
    const l2 = this.laserGroup.create(
      this.paddle.x + 15,
      this.paddle.y - 10,
      "laser",
    );
    l1.setVelocityY(-400);
    l2.setVelocityY(-400);
    l1.body.allowGravity = false;
    l2.body.allowGravity = false;
    playSlide();
  }

  laserHitBrick(laser, brick) {
    laser.destroy();

    if (brick.brickType === BRICK_METAL) {
      return;
    }

    brick.hits--;
    if (brick.hits <= 0) {
      this.destroyBrick(brick);
    } else {
      brick.setTexture("brick_h1");
      brick.refreshBody();
      playSlide();
    }
  }

  deactivatePowerUp() {
    if (this.activePowerUp === PWR_WIDE_PADDLE) {
      this.paddleWidth = this.normalPaddleWidth;
      this.updatePaddleTexture();
    } else if (this.activePowerUp === PWR_SLOW) {
      // Restore speed
      const currentSpeed = Math.sqrt(
        this.ball.body.velocity.x ** 2 + this.ball.body.velocity.y ** 2,
      );
      if (currentSpeed > 0) {
        const scale = this.ballSpeed / currentSpeed;
        this.ball.setVelocity(
          this.ball.body.velocity.x * scale,
          this.ball.body.velocity.y * scale,
        );
      }
    }

    this.activePowerUp = null;
    this.powerUpText.setText("");
  }

  updatePaddleTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x44bbff, 1);
    g.fillRoundedRect(0, 0, this.paddleWidth, 14, 7);
    g.fillStyle(0x88ddff, 0.5);
    g.fillRoundedRect(4, 2, this.paddleWidth - 8, 4, 2);

    if (this.textures.exists("paddle")) {
      this.textures.remove("paddle");
    }
    g.generateTexture("paddle", this.paddleWidth, 14);
    g.destroy();

    this.paddle.setTexture("paddle");
    this.paddle.body.setSize(this.paddleWidth, 14);
  }

  nextLevel() {
    this.level++;
    this.ballOnPaddle = true;
    this.ball.setVelocity(0, 0);

    // Clean up extra balls
    for (const extra of this.extraBalls) {
      if (extra.active) extra.destroy();
    }
    this.extraBalls = [];

    // Speed up slightly each level
    this.ballSpeed = Math.min(500, this.normalBallSpeed + this.level * 20);

    this.loadLevel(this.level);
    this.launchHint.setVisible(true);
    playMilestone();

    // Level transition text
    const txt = this.add
      .text(400, 300, `Level ${this.level + 1}`, {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#44bbff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: txt,
      alpha: 1,
      duration: 400,
      yoyo: true,
      hold: 600,
      onComplete: () => txt.destroy(),
    });
  }

  loseLife() {
    this.lives--;
    this.livesText.setText(`Lives: ${this.lives}`);

    // Clean up extra balls
    for (const extra of this.extraBalls) {
      if (extra.active) extra.destroy();
    }
    this.extraBalls = [];

    // Clean up power-ups
    if (this.powerUpTimer) {
      this.powerUpTimer.remove();
      this.powerUpTimer = null;
    }
    this.deactivatePowerUp();

    if (this.lives <= 0) {
      this.gameOver();
      return;
    }

    // Reset ball on paddle
    this.ballOnPaddle = true;
    this.ball.setVelocity(0, 0);
    this.ball.setPosition(this.paddle.x, this.paddle.y - 20);
    this.launchHint.setVisible(true);
    playGameOver();
  }

  gameOver() {
    playGameOver();

    // Save high score
    const best = parseInt(
      localStorage.getItem("brickbreaker-highscore") || "0",
      10,
    );
    const isNewRecord = this.score > best;
    if (isNewRecord) {
      localStorage.setItem("brickbreaker-highscore", this.score);
    }

    this.scene.start("ResultScene", {
      score: this.score,
      level: this.level + 1,
      isNewRecord,
    });
  }

  update(time, delta) {
    const { width, height } = this.scale;

    // Paddle keyboard control
    const paddleSpeed = 500;
    if (this.cursors.left.isDown) {
      this.paddle.x = Math.max(
        this.paddleWidth / 2,
        this.paddle.x - (paddleSpeed * delta) / 1000,
      );
    } else if (this.cursors.right.isDown) {
      this.paddle.x = Math.min(
        width - this.paddleWidth / 2,
        this.paddle.x + (paddleSpeed * delta) / 1000,
      );
    }

    // Launch with space
    if (this.spaceKey.isDown && this.ballOnPaddle) {
      this.launchBall();
    }

    // Fire laser with space
    if (
      Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
      !this.ballOnPaddle &&
      this.activePowerUp === PWR_LASER
    ) {
      this.fireLaser();
    }

    // Ball follows paddle when on paddle
    if (this.ballOnPaddle) {
      this.ball.setPosition(this.paddle.x, this.paddle.y - 20);
    }

    // Check ball out of bounds (bottom)
    if (this.ball.y > height + 10) {
      this.loseLife();
    }

    // Check extra balls out of bounds
    for (let i = this.extraBalls.length - 1; i >= 0; i--) {
      const extra = this.extraBalls[i];
      if (!extra.active || extra.y > height + 10) {
        if (extra.active) extra.destroy();
        this.extraBalls.splice(i, 1);
      }
    }

    // Clean up off-screen lasers
    this.laserGroup.getChildren().forEach((laser) => {
      if (laser.y < -20) laser.destroy();
    });

    // Clean up off-screen power-ups
    this.powerUps.getChildren().forEach((pwr) => {
      if (pwr.y > height + 20) pwr.destroy();
    });

    // Prevent ball from going too horizontal
    if (!this.ballOnPaddle && this.ball.active) {
      const vx = this.ball.body.velocity.x;
      const vy = this.ball.body.velocity.y;
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > 0 && Math.abs(vy) < speed * 0.15) {
        const sign = vy >= 0 ? 1 : -1;
        const newVy = sign * speed * 0.2;
        const newVx =
          (vx >= 0 ? 1 : -1) * Math.sqrt(speed * speed - newVy * newVy);
        this.ball.setVelocity(newVx, newVy);
      }
    }
  }
}
