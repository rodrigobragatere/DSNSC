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

  /** Municípios por UF (cache em memória; fonte: IBGE) */
  const cidadesCache = Object.create(null);
  const fieldEstado = $("#field-estado");
  const fieldCidade = $("#field-cidade");

  function resetCidadeSelect(placeholder) {
    fieldCidade.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder || "Selecione o estado…";
    fieldCidade.appendChild(opt);
    fieldCidade.value = "";
    fieldCidade.disabled = true;
  }

  function fillCidadeSelect(cidades) {
    fieldCidade.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = "Selecione a cidade…";
    fieldCidade.appendChild(first);
    for (let i = 0; i < cidades.length; i++) {
      const o = document.createElement("option");
      o.value = cidades[i];
      o.textContent = cidades[i];
      fieldCidade.appendChild(o);
    }
    fieldCidade.disabled = false;
  }

  async function loadCidadesPorUf(uf) {
    if (!uf || uf.length !== 2) {
      resetCidadeSelect("Selecione o estado…");
      return;
    }
    if (cidadesCache[uf]) {
      fillCidadeSelect(cidadesCache[uf]);
      return;
    }
    resetCidadeSelect("Carregando cidades…");
    try {
      const url =
        "https://servicodados.ibge.gov.br/api/v1/localidades/estados/" +
        encodeURIComponent(uf) +
        "/municipios?orderBy=nome";
      const res = await fetch(url);
      if (!res.ok) throw new Error("IBGE " + res.status);
      const data = await res.json();
      const nomes = (Array.isArray(data) ? data : [])
        .map((m) => (m && m.nome ? String(m.nome) : ""))
        .filter(Boolean);
      cidadesCache[uf] = nomes;
      if (fieldEstado.value === uf) fillCidadeSelect(nomes);
    } catch (err) {
      console.warn("[DSNSC] cidades IBGE:", err);
      resetCidadeSelect("Falha ao carregar — escolha o estado de novo");
    }
  }

  fieldEstado.addEventListener("change", () => {
    loadCidadesPorUf((fieldEstado.value || "").trim().toUpperCase());
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
    const hudH = hud ? hud.getBoundingClientRect().height : 40;
    const pad = 12;

    const maxW = Math.max(320, window.innerWidth - pad);
    const maxH = Math.max(180, window.innerHeight - hudH - pad);

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
      game.clearGodMode();
      game.stop();
      game = null;
    }
    cheatBuf = "";
    stopWinFireworks();
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
    const maxE = data.maxEnergy || 4;
    $("#hud-vidas").textContent = (data.energy != null ? data.energy : data.lives) + "/" + maxE;
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
    stopWinFireworks();

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
        // Após fogos do herói: sem fogos — só o card da bolsa
        stopWinFireworks();
        hide(loseSplash);
        show(winSplash);
        endCard.classList.add("is-win");
        overlayEnd.classList.add("is-win");
        $("#end-pontos-win").textContent = result.score;
        winSplash.classList.remove("boom-play");
        show(overlayEnd);
        return;
      } else {
        stopWinFireworks();
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

  let winFwRaf = null;
  let winFwParts = [];

  function stopWinFireworks() {
    if (winFwRaf) {
      cancelAnimationFrame(winFwRaf);
      winFwRaf = null;
    }
    winFwParts = [];
    const fwCanvas = $("#win-fireworks");
    if (fwCanvas) {
      const ctx = fwCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
    }
  }

  function startWinFireworks() {
    stopWinFireworks();
    const fwCanvas = $("#win-fireworks");
    if (!fwCanvas) return;
    const ctx = fwCanvas.getContext("2d");
    if (!ctx) return;

    const colors = [
      "#e74c3c",
      "#f4c542",
      "#3fa3a9",
      "#ffffff",
      "#e67e22",
      "#9b59b6",
      "#2ecc71",
      "#3498db",
    ];

    function resize() {
      const rect = overlayEnd.getBoundingClientRect();
      fwCanvas.width = Math.max(1, Math.floor(rect.width || window.innerWidth));
      fwCanvas.height = Math.max(1, Math.floor(rect.height || window.innerHeight));
    }
    resize();

    function boom(x, y, color) {
      const n = 42 + ((Math.random() * 24) | 0);
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.15;
        const sp = 2 + Math.random() * 6;
        winFwParts.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 55 + ((Math.random() * 35) | 0),
          max: 90,
          color: Math.random() < 0.3
            ? colors[(Math.random() * colors.length) | 0]
            : color,
          size: 2 + Math.random() * 3.5,
        });
      }
    }

    // Estouro inicial atrás do card
    for (let i = 0; i < 5; i++) {
      boom(
        fwCanvas.width * (0.15 + Math.random() * 0.7),
        fwCanvas.height * (0.12 + Math.random() * 0.35),
        colors[(Math.random() * colors.length) | 0]
      );
    }

    let tick = 0;
    function frame() {
      tick++;
      ctx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
      if (tick % 12 === 1) {
        boom(
          60 + Math.random() * (fwCanvas.width - 120),
          40 + Math.random() * (fwCanvas.height * 0.45),
          colors[(Math.random() * colors.length) | 0]
        );
      }
      winFwParts = winFwParts.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;
        p.vx *= 0.99;
        p.life--;
        const a = Math.max(0, p.life / 40);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        return p.life > 0;
      });
      ctx.globalAlpha = 1;
      if (tick < 280 || winFwParts.length) {
        winFwRaf = requestAnimationFrame(frame);
      } else {
        winFwRaf = null;
      }
    }
    winFwRaf = requestAnimationFrame(frame);
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
    const estado = ($("#field-estado").value || "").trim().toUpperCase();
    const cidade = ($("#field-cidade").value || "").trim();
    const curso = $("#field-curso").value || "";
    const tema = (form.querySelector('input[name="tema"]:checked') || {}).value || "";
    const hero = (form.querySelector('input[name="hero"]:checked') || {}).value || "";
    const pele = ($("#field-pele").value || "branco").trim();
    return { nome, email, telefone, estado, cidade, curso, tema, hero, pele };
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
    if (!data.estado || data.estado.length !== 2) {
      return "Selecione o estado (UF).";
    }
    if (!data.cidade || data.cidade.length < 2) {
      return "Informe a cidade.";
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
      btn.textContent = "ABRINDO…";
    }

    try {
      // Cadastro em segundo plano — não atrasa a abertura do jogo
      if (window.DsnscLeads) {
        window.DsnscLeads.saveCadastro(data)
          .then((result) => {
            if (!result) return;
            if (result.duplicate) {
              console.info("[DSNSC] E-mail já cadastrado — sem novo insert.");
            }
            if (result.offline) {
              console.warn(
                "[DSNSC] Banco remoto indisponível; cadastro no aparelho.",
                result.error
              );
            }
            if (result.ok === false) {
              console.warn("[DSNSC] Falha ao salvar cadastro:", result.error);
            }
          })
          .catch((err) => console.warn("[DSNSC] Save async:", err));
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

  /** Cor de pele do herói: atualiza preview + campo hidden */
  function setHeroSkin(hero, skin) {
    const allowed = ["branco", "pardo", "negro"];
    const s = allowed.indexOf(skin) >= 0 ? skin : "branco";
    const h = hero === "girl" ? "girl" : "boy";
    $("#field-pele").value = s;
    ["boy", "girl"].forEach((hid) => {
      const img = $("#preview-" + hid);
      if (!img) return;
      img.src = window.HeroSprites
        ? window.HeroSprites.previewSrc(hid, s)
        : "assets/sprites/skins/" + hid + "_preview_" + s + ".png?v=8";
    });
    document.querySelectorAll(".skin-swatch").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-skin") === s);
    });
    const radio = form.querySelector('input[name="hero"][value="' + h + '"]');
    if (radio) radio.checked = true;
  }

  document.querySelectorAll(".skin-swatch").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setHeroSkin(btn.getAttribute("data-hero"), btn.getAttribute("data-skin"));
    });
  });

  form.querySelectorAll('input[name="hero"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const pele = $("#field-pele").value || "branco";
      setHeroSkin(radio.value, pele);
    });
  });

  // Pré-carrega sprites dos heróis (todas as peles)
  if (window.HeroSprites) {
    window.HeroSprites.preload().catch((err) => {
      console.warn("Sprites não carregaram:", err);
    });
  }

  let cheatBuf = "";

  window.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    const typingField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    // Cheat "god" — invencível; desliga ao fechar/sair do jogo
    if (
      !typingField &&
      gameScreen.classList.contains("active") &&
      e.key.length === 1 &&
      /[a-z]/i.test(e.key)
    ) {
      cheatBuf = (cheatBuf + e.key.toLowerCase()).slice(-8);
      if (cheatBuf.endsWith("god")) {
        cheatBuf = "";
        if (game && !game.ended && !game.paused) {
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
    stopWinFireworks();
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
