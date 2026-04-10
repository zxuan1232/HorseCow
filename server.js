/**
 * 本地 / 云部署：托管静态文件 + 将 AI 请求转发到阿里云百炼（DashScope OpenAI 兼容）/ 火山方舟 / Gemini / OpenAI 兼容接口。
 * 密钥只放在环境变量（或平台「Environment」配置）中，不写进前端。
 */
const path = require("path");
const envPath = path.join(__dirname, ".env");
require("dotenv").config({ path: envPath });

const express = require("express");

(function logAiKeyHint() {
  var prov = (process.env.AI_PROVIDER || "bailian").toLowerCase();
  if (prov === "openai") {
    if (!process.env.OPENAI_API_KEY || !String(process.env.OPENAI_API_KEY).trim()) {
      console.warn("[HorseCow] 未读取到 OPENAI_API_KEY，已从文件加载:", envPath);
    }
  } else if (prov === "gemini") {
    if (!process.env.GEMINI_API_KEY || !String(process.env.GEMINI_API_KEY).trim()) {
      console.warn("[HorseCow] 未读取到 GEMINI_API_KEY，已从文件加载:", envPath);
    }
  } else if (prov === "bailian" || prov === "dashscope") {
    var ds =
      (process.env.DASHSCOPE_API_KEY && String(process.env.DASHSCOPE_API_KEY).trim()) ||
      (process.env.BAILIAN_API_KEY && String(process.env.BAILIAN_API_KEY).trim());
    if (!ds) {
      console.warn(
        "[HorseCow] 未读取到 DASHSCOPE_API_KEY（或 BAILIAN_API_KEY），百炼密钥见控制台，已从文件加载:",
        envPath,
      );
    }
  } else if (prov === "ark" || prov === "volcengine") {
    if (!process.env.ARK_API_KEY || !String(process.env.ARK_API_KEY).trim()) {
      console.warn("[HorseCow] 未读取到 ARK_API_KEY，已从文件加载:", envPath);
    }
    var ep = process.env.ARK_ENDPOINT_ID || process.env.ARK_MODEL;
    if (!ep || !String(ep).trim()) {
      console.warn("[HorseCow] 未读取到 ARK_ENDPOINT_ID（方舟接入点 ID，形如 ep-xxxx），已从文件加载:", envPath);
    }
  }
})();

const MAX_PROMPT_CHARS = 150000;

/** 把 undici「fetch failed」等转成可操作的说明（常见于大陆无法直连 Google） */
function formatUpstreamError(err) {
  if (!err) return "未知错误";
  var msg = String(err.message || err);
  var code = err.cause && err.cause.code ? String(err.cause.code) : "";
  if (/fetch failed/i.test(msg) || code === "ENOTFOUND" || code === "ECONNRESET" || code === "ETIMEDOUT" || code === "EAI_AGAIN") {
    var tail = code ? "（" + code + "）" : "";
    return (
      "连不上模型接口 " +
      tail +
      "。请检查网络、代理与 .env 中 AI_PROVIDER（bailian / ark / openai / gemini）及对应密钥、模型配置。"
    );
  }
  return msg;
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function parseRetryDelayMs(msg) {
  const m = String(msg).match(/retry in ([\d.]+)\s*s/i);
  if (m) {
    return Math.min(120000, Math.max(2000, Math.ceil(parseFloat(m[1], 10) * 1000)));
  }
  return 10000;
}

function isQuotaOrRateError(msg) {
  const s = String(msg).toLowerCase();
  return (
    s.includes("quota") ||
    s.includes("rate") ||
    s.includes("exceeded") ||
    s.includes("resource exhausted") ||
    s.includes("429") ||
    s.includes("503") ||
    s.includes("too many requests")
  );
}

async function callGeminiOnce(apiKey, model, prompt, maxOutputTokens) {
  const mo = typeof maxOutputTokens === "number" ? maxOutputTokens : 1024;
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.92,
        maxOutputTokens: mo,
      },
    }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  if (!res.ok) {
    throw new Error(
      (data && data.error && data.error.message) || res.statusText || "Gemini 请求失败",
    );
  }
  const c0 = data.candidates && data.candidates[0];
  if (!c0) {
    const fb = data.promptFeedback || data;
    throw new Error(
      "Gemini 无候选回复（可能被安全策略拦截）" +
        (fb ? "：" + JSON.stringify(fb).slice(0, 200) : ""),
    );
  }
  const parts = c0.content && c0.content.parts;
  const text = parts && parts[0] && parts[0].text;
  if (!text) throw new Error("Gemini 返回内容为空");
  return text;
}

