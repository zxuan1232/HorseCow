/**
 * 本地 / 云部署：托管静态文件 + 将 AI 请求转发到 Gemini 或 OpenAI 兼容接口。
 * 密钥只放在环境变量（或平台「Environment」配置）中，不写进前端。
 */
require("dotenv").config();

const path = require("path");
const express = require("express");

const MAX_PROMPT_CHARS = 150000;

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

async function callOpenAICompatible(baseUrl, apiKey, model, prompt, maxTokens) {
  const mt = typeof maxTokens === "number" ? maxTokens : 1024;
  const base = baseUrl.replace(/\/?$/, "");
  const url = base + "/chat/completions";
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
          content:
            "只输出合法 JSON：segments 数组；plain 含 story(建议充实、总长≤200字符)、deltaAnger、deltaFatigue；choice 另含 choiceA、choiceB、effectA、effectB（各含 deltaAnger、deltaFatigue）。简体中文。",
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
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  let configured = false;
  if (provider === "openai") {
    configured = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
  } else {
    configured = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
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

    const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
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
      );
    } else {
      const key = process.env.GEMINI_API_KEY;
      if (!key || !key.trim()) {
        return res.status(500).json({ ok: false, error: "服务器未配置 GEMINI_API_KEY" });
      }
      text = await callGemini(
        key,
        process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        prompt,
        mo,
      );
    }

    return res.json({ ok: true, text: text });
  } catch (e) {
    console.error("[game-ai/chat]", e);
    return res.status(502).json({
      ok: false,
      error: e && e.message ? e.message : String(e),
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
  console.log("AI 提供方: " + (process.env.AI_PROVIDER || "gemini"));
});
