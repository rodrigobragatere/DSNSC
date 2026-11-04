(function () {
  const $ = (s) => document.querySelector(s);
  const AUTH_KEY = "dsnsc_admin_ok";

  const gate = $("#admin-gate");
  const app = $("#admin-app");
  const tbody = $("#admin-tbody");
  const statusEl = $("#admin-status");
  const modal = $("#admin-modal");
  const form = $("#form-admin-crud");
  const filterCurso = $("#filter-curso");
  const filterFrom = $("#filter-date-from");
  const filterTo = $("#filter-date-to");

  let allRows = [];
  let rows = [];
  let dataSource = "—";

  function authed() {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  }

  function setStatus(msg, isErr) {
    statusEl.textContent = msg || "";
    statusEl.style.color = isErr ? "#c0392b" : "#1a3a5c";
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("pt-BR");
    } catch (_) {
      return iso;
    }
  }

  function dayKey(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function openModal(row) {
    $("#admin-modal-title").textContent = row && row.id ? "Editar cadastro" : "Novo cadastro";
    $("#crud-id").value = (row && row.id) || "";
    $("#crud-nome").value = (row && row.nome) || "";
    $("#crud-email").value = (row && row.email) || "";
    $("#crud-telefone").value = (row && row.telefone) || "";
    $("#crud-curso").value = (row && row.curso) || "";
    $("#crud-tema").value = (row && row.tema) || "saude";
    $("#crud-hero").value = (row && row.hero) || "boy";
    $("#crud-error").hidden = true;
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  function fillCursoOptions() {
    const current = filterCurso.value;
    const cursos = Array.from(
      new Set(allRows.map((r) => (r.curso || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
    filterCurso.innerHTML = '<option value="">Todos os cursos</option>';
    cursos.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      filterCurso.appendChild(opt);
    });
    if (current && cursos.indexOf(current) >= 0) filterCurso.value = current;
  }

  function applyFilters() {
    const curso = (filterCurso.value || "").trim();
    const from = filterFrom.value || "";
    const to = filterTo.value || "";

    rows = allRows.filter((r) => {
      if (curso && (r.curso || "").trim() !== curso) return false;
      const day = dayKey(r.created_at);
      if (!day) return !from && !to;
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });

    const parts = [rows.length + " de " + allRows.length + " registro(s)"];
    if (from || to || curso) {
      const bits = [];
      if (from && to) bits.push("data " + from + " → " + to);
      else if (from) bits.push("a partir de " + from);
      else if (to) bits.push("até " + to);
      if (curso) bits.push("curso: " + curso);
      parts.push("filtro: " + bits.join(" · "));
    }
    parts.push("fonte: " + dataSource);
    setStatus(parts.join(" · "));
    render();
  }

  function clearFilters() {
    filterFrom.value = "";
    filterTo.value = "";
    filterCurso.value = "";
    applyFilters();
  }

  function render() {
    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="text-center py-4">Nenhum cadastro encontrado com esses filtros.</td></tr>';
      return;
    }
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        fmtDate(r.created_at) +
        "</td>" +
        "<td>" +
        escapeHtml(r.nome) +
        "</td>" +
        "<td>" +
        escapeHtml(r.email) +
        "</td>" +
        "<td>" +
        escapeHtml(r.telefone) +
        "</td>" +
        "<td>" +
        escapeHtml(r.curso) +
        "</td>" +
        "<td>" +
        escapeHtml(r.tema) +
        "</td>" +
        "<td>" +
        escapeHtml(r.hero) +
        "</td>" +
        '<td class="actions">' +
        '<button type="button" class="btn-xs" data-edit="' +
        r.id +
        '">Editar</button>' +
        '<button type="button" class="btn-xs danger" data-del="' +
        r.id +
        '">Excluir</button>' +
        "</td>";
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function load() {
    setStatus("Carregando…");
    const res = await window.DsnscLeads.listCadastros();
    if (!res.ok) {
      setStatus(res.error || "Erro ao carregar", true);
      allRows = [];
      rows = [];
      dataSource = "—";
      fillCursoOptions();
      render();
      return;
    }
    allRows = res.data || [];
    dataSource = res.source || "—";
    fillCursoOptions();
    applyFilters();
  }

  function exportXls() {
    if (!rows.length) {
      setStatus("Nada para exportar com o filtro atual.", true);
      return;
    }
    if (!window.XLSX) {
      setStatus("Biblioteca XLSX não carregou.", true);
      return;
    }
    const sheetData = rows.map((r) => ({
      Data: fmtDate(r.created_at),
      Nome: r.nome,
      Email: r.email,
      Telefone: r.telefone,
      Curso: r.curso,
      Tema: r.tema,
      Heroi: r.hero,
      Origem: r.origem || "",
      ID: r.id || "",
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cadastros");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, "dsnsc-cadastros-" + stamp + ".xls", { bookType: "xls" });
    setStatus("Arquivo .xls exportado (" + rows.length + " linha(s) filtradas).");
  }

  if (!authed()) {
    gate.classList.remove("hidden");
    app.classList.add("hidden");
    return;
  }

  gate.classList.add("hidden");
  app.classList.remove("hidden");
  load();

  $("#btn-admin-refresh").addEventListener("click", load);
  $("#btn-admin-new").addEventListener("click", () => openModal(null));
  $("#btn-admin-xls").addEventListener("click", exportXls);
  $("#btn-filter-apply").addEventListener("click", applyFilters);
  $("#btn-filter-clear").addEventListener("click", clearFilters);
  filterCurso.addEventListener("change", applyFilters);
  filterFrom.addEventListener("change", applyFilters);
  filterTo.addEventListener("change", applyFilters);

  $("#btn-admin-logout").addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    window.close();
    setTimeout(() => {
      window.location.href = "index.html";
    }, 150);
  });
  $("#btn-crud-cancel").addEventListener("click", closeModal);

  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const editId = btn.getAttribute("data-edit");
    const delId = btn.getAttribute("data-del");
    if (editId) {
      const row = allRows.find((r) => String(r.id) === String(editId));
      openModal(row || null);
      return;
    }
    if (delId) {
      if (!confirm("Excluir este cadastro?")) return;
      const res = await window.DsnscLeads.deleteCadastro(delId);
      if (!res.ok) {
        setStatus(res.error || "Falha ao excluir", true);
        return;
      }
      await load();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("#crud-error");
    errEl.hidden = true;
    const payload = {
      id: $("#crud-id").value || null,
      nome: $("#crud-nome").value.trim(),
      email: $("#crud-email").value.trim(),
      telefone: $("#crud-telefone").value.trim(),
      curso: $("#crud-curso").value.trim(),
      tema: $("#crud-tema").value,
      hero: $("#crud-hero").value,
    };
    if (!payload.nome || !payload.email || !payload.telefone || !payload.curso) {
      errEl.hidden = false;
      errEl.textContent = "Preencha todos os campos.";
      return;
    }
    const res = payload.id
      ? await window.DsnscLeads.updateCadastro(payload.id, payload)
      : await window.DsnscLeads.createCadastro(payload);
    if (!res.ok) {
      errEl.hidden = false;
      errEl.textContent = res.error || "Erro ao salvar.";
      return;
    }
    closeModal();
    await load();
  });
})();
