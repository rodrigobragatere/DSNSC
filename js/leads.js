/**
 * Persistência de cadastros → Supabase (+ fallback localStorage)
 */
(function (global) {
  function getClient() {
    const cfg = global.SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey) return null;
    if (!global.supabase || typeof global.supabase.createClient !== "function") {
      console.warn("Supabase SDK não carregou.");
      return null;
    }
    if (!global.__dsnscSupabase) {
      global.__dsnscSupabase = global.supabase.createClient(cfg.url, cfg.anonKey);
    }
    return global.__dsnscSupabase;
  }

  function isConfigured() {
    const cfg = global.SUPABASE_CONFIG || {};
    return !!(cfg.url && cfg.anonKey);
  }

  function readLocal() {
    try {
      return JSON.parse(localStorage.getItem("dsnsc_leads") || "[]");
    } catch (_) {
      return [];
    }
  }

  function writeLocal(list) {
    try {
      localStorage.setItem("dsnsc_leads", JSON.stringify(list.slice(-500)));
    } catch (_) {}
  }

  function saveLocal(data) {
    const leads = readLocal();
    leads.push({
      ...data,
      id: data.id || "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      created_at: data.created_at || new Date().toISOString(),
      at: new Date().toISOString(),
    });
    writeLocal(leads);
  }

  function normalizeLocalRow(r) {
    return {
      id: r.id || r.at || "local-" + Math.random().toString(36).slice(2, 9),
      created_at: r.created_at || r.at || null,
      nome: r.nome || "",
      email: r.email || "",
      telefone: r.telefone || "",
      curso: r.curso || "",
      tema: r.tema || "",
      hero: r.hero || "",
      origem: r.origem || "localStorage",
      user_agent: r.user_agent || null,
      _local: true,
    };
  }

  async function saveCadastro(data) {
    const payload = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      curso: data.curso,
      tema: data.tema,
      hero: data.hero,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 240) : null,
      origem: "dsnsc-web",
    };

    saveLocal(payload);

    const client = getClient();
    if (!client) {
      return {
        ok: true,
        remote: false,
        error: isConfigured()
          ? "Cliente Supabase indisponível."
          : "Supabase não configurado (js/supabase-config.js).",
      };
    }

    const { error } = await client.from("cadastros").insert([payload]);
    if (error) {
      console.error("Supabase insert:", error);
      return { ok: false, remote: true, error: error.message || "Falha ao salvar no banco." };
    }
    return { ok: true, remote: true };
  }

  async function listCadastros() {
    const client = getClient();
    if (client) {
      const { data, error } = await client
        .from("cadastros")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) {
        return { ok: true, data: data || [], source: "supabase" };
      }
      console.error("Supabase list:", error);
      // fallback local
    }
    const local = readLocal().map(normalizeLocalRow).reverse();
    return {
      ok: true,
      data: local,
      source: client ? "localStorage (fallback)" : "localStorage",
      error: client ? "Falha no Supabase; mostrando local." : undefined,
    };
  }

  async function createCadastro(data) {
    const payload = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      curso: data.curso,
      tema: data.tema,
      hero: data.hero,
      origem: "admin",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 240) : null,
    };
    const client = getClient();
    if (client) {
      const { error } = await client.from("cadastros").insert([payload]);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    saveLocal(payload);
    return { ok: true };
  }

  async function updateCadastro(id, data) {
    const payload = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      curso: data.curso,
      tema: data.tema,
      hero: data.hero,
    };
    const client = getClient();
    if (client && id && !String(id).startsWith("local-")) {
      const { error } = await client.from("cadastros").update(payload).eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    const list = readLocal();
    const idx = list.findIndex((r) => String(r.id) === String(id) || String(r.at) === String(id));
    if (idx < 0) return { ok: false, error: "Registro local não encontrado." };
    list[idx] = { ...list[idx], ...payload };
    writeLocal(list);
    return { ok: true };
  }

  async function deleteCadastro(id) {
    const client = getClient();
    if (client && id && !String(id).startsWith("local-")) {
      const { error } = await client.from("cadastros").delete().eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    const list = readLocal().filter(
      (r) => String(r.id) !== String(id) && String(r.at) !== String(id)
    );
    writeLocal(list);
    return { ok: true };
  }

  global.DsnscLeads = {
    isConfigured,
    saveCadastro,
    listCadastros,
    createCadastro,
    updateCadastro,
    deleteCadastro,
  };
})(window);
