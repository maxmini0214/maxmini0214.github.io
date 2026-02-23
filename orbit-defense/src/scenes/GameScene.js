import Phaser from "phaser";
import {
  playNoteHit,
  playNoteMiss,
  playGameOver,
  playMilestone,
} from "../../../../common/audio.js";

const W = 600;
const H = 600;
const CX = W / 2;
const CY = H / 2;
const PLANET_R = 40;
const ORBIT_R = 90;
const SHIP_SIZE = 10;
const BULLET_SPEED = 400;
const BULLET_LIFE = 1200;
const FIRE_COOLDOWN = 180;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.score = 0;
    this.wave = 1;
    this.planetHP = 5;
    this.maxHP = 5;
    this.kills = 0;
    this.waveKills = 0;
    this.waveTarget = 6;
    this.lastFireTime = 0;
    this.gameOver = false;

    // Ship orbit
    this.shipAngle = -Math.PI / 2; // starts at top
    this.orbitDir = 1; // 1 = clockwise, -1 = counter-clockwise
    this.orbitSpeed = 2.2; // radians per second

    // Arrays
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.powerups = [];
    this.damageFlashTime = 0;

    // Power-up state
    this.rapidFire = false;
    this.rapidFireTimer = null;
    this.piercing = false;
    this.piercingTimer = null;
    this.shield = false;
    this.shieldTimer = null;

    // Graphics layers
    this.bgGfx = this.add.graphics();
    this.orbitGfx = this.add.graphics();
    this.entityGfx = this.add.graphics();
    this.uiGfx = this.add.graphics();

    // Starfield
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() < 0.2 ? 1.5 : 0.8,
        alpha: 0.15 + Math.random() * 0.4,
      });
    }

    // UI Text
    this.scoreText = this.add.text(10, 10, "Score: 0", {
      fontSize: "18px",
      fontFamily: "monospace",
      color: "#aaccff",
    });

    this.waveText = this.add
      .text(W - 10, 10, "Wave 1", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#ffcc44",
      })
      .setOrigin(1, 0);

    this.hpText = this.add
      .text(CX, 16, "", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#ff4444",
      })
      .setOrigin(0.5, 0);

    this.powerText = this.add
      .text(CX, H - 20, "", {
        fontSize: "12px",
        fontFamily: "monospace",
        color: "#ffcc44",
      })
      .setOrigin(0.5);

    this.waveAnnounce = this.add
      .text(CX, CY - 120, "", {
        fontSize: "28px",
        fontFamily: "monospace",
        color: "#ffdd44",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Input - keyboard
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );

    // Input - touch/mouse
    this.input.on("pointerdown", (pointer) => {
      if (this.gameOver) return;
      // Left half = counter-clockwise, right half = clockwise
      if (pointer.x < W / 3) {
        this.orbitDir = -1;
      } else if (pointer.x > (W * 2) / 3) {
        this.orbitDir = 1;
      }
      this.fire();
    });

    // Swipe detection
    this.swipeStart = null;
    this.input.on("pointerdown", (pointer) => {
      this.swipeStart = { x: pointer.x, y: pointer.y, time: Date.now() };
    });
    this.input.on("pointerup", (pointer) => {
      if (!this.swipeStart) return;
      const dx = pointer.x - this.swipeStart.x;
      const dt = Date.now() - this.swipeStart.time;
      if (dt < 300 && Math.abs(dx) > 40) {
        this.orbitDir = dx > 0 ? 1 : -1;
      }
      this.swipeStart = null;
    });

    // Start spawning enemies
    this.spawnTimer = this.time.addEvent({
      delay: 1800,
      callback: () => this.spawnEnemy(),
      loop: true,
    });

    this.showWaveAnnounce("Wave 1");
    this.updateHPDisplay();
  }

  fire() {
    const now = Date.now();
    const cooldown = this.rapidFire ? FIRE_COOLDOWN * 0.4 : FIRE_COOLDOWN;
    if (now - this.lastFireTime < cooldown) return;
    this.lastFireTime = now;

    const bx = CX + Math.cos(this.shipAngle) * ORBIT_R;
    const by = CY + Math.sin(this.shipAngle) * ORBIT_R;
    const vx = Math.cos(this.shipAngle) * BULLET_SPEED;
    const vy = Math.sin(this.shipAngle) * BULLET_SPEED;

    this.bullets.push({
      x: bx,
      y: by,
      vx,
      vy,
      born: now,
      piercing: this.piercing,
      hitSet: new Set(),
    });

    playNoteHit(0);
  }

  spawnEnemy() {
    if (this.gameOver) return;

    const count = this.wave <= 2 ? 1 : Math.min(this.wave - 1, 3);
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 300, () => this._spawnOne());
    }
  }

  _spawnOne() {
    if (this.gameOver) return;

    // Spawn from edges, aimed toward planet
    const side = Phaser.Math.Between(0, 3);
    let x, y;
    switch (side) {
      case 0:
        x = Phaser.Math.Between(0, W);
        y = -20;
        break;
      case 1:
        x = Phaser.Math.Between(0, W);
        y = H + 20;
        break;
      case 2:
        x = -20;
        y = Phaser.Math.Between(0, H);
        break;
      case 3:
        x = W + 20;
        y = Phaser.Math.Between(0, H);
        break;
    }

    // Direction toward planet center with slight random offset
    const angle = Math.atan2(CY - y, CX - x) + (Math.random() - 0.5) * 0.3;
    const baseSpeed = 40 + this.wave * 5;
    const speed = baseSpeed + Math.random() * 20;

    // Enemy types: 0=basic square, 1=fast circle, 2=tank
    let type = 0;
    if (this.wave >= 3 && Math.random() < 0.3) type = 1;
    if (this.wave >= 5 && Math.random() < 0.2) type = 2;

    const hp = type === 2 ? 3 : 1;
    const sizeMulti = type === 2 ? 1.5 : type === 1 ? 0.7 : 1;
    const speedMulti = type === 1 ? 1.6 : type === 2 ? 0.7 : 1;

    this.enemies.push({
      x,
      y,
      vx: Math.cos(angle) * speed * speedMulti,
      vy: Math.sin(angle) * speed * speedMulti,
      type,
      hp,
      maxHP: hp,
      size: 10 * sizeMulti,
      id: Date.now() + Math.random(),
    });
  }

  showWaveAnnounce(text) {
    this.waveAnnounce.setText(text).setAlpha(1);
    this.tweens.add({
      targets: this.waveAnnounce,
      alpha: 0,
      duration: 2000,
      delay: 800,
    });
  }

  updateHPDisplay() {
    let hearts = "";
    for (let i = 0; i < this.maxHP; i++) {
      hearts += i < this.planetHP ? "O " : "X ";
    }
    this.hpText.setText(hearts.trim());
  }

  spawnPowerUp(x, y) {
    // 20% chance to spawn power-up on kill
    if (Math.random() > 0.2) return;
    const types = ["rapid", "pierce", "shield"];
    const type = types[Phaser.Math.Between(0, types.length - 1)];
    this.powerups.push({ x, y, type, born: Date.now(), size: 8 });
  }

  activatePowerUp(type) {
    const duration = 8000;
    if (type === "rapid") {
      this.rapidFire = true;
      if (this.rapidFireTimer) this.rapidFireTimer.remove();
      this.rapidFireTimer = this.time.delayedCall(duration, () => {
        this.rapidFire = false;
      });
    } else if (type === "pierce") {
      this.piercing = true;
      if (this.piercingTimer) this.piercingTimer.remove();
      this.piercingTimer = this.time.delayedCall(duration, () => {
        this.piercing = false;
      });
    } else if (type === "shield") {
      this.shield = true;
      if (this.shieldTimer) this.shieldTimer.remove();
      this.shieldTimer = this.time.delayedCall(duration, () => {
        this.shield = false;
      });
    }
    playMilestone();
  }

  spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.4 + Math.random() * 0.3,
        size: 1.5 + Math.random() * 2,
        color,
      });
    }
  }

  update(time, delta) {
    if (this.gameOver) return;
    const dt = delta / 1000;
    const now = Date.now();

    // Keyboard input
    if (this.cursors.left.isDown) this.orbitDir = -1;
    if (this.cursors.right.isDown) this.orbitDir = 1;
    if (this.spaceKey.isDown) this.fire();

    // Move ship along orbit
    this.shipAngle += this.orbitDir * this.orbitSpeed * dt;

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (
        now - b.born > BULLET_LIFE ||
        b.x < -20 ||
        b.x > W + 20 ||
        b.y < -20 ||
        b.y > H + 20
      ) {
        this.bullets.splice(i, 1);
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Check collision with planet
      const distToPlanet = Math.hypot(e.x - CX, e.y - CY);
      if (distToPlanet < PLANET_R + e.size) {
        if (this.shield) {
          // Shield absorbs hit, destroy enemy
          this.shield = false;
          if (this.shieldTimer) this.shieldTimer.remove();
          this.spawnExplosion(e.x, e.y, 0x44ffff, 8);
        } else {
          this.planetHP--;
          this.damageFlashTime = now;
          this.updateHPDisplay();
          this.spawnExplosion(e.x, e.y, 0xff4444, 6);
          playNoteMiss();
        }
        this.enemies.splice(i, 1);

        if (this.planetHP <= 0) {
          this.endGame();
          return;
        }
        continue;
      }

      // Check bullet collisions
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        if (b.hitSet && b.hitSet.has(e.id)) continue;
        const dist = Math.hypot(b.x - e.x, b.y - e.y);
        if (dist < e.size + 4) {
          e.hp--;
          if (b.piercing) {
            if (b.hitSet) b.hitSet.add(e.id);
          } else {
            this.bullets.splice(j, 1);
          }

          if (e.hp <= 0) {
            this.score += e.type === 2 ? 30 : e.type === 1 ? 15 : 10;
            this.kills++;
            this.waveKills++;
            this.spawnExplosion(
              e.x,
              e.y,
              e.type === 1 ? 0xff8844 : e.type === 2 ? 0xff44ff : 0x44ff88,
              10,
            );
            this.spawnPowerUp(e.x, e.y);
            this.enemies.splice(i, 1);
            playNoteHit(2);

            // Check wave progression
            if (this.waveKills >= this.waveTarget) {
              this.wave++;
              this.waveKills = 0;
              this.waveTarget = Math.floor(6 + this.wave * 2);
              this.showWaveAnnounce(`Wave ${this.wave}`);

              // Speed up spawns
              if (this.spawnTimer) this.spawnTimer.remove();
              const newDelay = Math.max(600, 1800 - this.wave * 120);
              this.spawnTimer = this.time.addEvent({
                delay: newDelay,
                callback: () => this.spawnEnemy(),
                loop: true,
              });
            }
          } else {
            this.spawnExplosion(e.x, e.y, 0xffffff, 3);
          }
          break;
        }
      }
    }

    // Update power-ups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      // Lifetime
      if (now - p.born > 6000) {
        this.powerups.splice(i, 1);
        continue;
      }
      // Check ship collision
      const sx = CX + Math.cos(this.shipAngle) * ORBIT_R;
      const sy = CY + Math.sin(this.shipAngle) * ORBIT_R;
      if (Math.hypot(p.x - sx, p.y - sy) < p.size + SHIP_SIZE) {
        this.activatePowerUp(p.type);
        this.powerups.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update UI
    this.scoreText.setText(`Score: ${this.score}`);
    this.waveText.setText(`Wave ${this.wave}`);

    // Power-up status text
    const powers = [];
    if (this.rapidFire) powers.push("RAPID FIRE");
    if (this.piercing) powers.push("PIERCING");
    if (this.shield) powers.push("SHIELD");
    this.powerText.setText(powers.join(" | "));

    // Render
    this.render(now);
  }

  render(now) {
    const dt = now;

    // Background
    this.bgGfx.clear();
    for (const s of this.stars) {
      this.bgGfx.fillStyle(0xffffff, s.alpha);
      this.bgGfx.fillCircle(s.x, s.y, s.size);
    }

    // Orbit ring
    this.orbitGfx.clear();
    this.orbitGfx.lineStyle(1, 0x334466, 0.4);
    this.orbitGfx.strokeCircle(CX, CY, ORBIT_R);

    // Planet
    const flashAlpha = now - this.damageFlashTime < 200 ? 0.6 : 0;
    this.orbitGfx.fillStyle(0x2255aa, 0.8);
    this.orbitGfx.fillCircle(CX, CY, PLANET_R);
    this.orbitGfx.lineStyle(2, 0x4488cc, 0.6);
    this.orbitGfx.strokeCircle(CX, CY, PLANET_R);
    // Planet surface details
    this.orbitGfx.fillStyle(0x3366bb, 0.4);
    this.orbitGfx.fillCircle(CX - 10, CY - 8, 12);
    this.orbitGfx.fillCircle(CX + 15, CY + 5, 8);
    // Damage flash
    if (flashAlpha > 0) {
      this.orbitGfx.fillStyle(0xff0000, flashAlpha);
      this.orbitGfx.fillCircle(CX, CY, PLANET_R + 5);
    }

    // Shield visual
    if (this.shield) {
      this.orbitGfx.lineStyle(2, 0x44ffff, 0.4 + Math.sin(now * 0.005) * 0.2);
      this.orbitGfx.strokeCircle(CX, CY, PLANET_R + 12);
    }

    // Entity layer
    this.entityGfx.clear();

    // Ship
    const sx = CX + Math.cos(this.shipAngle) * ORBIT_R;
    const sy = CY + Math.sin(this.shipAngle) * ORBIT_R;
    const sa = this.shipAngle; // point outward
    this.entityGfx.fillStyle(0x44ff88, 1);
    this.entityGfx.fillTriangle(
      sx + Math.cos(sa) * SHIP_SIZE,
      sy + Math.sin(sa) * SHIP_SIZE,
      sx + Math.cos(sa + 2.4) * SHIP_SIZE * 0.7,
      sy + Math.sin(sa + 2.4) * SHIP_SIZE * 0.7,
      sx + Math.cos(sa - 2.4) * SHIP_SIZE * 0.7,
      sy + Math.sin(sa - 2.4) * SHIP_SIZE * 0.7,
    );
    // Engine glow
    this.entityGfx.fillStyle(0x44aaff, 0.6);
    this.entityGfx.fillCircle(sx - Math.cos(sa) * 6, sy - Math.sin(sa) * 6, 3);

    // Bullets
    for (const b of this.bullets) {
      this.entityGfx.fillStyle(b.piercing ? 0xff44ff : 0xffff44, 0.9);
      this.entityGfx.fillCircle(b.x, b.y, b.piercing ? 4 : 3);
    }

    // Enemies
    for (const e of this.enemies) {
      if (e.type === 0) {
        // Basic - square
        this.entityGfx.fillStyle(0xff4444, 0.9);
        this.entityGfx.fillRect(
          e.x - e.size,
          e.y - e.size,
          e.size * 2,
          e.size * 2,
        );
      } else if (e.type === 1) {
        // Fast - circle
        this.entityGfx.fillStyle(0xff8844, 0.9);
        this.entityGfx.fillCircle(e.x, e.y, e.size);
      } else {
        // Tank - hexagon-ish
        this.entityGfx.fillStyle(0xff44ff, 0.9);
        const s = e.size;
        this.entityGfx.fillRect(e.x - s, e.y - s * 0.7, s * 2, s * 1.4);
        this.entityGfx.fillRect(e.x - s * 0.7, e.y - s, s * 1.4, s * 2);
        // HP bar for tanks
        if (e.hp < e.maxHP) {
          const bw = e.size * 2;
          this.entityGfx.fillStyle(0x330000, 0.8);
          this.entityGfx.fillRect(e.x - bw / 2, e.y - e.size - 6, bw, 3);
          this.entityGfx.fillStyle(0xff4444, 0.9);
          this.entityGfx.fillRect(
            e.x - bw / 2,
            e.y - e.size - 6,
            bw * (e.hp / e.maxHP),
            3,
          );
        }
      }
    }

    // Power-ups
    for (const p of this.powerups) {
      const age = now - p.born;
      const blink = age > 4000 ? (Math.sin(age * 0.01) > 0 ? 1 : 0.3) : 1;
      let color;
      if (p.type === "rapid") color = 0xffff44;
      else if (p.type === "pierce") color = 0xff44ff;
      else color = 0x44ffff;

      this.entityGfx.fillStyle(color, 0.8 * blink);
      // Diamond shape
      const s = p.size;
      this.entityGfx.fillTriangle(p.x, p.y - s, p.x + s, p.y, p.x, p.y + s);
      this.entityGfx.fillTriangle(p.x, p.y - s, p.x - s, p.y, p.x, p.y + s);
    }

    // Particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      this.entityGfx.fillStyle(p.color, alpha);
      this.entityGfx.fillCircle(p.x, p.y, p.size * alpha);
    }
  }

  endGame() {
    this.gameOver = true;
    if (this.spawnTimer) this.spawnTimer.remove();
    playGameOver();

    // Save high score
    const best = parseInt(
      localStorage.getItem("orbitdefense-highscore") || "0",
    );
    const isNewRecord = this.score > best;
    if (isNewRecord) {
      localStorage.setItem("orbitdefense-highscore", this.score);
    }

    this.time.delayedCall(1200, () => {
      this.scene.start("ResultScene", {
        score: this.score,
        wave: this.wave,
        kills: this.kills,
        isNewRecord,
      });
    });
  }
}
