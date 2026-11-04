/**
 * Engine arcade estilo Mario — Dê o Start na sua Carreira (Unifeso)
 */
(function (global) {
  const TILE = 40;
  const GRAVITY = 0.55;
  const JUMP = -11.2;
  const MOVE = 4.2;
  const FRICTION = 0.82;

  // Mapa ~280 tiles (~1 min de percurso com combate/plataformas)
  // # chão, ? mistério, ^ espinho, E inimigo, B boss, F bandeira, P/H/A marcadores
  function buildLevel(themeId) {
    const W = 280;
    const H = 15;
    const g = H - 2;
    const rows = Array.from({ length: H }, () => Array(W).fill("."));

    function put(r, c, ch) {
      if (r >= 0 && r < H && c >= 0 && c < W) rows[r][c] = ch;
    }
    function fillGround(c0, c1) {
      for (let c = c0; c < c1; c++) {
        put(g, c, "#");
        put(g + 1, c, "#");
      }
    }
    function plat(r, c, len) {
      for (let i = 0; i < len; i++) put(r, c + i, "#");
    }

    fillGround(0, W);

    // Fossos ao longo da fase (exceto arena do boss)
    const pits = [
      [48, 51],
      [92, 95],
      [138, 142],
      [185, 188],
      [220, 223],
    ];
    pits.forEach(([a, b]) => {
      for (let c = a; c < b; c++) {
        put(g, c, ".");
        put(g + 1, c, ".");
      }
    });

    // Plataformas elevadas
    const plats = [
      [g - 3, 12, 4],
      [g - 5, 28, 4],
      [g - 3, 40, 3],
      [g - 4, 58, 5],
      [g - 6, 72, 3],
      [g - 3, 85, 4],
      [g - 5, 105, 4],
      [g - 3, 118, 5],
      [g - 6, 132, 3],
      [g - 4, 150, 4],
      [g - 3, 165, 5],
      [g - 5, 178, 3],
      [g - 4, 198, 5],
      [g - 6, 210, 3],
      [g - 3, 230, 4],
    ];
    plats.forEach(([r, c, len]) => plat(r, c, len));

    // Blocos mistério
    [18, 35, 64, 88, 112, 145, 170, 195, 215, 238].forEach((c, i) => {
      put(g - (i % 2 === 0 ? 5 : 7), c, "?");
    });

    // Espinhos
    [22, 67, 110, 160, 205, 235].forEach((c) => put(g - 1, c, "^"));

    // Inimigos espalhados (~1 min de combate)
    const enemyCols = [
      20, 34, 45, 56, 70, 82, 98, 108, 125, 135, 148, 158, 172, 182, 196, 208, 218, 232, 242,
    ];
    enemyCols.forEach((c) => put(g - 1, c, "E"));
    // Alguns no ar / plataforma
    put(g - 4, 30, "E");
    put(g - 6, 74, "E");
    put(g - 4, 120, "E");
    put(g - 4, 168, "E");
    put(g - 4, 200, "E");

    // Variações por tema (marcadores / densidade)
    if (themeId === "saude") {
      put(g - 6, 55, "H");
      put(g - 6, 155, "H");
    }
    if (themeId === "humanas") {
      put(g - 5, 60, "A");
      put(g - 5, 160, "A");
    }
    if (themeId === "ead") {
      put(g - 6, 50, "P");
      put(g - 6, 100, "P");
      put(g - 6, 175, "P");
    }
    if (themeId === "tech") {
      put(g - 1, 76, "E");
      put(g - 1, 190, "E");
      plat(g - 5, 95, 3);
      plat(g - 5, 188, 3);
    }

    // Arena do boss (últimos ~28 tiles limpos + boss + bandeira)
    const arenaStart = W - 28;
    for (let c = arenaStart; c < W; c++) {
      put(g, c, "#");
      put(g + 1, c, "#");
      for (let r = 0; r < g; r++) {
        if (rows[r][c] === "E" || rows[r][c] === "^" || rows[r][c] === "?") {
          put(r, c, ".");
        }
      }
    }
    plat(g - 4, arenaStart + 4, 3);
    plat(g - 4, arenaStart + 18, 3);
    put(g - 1, arenaStart + 12, "B");
    put(g - 1, W - 6, "F");

    return rows.map((r) => r.join(""));
  }

  function Game(canvas, playerData, theme) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.playerData = playerData;
    this.theme = theme;
    this.heroId = playerData.hero === "girl" ? "girl" : "boy";
    this.skin =
      playerData.pele === "pardo" || playerData.pele === "negro"
        ? playerData.pele
        : "branco";
    this.keys = Object.create(null);
    this.paused = false;
    this.ended = false;
    this.won = false;
    this.score = 0;
    this.lives = 3;
    this.items = 0;
    this.eventTimer = 0;
    this.eventText = "";
    this.cameraX = 0;
    this.frame = 0;
    this.invuln = 0;
    this.godMode = false;
    this.attackCooldown = 0;
    this.particles = [];
    this.projectiles = [];
    this.bgImg = null;
    this.enemySprites = Object.create(null);
    this.itemVitamina = null;
    this.onHud = null;
    this.onEnd = null;
    this._raf = null;
    this._boundLoop = this.loop.bind(this);
    this.loadThemeBackground();
    this.loadEnemySprites();
    this.loadItemVitamina();
    this.loadHazardSprite();
    this.resetLevel();
  }

  Game.prototype.loadThemeBackground = function () {
    const src = this.theme && this.theme.bgImage;
    this.bgImg = null;
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      this.bgImg = img;
    };
    img.src = src + (src.indexOf("?") >= 0 ? "&" : "?") + "v=2";
  };

  Game.prototype.loadEnemySprites = function () {
    this.enemySprites = Object.create(null);
    const list = ((this.theme && this.theme.enemies) || []).slice();
    if (this.theme && this.theme.boss) list.push(this.theme.boss);
    list.forEach((en) => {
      if (!en.sprite) return;
      const img = new Image();
      img.onload = () => {
        this.enemySprites[en.name] = img;
      };
      img.src = en.sprite + (en.sprite.indexOf("?") >= 0 ? "&" : "?") + "v=1";
    });
  };

  Game.prototype.loadItemVitamina = function () {
    const img = new Image();
    img.onload = () => {
      this.itemVitamina = img;
    };
    img.src = "assets/items/vitamina.png?v=1";
  };

  Game.prototype.loadHazardSprite = function () {
    const img = new Image();
    img.onload = () => {
      this.hazardSprite = img;
    };
    img.src = "assets/obstacles/espinhos.png?v=1";
  };

  /**
   * Fundo contínuo dentro do canvas do jogo:
   * - cobre 100% da tela (cover)
   * - tile horizontal sem buracos
   * - leve transparência sem perder nitidez da arte
   */
  Game.prototype.drawContinuousBackground = function (ctx, W, H, cam) {
    const img = this.bgImg;
    const t = this.theme;

    // Base sólida (mantém contraste se a arte estiver translúcida)
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, t.skyTop || "#87CEEB");
    g.addColorStop(1, t.skyBottom || "#5BA3D9");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (!img || !img.complete || !img.naturalWidth) return;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(W / iw, H / ih) * 1.02;
    const drawW = Math.ceil(iw * scale);
    const drawH = Math.ceil(ih * scale);
    const y = Math.floor((H - drawH) / 2);

    const parallax = t.bgParallax != null ? t.bgParallax : 0.85;
    const alpha = t.bgAlpha != null ? t.bgAlpha : 0.82;
    const scroll = cam * parallax;
    let startX = -(((scroll % drawW) + drawW) % drawW);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    for (let x = startX - 1; x < W + drawW; x += drawW - 1) {
      ctx.drawImage(img, 0, 0, iw, ih, Math.floor(x), y, drawW, drawH);
    }
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.restore();
  };

  Game.prototype.resetLevel = function () {
    this.map = buildLevel(this.theme.id);
    this.mapH = this.map.length;
    this.mapW = this.map[0].length;
    this.worldW = this.mapW * TILE;
    this.worldH = this.mapH * TILE;
    this.platforms = [];
    this.enemies = [];
    this.collectibles = [];
    this.hazards = [];
    this.flag = null;
    this.boss = null;
    this.bossDefeated = false;
    this._bossAnnounced = false;
    this.markers = [];
    this.projectiles = [];
    this.parseMap();
    this.player = {
      x: 80,
      y: 160,
      w: 40,
      h: 52,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      attacking: 0,
      anim: 0,
      shootFrame: 0,
      state: "idle",
      jumpsLeft: 2,
    };
    this._jumpHeld = false;
    this.cameraX = 0;
    this.ended = false;
    this.won = false;
    this.invuln = 0;
    this.eventTimer = 180;
    this.eventText = this.theme.story;
    this.emitHud();
  };

  Game.prototype.parseMap = function () {
    const enemyPool = this.theme.enemies;
    const itemPool = this.theme.collectibles;
    let enemyIdx = 0;
    let itemIdx = 0;

    for (let r = 0; r < this.mapH; r++) {
      for (let c = 0; c < this.mapW; c++) {
        const ch = this.map[r][c];
        const x = c * TILE;
        const y = r * TILE;
        if (ch === "#" || ch === "=") {
          this.platforms.push({ x, y, w: TILE, h: TILE, solid: true, type: "ground" });
        } else if (ch === ".") {
          // empty
        } else if (ch === "?") {
          this.platforms.push({ x, y, w: TILE, h: TILE, solid: true, type: "mystery", hit: false });
        } else if (ch === "^") {
          // Faixa de espinhos de fogo (sprite larga)
          const hw = 88;
          const hh = 36;
          this.hazards.push({
            x: x + (TILE - hw) / 2,
            y: y + TILE - hh,
            w: hw,
            h: hh,
          });
        } else if (ch === "E") {
          const proto = enemyPool[enemyIdx % enemyPool.length];
          enemyIdx++;
          this.enemies.push({
            ...proto,
            x: x + 4,
            y: y + (TILE - proto.h),
            vx: proto.speed * (Math.random() > 0.5 ? 1 : -1),
            alive: true,
            flash: 0,
            isBoss: false,
          });
        } else if (ch === "B") {
          const proto = this.theme.boss || enemyPool[enemyPool.length - 1];
          const bw = proto.w || 100;
          const bh = proto.h || 100;
          const boss = {
            ...proto,
            w: bw,
            h: bh,
            maxHp: proto.hp || 14,
            hp: proto.hp || 14,
            x: x + 4,
            y: y + (TILE - bh),
            vx: (proto.speed || 1.2) * (Math.random() > 0.5 ? 1 : -1),
            alive: true,
            flash: 0,
            isBoss: true,
            shootCd: 40,
            shootInterval: proto.shootInterval || 70,
            points: proto.points || 1500,
          };
          this.enemies.push(boss);
          this.boss = boss;
        } else if (ch === "F") {
          this.flag = { x, y: y - TILE * 2, w: 20, h: TILE * 3, locked: true };
        } else if (ch === "P" || ch === "H" || ch === "A") {
          this.markers.push({ x, y, kind: ch });
          const item = itemPool[itemIdx % itemPool.length];
          itemIdx++;
          this.collectibles.push({
            ...item,
            x: x + 8,
            y: y + 8,
            w: 24,
            h: 24,
            taken: false,
            bob: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    // Diplomas flutuantes ao longo da fase longa
    for (let i = 0; i < 28; i++) {
      const item = itemPool[i % itemPool.length];
      const cx = 180 + i * 340 + (i % 3) * 40;
      const cy = 160 + (i % 4) * 55;
      if (cx < this.worldW - 1200 && !this.overlapsSolid(cx, cy, 24, 24)) {
        this.collectibles.push({
          ...item,
          x: cx,
          y: cy,
          w: 24,
          h: 24,
          taken: false,
          bob: i,
        });
      }
    }
  };

  Game.prototype.overlapsSolid = function (x, y, w, h) {
    return this.platforms.some(
      (p) => x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y
    );
  };

  Game.prototype.setKey = function (key, down) {
    const k = key.length === 1 ? key.toLowerCase() : key;
    this.keys[k] = down;
    if (k === "ArrowLeft" || k === "a") this.keys.left = down;
    if (k === "ArrowRight" || k === "d") this.keys.right = down;
    if (k === "ArrowUp" || k === "w" || k === " " || k === "Space") this.keys.jump = down;
    if (k === "z" || k === "Z" || k === "x" || k === "Control") this.keys.attack = down;
  };

  function wantsTouchPads() {
    try {
      if (window.matchMedia("(pointer: coarse)").matches) return true;
    } catch (_) {}
    return "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0;
  }

  Game.prototype.touchLayout = function () {
    const W = this.canvas.width;
    const H = this.canvas.height;
    return {
      stick: { x: 118, y: H - 92, r: 62 },
      jump: { x: W - 82, y: H - 82, r: 46 },
      attack: { x: W - 178, y: H - 108, r: 38 },
    };
  };

  Game.prototype.canvasPointerPos = function (e) {
    const rect = this.canvas.getBoundingClientRect();
    const rw = rect.width || 1;
    const rh = rect.height || 1;
    return {
      x: ((e.clientX - rect.left) / rw) * this.canvas.width,
      y: ((e.clientY - rect.top) / rh) * this.canvas.height,
    };
  };

  Game.prototype.hitTouchRole = function (x, y) {
    const L = this.touchLayout();
    const dJump = Math.hypot(x - L.jump.x, y - L.jump.y);
    if (dJump <= L.jump.r + 8) return "jump";
    const dAtk = Math.hypot(x - L.attack.x, y - L.attack.y);
    if (dAtk <= L.attack.r + 8) return "attack";
    // Zona esquerda = analógico (andar)
    if (x < this.canvas.width * 0.46 && y > this.canvas.height * 0.35) return "move";
    return null;
  };

  Game.prototype.syncTouchKeys = function () {
    if (!this.touchPads) return;
    let left = false;
    let right = false;
    let jump = false;
    let attack = false;
    this._ptrs.forEach((p) => {
      if (p.role === "move") {
        if (p.dx < -12) left = true;
        if (p.dx > 12) right = true;
      } else if (p.role === "jump") jump = true;
      else if (p.role === "attack") attack = true;
    });
    this.keys.left = left;
    this.keys.right = right;
    this.keys.jump = jump;
    this.keys.attack = attack;
  };

  Game.prototype.bindTouchControls = function () {
    this.unbindTouchControls();
    this.touchPads = wantsTouchPads();
    this._ptrs = new Map();
    if (!this.touchPads) return;

    const canvas = this.canvas;
    const self = this;

    this._onPtrDown = function (e) {
      if (self.paused || self.ended) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const pos = self.canvasPointerPos(e);
      const role = self.hitTouchRole(pos.x, pos.y);
      if (!role) return;
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
      const L = self.touchLayout();
      const entry = { role: role, dx: 0, dy: 0 };
      if (role === "move") {
        entry.dx = pos.x - L.stick.x;
        entry.dy = pos.y - L.stick.y;
      }
      self._ptrs.set(e.pointerId, entry);
      self.syncTouchKeys();
    };

    this._onPtrMove = function (e) {
      const p = self._ptrs.get(e.pointerId);
      if (!p || p.role !== "move") return;
      e.preventDefault();
      const pos = self.canvasPointerPos(e);
      const L = self.touchLayout();
      p.dx = pos.x - L.stick.x;
      p.dy = pos.y - L.stick.y;
      self.syncTouchKeys();
    };

    this._onPtrUp = function (e) {
      if (!self._ptrs.has(e.pointerId)) return;
      e.preventDefault();
      self._ptrs.delete(e.pointerId);
      self.syncTouchKeys();
    };

    canvas.addEventListener("pointerdown", this._onPtrDown, { passive: false });
    canvas.addEventListener("pointermove", this._onPtrMove, { passive: false });
    canvas.addEventListener("pointerup", this._onPtrUp, { passive: false });
    canvas.addEventListener("pointercancel", this._onPtrUp, { passive: false });
    canvas.style.touchAction = "none";
  };

  Game.prototype.unbindTouchControls = function () {
    const canvas = this.canvas;
    if (this._onPtrDown) {
      canvas.removeEventListener("pointerdown", this._onPtrDown);
      canvas.removeEventListener("pointermove", this._onPtrMove);
      canvas.removeEventListener("pointerup", this._onPtrUp);
      canvas.removeEventListener("pointercancel", this._onPtrUp);
    }
    this._onPtrDown = this._onPtrMove = this._onPtrUp = null;
    if (this._ptrs) this._ptrs.clear();
    this.keys.left = this.keys.right = this.keys.jump = this.keys.attack = false;
  };

  Game.prototype.drawTouchPads = function (ctx) {
    if (!this.touchPads || this.ended) return;
    const L = this.touchLayout();
    let moveActive = false;
    let jumpActive = false;
    let attackActive = false;
    let knobDx = 0;
    let knobDy = 0;
    this._ptrs.forEach((p) => {
      if (p.role === "move") {
        moveActive = true;
        const max = L.stick.r * 0.55;
        const len = Math.hypot(p.dx, p.dy) || 1;
        const scale = Math.min(1, max / len);
        knobDx = p.dx * scale;
        knobDy = p.dy * scale;
      }
      if (p.role === "jump") jumpActive = true;
      if (p.role === "attack") attackActive = true;
    });

    function ring(x, y, r, fill, stroke, active) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = active ? fill : "rgba(255,255,255,.14)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = active ? stroke : "rgba(255,255,255,.45)";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Analógico
    ring(L.stick.x, L.stick.y, L.stick.r, "rgba(63,163,169,.45)", "#9fe7eb", moveActive);
    ctx.beginPath();
    ctx.arc(L.stick.x + knobDx, L.stick.y + knobDy, L.stick.r * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = moveActive ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.4)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.font = "9px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("◀ ▶", L.stick.x, L.stick.y + L.stick.r + 16);

    // Pulo
    ring(L.jump.x, L.jump.y, L.jump.r, "rgba(46,204,113,.5)", "#2ecc71", jumpActive);
    ctx.fillStyle = "#fff";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillText("PULO", L.jump.x, L.jump.y + 4);

    // Tiro
    ring(L.attack.x, L.attack.y, L.attack.r, "rgba(231,76,60,.5)", "#e74c3c", attackActive);
    ctx.fillText("TIRO", L.attack.x, L.attack.y + 4);
    ctx.textAlign = "left";
  };

  Game.prototype.start = function () {
    this.paused = false;
    this.bindTouchControls();
    cancelAnimationFrame(this._raf);
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._boundLoop);
  };

  Game.prototype.stop = function () {
    this.unbindTouchControls();
    cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  Game.prototype.pause = function (v) {
    this.paused = v;
    if (v && this._ptrs) {
      this._ptrs.clear();
      this.keys.left = this.keys.right = this.keys.jump = this.keys.attack = false;
    }
    if (!v && !this.ended) this.start();
  };

  Game.prototype.emitHud = function () {
    if (this.onHud) {
      this.onHud({
        score: this.score,
        lives: this.lives,
        items: this.items,
        tema: this.theme.label,
        nome: this.playerData.nome,
      });
    }
  };

  Game.prototype.triggerEvent = function () {
    const ev = this.theme.events[Math.floor(Math.random() * this.theme.events.length)];
    this.eventText = ev.msg;
    this.eventTimer = 120;
    this.score += ev.bonus;
    this.emitHud();
    this.burst(this.player.x + 14, this.player.y, this.theme.accent);
  };

  Game.prototype.burst = function (x, y, color) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        life: 30 + Math.random() * 20,
        color,
      });
    }
  };

  Game.prototype.loop = function (now) {
    const dt = Math.min(32, now - (this._last || now));
    this._last = now;
    if (!this.paused && !this.ended) {
      this.update(dt / 16.67);
      this.draw();
    } else if (this.paused) {
      this.draw();
    }
    this._raf = requestAnimationFrame(this._boundLoop);
  };

  Game.prototype.update = function (scale) {
    this.frame++;
    if (this.eventTimer > 0) this.eventTimer--;
    if (this.invuln > 0) this.invuln--;
    if (this.attackCooldown > 0) this.attackCooldown--;

    const p = this.player;
    let ax = 0;
    if (this.keys.left) {
      ax = -MOVE;
      p.facing = -1;
    }
    if (this.keys.right) {
      ax = MOVE;
      p.facing = 1;
    }
    if (ax !== 0) {
      p.vx = ax;
    } else {
      p.vx *= FRICTION;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    // Pulo + duplo pulo (só no instante em que a tecla é pressionada)
    if (this.keys.jump && !this._jumpHeld) {
      if (p.onGround) {
        p.vy = JUMP;
        p.onGround = false;
        p.jumpsLeft = 1;
        p.state = "jump";
        this.burst(p.x + p.w / 2, p.y + p.h, "#9fe7eb");
      } else if (p.jumpsLeft > 0) {
        p.vy = JUMP * 0.92;
        p.jumpsLeft -= 1;
        p.state = "jump";
        this.burst(p.x + p.w / 2, p.y + p.h, "#9fe7eb");
      }
    }
    this._jumpHeld = !!this.keys.jump;

    if (this.keys.attack && this.attackCooldown <= 0) {
      p.attacking = 18;
      p.shootFrame = 0;
      this.attackCooldown = 26;
      this.projectiles.push({
        x: p.facing > 0 ? p.x + p.w - 4 : p.x - 10,
        y: p.y + 18,
        w: 12,
        h: 8,
        vx: p.facing * 7.5,
        life: 55,
        fromPlayer: true,
      });
    }

    p.vy += GRAVITY * scale;
    if (p.vy > 14) p.vy = 14;

    const wasGrounded = p.onGround;
    this.moveActor(p, p.vx * scale, 0);
    p.onGround = false;
    this.moveActor(p, 0, p.vy * scale);
    // Saiu da plataforma sem pular → ainda pode 1 pulo no ar
    if (wasGrounded && !p.onGround && p.jumpsLeft > 1) {
      p.jumpsLeft = 1;
    }

    // Estado de animação do herói
    if (p.attacking > 0) {
      p.state = "shoot";
      p.shootFrame += 0.35 * scale;
      p.attacking--;
    } else if (!p.onGround) {
      p.state = "jump";
    } else if (Math.abs(p.vx) > 0.4) {
      p.state = "walk";
      p.anim += 0.28 * scale;
    } else {
      p.state = "idle";
      p.anim += 0.12 * scale;
    }

    // Projéteis
    this.projectiles = this.projectiles.filter((pr) => {
      pr.x += pr.vx * scale;
      pr.y += (pr.vy || 0) * scale;
      pr.life--;
      if (pr.life <= 0) return false;

      if (pr.fromPlayer) {
        let hitSomething = false;
        this.enemies.forEach((e) => {
          if (!e.alive || hitSomething) return;
          if (rects(pr, e)) {
            this.damageEnemy(e, 1, Math.sign(pr.vx) * 3);
            hitSomething = true;
          }
        });
        if (hitSomething) return false;
      } else if (this.invuln <= 0 && rects(pr, p)) {
        this.hurt();
        return false;
      }

      if (this.solidAt(pr.x + pr.w / 2, pr.y + pr.h / 2)) return false;
      return true;
    });

    // Inimigos + boss
    this.enemies.forEach((e) => {
      if (!e.alive) return;
      if (e.flash > 0) e.flash--;
      e.vy = (e.vy || 0) + GRAVITY * 0.9 * scale;
      this.moveEnemy(e, e.vx * scale, 0);
      this.moveEnemy(e, 0, (e.vy || 0) * scale);

      if (e.isBoss) {
        this.updateBoss(e, p, scale);
      } else {
        const footX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
        const footY = e.y + e.h + 2;
        if (
          !this.solidAt(footX, footY) ||
          this.solidAt(e.x + (e.vx > 0 ? e.w + 1 : -1), e.y + e.h / 2)
        ) {
          e.vx *= -1;
        }
      }

      if (this.invuln <= 0 && rects(p, e)) {
        const stompH = e.isBoss ? 22 : 16;
        if (p.vy > 0 && p.y + p.h - e.y < stompH) {
          this.damageEnemy(e, e.isBoss ? 1 : 1, 0);
          p.vy = JUMP * 0.65;
        } else {
          this.hurt();
        }
      }
    });

    // Coletáveis
    this.collectibles.forEach((c) => {
      if (c.taken) return;
      c.bob += 0.08 * scale;
      if (rects(p, c)) {
        c.taken = true;
        this.items++;
        this.score += c.points;
        this.burst(c.x + 12, c.y + 12, c.color);
        this.emitHud();
        if (this.items % 3 === 0) this.triggerEvent();
      }
    });

    // Espinhos
    this.hazards.forEach((h) => {
      if (this.invuln <= 0 && rects(p, h)) this.hurt();
    });

    // Blocos mistério
    this.platforms.forEach((pl) => {
      if (pl.type !== "mystery" || pl.hit) return;
      if (
        p.vy < 0 &&
        p.x + p.w > pl.x + 4 &&
        p.x < pl.x + pl.w - 4 &&
        p.y < pl.y + pl.h &&
        p.y > pl.y + pl.h - 16
      ) {
        pl.hit = true;
        p.vy = 1;
        this.score += 30;
        this.items++;
        this.burst(pl.x + 20, pl.y, this.theme.accent);
        this.emitHud();
      }
    });

    // Bandeira / vitória (só após derrotar o boss)
    if (this.flag && !this.flag.locked && rects(p, this.flag)) {
      this.win();
    }

    // Aviso de boss ao entrar na arena
    if (
      this.boss &&
      this.boss.alive &&
      !this._bossAnnounced &&
      p.x > this.worldW - 34 * TILE
    ) {
      this._bossAnnounced = true;
      this.eventText = "BOSS: " + (this.boss.name || "VILÃO").toUpperCase() + "!";
      this.eventTimer = 150;
    }

    // Queda
    if (p.y > this.worldH + 40) this.hurt(true);

    // Câmera
    const target = p.x - this.canvas.width * 0.35;
    this.cameraX += (target - this.cameraX) * 0.12;
    this.cameraX = Math.max(0, Math.min(this.cameraX, this.worldW - this.canvas.width));

    // Partículas
    this.particles = this.particles.filter((pt) => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.2;
      pt.life--;
      return pt.life > 0;
    });
  };

  Game.prototype.solidAt = function (x, y) {
    return this.platforms.some(
      (p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h
    );
  };

  Game.prototype.moveActor = function (a, dx, dy) {
    a.x += dx;
    for (const pl of this.platforms) {
      if (!pl.solid) continue;
      if (rects(a, pl)) {
        if (dx > 0) a.x = pl.x - a.w;
        else if (dx < 0) a.x = pl.x + pl.w;
      }
    }
    a.y += dy;
    for (const pl of this.platforms) {
      if (!pl.solid) continue;
      if (rects(a, pl)) {
        if (dy > 0) {
          a.y = pl.y - a.h;
          a.vy = 0;
          a.onGround = true;
          if (a.jumpsLeft != null) a.jumpsLeft = 2;
        } else if (dy < 0) {
          a.y = pl.y + pl.h;
          a.vy = 0;
        }
      }
    }
    if (a.x < 0) a.x = 0;
    if (a.x + a.w > this.worldW) a.x = this.worldW - a.w;
  };

  Game.prototype.moveEnemy = function (e, dx, dy) {
    e.x += dx;
    for (const pl of this.platforms) {
      if (!pl.solid) continue;
      if (rects(e, pl)) {
        if (dx > 0) {
          e.x = pl.x - e.w;
          e.vx *= -1;
        } else if (dx < 0) {
          e.x = pl.x + pl.w;
          e.vx *= -1;
        }
      }
    }
    e.y += dy;
    e.onGround = false;
    for (const pl of this.platforms) {
      if (!pl.solid) continue;
      if (rects(e, pl)) {
        if (dy > 0) {
          e.y = pl.y - e.h;
          e.vy = 0;
          e.onGround = true;
        } else if (dy < 0) {
          e.y = pl.y + pl.h;
          e.vy = 0;
        }
      }
    }
  };

  Game.prototype.damageEnemy = function (e, dmg, knock) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.flash = 8;
    if (knock) e.vx = knock;
    this.burst(e.x + e.w / 2, e.y + e.h * 0.3, e.color || this.theme.accent);
    if (e.hp <= 0) {
      e.alive = false;
      this.score += e.points || 100;
      this.emitHud();
      if (e.isBoss) {
        this.onBossDefeated(e);
      } else if (Math.random() < 0.35) {
        this.triggerEvent();
      }
    }
  };

  Game.prototype.onBossDefeated = function (e) {
    this.bossDefeated = true;
    if (this.flag) this.flag.locked = false;
    this.eventText = "BOSS DERROTADO! Pegue a bandeira!";
    this.eventTimer = 180;
    this.score += 500;
    this.emitHud();
    this.burst(e.x + e.w / 2, e.y + e.h / 2, "#f4c542");
    this.burst(e.x + e.w / 2, e.y + e.h / 2, this.theme.accent);
  };

  Game.prototype.updateBoss = function (e, p, scale) {
    // Persegue o jogador horizontalmente e vira nas bordas da arena
    const arenaMin = this.worldW - 28 * TILE;
    const arenaMax = this.worldW - 40;
    const dir = p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1;
    const spd = Math.abs(e.speed || 1.3);
    e.vx = dir * spd;

    if (e.x < arenaMin) {
      e.x = arenaMin;
      e.vx = Math.abs(e.vx);
    }
    if (e.x + e.w > arenaMax) {
      e.x = arenaMax - e.w;
      e.vx = -Math.abs(e.vx);
    }

    // Olha para o jogador
    e.facing = dir;

    // Atira periodicamente quando o jogador está perto
    e.shootCd = (e.shootCd || 0) - scale;
    const dist = Math.abs(p.x - e.x);
    if (e.shootCd <= 0 && dist < 520) {
      e.shootCd = e.shootInterval || 70;
      const bx = dir > 0 ? e.x + e.w - 8 : e.x - 14;
      const by = e.y + e.h * 0.35;
      this.projectiles.push({
        x: bx,
        y: by,
        w: 16,
        h: 12,
        vx: dir * 5.2,
        vy: (p.y - e.y) * 0.012,
        life: 90,
        fromPlayer: false,
        hostile: true,
        color: e.color || "#e74c3c",
      });
    }

    // Salto ocasional do boss
    if (e.onGround && Math.random() < 0.008) {
      e.vy = JUMP * 0.55;
      e.onGround = false;
    }
  };

  Game.prototype.setGodMode = function (on) {
    this.godMode = !!on;
    this.eventText = this.godMode ? "MODO GOD ON" : "MODO GOD OFF";
    this.eventTimer = 100;
    if (this.godMode) this.invuln = 0;
  };

  Game.prototype.hurt = function (fell) {
    if (this.godMode) {
      if (fell) {
        this.player.x = Math.max(40, this.cameraX + 80);
        this.player.y = 100;
        this.player.vx = 0;
        this.player.vy = 0;
      }
      return;
    }
    if (this.invuln > 0 && !fell) return;
    this.lives--;
    this.invuln = 90;
    this.emitHud();
    this.burst(this.player.x + 14, this.player.y + 10, "#e74c3c");
    if (this.lives <= 0) {
      this.lose();
      return;
    }
    if (fell) {
      this.player.x = Math.max(40, this.cameraX + 80);
      this.player.y = 100;
      this.player.vx = 0;
      this.player.vy = 0;
    } else {
      this.player.vy = JUMP * 0.5;
      this.player.vx = -this.player.facing * 4;
    }
  };

  Game.prototype.win = function () {
    if (this.ended) return;
    this.ended = true;
    this.won = true;
    this.score += 500;
    this.emitHud();
    if (this.onEnd) {
      this.onEnd({
        won: true,
        score: this.score,
        items: this.items,
        msg: "Você conseguiu um desconto na Unifeso!!!!! 50% de bolsa — não acumulável.",
      });
    }
  };

  Game.prototype.lose = function () {
    if (this.ended) return;
    this.ended = true;
    this.won = false;
    if (this.onEnd) {
      this.onEnd({
        won: false,
        score: this.score,
        items: this.items,
        msg: "Game Over! Estude, respire e dê o start de novo.",
      });
    }
  };

  /* ========== DRAW ========== */
  Game.prototype.draw = function () {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cam = this.cameraX;
    const t = this.theme;

    // Fundo do tema (Saúde = imagem contínua)
    if (t.bgImage && t.bgContinuous) {
      this.drawContinuousBackground(ctx, W, H, cam);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, t.skyTop);
      g.addColorStop(1, t.skyBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(-cam * 0.3, 0);
      this.drawDecor(ctx, W + cam);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(-cam, 0);

    if (!(t.bgImage && t.bgContinuous)) {
      this.drawCampus(ctx, this.worldW - 280, 120);
    }

    // Plataformas
    this.platforms.forEach((pl) => this.drawTile(ctx, pl));

    // Espinhos (sprite de fogo / magma)
    this.hazards.forEach((h) => {
      const spr = this.hazardSprite;
      if (spr && spr.complete && spr.naturalWidth) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(spr, h.x, h.y, h.w, h.h);
        ctx.imageSmoothingEnabled = false;
      } else {
        ctx.fillStyle = "#c0392b";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(h.x + i * 10, h.y + h.h);
          ctx.lineTo(h.x + i * 10 + 5, h.y);
          ctx.lineTo(h.x + i * 10 + 10, h.y + h.h);
          ctx.fill();
        }
      }
    });

    // Coletáveis = Diplomas
    this.collectibles.forEach((c) => {
      if (c.taken) return;
      const by = c.y + Math.sin(c.bob) * 4;
      const spr = this.itemVitamina;
      const size = 36;
      const dx = c.x + (c.w - size) / 2;
      const dy = by + (c.h - size) / 2;
      if (spr && spr.complete && spr.naturalWidth) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(spr, dx, dy, size, size);
        ctx.imageSmoothingEnabled = false;
      } else {
        ctx.fillStyle = "#f4c542";
        ctx.beginPath();
        ctx.ellipse(c.x + c.w / 2, by + c.h / 2, 12, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a3a5c";
        ctx.font = "6px 'Press Start 2P', monospace";
        ctx.fillText("DIP", c.x + 2, by + 16);
      }
    });

    // Marcadores de polo / área
    this.markers.forEach((m) => {
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillRect(m.x, m.y - 18, 72, 14);
      ctx.fillStyle = "#fff";
      ctx.font = "8px 'Press Start 2P', monospace";
      let label = "ÁREA";
      if (m.kind === "P" && t.polos) label = t.polos[Math.floor(m.x / 400) % t.polos.length];
      if (m.kind === "H") label = "SAÚDE";
      if (m.kind === "A") label = "DIREITO";
      ctx.fillText(label.slice(0, 10), m.x + 2, m.y - 7);
    });

    // Inimigos
    this.enemies.forEach((e) => {
      if (!e.alive) return;
      this.drawEnemy(ctx, e);
    });

    // Bandeira (travada até derrotar o boss)
    if (this.flag) {
      const f = this.flag;
      ctx.fillStyle = "#222";
      ctx.fillRect(f.x + 8, f.y, 4, f.h);
      ctx.fillStyle = f.locked ? "#7f8c8d" : t.accent;
      ctx.beginPath();
      ctx.moveTo(f.x + 12, f.y + 4);
      ctx.lineTo(f.x + 48, f.y + 16);
      ctx.lineTo(f.x + 12, f.y + 28);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.fillText(f.locked ? "BOSS!" : "UNIFESO", f.x + 14, f.y + 18);
    }

    // Projéteis + Player
    this.drawProjectiles(ctx);
    this.drawPlayer(ctx, this.player);

    // Partículas
    this.particles.forEach((pt) => {
      ctx.globalAlpha = Math.min(1, pt.life / 20);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, 4, 4);
      ctx.globalAlpha = 1;
    });

    ctx.restore();

    // Barra de vida do boss
    if (this.boss && this.boss.alive) {
      const nearBoss = this.player.x > this.worldW - 36 * TILE;
      if (nearBoss || this.player.x + W > this.boss.x - 80) {
        const barW = Math.min(420, W * 0.7);
        const barX = (W - barW) / 2;
        const barY = 12;
        const pct = Math.max(0, this.boss.hp / (this.boss.maxHp || 14));
        ctx.fillStyle = "rgba(0,0,0,.65)";
        ctx.fillRect(barX - 4, barY - 4, barW + 8, 28);
        ctx.fillStyle = "#3d0000";
        ctx.fillRect(barX, barY + 10, barW, 10);
        ctx.fillStyle = this.theme.accent || "#e74c3c";
        ctx.fillRect(barX, barY + 10, barW * pct, 10);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY + 10, barW, 10);
        ctx.fillStyle = "#fff";
        ctx.font = "9px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("BOSS " + (this.boss.name || "").toUpperCase(), W / 2, barY + 8);
        ctx.textAlign = "left";
      }
    }

    // Event banner
    if (this.eventTimer > 0 && this.eventText) {
      ctx.fillStyle = "rgba(26,58,92,.85)";
      ctx.fillRect(W * 0.1, 48, W * 0.8, 36);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeRect(W * 0.1, 48, W * 0.8, 36);
      ctx.fillStyle = "#fff";
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.eventText.slice(0, 42), W / 2, 72);
      ctx.textAlign = "left";
    }

    // Controles: pads no canvas (mobile) ou dica de teclado (desktop)
    if (this.touchPads) {
      this.drawTouchPads(ctx);
    } else {
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillRect(8, H - 28, 280, 20);
      ctx.fillStyle = "#fff";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillText("←→ ANDAR  ESPAÇO PULAR×2  Z ATACAR", 14, H - 14);
    }

    if (this.godMode) {
      ctx.fillStyle = "rgba(244,197,66,.92)";
      ctx.fillRect(W - 78, H - 28, 70, 20);
      ctx.fillStyle = "#1a3a5c";
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillText("GOD", W - 58, H - 14);
    }
  };

  Game.prototype.drawDecor = function (ctx, width) {
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (let i = 0; i < 8; i++) {
      const x = i * 180 + 40;
      const y = 40 + (i % 3) * 28;
      ctx.fillRect(x, y, 48, 14);
      ctx.fillRect(x + 12, y - 10, 36, 14);
    }
    // blocos pixel estilo key visual
    ctx.fillStyle = "#000";
    ctx.fillRect(60, 100, 8, 8);
    ctx.fillRect(68, 108, 8, 8);
    ctx.fillRect(76, 100, 8, 8);
    ctx.fillRect(200, 70, 8, 8);
    ctx.fillRect(208, 78, 16, 8);
  };

  Game.prototype.drawCampus = function (ctx, x, y) {
    // Prédio pixel inspirado no key visual
    ctx.fillStyle = "#4a6741";
    ctx.fillRect(x - 40, y + 160, 40, 80);
    ctx.fillRect(x + 160, y + 150, 50, 90);
    ctx.fillStyle = "#8a9aa0";
    ctx.fillRect(x, y, 160, 240);
    ctx.fillStyle = "#6d7c82";
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = (r + c) % 2 ? "#dfe6e9" : "#74b9ff";
        ctx.fillRect(x + 16 + c * 34, y + 20 + r * 34, 22, 22);
      }
    }
    ctx.fillStyle = "#1a3a5c";
    ctx.fillRect(x + 60, y + 200, 40, 40);
    ctx.fillStyle = "#fff";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillText("UNIFESO", x + 40, y - 8);
  };

  Game.prototype.drawTile = function (ctx, pl) {
    const t = this.theme;
    if (pl.type === "mystery") {
      ctx.fillStyle = "#000";
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.fillStyle = pl.hit ? "#7f8c8d" : "#f4c542";
      ctx.fillRect(pl.x + 2, pl.y + 2, pl.w - 4, pl.h - 4);
      if (!pl.hit) {
        ctx.fillStyle = "#000";
        ctx.font = "16px 'Press Start 2P', monospace";
        ctx.fillText("?", pl.x + 12, pl.y + 28);
      }
      return;
    }

    // Fundo ilustrado: chão bem visível (grama + terra), plataformas altas também
    if (t.bgContinuous && t.bgImage) {
      const isGroundRow = pl.y >= this.worldH - TILE * 2;
      // contorno
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);

      if (isGroundRow) {
        // faixa de grama
        ctx.fillStyle = "#4caf50";
        ctx.fillRect(pl.x + 1, pl.y + 1, pl.w - 2, 12);
        ctx.fillStyle = "#81c784";
        ctx.fillRect(pl.x + 2, pl.y + 2, pl.w - 4, 4);
        // terra
        ctx.fillStyle = "#8d6e63";
        ctx.fillRect(pl.x + 1, pl.y + 13, pl.w - 2, pl.h - 14);
        ctx.fillStyle = "#6d4c41";
        ctx.fillRect(pl.x + 1, pl.y + pl.h - 10, pl.w - 2, 9);
        // detalhes
        ctx.fillStyle = "rgba(255,255,255,.2)";
        ctx.fillRect(pl.x + 6, pl.y + 4, 8, 3);
        ctx.fillStyle = "rgba(0,0,0,.18)";
        ctx.fillRect(pl.x + 14, pl.y + 20, 10, 6);
      } else {
        ctx.fillStyle = "#43a047";
        ctx.fillRect(pl.x + 1, pl.y + 1, pl.w - 2, 10);
        ctx.fillStyle = "#a5d6a7";
        ctx.fillRect(pl.x + 2, pl.y + 2, pl.w - 4, 3);
        ctx.fillStyle = "#795548";
        ctx.fillRect(pl.x + 1, pl.y + 11, pl.w - 2, pl.h - 12);
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(pl.x + 1, pl.y + pl.h - 8, pl.w - 2, 7);
      }
      return;
    }

    ctx.fillStyle = "#000";
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.fillStyle = t.ground;
    ctx.fillRect(pl.x + 1, pl.y + 1, pl.w - 2, pl.h - 2);
    ctx.fillStyle = t.groundDark;
    ctx.fillRect(pl.x + 1, pl.y + pl.h - 10, pl.w - 2, 9);
    ctx.fillStyle = "rgba(255,255,255,.15)";
    ctx.fillRect(pl.x + 4, pl.y + 4, 10, 6);
  };

  Game.prototype.drawEnemy = function (ctx, e) {
    const flash = e.flash > 0 && e.flash % 2 === 0;
    const spr = e.sprite && this.enemySprites[e.name];
    const faceLeft = (e.facing != null ? e.facing : Math.sign(e.vx || 1)) < 0;

    if (spr && spr.complete && spr.naturalWidth) {
      const pad = e.isBoss ? 16 : 8;
      const drawW = e.w + pad;
      const drawH = e.h + pad;
      const dx = e.x + (e.w - drawW) / 2;
      const dy = e.y + e.h - drawH;
      ctx.save();
      if (flash) ctx.globalAlpha = 0.45;
      ctx.imageSmoothingEnabled = true;
      if (faceLeft) {
        ctx.translate(dx + drawW, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(spr, 0, 0, drawW, drawH);
      } else {
        ctx.drawImage(spr, dx, dy, drawW, drawH);
      }
      ctx.restore();
      ctx.fillStyle = e.isBoss ? "rgba(192,57,43,.9)" : "rgba(26,58,92,.75)";
      ctx.font = e.isBoss ? "9px 'Press Start 2P', monospace" : "7px 'Press Start 2P', monospace";
      const label = (e.isBoss ? "BOSS " : "") + e.name.slice(0, e.isBoss ? 12 : 8);
      ctx.fillText(label, e.x - 2, e.y - 6);
      return;
    }

    ctx.fillStyle = "#000";
    ctx.fillRect(e.x - 1, e.y - 1, e.w + 2, e.h + 2);
    ctx.fillStyle = flash ? "#fff" : e.color;
    ctx.fillRect(e.x, e.y, e.w, e.h);
    const eye = Math.max(6, Math.floor(e.w * 0.12));
    ctx.fillStyle = e.eyes || "#fff";
    ctx.fillRect(e.x + eye, e.y + eye + 2, eye, eye);
    ctx.fillRect(e.x + e.w - eye * 2 - 2, e.y + eye + 2, eye, eye);
    ctx.fillStyle = "#000";
    ctx.fillRect(e.x + eye + 2, e.y + eye + 4, eye / 2, eye / 2);
    ctx.fillRect(e.x + e.w - eye * 2, e.y + eye + 4, eye / 2, eye / 2);
    ctx.fillStyle = e.isBoss ? "rgba(192,57,43,.9)" : "rgba(0,0,0,.5)";
    ctx.font = e.isBoss ? "9px 'Press Start 2P', monospace" : "7px 'Press Start 2P', monospace";
    const label = (e.isBoss ? "BOSS " : "") + e.name.slice(0, e.isBoss ? 12 : 8);
    ctx.fillText(label, e.x - 2, e.y - 4);
  };

  Game.prototype.drawPlayer = function (ctx, p) {
    const blink = !this.godMode && this.invuln > 0 && Math.floor(this.frame / 3) % 2 === 0;
    if (blink) return;
    if (this.godMode) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.2 * Math.sin(this.frame * 0.2);
      ctx.fillStyle = "#f4c542";
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.7, p.h * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Escala inteira (64px) a partir do atlas 128px → nitidez pixel art
    const drawW = 64;
    const drawH = 64;
    const dx = p.x + (p.w - drawW) / 2;
    const dy = p.y + p.h - drawH + 2;

    // sombra
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h - 1, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    let anim = "idle";
    let fi = Math.floor(p.anim) % 4;
    if (p.state === "shoot") {
      anim = "shoot";
      fi = Math.min(5, Math.floor(p.shootFrame));
    } else if (p.state === "jump") {
      anim = "jump";
      fi = window.HeroSprites
        ? window.HeroSprites.jumpFrame(p.vy, p.onGround)
        : 2;
    } else if (p.state === "walk") {
      anim = "walk";
      fi = Math.floor(p.anim) % 6;
    }

    const ok =
      window.HeroSprites &&
      window.HeroSprites.drawHero(
        ctx,
        this.heroId,
        anim,
        fi,
        dx,
        dy,
        drawW,
        drawH,
        p.facing,
        this.skin
      );

    if (!ok) {
      // fallback simples
      ctx.fillStyle = "#fff";
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }

    // nome
    ctx.fillStyle = "rgba(26,58,92,.85)";
    ctx.font = "7px 'Press Start 2P', monospace";
    const nome = (this.playerData.nome || "Aluno").split(" ")[0].slice(0, 10);
    ctx.fillText(nome, p.x - 2, p.y - 6);
  };

  Game.prototype.drawProjectiles = function (ctx) {
    this.projectiles.forEach((pr) => {
      const cx = pr.x + pr.w / 2;
      const cy = pr.y + pr.h / 2;
      if (pr.hostile || pr.fromPlayer === false) {
        // Tiro do boss — orb escura
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pr.color || "#e74c3c";
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillRect(cx - 2, cy - 2, 2, 2);
        return;
      }
      // Projétil do herói = diploma enrolado
      ctx.fillStyle = "#f5e6c8";
      ctx.fillRect(pr.x, pr.y + 1, pr.w + 4, pr.h - 2);
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(pr.x + 2, pr.y, 3, pr.h);
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(cx - 1, pr.y + 2, 8, 3);
      ctx.fillStyle = "#fff";
      ctx.fillRect(pr.x + pr.w, cy - 1, 2, 2);
    });
  };

  function rects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  global.UnifesoGame = Game;
})(window);
