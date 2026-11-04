/**
 * Persistência de cadastros:
 * - Produção (Vercel HTTPS) → /api/cadastros (Blob)
 * - Local/LAN → Supabase Docker (+ fallback localStorage)
 */
(function (global) {
  function isPrivateHost(host) {
    if (!host) return true;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    return false;
  }

  function useCloudApi() {
    try {
      if (typeof location === "undefined") return false;
      if (location.protocol !== "https:") return false;
      return !isPrivateHost(location.hostname || "");
    } catch (_) {
      return false;
    }
  }

  async function apiRequest(method, body, query) {
    var url = "/api/cadastros";
    if (query) {
      url += "?" + new URLSearchParams(query).toString();
    }
    var opts = { method: method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    var r = await fetch(url, opts);
    var json = await r.json().catch(function () {
      return {};
    });
    if (!r.ok) {
      throw new Error(json.error || r.statusText || "Falha na API");
    }
    return json;
  }

  function getClient() {
    const cfg = global.SUPABASE_CONFIG || {};
    if (cfg.enabled === false || !cfg.url || !cfg.anonKey) return null;
    try {
      if (
        typeof location !== "undefined" &&
        location.protocol === "https:" &&
        String(cfg.url).indexOf("http:") === 0
      ) {
        return null;
      }
    } catch (_) {}
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
    if (useCloudApi()) return true;
    const cfg = global.SUPABASE_CONFIG || {};
    if (cfg.enabled === false) return false;
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
      pele: r.pele || "branco",
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
      pele: data.pele || "branco",
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 240) : null,
      origem: "dsnsc-web",
    };

    saveLocal(payload);

    if (useCloudApi()) {
      try {
        await apiRequest("POST", payload);
        return { ok: true, remote: true, local: true, via: "vercel-api" };
      } catch (ex) {
        console.error("API cadastros:", ex);
        return {
          ok: true,
          remote: false,
          local: true,
          offline: true,
          error: (ex && ex.message) || "Falha na API",
        };
      }
    }

    const client = getClient();
    if (!client) {
      return {
        ok: true,
        remote: false,
        local: true,
        error: isConfigured()
          ? "Cliente Supabase indisponível."
          : "Supabase não configurado (js/supabase-config.js).",
      };
    }

    try {
      const { error } = await client.from("cadastros").insert([payload]);
      if (error) {
        const msg = error.message || "Falha ao salvar no banco.";
        console.error("Supabase insert:", error);
        if (/failed to fetch|network|load failed|cors|timeout/i.test(msg)) {
          return { ok: true, remote: false, local: true, offline: true, error: msg };
        }
        return { ok: false, remote: true, error: msg };
      }
      return { ok: true, remote: true, local: true };
    } catch (ex) {
      console.warn("Supabase offline/rede:", ex);
      return {
        ok: true,
        remote: false,
        local: true,
        offline: true,
        error: (ex && ex.message) || "Sem conexão com o banco.",
      };
    }
  }

  async function listCadastros() {
    if (useCloudApi()) {
      try {
        const json = await apiRequest("GET");
        return { ok: true, data: json.data || [], source: "vercel-api" };
      } catch (ex) {
        console.error("API list:", ex);
      }
    }

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
    }
    const local = readLocal().map(normalizeLocalRow).reverse();
    return {
      ok: true,
      data: local,
      source: client ? "localStorage (fallback)" : "localStorage",
      error: client ? "Falha no remoto; mostrando local." : undefined,
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
      pele: data.pele || "branco",
      origem: "admin",
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 240) : null,
    };

    if (useCloudApi()) {
      try {
        await apiRequest("POST", payload);
        return { ok: true };
      } catch (ex) {
        return { ok: false, error: (ex && ex.message) || "Falha na API" };
      }
    }

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
      id: id,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      curso: data.curso,
      tema: data.tema,
      hero: data.hero,
      pele: data.pele || "branco",
      created_at: data.created_at,
      origem: data.origem || "admin",
    };

    if (useCloudApi() && id && !String(id).startsWith("local-")) {
      try {
        await apiRequest("PUT", payload);
        return { ok: true };
      } catch (ex) {
        return { ok: false, error: (ex && ex.message) || "Falha na API" };
      }
    }

    const client = getClient();
    if (client && id && !String(id).startsWith("local-")) {
      const { error } = await client.from("cadastros").update(payload).eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    const list = readLocal();
    const idx = list.findIndex(
      (r) => String(r.id) === String(id) || String(r.at) === String(id)
    );
    if (idx < 0) return { ok: false, error: "Registro local não encontrado." };
    list[idx] = { ...list[idx], ...payload };
    writeLocal(list);
    return { ok: true };
  }

  async function deleteCadastro(id) {
    if (useCloudApi() && id && !String(id).startsWith("local-")) {
      try {
        await apiRequest("DELETE", null, { id: id });
        return { ok: true };
      } catch (ex) {
        return { ok: false, error: (ex && ex.message) || "Falha na API" };
      }
    }

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
    isConfigured: isConfigured,
    saveCadastro: saveCadastro,
    listCadastros: listCadastros,
    createCadastro: createCadastro,
    updateCadastro: updateCadastro,
    deleteCadastro: deleteCadastro,
  };
})(window);
