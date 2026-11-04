/** Folhas Vestibulando / Vestibulanda (sprites limpos 64x64) + tons de pele */
(function (global) {
  const FS = 128; // atlas 2x — mais nítido em HiDPI
  const VER = "8"; // cache-bust ao trocar arte / skins
  const SKINS = ["branco", "pardo", "negro"];

  const HEROES = {
    boy: {
      id: "boy",
      label: "Vestibulando",
    },
    girl: {
      id: "girl",
      label: "Vestibulanda",
    },
  };

  function asset(heroId, kind, skin) {
    const s = SKINS.indexOf(skin) >= 0 ? skin : "branco";
    if (kind === "preview") {
      return "assets/sprites/skins/" + heroId + "_preview_" + s + ".png?v=" + VER;
    }
    if (kind === "walkL") {
      return "assets/sprites/skins/" + heroId + "_walk_l_" + s + ".png?v=" + VER;
    }
    return "assets/sprites/skins/" + heroId + "_sheet_" + s + ".png?v=" + VER;
  }

  // Linhas no atlas master
  const ANIMS = {
    idle: { row: 0, frames: 4, speed: 0.12 },
    walk: { row: 1, frames: 6, speed: 0.22 },
    jump: { row: 2, frames: 6, speed: 0 },
    shoot: { row: 3, frames: 6, speed: 0.35 },
  };

  // cache[heroId][skin]
  const cache = { boy: {}, girl: {} };
  const walkLCache = { boy: {}, girl: {} };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function preload(skins) {
    const list = skins && skins.length ? skins : SKINS;
    const jobs = [];
    Object.keys(HEROES).forEach((heroId) => {
      list.forEach((skin) => {
        jobs.push(
          loadImage(asset(heroId, "sheet", skin)).then((img) => {
            cache[heroId][skin] = img;
          })
        );
        jobs.push(
          loadImage(asset(heroId, "walkL", skin))
            .then((img) => {
              walkLCache[heroId][skin] = img;
            })
            .catch(() => {
              walkLCache[heroId][skin] = null;
            })
        );
      });
    });
    await Promise.all(jobs);
    return cache;
  }

  function getSheet(heroId, skin) {
    const s = SKINS.indexOf(skin) >= 0 ? skin : "branco";
    const h = heroId === "girl" ? "girl" : "boy";
    return (cache[h] && cache[h][s]) || (cache.boy && cache.boy.branco) || null;
  }

  function drawHero(ctx, heroId, anim, frameIndex, dx, dy, dw, dh, facing, skin) {
    const conf = ANIMS[anim] || ANIMS.idle;
    const fi = ((frameIndex % conf.frames) + conf.frames) % conf.frames;
    const s = SKINS.indexOf(skin) >= 0 ? skin : "branco";
    const h = heroId === "girl" ? "girl" : "boy";

    if (anim === "walk" && facing < 0 && h === "girl" && walkLCache.girl && walkLCache.girl[s]) {
      const strip = walkLCache.girl[s];
      ctx.drawImage(strip, fi * FS, 0, FS, FS, dx, dy, dw, dh);
      return true;
    }

    const sheet = getSheet(h, s);
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

  function previewSrc(heroId, skin) {
    return asset(heroId === "girl" ? "girl" : "boy", "preview", skin);
  }

  global.HeroSprites = {
    HEROES,
    ANIMS,
    SKINS,
    FS,
    preload,
    getSheet,
    drawHero,
    jumpFrame,
    previewSrc,
    ready: () =>
      !!(cache.boy.branco && cache.girl.branco),
  };
})(window);
