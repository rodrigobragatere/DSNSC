(function () {
  const $ = (sel) => document.querySelector(sel);
  const loginScreen = $("#screen-login");
  const gameScreen = $("#screen-game");
  const form = $("#form-start");
  const canvas = $("#game");
  const overlayPause = $("#overlay-pause");
  const overlayEnd = $("#overlay-end");

  const BASE_W = 960;
  const BASE_H = 540;

  let game = null;
  let playerData = null;

  function maskPhone(v) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10) {
      return d
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  $("#field-telefone").addEventListener("input", (e) => {
    e.target.value = maskPhone(e.target.value);
  });

  function show(el) {
    el.classList.remove("hidden");
  }
  function hide(el) {
    el.classList.add("hidden");
  }

  /** Aviso de girar o celular (portrait + tela do jogo) */
  function updateRotateHint() {
    const playing = gameScreen.classList.contains("active");
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    const narrow = window.matchMedia("(max-width: 767.98px)").matches;
    document.body.classList.toggle("show-rotate", playing && portrait && narrow);
  }

  /** Ajusta o canvas ao espaço disponível (landscape mobile) */
  function fitCanvas() {
    const wrap = canvas.parentElement;
    if (!wrap) return;

    const playing = gameScreen.classList.contains("active");
    if (!playing) {
      canvas.width = BASE_W;
      canvas.height = BASE_H;
      return;
    }

    const hud = document.querySelector(".hud");
    const touch = document.querySelector(".touch-bar");
    const hudH = hud ? hud.getBoundingClientRect().height : 40;
    const touchVisible = touch && getComputedStyle(touch).display !== "none";
    const touchH = touchVisible ? touch.getBoundingClientRect().height + 8 : 0;
    const pad = 12;

    const maxW = Math.max(320, window.innerWidth - pad);
    const maxH = Math.max(180, window.innerHeight - hudH - touchH - pad);

    let w = maxW;
    let h = Math.round(w * (BASE_H / BASE_W));
    if (h > maxH) {
      h = maxH;
      w = Math.round(h * (BASE_W / BASE_H));
    }

    // Mantém buffer interno em 16:9 para o jogo; CSS escala o elemento
    canvas.width = BASE_W;
    canvas.height = BASE_H;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }

  function goMenu() {
    if (game) {
      game.setGodMode(false);
      game.stop();
      game = null;
    }
    cheatBuf = "";
    hide(overlayPause);
    hide(overlayEnd);
    gameScreen.classList.remove("active");
    loginScreen.classList.add("active");
    document.body.classList.remove("show-rotate");
    canvas.style.width = "";
    canvas.style.height = "";
  }

  function updateHud(data) {
    $("#hud-nome").textContent = (data.nome || "—").split(" ")[0];
    $("#hud-vidas").textContent = data.lives;
    $("#hud-pontos").textContent = data.score;
    $("#hud-itens").textContent = data.items;
    $("#hud-tema").textContent = data.tema;
  }

  async function startGame(data) {
    playerData = data;
    const theme = window.THEMES[data.tema];
    loginScreen.classList.remove("active");
    gameScreen.classList.add("active");
    hide(overlayPause);
    hide(overlayEnd);

    if (window.HeroSprites && !window.HeroSprites.ready()) {
      try {
        await window.HeroSprites.preload();
      } catch (_) {}
    }

    if (game) game.stop();
    fitCanvas();
    updateRotateHint();

    game = new window.UnifesoGame(canvas, data, theme);
    game.onHud = updateHud;
    game.onEnd = (result) => {
      const winSplash = $("#win-splash");
      const loseSplash = $("#lose-splash");
      const endCard = $("#end-card");
      if (result.won) {
        hide(loseSplash);
        show(winSplash);
        endCard.classList.add("is-win");
        overlayEnd.classList.add("is-win");
        $("#end-pontos-win").textContent = result.score;
        // Reinicia animação da explosão
        winSplash.classList.remove("boom-play");
        void winSplash.offsetWidth;
        winSplash.classList.add("boom-play");
      } else {
        hide(winSplash);
        show(loseSplash);
        endCard.classList.remove("is-win");
        overlayEnd.classList.remove("is-win");
        $("#end-title").textContent = "GAME OVER";
        $("#end-msg").textContent = result.msg;
        $("#end-pontos").textContent = result.score;
      }
      show(overlayEnd);
    };
    updateHud({
      nome: data.nome,
      lives: 3,
      score: 0,
      items: 0,
      tema: theme.label,
    });
    game.start();

    try {
      const leads = JSON.parse(localStorage.getItem("dsnsc_leads") || "[]");
      leads.push({ ...data, at: new Date().toISOString() });
      localStorage.setItem("dsnsc_leads", JSON.stringify(leads.slice(-100)));
    } catch (_) {}

    requestAnimationFrame(fitCanvas);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const tema = (form.querySelector('input[name="tema"]:checked') || {}).value;
    const hero = (form.querySelector('input[name="hero"]:checked') || {}).value || "boy";
    if (!tema) {
      alert("Escolha um tema / área para jogar.");
      return;
    }
    startGame({
      nome: $("#field-nome").value.trim(),
      email: $("#field-email").value.trim(),
      telefone: $("#field-telefone").value.trim(),
      curso: $("#field-curso").value,
      tema,
      hero,
    });
  });

  // Pré-carrega sprites dos heróis
  if (window.HeroSprites) {
    window.HeroSprites.preload().catch((err) => {
      console.warn("Sprites não carregaram:", err);
    });
  }

  let cheatBuf = "";

  window.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    const typingField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    // Cheat "god" — invencível; desativa ao sair do jogo (menu)
    if (!typingField && e.key.length === 1 && /[a-z]/i.test(e.key)) {
      cheatBuf = (cheatBuf + e.key.toLowerCase()).slice(-8);
      if (cheatBuf.endsWith("god")) {
        cheatBuf = "";
        if (game && !game.ended) {
          game.setGodMode(!game.godMode);
        }
      }
    }

    if (!game) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "Space"].includes(e.key) || e.key.toLowerCase() === "z") {
      e.preventDefault();
    }
    if (e.key === "Escape" || e.key.toLowerCase() === "p") {
      if (game.ended) return;
      const next = !game.paused;
      game.pause(next);
      if (next) show(overlayPause);
      else hide(overlayPause);
      return;
    }
    game.setKey(e.key === " " ? " " : e.key, true);
  });

  window.addEventListener("keyup", (e) => {
    if (!game) return;
    game.setKey(e.key === " " ? " " : e.key, false);
  });

  // Touch (mobile landscape)
  const touch = $("#touch-controls");
  if (touch) {
    touch.querySelectorAll("button[data-key]").forEach((btn) => {
      const key = btn.getAttribute("data-key");
      const down = (ev) => {
        ev.preventDefault();
        if (game) game.setKey(key, true);
      };
      const up = (ev) => {
        ev.preventDefault();
        if (game) game.setKey(key, false);
      };
      btn.addEventListener("touchstart", down, { passive: false });
      btn.addEventListener("touchend", up, { passive: false });
      btn.addEventListener("touchcancel", up, { passive: false });
      btn.addEventListener("mousedown", down);
      btn.addEventListener("mouseup", up);
      btn.addEventListener("mouseleave", up);
    });
  }

  $("#btn-pause").addEventListener("click", () => {
    if (!game || game.ended) return;
    game.pause(true);
    show(overlayPause);
  });
  $("#btn-resume").addEventListener("click", () => {
    if (!game) return;
    hide(overlayPause);
    game.pause(false);
  });
  $("#btn-restart").addEventListener("click", () => {
    if (!playerData) return;
    hide(overlayPause);
    startGame(playerData);
  });
  $("#btn-menu").addEventListener("click", goMenu);
  $("#btn-end-menu").addEventListener("click", goMenu);
  $("#btn-again").addEventListener("click", () => {
    if (!playerData) return;
    hide(overlayEnd);
    startGame(playerData);
  });

  let resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateRotateHint();
      fitCanvas();
    }, 80);
  }

  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", () => {
    setTimeout(onResize, 150);
  });

  /** Fundo: nomes dos cursos caindo em branco */
  function initCourseRain() {
    const layer = $("#course-rain");
    if (!layer) return;

    const courses = [
      "Arquitetura e Urbanismo",
      "Ciência da Computação",
      "Direito",
      "Enfermagem",
      "Engenharia Civil",
      "Fisioterapia",
      "Medicina Veterinária",
      "Nutrição",
      "Odontologia",
      "Psicologia",
      "Biomedicina",
      "Educação Física",
      "Farmácia",
      "Fonoaudiologia",
      "Pedagogia",
      "Administração EaD",
      "Ciências Contábeis EaD",
      "Gestão Ambiental EaD",
      "Gestão de Recursos Humanos EaD",
      "Marketing EaD",
      "ADS EaD",
    ];

    const count = Math.min(28, Math.max(16, Math.floor(window.innerWidth / 55)));
    layer.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const span = document.createElement("span");
      span.textContent = courses[i % courses.length];
      const left = (i * (100 / count) + Math.random() * 4) % 100;
      const delay = Math.random() * 12;
      const duration = 9 + Math.random() * 10;
      const size = 0.7 + Math.random() * 0.55;
      span.style.left = left + "%";
      span.style.fontSize = size + "rem";
      span.style.animationDuration = duration + "s";
      span.style.animationDelay = delay + "s";
      layer.appendChild(span);
    }
  }

  let rainTimer;
  initCourseRain();
  window.addEventListener("resize", () => {
    clearTimeout(rainTimer);
    rainTimer = setTimeout(initCourseRain, 250);
  });

  updateRotateHint();
})();
