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
    requestAnimationFrame(fitCanvas);
  }

  function showFormError(msg) {
    const el = $("#form-error");
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = msg;
  }

  function collectFormData() {
    const nome = ($("#field-nome").value || "").trim();
    const email = ($("#field-email").value || "").trim();
    const telefone = ($("#field-telefone").value || "").trim();
    const curso = $("#field-curso").value || "";
    const tema = (form.querySelector('input[name="tema"]:checked') || {}).value || "";
    const hero = (form.querySelector('input[name="hero"]:checked') || {}).value || "";
    return { nome, email, telefone, curso, tema, hero };
  }

  function validateCadastro(data) {
    if (!data.nome || data.nome.length < 3) {
      return "Informe seu nome completo.";
    }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return "Informe um e-mail válido.";
    }
    const digits = data.telefone.replace(/\D/g, "");
    if (digits.length < 10) {
      return "Informe um telefone válido com DDD.";
    }
    if (!data.curso) {
      return "Selecione o curso de interesse.";
    }
    if (!data.hero) {
      return "Escolha seu herói.";
    }
    if (!data.tema) {
      return "Escolha o tema / área para jogar.";
    }
    return "";
  }

  /** Admin: login destart / destart → nova janela com grid */
  const overlayAdmin = $("#overlay-admin-login");
  const formAdmin = $("#form-admin-login");
  $("#btn-admin") &&
    $("#btn-admin").addEventListener("click", () => {
      showFormError("");
      const err = $("#admin-login-error");
      if (err) {
        err.hidden = true;
        err.textContent = "";
      }
      $("#admin-user").value = "";
      $("#admin-pass").value = "";
      show(overlayAdmin);
    });
  $("#btn-admin-cancel") &&
    $("#btn-admin-cancel").addEventListener("click", () => hide(overlayAdmin));
  formAdmin &&
    formAdmin.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = ($("#admin-user").value || "").trim();
      const pass = ($("#admin-pass").value || "").trim();
      const err = $("#admin-login-error");
      if (user === "destart" && pass === "destart") {
        sessionStorage.setItem("dsnsc_admin_ok", "1");
        hide(overlayAdmin);
        window.open("admin.html", "dsnsc_admin", "noopener,noreferrer");
      } else {
        if (err) {
          err.hidden = false;
          err.textContent = "Usuário ou senha inválidos.";
        }
      }
    });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFormError("");

    const data = collectFormData();
    const err = validateCadastro(data);
    if (err) {
      showFormError(err);
      if (!form.reportValidity()) {
        /* HTML5 também sinaliza campos required */
      }
      return;
    }

    // Bloqueia se o formulário nativo ainda estiver incompleto
    if (!form.checkValidity()) {
      showFormError("Preencha todos os dados antes de clicar em START.");
      form.reportValidity();
      return;
    }

    const btn = $("#btn-start");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "SALVANDO…";
    }

    try {
      if (window.DsnscLeads) {
        const result = await window.DsnscLeads.saveCadastro(data);
        if (window.DsnscLeads.isConfigured() && !result.ok) {
          showFormError("Não foi possível salvar o cadastro. Tente de novo.");
          return;
        }
        if (!window.DsnscLeads.isConfigured()) {
          console.warn(
            "[DSNSC] Configure js/supabase-config.js e rode supabase/schema.sql para gravar no Supabase."
          );
        }
      }
      await startGame(data);
    } catch (ex) {
      console.error(ex);
      showFormError("Erro ao iniciar. Verifique o cadastro e tente novamente.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "START — JOGAR";
      }
    }
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

  /** Música de fundo + controle de volume */
  function initBgMusic() {
    const audio = $("#bg-music");
    const btn = $("#btn-audio-toggle");
    const slider = $("#audio-volume");
    if (!audio || !btn || !slider) return;

    const savedVol = localStorage.getItem("dsnsc_vol");
    const savedMute = localStorage.getItem("dsnsc_mute") === "1";
    const vol = savedVol != null ? Math.min(1, Math.max(0, Number(savedVol))) : 0.45;
    slider.value = String(Math.round(vol * 100));
    audio.volume = vol;
    audio.muted = savedMute;
    btn.classList.toggle("is-muted", savedMute || vol === 0);
    btn.textContent = savedMute || vol === 0 ? "OFF" : "ON";

    function persist() {
      localStorage.setItem("dsnsc_vol", String(audio.volume));
      localStorage.setItem("dsnsc_mute", audio.muted ? "1" : "0");
    }

    function syncBtn() {
      const off = audio.muted || audio.volume === 0;
      btn.classList.toggle("is-muted", off);
      btn.textContent = off ? "OFF" : "ON";
      btn.setAttribute("aria-pressed", off ? "true" : "false");
    }

    function tryPlay() {
      if (audio.muted && audio.volume > 0) return;
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    }

    slider.addEventListener("input", () => {
      const v = Number(slider.value) / 100;
      audio.volume = v;
      if (v > 0 && audio.muted) audio.muted = false;
      syncBtn();
      persist();
      tryPlay();
    });

    btn.addEventListener("click", () => {
      if (audio.muted || audio.volume === 0) {
        audio.muted = false;
        if (audio.volume === 0) {
          audio.volume = 0.45;
          slider.value = "45";
        }
        tryPlay();
      } else {
        audio.muted = true;
        audio.pause();
      }
      syncBtn();
      persist();
    });

    // Tenta ao abrir; se o browser bloquear, inicia no primeiro toque/clique
    tryPlay();
    const unlock = () => {
      if (!audio.muted) tryPlay();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }

  initBgMusic();

  updateRotateHint();
})();
