const menuButton = document.getElementById("menu-toggle");
const sidePanel = document.getElementById("side-panel");

if (menuButton && sidePanel) {
  menuButton.addEventListener("click", () => {
    const isOpen = sidePanel.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    sidePanel.setAttribute("aria-hidden", String(!isOpen));
  });

  sidePanel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      sidePanel.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      sidePanel.setAttribute("aria-hidden", "true");
    });
  });
}

document.querySelectorAll("#year").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

class FloatingAtlas {
  constructor(canvas, soundButton) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.soundButton = soundButton;
    this.nodes = [];
    this.images = [];
    this.smoke = [];
    this.embers = [];
    this.fractures = [];
    this.pixelBursts = [];
    this.lastTime = 0;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.terms = [
      "island studies",
      "multi-species ethnography",
      "critical thinking on ai",
      "sea rise",
      "sea level rise",
      "anthropology and studies",
      "climate changes",
      "anthropology of climate changes",
    ];

    this.imageUrls = [
      "assets/floating/225AF612-84B8-43D0-A75D-C9A9D5E55F8A.jpg",
      "assets/floating/D61F3249-EDDD-4720-A8DE-5B4C1CC53BE8.jpg",
      "assets/floating/D940BCF9-BE5E-47DD-8D8D-EB47E934B153.jpg",
      "assets/floating/DBA7F436-66D8-4A7F-A9FE-B4370D21C036.jpg",
      "assets/floating/IMG_2401.jpeg",
      "assets/floating/L1520127.jpeg",
      "assets/floating/L1520128.jpeg",
    ];

