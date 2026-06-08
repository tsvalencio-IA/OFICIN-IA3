// OFICIN-IA - proxy seguro da IA Diagnostico Automotivo para Vercel.
// O front chama somente /api/diagnostico. Credenciais ficam em variaveis de ambiente.

const SUPABASE_URL = "https://luazuifvwyeabuldlvzw.supabase.co";
const DIAGNOSTIC_CHAT_URL = `${SUPABASE_URL}/functions/v1/diagnostic-chat`;

function corsOrigin(req) {
  const allowed = process.env.ALLOWED_ORIGIN || "*";
  if (allowed === "*") return "*";
  const origin = req.headers.origin || "";
  return origin === allowed ? allowed : allowed;
}

function sendJson(req, res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", corsOrigin(req));
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Body JSON invalido.");
  }
}

function pickText(body, keys) {
  for (const key of keys) {
    const value = body && body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickPergunta(body) {
  return pickText(body, ["pergunta", "message", "text", "prompt"]);
}

function plain(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function montarPerguntaComContexto(body) {
  const pergunta = pickPergunta(body);
  if (!pergunta) throw new Error("Pergunta vazia.");

  const contexto = body.contexto || body.context || {};
  const contextoTexto =
    contexto.contextoTexto ||
    contexto.resumoTexto ||
    body.contextoTexto ||
    body.resumoTexto ||
    "";

  const partes = [
    "Voce e um especialista em diagnostico automotivo trabalhando junto com o OFICIN-IA.",
    "Responda em portugues do Brasil, de forma objetiva e profissional para uma oficina mecanica.",
    "Analise o problema informado e organize a resposta em:",
    "1. Possiveis causas",
    "2. Checklist de diagnostico",
    "3. Testes recomendados",
    "4. Interpretacao dos resultados",
    "5. Proximo passo",
    "",
    "Problema informado pelo usuario:",
    pergunta
  ];

  if (contextoTexto) {
    partes.push("", "Contexto interno do OFICIN-IA:", String(contextoTexto));
  } else if (contexto && Object.keys(contexto).length) {
    partes.push("", "Contexto interno do OFICIN-IA:", plain(contexto));
  }

  return partes.join("\n");
}

function credenciais() {
  const email = process.env.DIAGNOSTICO_EMAIL || "";
  const password = process.env.DIAGNOSTICO_PASSWORD || "";
  const anonKey = process.env.DIAGNOSTICO_SUPABASE_ANON_KEY || "";

  if (!email || !password || !anonKey) {
    throw new Error("Configure DIAGNOSTICO_EMAIL, DIAGNOSTICO_PASSWORD e DIAGNOSTICO_SUPABASE_ANON_KEY na Vercel.");
  }

  return { email, password, anonKey };
}

async function loginSupabase() {
  const { email, password, anonKey } = credenciais();

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey
    },
    body: JSON.stringify({ email, password })
  });

  const text = await resp.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = null; }

  if (!resp.ok || !data || !data.access_token) {
    throw new Error("Falha no login Supabase da IA Diagnostico: " + resp.status + " " + text);
  }

  return { token: data.access_token, anonKey };
}

function parseSseDiagnosticChat(text) {
  if (!text) return "";
  const lines = String(text).split(/\r?\n/);
  let output = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith("data:")) continue;

    const raw = trimmed.slice(5).trim();
    if (!raw || raw === "[DONE]") continue;

    try {
      const obj = JSON.parse(raw);
      output +=
        obj?.choices?.[0]?.delta?.content ||
        obj?.choices?.[0]?.message?.content ||
        obj?.delta ||
        obj?.content ||
        obj?.text ||
        obj?.message ||
        "";
    } catch {
      output += raw;
    }
  }

  return output.trim();
}

async function chamarDiagnosticChat(perguntaComContexto) {
  const { token, anonKey } = await loginSupabase();
  const payload = {
    messages: [
      { role: "assistant", content: "welcome" },
      { role: "user", content: perguntaComContexto }
    ],
    language: "pt"
  };

  const resp = await fetch(DIAGNOSTIC_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": anonKey
    },
    body: JSON.stringify(payload)
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error("Falha no diagnostic-chat: " + resp.status + " " + text);
  }

  return {
    resposta: parseSseDiagnosticChat(text) || text.trim(),
    raw: text,
    payload
  };
}

async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return sendJson(req, res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, erro: "Use POST." });
  }

  try {
    const body = await readJsonBody(req);
    const perguntaComContexto = montarPerguntaComContexto(body);
    const resultado = await chamarDiagnosticChat(perguntaComContexto);

    return sendJson(req, res, 200, {
      ok: true,
      resposta: resultado.resposta,
      provider: "appdiagnosticoautomotivo-supabase",
      payload: resultado.payload
    });
  } catch (error) {
    return sendJson(req, res, 500, {
      ok: false,
      erro: error.message || "Erro interno no proxy da IA Diagnostico."
    });
  }
}

module.exports = handler;
