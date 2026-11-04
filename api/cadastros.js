/**
 * API de cadastros (Vercel Serverless + Blob Storage)
 * Produção HTTPS — evita Mixed Content do Supabase local.
 */
const { list, put, del } = require("@vercel/blob");
const crypto = require("crypto");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      resolve(req.body);
      return;
    }
    let data = "";
    req.on("data", (c) => {
      data += c;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function normalizeRow(body, id, createdAt) {
  return {
    id: id,
    created_at: createdAt || new Date().toISOString(),
    nome: String(body.nome || "").trim().slice(0, 80),
    email: String(body.email || "").trim().slice(0, 120),
    telefone: String(body.telefone || "").trim().slice(0, 20),
    curso: String(body.curso || "").trim().slice(0, 120),
    tema: String(body.tema || "").trim().slice(0, 40),
    hero: body.hero === "girl" ? "girl" : "boy",
    pele: ["branco", "pardo", "negro"].includes(body.pele) ? body.pele : "branco",
    user_agent: body.user_agent
      ? String(body.user_agent).slice(0, 240)
      : null,
    origem: body.origem || "dsnsc-web",
  };
}

async function readBlobJson(url) {
  const r = await fetch(url, {
    headers: {
      Authorization: "Bearer " + process.env.BLOB_READ_WRITE_TOKEN,
    },
  });
  if (!r.ok) return null;
  return r.json();
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(500).json({
      ok: false,
      error: "BLOB_READ_WRITE_TOKEN não configurado na Vercel.",
    });
    return;
  }

  try {
    if (req.method === "GET") {
      const { blobs } = await list({ prefix: "cadastros/", limit: 1000 });
      const rows = [];
      for (let i = 0; i < blobs.length; i++) {
        const row = await readBlobJson(blobs[i].url);
        if (row) rows.push(row);
      }
      rows.sort(function (a, b) {
        return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      });
      res.status(200).json({ ok: true, data: rows });
      return;
    }

    if (req.method === "POST") {
      const body = await parseBody(req);
      const id = crypto.randomUUID();
      const row = normalizeRow(body, id);
      if (!row.nome || !row.email || !row.telefone || !row.curso || !row.tema) {
        res.status(400).json({ ok: false, error: "Campos obrigatórios ausentes." });
        return;
      }
      await put("cadastros/" + id + ".json", JSON.stringify(row), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: false,
      });
      res.status(201).json({ ok: true, data: row });
      return;
    }

    if (req.method === "PUT") {
      const body = await parseBody(req);
      const id = body.id;
      if (!id) {
        res.status(400).json({ ok: false, error: "id obrigatório" });
        return;
      }
      const row = normalizeRow(body, id, body.created_at);
      if (!row.nome || !row.email || !row.telefone || !row.curso || !row.tema) {
        res.status(400).json({ ok: false, error: "Campos obrigatórios ausentes." });
        return;
      }
      await put("cadastros/" + id + ".json", JSON.stringify(row), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      res.status(200).json({ ok: true, data: row });
      return;
    }

    if (req.method === "DELETE") {
      const body =
        req.query && req.query.id ? { id: req.query.id } : await parseBody(req);
      const id = body.id;
      if (!id) {
        res.status(400).json({ ok: false, error: "id obrigatório" });
        return;
      }
      const { blobs } = await list({
        prefix: "cadastros/" + id,
        limit: 10,
      });
      const urls = blobs.map(function (b) {
        return b.url;
      });
      if (urls.length) await del(urls);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: (e && e.message) || "Erro interno" });
  }
};
