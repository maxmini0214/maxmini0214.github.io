import Phaser from "phaser";

// === Procedural Audio ===
let audioCtx = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, dur, type = "sine", vol = 0.3, decay = true) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  if (decay) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

function playNoise(dur, vol = 0.1) {
  const ctx = getCtx();
  const bufSize = ctx.sampleRate * dur;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * vol;
  // Fade out
  for (let i = Math.floor(bufSize * 0.7); i < bufSize; i++) {
    data[i] *= 1 - (i - bufSize * 0.7) / (bufSize * 0.3);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

function playDrone() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(55, ctx.currentTime);
  gain.gain.setValueAtTime(0.02, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 6);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 6);
}

function playClick() {
  playTone(600, 0.05, "sine", 0.15);
}

function playUnlock() {
  playTone(330, 0.1, "sine", 0.2);
  setTimeout(() => playTone(440, 0.1, "sine", 0.2), 80);
  setTimeout(() => playTone(660, 0.15, "sine", 0.2), 160);
}

function playError() {
  playTone(150, 0.3, "square", 0.15);
}

function playJumpScare() {
  playNoise(0.8, 0.4);
  playTone(80, 0.6, "sawtooth", 0.3);
}

function playHeartbeat() {
  playTone(60, 0.15, "sine", 0.12, true);
  setTimeout(() => playTone(55, 0.12, "sine", 0.1, true), 180);
}

function playKeypadBeep() {
  playTone(800, 0.06, "square", 0.1);
}