async function callGemini(apiKey, model, prompt, maxOutputTokens) {
  let attempts = 0;
  const maxAttempts = 4;
  for (;;) {
    attempts++;
    try {
      return await callGeminiOnce(apiKey, model, prompt, maxOutputTokens);
    } catch (err) {
      if (attempts >= maxAttempts || !isQuotaOrRateError(err.message)) {
        throw err;
      }
      await delay(parseRetryDelayMs(err.message));
    }
  }
}

const SYSTEM_JSON_SEGMENTS =
  "只输出合法 JSON：segments 数组；plain 含 story、deltaAnger、deltaFatigue（±1 或 ±2，恰好一轴非零，以 ±1 为主）；choice 另含 choiceA、choiceB、outcomeA、outcomeB、effectA、effectB（同上）。story/outcome 须以第二人称「你」叙述。简体中文。";
const SYSTEM_PLAIN_TEXT =
  "只输出用户任务要求的正文：简体中文；不要代码块与 markdown 围栏；不要 JSON；不要任何前言、标题或括号说明。";

async function callOpenAICompatible(baseUrl, apiKey, model, prompt, maxTokens, usePlainSystem) {
  const mt = typeof maxTokens === "number" ? maxTokens : 1024;
  const base = baseUrl.replace(/\/?$/, "");
  const url = base + "/chat/completions";
  const systemContent = usePlainSystem ? SYSTEM_PLAIN_TEXT : SYSTEM_JSON_SEGMENTS;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: systemContent,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.92,
      max_tokens: mt,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg =
      (data && data.error && (data.error.message || data.error)) || res.statusText;
    throw new Error(String(msg) || "接口请求失败（可检查 Base URL、模型名）");
  }
  const text =
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;
  if (!text) throw new Error("接口返回内容为空");
  return text;
}

function corsMiddleware(req, res, next) {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw || !raw.trim()) {
    return next();
  }
  const origin = req.get("Origin");
  const allowedList = raw.split(",").map(function (s) {
    return s.trim();
  });
  const ok =
    raw.trim() === "*" ||
    (origin && allowedList.indexOf(origin) >= 0);
  if (ok && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-game-ai-secret");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
}

const app = express();
app.disable("x-powered-by");
app.use(corsMiddleware);
app.use(express.json({ limit: "2mb" }));

app.get("/api/game-ai/health", function (req, res) {
  const provider = (process.env.AI_PROVIDER || "bailian").toLowerCase();
  let configured = false;
  if (provider === "openai") {
    configured = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
  } else if (provider === "gemini") {
    configured = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  } else if (provider === "bailian" || provider === "dashscope") {
    const k =
      (process.env.DASHSCOPE_API_KEY && process.env.DASHSCOPE_API_KEY.trim()) ||
      (process.env.BAILIAN_API_KEY && process.env.BAILIAN_API_KEY.trim());
    configured = !!k;
  } else if (provider === "ark" || provider === "volcengine") {
    configured = !!(
      process.env.ARK_API_KEY &&
      process.env.ARK_API_KEY.trim() &&
      (process.env.ARK_ENDPOINT_ID || process.env.ARK_MODEL) &&
      String(process.env.ARK_ENDPOINT_ID || process.env.ARK_MODEL).trim()
    );
  } else {
    configured = false;
  }
  res.json({ ok: true, aiConfigured: configured, provider: provider });
});

