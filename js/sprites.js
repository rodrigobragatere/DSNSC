/** Folhas Vestibulando / Vestibulanda (sprites limpos 64x64) */
(function (global) {
  const FS = 128; // atlas 2x — mais nítido em HiDPI
  const VER = "7"; // cache-bust ao trocar arte

  const HEROES = {
    boy: {
      id: "boy",
      label: "Vestibulando",
      sheet: "assets/sprites/boy_sheet.png?v=" + VER,
      preview: "assets/sprites/boy_preview.png?v=" + VER,
      walkL: "assets/sprites/boy_walk_l.png?v=" + VER,
    },
    girl: {
      id: "girl",
      label: "Vestibulanda",
      sheet: "assets/sprites/girl_sheet.png?v=" + VER,
      preview: "assets/sprites/girl_preview.png?v=" + VER,
      walkL: "assets/sprites/girl_walk_l.png?v=" + VER,
    },
  };

  // Linhas no atlas master (boy_sheet / girl_sheet)
  const ANIMS = {
    idle: { row: 0, frames: 4, speed: 0.12 },
    walk: { row: 1, frames: 6, speed: 0.22 },
    jump: { row: 2, frames: 6, speed: 0 },
    shoot: { row: 3, frames: 6, speed: 0.35 },
  };

  const cache = {};
  const walkLCache = {};

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function preload() {
    await Promise.all(
      Object.values(HEROES).map(async (h) => {
        cache[h.id] = await loadImage(h.sheet);
        try {
          walkLCache[h.id] = await loadImage(h.walkL);
        } catch (_) {
          walkLCache[h.id] = null;
        }
      })
    );
    return cache;
  }

  function getSheet(heroId) {
    return cache[heroId] || cache.boy;
  }

  /**
   * Desenha frame do herói.
   * facing < 0 usa atlas walk_l quando anim=walk (sem flip artificial).
   */
  function drawHero(ctx, heroId, anim, frameIndex, dx, dy, dw, dh, facing) {
    const conf = ANIMS[anim] || ANIMS.idle;
    const fi = ((frameIndex % conf.frames) + conf.frames) % conf.frames;

    // Vestibulanda: linha 3 da folha já vem espelhada (andar esquerda)
    if (anim === "walk" && facing < 0 && heroId === "girl" && walkLCache.girl) {
      const strip = walkLCache.girl;
      ctx.drawImage(strip, fi * FS, 0, FS, FS, dx, dy, dw, dh);
      return true;
    }

    const sheet = getSheet(heroId);
    if (!sheet) return false;

    const sx = fi * FS;
    const sy = conf.row * FS;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if ("mozImageSmoothingEnabled" in ctx) ctx.mozImageSmoothingEnabled = false;
    if ("webkitImageSmoothingEnabled" in ctx) ctx.webkitImageSmoothingEnabled = false;
    if (facing < 0) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, sx, sy, FS, FS, 0, 0, dw, dh);
    } else {
      ctx.drawImage(sheet, sx, sy, FS, FS, dx, dy, dw, dh);
    }
    ctx.restore();
    return true;
  }

  function jumpFrame(vy, onGround) {
    if (onGround) return 0;
    if (vy < -6) return 1;
    if (vy < -2) return 2;
    if (vy < 2) return 3;
    if (vy < 6) return 4;
    return 5;
  }

  global.HeroSprites = {
    HEROES,
    ANIMS,
    FS,
    preload,
    getSheet,
    drawHero,
    jumpFrame,
    ready: () => Object.keys(cache).length >= 2,
  };
})(window);