// === Colors ===
const C = {
  WALL: 0x0d0d1a,
  FLOOR: 0x111122,
  FURNITURE: 0x1a1a33,
  ACCENT: 0x2a2a44,
  DOOR: 0x221133,
  INTERACTIVE: 0x883333,
  TEXT: "#aaaaaa",
  HORROR: "#cc2222",
  DIM: "#555555",
  BRIGHT: "#dddddd",
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.cameras.main.fadeIn(2000, 0, 0, 0);

    this.state = {
      hasKey: false,
      hasNote: false,
      drawerOpen: false,
      checkedClock: false,
      doorOpen: false,
      rugSearched: 0,
      horrorLevel: 0,
      interactions: 0,
      keypadOpen: false,
      ending: false,
    };
    this.inventory = [];

    this.drawRoom();
    this.setupFlashlight();
    this.setupUI();
    this.setupInteractions();
    this.scheduleHorrorEvents();
    this.startAmbience();
  }

  // === ROOM DRAWING ===
  drawRoom() {
    const g = this.add.graphics();

    // Floor
    g.fillStyle(C.FLOOR);
    g.fillRect(0, 250, 800, 350);

    // Back wall
    g.fillStyle(C.WALL);
    g.fillRect(0, 0, 800, 250);

    // Wall-floor edge
    g.lineStyle(2, 0x222244);
    g.lineBetween(0, 250, 800, 250);

    // Baseboard
    g.fillStyle(0x0a0a15);
    g.fillRect(0, 245, 800, 8);

    this.roomGfx = g;
    this.drawFurniture();
  }

  drawFurniture() {
    // === Window (left wall) ===
    this.windowObj = this.add.graphics();
    this.windowObj.fillStyle(0x050515);
    this.windowObj.fillRect(60, 80, 80, 110);
    this.windowObj.lineStyle(3, 0x333355);
    this.windowObj.strokeRect(60, 80, 80, 110);
    // Cross panes
    this.windowObj.lineBetween(100, 80, 100, 190);
    this.windowObj.lineBetween(60, 135, 140, 135);
    // Faint moonlight glow
    this.windowGlow = this.add.rectangle(100, 135, 70, 100, 0x112244, 0.15);

    // === Painting (center wall) ===
    this.paintingObj = this.add.graphics();
    this.paintingObj.fillStyle(0x1a0a0a);
    this.paintingObj.fillRect(330, 60, 120, 90);
    this.paintingObj.lineStyle(3, 0x443322);
    this.paintingObj.strokeRect(330, 60, 120, 90);
    // Abstract dark painting content
    this.paintingObj.fillStyle(0x220808);
    this.paintingObj.fillRect(340, 70, 100, 70);
    // Hidden eyes (invisible initially)
    this.paintingEyes = this.add.graphics();
    this.paintingEyes.fillStyle(0xcc2222);
    this.paintingEyes.fillCircle(370, 100, 3);
    this.paintingEyes.fillCircle(410, 100, 3);
    this.paintingEyes.setAlpha(0);

    // === Clock (right wall) ===
    this.clockObj = this.add.graphics();
    this.clockObj.fillStyle(0x111125);
    this.clockObj.fillCircle(620, 110, 35);
    this.clockObj.lineStyle(2, 0x444466);
    this.clockObj.strokeCircle(620, 110, 35);
    // Clock hands showing 7:13
    this.clockObj.lineStyle(2, 0x888899);
    // Hour hand (7 o'clock position = ~210 degrees)
    const hourAngle = ((7 / 12) * 360 - 90) * (Math.PI / 180);
    this.clockObj.lineBetween(620, 110, 620 + Math.cos(hourAngle) * 18, 110 + Math.sin(hourAngle) * 18);
    // Minute hand (13 minutes = ~78 degrees)
    const minAngle = ((13 / 60) * 360 - 90) * (Math.PI / 180);
    this.clockObj.lineStyle(1.5, 0xaaaabb);
    this.clockObj.lineBetween(620, 110, 620 + Math.cos(minAngle) * 28, 110 + Math.sin(minAngle) * 28);
    // Center dot
    this.clockObj.fillStyle(0x666688);
    this.clockObj.fillCircle(620, 110, 3);

    // === Door (right side) ===
    this.doorObj = this.add.graphics();
    this.doorObj.fillStyle(C.DOOR);
    this.doorObj.fillRect(680, 100, 90, 200);
    this.doorObj.lineStyle(2, 0x332255);
    this.doorObj.strokeRect(680, 100, 90, 200);
    // Door handle
    this.doorObj.fillStyle(0x555577);
    this.doorObj.fillCircle(700, 200, 5);
    // Keypad on wall next to door
    this.keypadBox = this.add.graphics();
    this.keypadBox.fillStyle(0x222233);
    this.keypadBox.fillRect(650, 180, 25, 35);
    this.keypadBox.lineStyle(1, 0x444466);
    this.keypadBox.strokeRect(650, 180, 25, 35);
    // Small LED on keypad (red = locked)
    this.keypadLed = this.add.circle(662, 186, 3, 0xcc2222);

    // === Desk (left-center) ===
    this.deskObj = this.add.graphics();
    // Desk top
    this.deskObj.fillStyle(C.FURNITURE);
    this.deskObj.fillRect(80, 340, 200, 15);
    // Desk legs
    this.deskObj.fillStyle(0x151528);
    this.deskObj.fillRect(85, 355, 8, 60);
    this.deskObj.fillRect(267, 355, 8, 60);
    // Drawer
    this.drawerObj = this.add.graphics();
    this.drawerObj.fillStyle(0x1d1d35);
    this.drawerObj.fillRect(130, 356, 100, 25);
    this.drawerObj.lineStyle(1, 0x333355);
    this.drawerObj.strokeRect(130, 356, 100, 25);
    // Drawer handle
    this.drawerObj.fillStyle(0x555577);
    this.drawerObj.fillRect(170, 365, 20, 4);

    // === Rug (center floor) ===
    this.rugObj = this.add.graphics();
    this.rugObj.fillStyle(0x1a0d0d);
    this.rugObj.fillEllipse(400, 420, 160, 50);
    this.rugObj.lineStyle(1, 0x2a1515);
    this.rugObj.strokeEllipse(400, 420, 160, 50);

    // === Filing cabinet ===
    this.cabinetObj = this.add.graphics();
    this.cabinetObj.fillStyle(C.FURNITURE);
    this.cabinetObj.fillRect(260, 230, 50, 120);
    this.cabinetObj.lineStyle(1, 0x333355);
    this.cabinetObj.strokeRect(260, 230, 50, 120);
    this.cabinetObj.lineBetween(260, 270, 310, 270);
    this.cabinetObj.lineBetween(260, 310, 310, 310);
  }

  // === FLASHLIGHT ===
  setupFlashlight() {
    this.darkCanvas = this.textures.createCanvas("darkOverlay", 800, 600);
    this.darkOverlay = this.add.image(400, 300, "darkOverlay").setDepth(50);
    this.flashlightRadius = 75;
    this.pointerX = 400;
    this.pointerY = 300;

    this.input.on("pointermove", (p) => {
      this.pointerX = p.x;
      this.pointerY = p.y;
    });
  }

  updateFlashlight() {
    const ctx = this.darkCanvas.getContext();
    ctx.clearRect(0, 0, 800, 600);

    // Dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.96)";
    ctx.fillRect(0, 0, 800, 600);

    // Cut out flashlight circle with gradient
    ctx.globalCompositeOperation = "destination-out";
    const r = this.flashlightRadius;
    const gradient = ctx.createRadialGradient(this.pointerX, this.pointerY, 0, this.pointerX, this.pointerY, r);
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.6, "rgba(0,0,0,0.9)");
    gradient.addColorStop(0.85, "rgba(0,0,0,0.4)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.pointerX, this.pointerY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    this.darkCanvas.refresh();
  }

  // === UI ===
  setupUI() {
    // Message box
    this.msgBg = this.add.rectangle(400, 545, 700, 45, 0x000000, 0.8).setDepth(60);
    this.msgText = this.add
      .text(400, 545, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "14px",
        color: C.TEXT,
        align: "center",
        wordWrap: { width: 680 },
      })
      .setOrigin(0.5)
      .setDepth(61);
    this.msgBg.setAlpha(0);

    // Inventory bar
    this.invBg = this.add.rectangle(400, 585, 300, 25, 0x111122, 0.7).setDepth(60);
    this.invText = this.add
      .text(400, 585, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        color: "#666688",
      })
      .setOrigin(0.5)
      .setDepth(61);
    this.updateInventoryDisplay();

    // Horror overlay text (for flashing messages)
    this.horrorText = this.add
      .text(400, 300, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "36px",
        color: C.HORROR,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setAlpha(0);

    // Shadow figure (hidden)
    this.shadowFigure = this.add.graphics().setDepth(45).setAlpha(0);
    this.shadowFigure.fillStyle(0x000000);
    this.shadowFigure.fillEllipse(0, 0, 40, 80);
    this.shadowFigure.fillCircle(0, -50, 18);
  }

  showMessage(text, duration = 3000) {
    this.msgText.setText(text);
    this.msgBg.setAlpha(1);
    this.msgText.setAlpha(1);
    if (this.msgTimer) this.msgTimer.remove();
    this.msgTimer = this.time.delayedCall(duration, () => {
      this.tweens.add({
        targets: [this.msgBg, this.msgText],
        alpha: 0,
        duration: 500,
      });
    });
  }

  updateInventoryDisplay() {
    if (this.inventory.length === 0) {
      this.invText.setText("Inventory: empty");
    } else {
      this.invText.setText("Inventory: " + this.inventory.join(" | "));
    }
  }

  addItem(item) {
    this.inventory.push(item);
    this.updateInventoryDisplay();
    playUnlock();
  }

  removeItem(item) {
    this.inventory = this.inventory.filter((i) => i !== item);
    this.updateInventoryDisplay();
  }

  hasItem(item) {
    return this.inventory.includes(item);
  }

  // === INTERACTIONS ===
  setupInteractions() {
    // Define clickable zones
    const zones = [
      { name: "window", x: 100, y: 135, w: 80, h: 110 },
      { name: "painting", x: 390, y: 105, w: 120, h: 90 },
      { name: "clock", x: 620, y: 110, w: 70, h: 70 },
      { name: "door", x: 725, y: 200, w: 90, h: 200 },
      { name: "keypad", x: 662, y: 197, w: 25, h: 35 },
      { name: "desk", x: 180, y: 347, w: 200, h: 15 },
      { name: "drawer", x: 180, y: 368, w: 100, h: 25 },
      { name: "rug", x: 400, y: 420, w: 160, h: 50 },
      { name: "cabinet", x: 285, y: 290, w: 50, h: 120 },
    ];

    zones.forEach((z) => {
      const zone = this.add.zone(z.x, z.y, z.w, z.h).setInteractive({ useHandCursor: false }).setDepth(55);
      zone.on("pointerdown", () => this.onInteract(z.name));
    });
  }

  onInteract(name) {
    if (this.state.keypadOpen || this.state.ending) return;
    this.state.interactions++;
    playClick();

    switch (name) {
      case "rug":
        this.handleRug();
        break;
      case "desk":
        this.handleDesk();
        break;
      case "drawer":
        this.handleDrawer();
        break;
      case "painting":
        this.handlePainting();
        break;
      case "clock":
        this.handleClock();
        break;
      case "door":
        this.handleDoor();
        break;
      case "keypad":
        this.handleKeypad();
        break;
      case "window":
        this.handleWindow();
        break;
      case "cabinet":
        this.handleCabinet();
        break;
    }
  }

  handleRug() {
    this.state.rugSearched++;
    if (this.state.hasKey) {
      this.showMessage("An old rug. There's nothing else here.");
      return;
    }
    if (this.state.rugSearched < 3) {
      const msgs = [
        "A dusty rug. Something might be under it...",
        "You lift the corner. There's something underneath...",
      ];
      this.showMessage(msgs[this.state.rugSearched - 1]);
    } else {
      this.showMessage("You found a RUSTY KEY under the rug!");
      this.addItem("Rusty Key");
      this.state.hasKey = true;
      this.triggerHorror(1);
    }
  }

  handleDesk() {
    this.showMessage("An old wooden desk. Papers scattered everywhere. The drawer might have something.");
  }

  handleDrawer() {
    if (this.state.drawerOpen) {
      this.showMessage("The drawer is empty now.");
      return;
    }
    if (!this.state.hasKey) {
      this.showMessage("The desk drawer is locked. You need a key.");
      return;
    }
    // Open drawer with key
    this.showMessage("You unlock the drawer with the rusty key... A crumpled NOTE inside!");
    this.removeItem("Rusty Key");
    this.addItem("Strange Note");
    this.state.drawerOpen = true;
    this.state.hasNote = true;

    // Visual: drawer slightly open
    this.drawerObj.clear();
    this.drawerObj.fillStyle(0x1d1d35);
    this.drawerObj.fillRect(130, 356, 100, 25);
    this.drawerObj.fillStyle(0x0d0d1a);
    this.drawerObj.fillRect(135, 358, 90, 20);

    this.triggerHorror(2);
  }

  handlePainting() {
    if (this.state.horrorLevel >= 2) {
      this.showMessage("The portrait... the eyes are following you. You're sure of it now.");
      // Eyes glow
      this.tweens.add({
        targets: this.paintingEyes,
        alpha: { from: 0, to: 0.8 },
        duration: 500,
        yoyo: true,
        hold: 1000,
      });
    } else {
      this.showMessage("A dark portrait of someone. The face is hard to make out in this light.");
    }
  }

  handleClock() {
    this.state.checkedClock = true;
    if (this.state.hasNote) {
      this.showMessage('The clock reads 7:13. The note said "remember the time"... 7-1-3!');
      playHeartbeat();
      this.triggerHorror(3);
    } else {
      this.showMessage("A wall clock. It stopped at 7:13. How long have you been here?");
    }
  }

  handleDoor() {
    if (this.state.doorOpen) return;
    this.showMessage("A heavy steel door. Locked. There's a keypad on the wall beside it.");
  }

  handleKeypad() {
    if (this.state.doorOpen) return;
    if (!this.state.hasNote) {
      this.showMessage("A digital keypad. 3-digit code required. You don't know the combination.");
      return;
    }
    this.showKeypad();
  }

  handleWindow() {
    if (this.state.horrorLevel >= 2) {
      this.showMessage("You look outside. Is that... a face staring back at you?!");
      this.screenFlash(0xcc2222, 200);
      playJumpScare();
    } else {
      this.showMessage("The window overlooks a dark alley. Nothing but shadows.");
    }
  }

  handleCabinet() {
    this.showMessage("A metal filing cabinet. All the drawers are empty. Someone cleaned this place out.");
  }

  // === KEYPAD ===
  showKeypad() {
    this.state.keypadOpen = true;
    this.keypadGroup = this.add.group();
    this.keypadCode = "";

    // Overlay
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7).setDepth(70);
    this.keypadGroup.add(overlay);

    // Keypad background
    const bg = this.add.rectangle(400, 280, 220, 300, 0x111122, 1).setDepth(71);
    this.keypadGroup.add(bg);
    const border = this.add.graphics().setDepth(71);
    border.lineStyle(2, 0x333355);
    border.strokeRect(290, 130, 220, 300);
    this.keypadGroup.add(border);

    // Title
    const title = this.add
      .text(400, 150, "ENTER CODE", {
        fontFamily: "Courier New, monospace",
        fontSize: "16px",
        color: "#666688",
      })
      .setOrigin(0.5)
      .setDepth(72);
    this.keypadGroup.add(title);

    // Display
    this.keypadDisplay = this.add
      .text(400, 185, "_ _ _", {
        fontFamily: "Courier New, monospace",
        fontSize: "28px",
        color: C.BRIGHT,
      })
      .setOrigin(0.5)
      .setDepth(72);
    this.keypadGroup.add(this.keypadDisplay);

    // Number buttons (3x4 grid: 1-9, clear, 0, enter)
    const labels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "OK"];
    const startX = 330;
    const startY = 220;
    const bw = 50;
    const bh = 40;
    const gap = 8;

    labels.forEach((label, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = startX + col * (bw + gap) + bw / 2;
      const y = startY + row * (bh + gap) + bh / 2;

      const btn = this.add.rectangle(x, y, bw, bh, 0x222244).setDepth(72).setInteractive({ useHandCursor: false });
      const txt = this.add
        .text(x, y, label, {
          fontFamily: "Courier New, monospace",
          fontSize: label.length > 1 ? "12px" : "18px",
          color: "#aaaacc",
        })
        .setOrigin(0.5)
        .setDepth(73);

      btn.on("pointerdown", () => {
        playKeypadBeep();
        if (label === "CLR") {
          this.keypadCode = "";
        } else if (label === "OK") {
          this.checkCode();
        } else if (this.keypadCode.length < 3) {
          this.keypadCode += label;
        }
        this.updateKeypadDisplay();
      });

      btn.on("pointerover", () => btn.setFillStyle(0x333366));
      btn.on("pointerout", () => btn.setFillStyle(0x222244));

      this.keypadGroup.add(btn);
      this.keypadGroup.add(txt);
    });

    // Close button
    const closeBtn = this.add
      .text(500, 140, "X", {
        fontFamily: "Courier New, monospace",
        fontSize: "16px",
        color: "#664444",
      })
      .setOrigin(0.5)
      .setDepth(73)
      .setInteractive({ useHandCursor: false });
    closeBtn.on("pointerdown", () => this.hideKeypad());
    this.keypadGroup.add(closeBtn);
  }

  updateKeypadDisplay() {
    const display = this.keypadCode.padEnd(3, "_").split("").join(" ");
    this.keypadDisplay.setText(display);
  }

  checkCode() {
    if (this.keypadCode === "713") {
      // Correct!
      this.hideKeypad();
      this.keypadLed.setFillStyle(0x22cc22);
      playUnlock();
      this.showMessage("CLICK. The lock disengages. The door is open.");
      this.state.doorOpen = true;
      this.time.delayedCall(2000, () => this.triggerEnding());
    } else {
      // Wrong code
      playError();
      this.screenShake(200, 3);
      this.showMessage("WRONG CODE. The keypad buzzes angrily.");
      this.keypadCode = "";
      this.updateKeypadDisplay();
      this.keypadDisplay.setColor(C.HORROR);
      this.time.delayedCall(500, () => this.keypadDisplay.setColor(C.BRIGHT));

      if (this.state.checkedClock) {
        this.time.delayedCall(1500, () => {
          this.showMessage("The clock... what time did it show?");
        });
      }
    }
  }

  hideKeypad() {
    this.state.keypadOpen = false;
    if (this.keypadGroup) {
      this.keypadGroup.destroy(true);
      this.keypadGroup = null;
    }
  }

  // === HORROR EVENTS ===
  scheduleHorrorEvents() {
    // Ambient heartbeat
    this.time.addEvent({
      delay: 8000,
      callback: () => {
        if (!this.state.ending && this.state.horrorLevel >= 1) playHeartbeat();
      },
      loop: true,
    });

    // First ambient event at 15 seconds
    this.time.delayedCall(15000, () => {
      if (this.state.horrorLevel < 1) {
        this.showHorrorText("...help me...", 1500);
        playDrone();
      }
    });

    // Shadow appearance at 30 seconds
    this.time.delayedCall(30000, () => {
      if (!this.state.ending) {
        this.flashShadow(500, 280);
      }
    });

    // Periodic random events
    this.time.addEvent({
      delay: 20000,
      callback: () => this.randomHorrorEvent(),
      loop: true,
      startAt: 25000,
    });
  }

  triggerHorror(level) {
    if (level <= this.state.horrorLevel) return;
    this.state.horrorLevel = level;

    switch (level) {
      case 1: // Found key
        this.screenFlicker(3);
        this.time.delayedCall(800, () => playDrone());
        this.flashlightRadius = 70;
        break;
      case 2: // Opened drawer
        this.showHorrorText("IT KNOWS YOU'RE HERE", 2000);
        this.screenShake(500, 4);
        playJumpScare();
        // Painting eyes start glowing faintly
        this.tweens.add({
          targets: this.paintingEyes,
          alpha: 0.3,
          duration: 2000,
        });
        this.flashlightRadius = 65;
        break;
      case 3: // Checked clock with note
        this.screenFlicker(5);
        this.time.delayedCall(500, () => {
          this.flashShadow(720, 200);
        });
        playDrone();
        this.flashlightRadius = 60;
        break;
    }
  }

  randomHorrorEvent() {
    if (this.state.ending || this.state.keypadOpen) return;
    const events = [
      () => this.showHorrorText("GET OUT", 800),
      () => this.screenFlicker(2),
      () => this.flashShadow(100 + Math.random() * 600, 250 + Math.random() * 150),
      () => {
        playHeartbeat();
        this.flashlightRadius = Math.max(45, this.flashlightRadius - 5);
      },
      () => playDrone(),
    ];
    const ev = events[Math.floor(Math.random() * events.length)];
    ev();
  }

  showHorrorText(text, duration) {
    this.horrorText.setText(text);
    this.horrorText.setAlpha(0);
    this.tweens.add({
      targets: this.horrorText,
      alpha: { from: 0, to: 0.9 },
      duration: 200,
      yoyo: true,
      hold: duration - 400,
    });
  }

  screenFlicker(times) {
    let i = 0;
    const doFlicker = () => {
      if (i >= times * 2) return;
      this.darkOverlay.setAlpha(i % 2 === 0 ? 0.3 : 1);
      i++;
      this.time.delayedCall(60 + Math.random() * 60, doFlicker);
    };
    doFlicker();
  }

  screenFlash(color, duration) {
    const flash = this.add.rectangle(400, 300, 800, 600, color, 0.5).setDepth(90);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: duration,
      onComplete: () => flash.destroy(),
    });
  }

  screenShake(duration, intensity) {
    this.cameras.main.shake(duration, intensity / 800);
  }

  flashShadow(x, y) {
    this.shadowFigure.setPosition(x, y);
    this.shadowFigure.setAlpha(0);
    this.tweens.add({
      targets: this.shadowFigure,
      alpha: { from: 0, to: 0.7 },
      duration: 150,
      yoyo: true,
      hold: 300,
    });
  }

  startAmbience() {
    // Start subtle drone after a delay
    this.time.delayedCall(5000, () => playDrone());
  }

  // === ENDING SEQUENCE ===
  triggerEnding() {
    this.state.ending = true;

    // Phase 1: Door opens (visual)
    this.doorObj.clear();
    this.doorObj.fillStyle(0x000000);
    this.doorObj.fillRect(680, 100, 90, 200);
    // Dark void behind door
    this.doorObj.fillStyle(0x000005);
    this.doorObj.fillRect(685, 105, 80, 190);

    this.showMessage("The door is open...");

    // Phase 2: Lights out
    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
    });

    // Phase 3: Horror reveal
    this.time.delayedCall(5000, () => {
      this.cameras.main.fadeIn(200, 0, 0, 0);

      // The shadow is RIGHT BEHIND where the cursor was
      this.shadowFigure.setPosition(400, 300);
      this.shadowFigure.setAlpha(1);
      this.shadowFigure.setScale(3);
      this.shadowFigure.setDepth(45);

      // Painting eyes bright red
      this.paintingEyes.setAlpha(1);

      // Flash red
      this.screenFlash(0xcc0000, 300);
      playJumpScare();
    });

    // Phase 4: Text
    this.time.delayedCall(6000, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
    });

    this.time.delayedCall(7500, () => {
      // Black screen with final text
      this.cameras.main.fadeIn(100, 0, 0, 0);
      // Hide everything except text
      this.darkOverlay.setAlpha(0);
      const black = this.add.rectangle(400, 300, 800, 600, 0x000000).setDepth(200);

      const finalText = this.add
        .text(400, 250, "You were never alone.", {
          fontFamily: "Courier New, monospace",
          fontSize: "28px",
          color: "#cc2222",
        })
        .setOrigin(0.5)
        .setDepth(201)
        .setAlpha(0);

      this.tweens.add({
        targets: finalText,
        alpha: 1,
        duration: 2000,
      });

      this.time.delayedCall(4000, () => {
        const endText = this.add
          .text(400, 350, "THE END", {
            fontFamily: "Courier New, monospace",
            fontSize: "18px",
            color: "#444444",
          })
          .setOrigin(0.5)
          .setDepth(201)
          .setAlpha(0);

        this.tweens.add({
          targets: endText,
          alpha: 1,
          duration: 1000,
        });

        // Restart option
        this.time.delayedCall(2000, () => {
          const restart = this.add
            .text(400, 450, "[ Play Again ]", {
              fontFamily: "Courier New, monospace",
              fontSize: "16px",
              color: "#333355",
            })
            .setOrigin(0.5)
            .setDepth(201)
            .setInteractive({ useHandCursor: false });

          restart.on("pointerover", () => restart.setColor("#6666aa"));
          restart.on("pointerout", () => restart.setColor("#333355"));
          restart.on("pointerdown", () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => this.scene.restart());
          });
        });
      });
    });
  }

  // === UPDATE LOOP ===
  update() {
    if (!this.state.ending) {
      this.updateFlashlight();
    }
  }
}