app.post("/api/game-ai/chat", async function (req, res) {
  try {
    const proxySecret = process.env.AI_PROXY_SECRET;
    if (proxySecret && proxySecret.trim()) {
      if (req.get("x-game-ai-secret") !== proxySecret.trim()) {
        return res.status(401).json({ ok: false, error: "未授权（代理密钥不匹配）" });
      }
    }

    const body = req.body || {};
    const prompt = body.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ ok: false, error: "缺少 prompt" });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return res.status(400).json({ ok: false, error: "prompt 过长" });
    }

    const maxRaw = body.maxOutputTokens;
    const mo = Math.min(
      4096,
      Math.max(256, typeof maxRaw === "number" && !Number.isNaN(maxRaw) ? maxRaw : 1024),
    );
    const usePlainSystem = body.outputKind === "plainText";

    const provider = (process.env.AI_PROVIDER || "bailian").toLowerCase();
    let text;

    if (provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key || !key.trim()) {
        return res.status(500).json({ ok: false, error: "服务器未配置 OPENAI_API_KEY" });
      }
      text = await callOpenAICompatible(
        process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1",
        key,
        process.env.OPENAI_MODEL || "llama-3.3-70b-versatile",
        prompt,
        mo,
        usePlainSystem,
      );
    } else if (provider === "gemini") {
      const key = process.env.GEMINI_API_KEY;
      if (!key || !key.trim()) {
        return res.status(500).json({ ok: false, error: "服务器未配置 GEMINI_API_KEY" });
      }
      const geminiPrompt = usePlainSystem
        ? SYSTEM_PLAIN_TEXT + "\n\n" + prompt
        : prompt;
      text = await callGemini(
        key,
        process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        geminiPrompt,
        mo,
      );
    } else if (provider === "bailian" || provider === "dashscope") {
      const key = (
        (process.env.DASHSCOPE_API_KEY && process.env.DASHSCOPE_API_KEY.trim()) ||
        (process.env.BAILIAN_API_KEY && process.env.BAILIAN_API_KEY.trim()) ||
        ""
      );
      const baseUrl =
        (process.env.DASHSCOPE_BASE_URL && process.env.DASHSCOPE_BASE_URL.trim()) ||
        (process.env.BAILIAN_BASE_URL && process.env.BAILIAN_BASE_URL.trim()) ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1";
      const model =
        (process.env.DASHSCOPE_MODEL && process.env.DASHSCOPE_MODEL.trim()) ||
        (process.env.BAILIAN_MODEL && process.env.BAILIAN_MODEL.trim()) ||
        "qwen-plus";
      if (!key) {
        return res.status(500).json({
          ok: false,
          error:
            "服务器未配置 DASHSCOPE_API_KEY（阿里云百炼 / DashScope 控制台 API-KEY，也可用 BAILIAN_API_KEY）",
        });
      }
      text = await callOpenAICompatible(baseUrl, key, model, prompt, mo, usePlainSystem);
    } else {
      const key = process.env.ARK_API_KEY;
      const endpointId = (process.env.ARK_ENDPOINT_ID || process.env.ARK_MODEL || "").trim();
      const baseUrl =
        (process.env.ARK_BASE_URL && process.env.ARK_BASE_URL.trim()) ||
        "https://ark.cn-beijing.volces.com/api/v3";
      if (!key || !key.trim()) {
        return res.status(500).json({ ok: false, error: "服务器未配置 ARK_API_KEY（火山方舟 API Key）" });
      }
      if (!endpointId) {
        return res.status(500).json({
          ok: false,
          error:
            "服务器未配置 ARK_ENDPOINT_ID（方舟控制台「在线推理」接入点 ID，一般为 ep- 开头）",
        });
      }
      text = await callOpenAICompatible(baseUrl, key.trim(), endpointId, prompt, mo, usePlainSystem);
    }

    return res.json({ ok: true, text: text });
  } catch (e) {
    console.error("[game-ai/chat]", e);
    return res.status(502).json({
      ok: false,
      error: formatUpstreamError(e),
    });
  }
});

const rootDir = __dirname;
app.use(express.static(rootDir));

app.use(function (req, res, next) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(rootDir, "index.html"));
});

const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, function () {
  console.log("HorseCow 服务已启动: http://localhost:" + PORT);
  console.log("AI 提供方: " + (process.env.AI_PROVIDER || "bailian"));
});