    this.audio = {
      enabled: false,
      ctx: null,
      masterGain: null,
      layers: [],
      motionTimer: null,
    };
    this.media = {
      unlock: null,
      water: null,
      tech: null,
    };
    this.resumeInFlight = false;
  }

  init() {
    if (this.soundButton) {
      this.soundButton.addEventListener("click", () => {
        this.toggleSound();
      });
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.audio.enabled) {
        this.startMediaAmbient();
        this.ensureAudioReady().then((ok) => {
          if (ok && !this.audio.masterGain) {
            this.startAmbient();
          }
        });
      } else if (document.hidden) {
        this.stopMediaAmbient();
      }
    });

    if (this.reducedMotion || this.canvas?.dataset?.audioOnly === "true") {
      return;
    }

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.loadImages().then(() => {
      this.buildNodes();
      requestAnimationFrame((t) => this.animate(t));
    });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  loadImages() {
    const loading = this.imageUrls.map((url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    });

    return Promise.all(loading).then((arr) => {
      this.images = arr.filter(Boolean);
    });
  }

  buildNodes() {
    this.nodes = [];

    const imageNodes = Math.min(this.images.length, this.width < 900 ? 4 : 6);
    for (let i = 0; i < imageNodes; i += 1) {
      const r = this.random(42, this.width < 900 ? 76 : 106);
      this.nodes.push({
        type: "image",
        img: this.images[i],
        x: this.random(r, this.width - r),
        y: this.random(r, this.height - r),
        vx: this.random(-0.15, 0.15),
        vy: this.random(-0.15, 0.15),
        r,
        mass: r * 0.11,
        angle: this.random(0, Math.PI * 2),
        spin: this.random(-0.0025, 0.0025),
        tilt: this.random(0, Math.PI * 2),
        tiltV: this.random(-0.004, 0.004),
        phase: this.random(0, Math.PI * 2),
        shatter: 0,
      });
    }

    const termCount = this.width < 900 ? 6 : this.terms.length;
    for (let i = 0; i < termCount; i += 1) {
      const term = this.terms[i];
      const fontSize = this.width < 900 ? this.random(10.2, 13.2) : this.random(11, 15.5);
      this.ctx.font = `600 ${fontSize}px "IBM Plex Mono", monospace`;
      const tw = this.ctx.measureText(term).width;
      const r = Math.max(40, tw * 0.56);
      this.nodes.push({
        type: "text",
        text: term,
        fontSize,
        x: this.random(r, this.width - r),
        y: this.random(r, this.height - r),
        vx: this.random(-0.1, 0.1),
        vy: this.random(-0.1, 0.1),
        r,
        mass: r * 0.08,
        angle: this.random(0, Math.PI * 2),
        spin: this.random(-0.004, 0.004),
        tilt: this.random(0, Math.PI * 2),
        tiltV: this.random(-0.008, 0.008),
        phase: this.random(0, Math.PI * 2),
        shatter: 0,
      });
    }
  }

  animate(time) {
    const dt = Math.min((time - this.lastTime) / 16.67 || 1, 2);
    this.lastTime = time;
    this.step(dt, time);
    this.draw(time);
    requestAnimationFrame((t) => this.animate(t));
  }

  step(dt, time) {
    for (const n of this.nodes) {
      const drift = 0.0022 * dt;
      n.vx += Math.sin(n.y * 0.002 + n.phase + time * 0.00007) * drift;
      n.vy += Math.cos(n.x * 0.002 + n.phase + time * 0.00009) * drift;

      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.angle += n.spin * dt;
      n.tilt += n.tiltV * dt;

      n.vx *= 0.998;
      n.vy *= 0.998;

      const speed = Math.hypot(n.vx, n.vy);
      const maxSpeed = 0.28;
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        n.vx *= scale;
        n.vy *= scale;
      }

      if (n.x - n.r < 0) {
        n.x = n.r;
        n.vx *= -0.9;
      }
      if (n.x + n.r > this.width) {
        n.x = this.width - n.r;
        n.vx *= -0.9;
      }
      if (n.y - n.r < 0) {
        n.y = n.r;
        n.vy *= -0.9;
      }
      if (n.y + n.r > this.height) {
        n.y = this.height - n.r;
        n.vy *= -0.9;
      }

      n.shatter = Math.max(0, n.shatter - 0.022 * dt);
    }

    for (let i = 0; i < this.nodes.length; i += 1) {
      for (let j = i + 1; j < this.nodes.length; j += 1) {
        this.resolveCollision(this.nodes[i], this.nodes[j], time);
      }
    }

    if (Math.random() < 0.18) {
      this.spawnAmbientSmoke();
    }

    this.smoke.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.size += 0.12 * dt;
      p.life -= p.decay * dt;
    });
    this.smoke = this.smoke.filter((p) => p.life > 0);

    this.embers.forEach((e) => {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 0.0022 * dt;
      e.life -= 0.018 * dt;
    });
    this.embers = this.embers.filter((e) => e.life > 0);

    this.fractures.forEach((f) => {
      f.life -= 0.024 * dt;
    });
    this.fractures = this.fractures.filter((f) => f.life > 0);

    this.pixelBursts.forEach((b) => {
      b.life -= 0.03 * dt;
    });
    this.pixelBursts = this.pixelBursts.filter((b) => b.life > 0);
  }

  resolveCollision(a, b, time) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = a.r + b.r;
    if (dist >= minDist) {
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;

    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) {
      return;
    }

    const restitution = 0.92;
    const impulse = (-(1 + restitution) * velAlongNormal) / ((1 / a.mass) + (1 / b.mass));
    const ix = impulse * nx;
    const iy = impulse * ny;

    a.vx -= ix / a.mass;
    a.vy -= iy / a.mass;
    b.vx += ix / b.mass;
    b.vy += iy / b.mass;

    a.spin += this.random(-0.002, 0.002);
    b.spin += this.random(-0.002, 0.002);

    const impact = Math.abs(velAlongNormal);
    if (impact > 0.18 && Math.random() > 0.42) {
      const cx = (a.x + b.x) * 0.5;
      const cy = (a.y + b.y) * 0.5;
      this.spawnFracture(cx, cy, impact, time);
      this.spawnCollisionSmoke(cx, cy, impact);
      this.spawnPixelBurst(cx, cy, impact);
      a.shatter = Math.min(1, a.shatter + 0.6);
      b.shatter = Math.min(1, b.shatter + 0.6);
      this.playImpactSound(impact);
    }
  }

  spawnFracture(x, y, impact, time) {
    const segmentCount = Math.floor(this.random(4, 10));
    const branches = [];
    for (let i = 0; i < segmentCount; i += 1) {
      const len = this.random(24, 80) * (0.55 + impact * 1.2);
      const angle = this.random(0, Math.PI * 2);
      branches.push({ len, angle, fork: Math.random() > 0.66 });
    }

    this.fractures.push({
      x,
      y,
      branches,
      life: 1,
      stamp: time,
    });
  }

  spawnAmbientSmoke() {
    this.smoke.push({
      x: this.random(0, this.width),
      y: this.height + this.random(30, 130),
      vx: this.random(-0.06, 0.06),
      vy: this.random(-0.16, -0.05),
      size: this.random(45, 140),
      life: this.random(0.24, 0.55),
      decay: this.random(0.0018, 0.004),
      tint: Math.random() > 0.86 ? "fire" : "smoke",
    });
  }

  spawnCollisionSmoke(x, y, impact) {
    const count = Math.floor(this.random(2, 6));
    for (let i = 0; i < count; i += 1) {
      this.smoke.push({
        x: x + this.random(-14, 14),
        y: y + this.random(-14, 14),
        vx: this.random(-0.11, 0.11),
        vy: this.random(-0.2, -0.04),
        size: this.random(20, 56) * (1 + impact),
        life: this.random(0.18, 0.42),
        decay: this.random(0.003, 0.009),
        tint: Math.random() > 0.7 ? "fire" : "smoke",
      });
    }

    const emb = Math.floor(this.random(6, 16));
    for (let i = 0; i < emb; i += 1) {
      this.embers.push({
        x,
        y,
        vx: this.random(-0.5, 0.5),
        vy: this.random(-0.8, 0.3),
        size: this.random(0.9, 2.7),
        life: this.random(0.2, 0.7),
      });
    }
  }

  spawnPixelBurst(x, y, impact) {
    this.pixelBursts.push({
      x,
      y,
      spread: this.random(24, 56) * (1 + impact),
      count: Math.floor(this.random(10, 30)),
      life: 0.8,
    });
  }

  draw(time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawSmoke(ctx);

    for (const n of this.nodes) {
      if (n.type === "image") {
        this.drawImageNode(ctx, n, time);
      } else {
        this.drawTextNode(ctx, n, time);
      }
    }

    this.drawFractures(ctx, time);
    this.drawPixelBursts(ctx, time);
  }

  drawSmoke(ctx) {
    for (const p of this.smoke) {
      ctx.save();
      ctx.globalAlpha = p.life * 0.22;
      if (p.tint === "fire") {
        ctx.fillStyle = "rgba(122, 40, 10, 0.7)";
      } else {
        ctx.fillStyle = "rgba(20, 20, 20, 0.75)";
      }
      this.blobPath(ctx, p.x, p.y, p.size, p.life * 4, 11);
      ctx.fill();
      ctx.restore();
    }

    for (const e of this.embers) {
      ctx.save();
      ctx.globalAlpha = e.life * 0.2;
      ctx.fillStyle = "#5e2b1f";
      ctx.fillRect(e.x, e.y, e.size, e.size);
      ctx.restore();
    }
  }

  drawImageNode(ctx, n, time) {
    const wobble = 1 + 0.06 * Math.sin(time * 0.0006 + n.phase);
    const radius = n.r * wobble;

    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.angle);

    this.blobPathLocal(ctx, 0, 0, radius, n.phase + time * 0.00042, 10);
    ctx.clip();

    ctx.globalAlpha = 0.26;
    if (n.img) {
      this.drawCover(n.img, -radius, -radius, radius * 2, radius * 2);
    } else {
      ctx.fillStyle = "#dcdcdc";
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    }

    if (n.shatter > 0.02) {
      ctx.globalAlpha = n.shatter * 0.24;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 4; i += 1) {
        const ry = this.random(-radius, radius);
        const h = this.random(2, 7);
        ctx.fillRect(-radius, ry, radius * 2, h);
      }
    }

    ctx.restore();
  }

  drawTextNode(ctx, n, time) {
    const phase = n.phase + time * 0.001;
    const flip = Math.sin(n.tilt);
    const scaleX = 0.65 + Math.abs(flip) * 0.5;
    const scaleY = 0.9 + Math.cos(n.tilt * 0.8) * 0.11;

    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.angle * 0.5);
    ctx.scale(scaleX, scaleY);

    const pad = 16;
    ctx.font = `600 ${n.fontSize}px "IBM Plex Mono", monospace`;
    const tw = ctx.measureText(n.text).width;
    const w = tw + pad * 1.6;
    const h = n.fontSize + pad;

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    this.blobPathLocal(ctx, 0, 0, Math.max(w, h) * 0.56, phase, 9);
    ctx.fill();

    ctx.globalAlpha = 0.66;
    ctx.fillStyle = "rgba(8,8,8,0.88)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(255,255,255,0.08)";
    ctx.shadowBlur = 8;
    ctx.fillText(n.text, 0, 0);

    if (n.shatter > 0.03) {
      ctx.globalAlpha = n.shatter * 0.25;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < 3; i += 1) {
        const rx = this.random(-w / 2, w / 2);
        ctx.fillRect(rx, this.random(-h / 2, h / 2), this.random(4, 14), 1);
      }
    }

    ctx.restore();
  }

  drawFractures(ctx, time) {
    for (const f of this.fractures) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.globalAlpha = f.life * 0.4;
      ctx.strokeStyle = "rgba(25, 25, 25, 0.8)";
      ctx.lineWidth = 0.8;
      ctx.lineCap = "round";

      f.branches.forEach((b) => {
        const len = b.len * (0.65 + f.life * 0.35);
        const x2 = Math.cos(b.angle) * len;
        const y2 = Math.sin(b.angle) * len;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (b.fork) {
          const fa = b.angle + this.random(-0.55, 0.55);
          ctx.beginPath();
          ctx.moveTo(x2 * 0.5, y2 * 0.5);
          ctx.lineTo(x2 * 0.5 + Math.cos(fa) * len * 0.33, y2 * 0.5 + Math.sin(fa) * len * 0.33);
          ctx.stroke();
        }
      });

      ctx.restore();
    }
  }

  drawPixelBursts(ctx, time) {
    for (const b of this.pixelBursts) {
      ctx.save();
      ctx.globalAlpha = b.life * 0.16;
      for (let i = 0; i < b.count; i += 1) {
        const px = b.x + this.random(-b.spread, b.spread);
        const py = b.y + this.random(-b.spread, b.spread);
        const size = this.random(1, 4);
        ctx.fillStyle = i % 4 === 0 ? "#4f231a" : "#111";
        ctx.fillRect(px, py, size, size);
      }
      ctx.restore();
    }

    if (Math.random() > 0.94) {
      ctx.save();
      ctx.globalAlpha = 0.045;
      const gy = this.random(0, this.height);
      ctx.fillStyle = "#151515";
      ctx.fillRect(0, gy, this.width, this.random(1, 3));
      ctx.restore();
    }

    if (Math.random() > 0.97) {
      ctx.save();
      ctx.globalAlpha = 0.06;
      const gx = this.random(0, this.width);
      ctx.fillStyle = "#4b2418";
      ctx.fillRect(gx, 0, this.random(1, 3), this.height);
      ctx.restore();
    }
  }

  blobPath(ctx, cx, cy, radius, phase, points) {
    ctx.beginPath();
    for (let i = 0; i <= points; i += 1) {
      const a = (Math.PI * 2 * i) / points;
      const d = 1 + 0.2 * Math.sin(a * 3.1 + phase) + 0.09 * Math.cos(a * 4.4 + phase * 1.3);
      const x = cx + Math.cos(a) * radius * d;
      const y = cy + Math.sin(a) * radius * d;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }

  blobPathLocal(ctx, cx, cy, radius, phase, points) {
    ctx.beginPath();
    for (let i = 0; i <= points; i += 1) {
      const a = (Math.PI * 2 * i) / points;
      const d = 1 + 0.19 * Math.sin(a * 2.8 + phase) + 0.08 * Math.cos(a * 5.2 + phase * 1.1);
      const x = cx + Math.cos(a) * radius * d;
      const y = cy + Math.sin(a) * radius * d;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }

  drawCover(img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let drawW = w;
    let drawH = h;
    let drawX = x;
    let drawY = y;

    if (imgRatio > boxRatio) {
      drawW = h * imgRatio;
      drawX = x - (drawW - w) / 2;
    } else {
      drawH = w / imgRatio;
      drawY = y - (drawH - h) / 2;
    }

    this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  updateSoundButton(state, blocked = false) {
    if (!this.soundButton) return;
    if (blocked) {
      this.soundButton.textContent = "sound: blocked";
      this.soundButton.setAttribute("aria-pressed", "false");
      return;
    }
    this.soundButton.textContent = state ? "sound: on" : "sound: off";
    this.soundButton.setAttribute("aria-pressed", state ? "true" : "false");
  }

  resolveSfxPath(fileName) {
    const inProjectPath = window.location.pathname.includes("/projects/");
    return inProjectPath ? `../../assets/sfx/${fileName}` : `assets/sfx/${fileName}`;
  }

  ensureMediaAudio() {
    if (!this.media.unlock) {
      this.media.unlock = new Audio(this.resolveSfxPath("unlock.wav"));
      this.media.unlock.preload = "auto";
      this.media.unlock.loop = false;
      this.media.unlock.volume = 1;
    }
    if (!this.media.water) {
      this.media.water = new Audio(this.resolveSfxPath("water_loop.wav"));
      this.media.water.preload = "auto";
      this.media.water.loop = true;
      this.media.water.volume = 0.34;
    }
    if (!this.media.tech) {
      this.media.tech = new Audio(this.resolveSfxPath("tech_loop.wav"));
      this.media.tech.preload = "auto";
      this.media.tech.loop = true;
      this.media.tech.volume = 0.26;
    }
  }

  playMediaUnlock() {
    this.ensureMediaAudio();
    if (!this.media.unlock) return;
    try {
      this.media.unlock.currentTime = 0;
      const p = this.media.unlock.play();
      if (p?.catch) p.catch(() => {});
    } catch (e) {
      // ignore play errors
    }
  }

  startMediaAmbient() {
    this.ensureMediaAudio();
    [this.media.water, this.media.tech].forEach((el) => {
      if (!el) return;
      try {
        const p = el.play();
        if (p?.catch) p.catch(() => {});
      } catch (e) {
        // ignore play errors
      }
    });
  }

  stopMediaAmbient() {
    [this.media.water, this.media.tech].forEach((el) => {
      if (!el) return;
      try {
        el.pause();
      } catch (e) {
        // ignore pause errors
      }
    });
  }

  async ensureAudioReady() {
    if (!this.audio.ctx) {
      try {
        this.audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return false;
      }
    }

    const ctx = this.audio.ctx;
    if (ctx.state === "running") return true;
    if (this.resumeInFlight) return ctx.state === "running";

    this.resumeInFlight = true;
    try {
      try {
        await ctx.resume();
      } catch (e) {
        // keep trying below
      }
      if (ctx.state !== "running") {
        await new Promise((resolve) => setTimeout(resolve, 120));
        try {
          await ctx.resume();
        } catch (e) {
          // final state check below
        }
      }
      return ctx.state === "running";
    } finally {
      this.resumeInFlight = false;
    }
  }

  async toggleSound() {
    const shouldEnable = !this.audio.enabled;

    if (shouldEnable) {
      const ready = await this.ensureAudioReady();
      this.audio.enabled = true;
      this.playMediaUnlock();
      this.startMediaAmbient();

      if (ready) {
        this.playAudibilityProbe();
        this.playToggleChime(true);
        this.startAmbient();
        this.playSoundConfirm();
        this.updateSoundButton(true);
      } else {
        this.updateSoundButton(true);
      }
      return;
    }

    this.audio.enabled = false;
    this.stopAmbient();
    this.stopMediaAmbient();
    this.updateSoundButton(false);
  }

  playAudibilityProbe() {
    if (!this.audio.ctx) return;
    const ctx = this.audio.ctx;
    const notes = [660, 880, 720];
    notes.forEach((freq, index) => {
      const t = ctx.currentTime + index * 0.15;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  startAmbient() {
    if (!this.audio.ctx) return;
    if (this.audio.masterGain) return;
    const ctx = this.audio.ctx;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + 0.95);
    master.connect(ctx.destination);
    this.audio.masterGain = master;
    this.audio.layers = [];

    // water stream bed
    const stream = this.createNoiseLayer(ctx, 3, 0.32);
    const streamHP = ctx.createBiquadFilter();
    streamHP.type = "highpass";
    streamHP.frequency.value = 92;
    const streamLP = ctx.createBiquadFilter();
    streamLP.type = "lowpass";
    streamLP.frequency.value = 860;
    const streamGain = ctx.createGain();
    streamGain.gain.value = 1.08;
    const streamLfo = ctx.createOscillator();
    streamLfo.type = "sine";
    streamLfo.frequency.value = 0.07;
    const streamLfoGain = ctx.createGain();
    streamLfoGain.gain.value = 190;
    streamLfo.connect(streamLfoGain);
    streamLfoGain.connect(streamLP.frequency);
    stream.source.connect(streamHP);
    streamHP.connect(streamLP);
    streamLP.connect(streamGain);
    streamGain.connect(master);
    stream.source.start();
    streamLfo.start();
    this.audio.layers.push(stream.source, streamLfo);

    // friction/texture layer
    const friction = this.createNoiseLayer(ctx, 2.2, 0.24);
    const frictionBP = ctx.createBiquadFilter();
    frictionBP.type = "bandpass";
    frictionBP.frequency.value = 1550;
    frictionBP.Q.value = 0.72;
    const frictionGain = ctx.createGain();
    frictionGain.gain.value = 0.35;
    const frictionLfo = ctx.createOscillator();
    frictionLfo.type = "triangle";
    frictionLfo.frequency.value = 0.11;
    const frictionLfoGain = ctx.createGain();
    frictionLfoGain.gain.value = 760;
    frictionLfo.connect(frictionLfoGain);
    frictionLfoGain.connect(frictionBP.frequency);
    friction.source.connect(frictionBP);
    frictionBP.connect(frictionGain);
    frictionGain.connect(master);
    friction.source.start();
    frictionLfo.start();
    this.audio.layers.push(friction.source, frictionLfo);

    // low movement body
    const moveOsc = ctx.createOscillator();
    moveOsc.type = "sine";
    moveOsc.frequency.value = 46;
    const moveFilter = ctx.createBiquadFilter();
    moveFilter.type = "lowpass";
    moveFilter.frequency.value = 130;
    const moveGain = ctx.createGain();
    moveGain.gain.value = 0.065;
    const moveLfo = ctx.createOscillator();
    moveLfo.type = "sine";
    moveLfo.frequency.value = 0.05;
    const moveLfoGain = ctx.createGain();
    moveLfoGain.gain.value = 0.013;
    moveLfo.connect(moveLfoGain);
    moveLfoGain.connect(moveGain.gain);
    moveOsc.connect(moveFilter);
    moveFilter.connect(moveGain);
    moveGain.connect(master);
    moveOsc.start();
    moveLfo.start();
    this.audio.layers.push(moveOsc, moveLfo);

    // processor heartbeat layer
    const cpuOsc = ctx.createOscillator();
    cpuOsc.type = "square";
    cpuOsc.frequency.value = 63;

    const cpuShaper = ctx.createWaveShaper();
    cpuShaper.curve = this.createQuantCurve(28);

    const cpuFilter = ctx.createBiquadFilter();
    cpuFilter.type = "bandpass";
    cpuFilter.frequency.value = 980;
    cpuFilter.Q.value = 1.6;

    const cpuGain = ctx.createGain();
    cpuGain.gain.value = 0.03;

    const cpuClock = ctx.createOscillator();
    cpuClock.type = "square";
    cpuClock.frequency.value = 5.2;
    const cpuClockGain = ctx.createGain();
    cpuClockGain.gain.value = 0.0032;
    cpuClock.connect(cpuClockGain);
    cpuClockGain.connect(cpuGain.gain);

    const cpuDrift = ctx.createOscillator();
    cpuDrift.type = "sine";
    cpuDrift.frequency.value = 0.09;
    const cpuDriftGain = ctx.createGain();
    cpuDriftGain.gain.value = 520;
    cpuDrift.connect(cpuDriftGain);
    cpuDriftGain.connect(cpuFilter.frequency);

    cpuOsc.connect(cpuShaper);
    cpuShaper.connect(cpuFilter);
    cpuFilter.connect(cpuGain);
    cpuGain.connect(master);
    cpuOsc.start();
    cpuClock.start();
    cpuDrift.start();
    this.audio.layers.push(cpuOsc, cpuClock, cpuDrift);

    // water sparkle layer
    const sparkle = this.createNoiseLayer(ctx, 1.7, 0.18);
    const sparkleHP = ctx.createBiquadFilter();
    sparkleHP.type = "highpass";
    sparkleHP.frequency.value = 1700;
    const sparkleBP = ctx.createBiquadFilter();
    sparkleBP.type = "bandpass";
    sparkleBP.frequency.value = 2300;
    sparkleBP.Q.value = 0.7;
    const sparkleGain = ctx.createGain();
    sparkleGain.gain.value = 0.11;
    const sparkleLfo = ctx.createOscillator();
    sparkleLfo.type = "sine";
    sparkleLfo.frequency.value = 0.16;
    const sparkleLfoGain = ctx.createGain();
    sparkleLfoGain.gain.value = 0.015;
    sparkleLfo.connect(sparkleLfoGain);
    sparkleLfoGain.connect(sparkleGain.gain);
    sparkle.source.connect(sparkleHP);
    sparkleHP.connect(sparkleBP);
    sparkleBP.connect(sparkleGain);
    sparkleGain.connect(master);
    sparkle.source.start();
    sparkleLfo.start();
    this.audio.layers.push(sparkle.source, sparkleLfo);

    this.scheduleAmbientTextures();
  }

  stopAmbient() {
    const { ctx } = this.audio;
    if (!ctx) return;

    if (this.audio.motionTimer) {
      clearTimeout(this.audio.motionTimer);
      this.audio.motionTimer = null;
    }

    if (this.audio.masterGain) {
      this.audio.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.audio.masterGain.gain.setValueAtTime(Math.max(this.audio.masterGain.gain.value, 0.0001), ctx.currentTime);
      this.audio.masterGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
    }

    this.audio.layers.forEach((node) => {
      try {
        node.stop(ctx.currentTime + 0.58);
      } catch (e) {
        // ignore stop errors for already-stopped nodes
      }
    });
    this.audio.layers = [];
    this.audio.masterGain = null;
  }

  createNoiseLayer(ctx, seconds = 2, amp = 0.2) {
    const noiseLength = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i += 1) {
      const env = 0.56 + 0.44 * Math.sin((Math.PI * 2 * i) / noiseLength);
      data[i] = (Math.random() * 2 - 1) * amp * env;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return { source };
  }

  createQuantCurve(steps = 24) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i += 1) {
      const x = (i / (samples - 1)) * 2 - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    return curve;
  }

  scheduleAmbientTextures() {
    if (!this.audio.enabled || !this.audio.ctx) return;
    const delay = this.random(900, 2800);
    this.audio.motionTimer = window.setTimeout(() => {
      if (!this.audio.enabled || !this.audio.ctx) return;
      const roll = Math.random();
      if (roll < 0.28) {
        this.playWaterWhoosh(this.audio.ctx);
      } else if (roll < 0.46) {
        this.playFrictionSweep(this.audio.ctx);
      } else if (roll < 0.68) {
        this.playProcessorPulse(this.audio.ctx);
      } else if (roll < 0.84) {
        this.playDataChirp(this.audio.ctx);
      } else {
        this.playBodyMovement(this.audio.ctx);
      }

      if (Math.random() < 0.34) {
        this.playWaterTrickle(this.audio.ctx);
      }
      this.scheduleAmbientTextures();
    }, delay);
  }

  playFrictionSweep(ctx) {
    const len = Math.floor(ctx.sampleRate * this.random(0.12, 0.28));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      const env = 1 - i / len;
      ch[i] = (Math.random() * 2 - 1) * env * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(this.random(900, 1700), ctx.currentTime);
    bp.frequency.exponentialRampToValueAtTime(this.random(1800, 3200), ctx.currentTime + 0.18);
    bp.Q.value = 1.3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(this.random(0.009, 0.019), ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.audio.masterGain || ctx.destination);
    src.start();
    src.stop(ctx.currentTime + 0.28);
  }

  playWaterWhoosh(ctx) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(this.random(140, 210), ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(this.random(80, 130), ctx.currentTime + 0.46);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = this.random(190, 280);
    filter.Q.value = 0.95;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(this.random(0.006, 0.013), ctx.currentTime + 0.09);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audio.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.52);
  }

  playBodyMovement(ctx) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(this.random(60, 120), ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(this.random(38, 72), ctx.currentTime + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(this.random(0.0045, 0.009), ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.34);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 190;

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(this.audio.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  }

  playProcessorPulse(ctx, intensity = 0.6) {
    const now = ctx.currentTime;
    const carrier = ctx.createOscillator();
    carrier.type = "square";
    carrier.frequency.setValueAtTime(this.random(260, 620), now);
    carrier.frequency.exponentialRampToValueAtTime(this.random(140, 320), now + 0.16);

    const mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.value = this.random(18, 42);
    const modGain = ctx.createGain();
    modGain.gain.value = this.random(22, 66);
    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 230;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime((0.008 + this.random(0.003, 0.008)) * intensity, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

    carrier.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(this.audio.masterGain || ctx.destination);
    carrier.start(now);
    mod.start(now);
    carrier.stop(now + 0.2);
    mod.stop(now + 0.2);
  }

  playDataChirp(ctx) {
    const pulses = Math.floor(this.random(2, 5));
    const now = ctx.currentTime;
    for (let i = 0; i < pulses; i += 1) {
      const t = now + i * this.random(0.04, 0.07);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      const base = this.random(480, 1100);
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * this.random(0.55, 0.82), t + 0.06);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(this.random(0.004, 0.009), t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.audio.masterGain || ctx.destination);
      osc.start(t);
      osc.stop(t + 0.085);
    }
  }

  playWaterTrickle(ctx) {
    const len = Math.floor(ctx.sampleRate * this.random(0.08, 0.17));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      const env = Math.pow(1 - i / len, 2.4);
      ch[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = this.random(1500, 3000);
    bp.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.value = this.random(0.004, 0.01);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.audio.masterGain || ctx.destination);
    src.start();
  }

  playImpactSound(impact) {
    if (!this.audio.enabled || !this.audio.ctx) return;
    const ctx = this.audio.ctx;

    const kind = Math.random();
    if (kind < 0.3) {
      this.playGlass(ctx, impact);
    } else if (kind < 0.6) {
      this.playBranch(ctx, impact);
    } else if (kind < 0.86) {
      this.playWavePing(ctx, impact);
    } else {
      this.playProcessorPulse(ctx, 0.9 + Math.min(0.8, impact));
    }
  }

  playGlass(ctx, impact) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200 + Math.random() * 2500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.028 + impact * 0.02, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(this.audio.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.23);
  }

  playBranch(ctx, impact) {
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.02 + impact * 0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.audio.masterGain || ctx.destination);
    src.start();
  }

  playWavePing(ctx, impact) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 230;
    osc.type = "sine";
    osc.frequency.setValueAtTime(180 + Math.random() * 120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(95, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.016 + impact * 0.02, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audio.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  playToggleChime(directToOutput = false) {
    if (!this.audio.ctx) return;
    const ctx = this.audio.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(610, ctx.currentTime + 0.21);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.26);
    osc.connect(gain);
    gain.connect(directToOutput ? ctx.destination : (this.audio.masterGain || ctx.destination));
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  }

  playSoundConfirm() {
    if (!this.audio.ctx) return;
    const ctx = this.audio.ctx;
    const now = ctx.currentTime + 0.03;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  random(min, max) {
    return Math.random() * (max - min) + min;
  }
}

const floatingCanvas = document.getElementById("floating-atlas");
function ensureSoundButton() {
  let btn = document.getElementById("sound-toggle");
  if (btn) return btn;

  const header = document.querySelector(".site-header");
  if (!header) return null;

  let actions = header.querySelector(".header-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "header-actions";
    header.appendChild(actions);
  }

  btn = document.createElement("button");
  btn.id = "sound-toggle";
  btn.className = "menu-toggle";
  btn.type = "button";
  btn.setAttribute("aria-pressed", "false");
  btn.textContent = "sound: off";
  actions.prepend(btn);
  return btn;
}

let runtimeCanvas = floatingCanvas;
if (!runtimeCanvas) {
  runtimeCanvas = document.createElement("canvas");
  runtimeCanvas.id = "floating-atlas";
  runtimeCanvas.dataset.audioOnly = "true";
  runtimeCanvas.setAttribute("aria-hidden", "true");
  runtimeCanvas.style.display = "none";
  document.body.prepend(runtimeCanvas);
}

const runtimeSoundButton = ensureSoundButton();
if (runtimeCanvas && runtimeSoundButton) {
  const floatingAtlas = new FloatingAtlas(runtimeCanvas, runtimeSoundButton);
  floatingAtlas.init();
}

async function initHomeAutoCovers() {
  const cards = Array.from(document.querySelectorAll(".project-card[href*='projects/']"));
  if (!cards.length) return;

  await Promise.all(
    cards.map(async (card) => {
      const href = card.getAttribute("href");
      if (!href) return;

      try {
        const projectUrl = new URL(href, window.location.href);
        const response = await fetch(projectUrl.href, { cache: "no-store" });
        if (!response.ok) return;

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const firstImage = doc.querySelector(".project-gallery img[src], .project-main img[src]");
        if (!firstImage) return;

        const src = firstImage.getAttribute("src");
        if (!src) return;

        const resolved = new URL(src, projectUrl.href).href;
        const thumb = card.querySelector(".thumb");
        if (!thumb) return;

        let img = thumb.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          img.loading = "lazy";
          thumb.innerHTML = "";
          thumb.appendChild(img);
        }

        const title = card.querySelector("h3")?.textContent?.trim() || "Project";
        img.src = resolved;
        img.alt = `${title} preview`;
        img.style.position = "absolute";
        img.style.inset = "0";
        img.style.display = "block";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.maxWidth = "none";
        img.style.maxHeight = "none";
        img.style.objectFit = "cover";
        img.style.objectPosition = "50% 50%";
      } catch (e) {
        // Ignore unavailable local fetches and keep current cover/placeholder.
      }
    }),
  );
}

initHomeAutoCovers();

function initProjectEditorialLayout() {
  const projectMain = document.querySelector(".project-main");
  if (!projectMain || projectMain.dataset.editorialReady === "true") return;

  const firstSection = projectMain.querySelector("section");
  const galleryRoot = projectMain.querySelector(".project-gallery");
  if (!firstSection || !galleryRoot) return;

  const gallerySection = galleryRoot.closest("section");
  const imageNodes = Array.from(galleryRoot.querySelectorAll("img[src]"));
  const imageSources = imageNodes
    .map((img) => ({
      src: img.getAttribute("src"),
      alt: img.getAttribute("alt") || "project image",
    }))
    .filter((entry) => Boolean(entry.src));

  if (!imageSources.length) return;

  const textChunks = [];
  const removableSections = [];
  const sections = Array.from(projectMain.querySelectorAll("section"));

  sections.forEach((section, index) => {
    if (index === 0) return;
    if (section === gallerySection) {
      removableSections.push(section);
      return;
    }
    removableSections.push(section);
    section.querySelectorAll("p").forEach((p) => {
      const html = p.innerHTML.trim();
      if (html) textChunks.push(html);
    });
  });

  const kicker = projectMain.querySelector(".kicker")?.textContent?.trim();
  const meta = projectMain.querySelector(".project-meta")?.textContent?.trim();

  const editorial = document.createElement("section");
  editorial.className = "project-editorial";

  const swipeSection = document.createElement("section");
  swipeSection.className = "project-swipe";

  const heroSource = imageSources[0];
  let floatingSources = imageSources.slice(1);
  if (!floatingSources.length && heroSource) {
    floatingSources = [heroSource];
  }

  const hero = document.createElement("figure");
  hero.className = "project-near-hero";
  if (heroSource) {
    const heroImage = document.createElement("img");
    heroImage.loading = "eager";
    heroImage.decoding = "async";
    heroImage.src = heroSource.src;
    heroImage.alt = heroSource.alt || "project image";
    hero.appendChild(heroImage);
  }

  const floatingLayer = document.createElement("div");
  floatingLayer.className = "project-floating-layer";
  floatingLayer.setAttribute("aria-hidden", "true");

  const textCore = document.createElement("article");
  textCore.className = "project-text-core prose";

  if (kicker) {
    const kickerLine = document.createElement("p");
    kickerLine.className = "project-text-kicker";
    kickerLine.textContent = kicker;
    textCore.appendChild(kickerLine);
  }

  if (meta) {
    const metaLine = document.createElement("p");
    metaLine.className = "project-text-meta";
    metaLine.textContent = meta;
    textCore.appendChild(metaLine);
  }

  if (textChunks.length) {
    textChunks.forEach((html, index) => {
      const p = document.createElement("p");
      p.innerHTML = html;
      textCore.appendChild(p);
    });
  }

  if (!textChunks.length && !meta) {
    const fallback = document.createElement("p");
    fallback.textContent = "project text is being prepared.";
    textCore.appendChild(fallback);
  }

  editorial.appendChild(hero);
  editorial.appendChild(floatingLayer);
  editorial.appendChild(textCore);

  const swipeHead = document.createElement("div");
  swipeHead.className = "project-swipe-head";

  const swipeTitle = document.createElement("p");
  swipeTitle.className = "project-swipe-title";
  swipeTitle.textContent = "gallery / swipe";
  swipeHead.appendChild(swipeTitle);

  const swipeControls = document.createElement("div");
  swipeControls.className = "project-swipe-controls";

  const prevButton = document.createElement("button");
  prevButton.className = "project-swipe-btn";
  prevButton.type = "button";
  prevButton.textContent = "prev";
  swipeControls.appendChild(prevButton);

  const counter = document.createElement("span");
  counter.className = "project-swipe-counter";
  counter.textContent = `1 / ${imageSources.length}`;
  swipeControls.appendChild(counter);

  const nextButton = document.createElement("button");
  nextButton.className = "project-swipe-btn";
  nextButton.type = "button";
  nextButton.textContent = "next";
  swipeControls.appendChild(nextButton);

  swipeHead.appendChild(swipeControls);
  swipeSection.appendChild(swipeHead);

  const swipeTrack = document.createElement("div");
  swipeTrack.className = "project-swipe-track";
  imageSources.forEach((entry, idx) => {
    const slide = document.createElement("figure");
    slide.className = "project-swipe-slide";
    slide.setAttribute("data-slide", String(idx + 1));

    const img = document.createElement("img");
    img.loading = idx === 0 ? "eager" : "lazy";
    img.decoding = "async";
    img.src = entry.src;
    img.alt = entry.alt || `project image ${idx + 1}`;
    slide.appendChild(img);

    swipeTrack.appendChild(slide);
  });
  swipeSection.appendChild(swipeTrack);

  removableSections.forEach((section) => {
    section.remove();
  });

  firstSection.insertAdjacentElement("afterend", editorial);
  editorial.insertAdjacentElement("afterend", swipeSection);
  projectMain.dataset.editorialReady = "true";

  function updateSwipeCounter() {
    const viewport = swipeTrack.clientWidth || 1;
    const slide = Math.round(swipeTrack.scrollLeft / viewport) + 1;
    const current = Math.max(1, Math.min(imageSources.length, slide));
    counter.textContent = `${current} / ${imageSources.length}`;
  }

  function moveSlides(direction) {
    const step = Math.max(240, swipeTrack.clientWidth * 0.92);
    swipeTrack.scrollBy({
      left: step * direction,
      behavior: "smooth",
    });
  }

  prevButton.addEventListener("click", () => moveSlides(-1));
  nextButton.addEventListener("click", () => moveSlides(1));
  swipeTrack.addEventListener("scroll", () => {
    window.requestAnimationFrame(updateSwipeCounter);
  });
  updateSwipeCounter();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function intersectsRect(node, rect, pad = 0) {
    if (!rect) return false;
    return !(
      node.x + node.w < rect.x - pad ||
      node.x > rect.x + rect.w + pad ||
      node.y + node.h < rect.y - pad ||
      node.y > rect.y + rect.h + pad
    );
  }

  function localRect(el, sceneRect) {
    if (!el || !sceneRect) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left - sceneRect.left,
      y: r.top - sceneRect.top,
      w: r.width,
      h: r.height,
    };
  }

  function buildNodes() {
    const nodes = [];
    const sceneRect = editorial.getBoundingClientRect();
    const textRectRaw = textCore.getBoundingClientRect();
    const heroRectRaw = localRect(hero, sceneRect);
    const textRect = {
      x: textRectRaw.left - sceneRect.left,
      y: textRectRaw.top - sceneRect.top,
      w: textRectRaw.width,
      h: textRectRaw.height,
    };
    const heroRect = heroRectRaw
      ? {
          x: heroRectRaw.x,
          y: heroRectRaw.y,
          w: heroRectRaw.w,
          h: heroRectRaw.h,
        }
      : null;

    floatingSources.forEach((entry, index) => {
      const img = document.createElement("img");
      img.className = "project-float-image";
      if (index === 0) img.classList.add("is-featured");
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.src = entry.src;

      const isMobile = window.innerWidth < 1000;
      const w = index === 0 ? rand(isMobile ? 260 : 420, isMobile ? 430 : 820) : rand(isMobile ? 200 : 300, isMobile ? 420 : 640);
      const h = w * rand(0.58, 1.08);
      const isLarge = index === 0 || w >= (isMobile ? 290 : 430);
      img.classList.add(isLarge ? "is-large" : "is-small");

      const tx = textRect.x + textRect.w / 2;
      const ty = textRect.y + textRect.h / 2;
      let angle = rand(0, Math.PI * 2);
      let radius = Math.max(textRect.w, textRect.h) * (isLarge ? 0.45 : 0.38) + rand(50, isMobile ? 160 : 280);
      let x = tx + Math.cos(angle) * radius - w / 2;
      let y = ty + Math.sin(angle) * radius - h / 2;
      let placed = false;

      for (let i = 0; i < 90; i += 1) {
        x = Math.max(0, Math.min(sceneRect.width - w, x));
        y = Math.max(0, Math.min(sceneRect.height - h, y));
        const overlapsHero = intersectsRect({ x, y, w, h }, heroRect, 56);
        const overlapsText = intersectsRect({ x, y, w, h }, textRect, 16);
        if (!overlapsHero && !overlapsText) {
          placed = true;
          break;
        }
        angle += rand(0.35, 0.95);
        radius += rand(6, 24);
        x = tx + Math.cos(angle) * radius - w / 2;
        y = ty + Math.sin(angle) * radius - h / 2;
      }

      if (!placed && heroRect) {
        const safeTop = Math.max(0, heroRect.y - h - 72);
        const safeBottom = Math.min(sceneRect.height - h, heroRect.y + heroRect.h + 72);
        y = Math.random() < 0.5 ? safeTop : safeBottom;
        x = rand(0, Math.max(1, sceneRect.width - w));
      }

      img.style.width = `${w}px`;
      img.style.height = `${h}px`;
      img.style.setProperty("--float-opacity", isLarge ? `${rand(0.48, 0.66).toFixed(2)}` : `${rand(0.9, 0.98).toFixed(2)}`);
      img.style.setProperty("--float-z", isLarge ? "1" : "2");
      floatingLayer.appendChild(img);

      nodes.push({
        el: img,
        x,
        y,
        w,
        h,
        r: Math.min(w, h) * (isLarge ? 0.26 : 0.2),
        vx: rand(isLarge ? -0.11 : -0.22, isLarge ? 0.11 : 0.22),
        vy: rand(isLarge ? -0.11 : -0.22, isLarge ? 0.11 : 0.22),
        rot: rand(-2.2, 2.2),
        spin: rand(-0.017, 0.017),
        phase: rand(0, Math.PI * 2),
        isLarge,
        layerWeight: isLarge ? 0.72 : 1.28,
        driftAmp: rand(isLarge ? 2.6 : 6.8, isLarge ? 6.2 : 14.2),
        wanderAmp: rand(isLarge ? 0.0011 : 0.0025, isLarge ? 0.0022 : 0.0042),
        orbitOffset: rand(-140, 180),
      });
    });

    return { nodes, sceneRect, textRect, heroRect };
  }

  const motion = buildNodes();
  let nodes = motion.nodes;
  let sceneW = motion.sceneRect.width;
  let sceneH = motion.sceneRect.height;
  let textRect = motion.textRect;
  let heroRect = motion.heroRect;
  let lastTime = 0;

  function refreshRects() {
    const sceneRect = editorial.getBoundingClientRect();
    const textRectRaw = textCore.getBoundingClientRect();
    const heroRectRaw = localRect(hero, sceneRect);
    sceneW = sceneRect.width;
    sceneH = sceneRect.height;
    textRect = {
      x: textRectRaw.left - sceneRect.left,
      y: textRectRaw.top - sceneRect.top,
      w: textRectRaw.width,
      h: textRectRaw.height,
    };
    heroRect = heroRectRaw
      ? {
          x: heroRectRaw.x,
          y: heroRectRaw.y,
          w: heroRectRaw.w,
          h: heroRectRaw.h,
        }
      : null;
  }

  function clamp(node) {
    if (node.x < 0) {
      node.x = 0;
      node.vx *= -0.92;
    }
    if (node.x + node.w > sceneW) {
      node.x = sceneW - node.w;
      node.vx *= -0.92;
    }
    if (node.y < 0) {
      node.y = 0;
      node.vy *= -0.92;
    }
    if (node.y + node.h > sceneH) {
      node.y = sceneH - node.h;
      node.vy *= -0.92;
    }
  }

  function steerAroundText(node, time, dt) {
    const nx = node.x + node.w / 2;
    const ny = node.y + node.h / 2;
    const tx = textRect.x + textRect.w / 2;
    const ty = textRect.y + textRect.h / 2;
    const dx = nx - tx;
    const dy = ny - ty;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const desiredRadius =
      Math.max(textRect.w, textRect.h) * (node.isLarge ? 0.52 : 0.43) +
      node.orbitOffset +
      Math.sin(time * 0.00011 + node.phase) * 36;
    const radialDelta = dist - desiredRadius;
    const radialForce = -radialDelta * 0.000045 * node.layerWeight;
    const tangentialForce = 0.0013 * node.layerWeight;

    node.vx += ((dx / dist) * radialForce + (-dy / dist) * tangentialForce) * dt;
    node.vy += ((dy / dist) * radialForce + (dx / dist) * tangentialForce) * dt;
  }

  function pushFromRect(node, rect, pad, force) {
    if (!intersectsRect(node, rect, pad)) return;
    const nx = node.x + node.w / 2;
    const ny = node.y + node.h / 2;
    const tx = rect.x + rect.w / 2;
    const ty = rect.y + rect.h / 2;
    const dx = nx - tx;
    const dy = ny - ty;
    const ox = rect.w / 2 + node.w / 2 + pad - Math.abs(dx);
    const oy = rect.h / 2 + node.h / 2 + pad - Math.abs(dy);

    if (ox < oy) {
      const dir = dx < 0 ? -1 : 1;
      node.x += dir * ox;
      node.vx += dir * force;
    } else {
      const dir = dy < 0 ? -1 : 1;
      node.y += dir * oy;
      node.vy += dir * force;
    }
  }

  function collide(a, b) {
    const acx = a.x + a.w / 2;
    const acy = a.y + a.h / 2;
    const bcx = b.x + b.w / 2;
    const bcy = b.y + b.h / 2;
    const dx = bcx - acx;
    const dy = bcy - acy;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = a.r + b.r;
    if (dist >= minDist) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn > 0) return;

    const impulse = -1.85 * vn;
    a.vx -= impulse * nx * 0.04;
    a.vy -= impulse * ny * 0.04;
    b.vx += impulse * nx * 0.04;
    b.vy += impulse * ny * 0.04;
  }

  function render(node, time) {
    const driftX = Math.sin(time * 0.00023 + node.phase) * node.driftAmp;
    const driftY = Math.cos(time * 0.00019 + node.phase) * node.driftAmp;
    const rot = node.rot + Math.sin(time * 0.00018 + node.phase) * 2.2;
    node.el.style.transform = `translate3d(${node.x + driftX}px, ${node.y + driftY}px, 0) rotate(${rot.toFixed(2)}deg)`;
  }

  function drawStatic() {
    nodes.forEach((node) => {
      node.el.style.transform = `translate3d(${node.x}px, ${node.y}px, 0)`;
    });
  }

  function tick(time) {
    const dt = Math.min((time - lastTime) / 16.67 || 1, 2);
    lastTime = time;
    refreshRects();

    nodes.forEach((node) => {
      node.vx += Math.sin(time * 0.00028 + node.phase) * node.wanderAmp * dt;
      node.vy += Math.cos(time * 0.00025 + node.phase) * node.wanderAmp * dt;
      steerAroundText(node, time, dt);
      pushFromRect(node, heroRect, 32 + node.driftAmp, node.isLarge ? 0.06 : 0.1);

      node.x += node.vx * dt * node.layerWeight;
      node.y += node.vy * dt * node.layerWeight;
      node.rot += node.spin * dt;
      node.vx *= node.isLarge ? 0.996 : 0.993;
      node.vy *= node.isLarge ? 0.996 : 0.993;
      clamp(node);
    });

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        collide(nodes[i], nodes[j]);
      }
    }

    nodes.forEach((node) => render(node, time));
    requestAnimationFrame(tick);
  }

  function rebuild() {
    while (floatingLayer.firstChild) {
      floatingLayer.firstChild.remove();
    }
    const rebuilt = buildNodes();
    nodes = rebuilt.nodes;
    sceneW = rebuilt.sceneRect.width;
    sceneH = rebuilt.sceneRect.height;
    textRect = rebuilt.textRect;
    heroRect = rebuilt.heroRect;
    if (reduceMotion) {
      drawStatic();
    }
  }

  window.addEventListener("resize", rebuild);

  if (reduceMotion) {
    drawStatic();
    return;
  }

  requestAnimationFrame((time) => {
    lastTime = time;
    requestAnimationFrame(tick);
  });
}

initProjectEditorialLayout();

// news and thoughts page (local archive)
const newsForm = document.getElementById("news-form");
const newsList = document.getElementById("news-list");

function getNewsPosts() {
  try {
    const raw = localStorage.getItem("news_thoughts_posts_v1");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveNewsPosts(posts) {
  localStorage.setItem("news_thoughts_posts_v1", JSON.stringify(posts));
}

function groupByDate(posts) {
  const grouped = {};
  posts.forEach((p) => {
    const day = new Date(p.createdAt).toISOString().slice(0, 10);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(p);
  });
  return grouped;
}

function renderNews() {
  if (!newsList) return;
  const posts = getNewsPosts().sort((a, b) => b.createdAt - a.createdAt);
  const grouped = groupByDate(posts);
  const days = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  if (!days.length) {
    newsList.innerHTML = "<p class=\"tagline\">no posts yet. publish your first note.</p>";
    return;
  }

  newsList.innerHTML = days
    .map((day) => {
      const dayPosts = grouped[day]
        .map((p) => {
          const t = new Date(p.createdAt);
          const hh = String(t.getHours()).padStart(2, "0");
          const mm = String(t.getMinutes()).padStart(2, "0");
          return `
            <article class="news-post">
              <h4>${p.title}</h4>
              <time>${day} ${hh}:${mm}</time>
              <p>${p.body.replace(/\n/g, "<br />")}</p>
            </article>
          `;
        })
        .join("");
      return `<section class="news-day"><h3 class="project-meta">${day}</h3>${dayPosts}</section>`;
    })
    .join("");
}

if (newsForm) {
  newsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = newsForm.querySelector("#post-title")?.value?.trim();
    const body = newsForm.querySelector("#post-body")?.value?.trim();
    if (!title || !body) {
      return;
    }

    const posts = getNewsPosts();
    posts.push({
      id: `${Date.now()}-${Math.random()}`,
      title,
      body,
      createdAt: Date.now(),
    });

    saveNewsPosts(posts);
    newsForm.reset();
    renderNews();
  });

  const clearBtn = document.getElementById("clear-news");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem("news_thoughts_posts_v1");
      renderNews();
    });
  }

  renderNews();
}
