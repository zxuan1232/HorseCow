/**
 * 浏览器端：构建提示词与解析 JSON；实际调用模型可走「服务端代理」（推荐，密钥不上屏）
 * 或浏览器直连（需 config 里 apiKey，易触发平台泄露警告）。
 * 配置见 config.js 的 window.GAME_AI_CONFIG。
 */
(function (global) {
  function defaultSettings() {
    return {
      enabled: false,
      /** true：POST 到 serverChatPath，由服务器读环境变量里的密钥 */
      useServerProxy: true,
      serverChatPath: "/api/game-ai/chat",
      /** 与服务器 AI_PROXY_SECRET 一致时可拦简单盗刷；可留空 */
      proxySecret: "",
      provider: "gemini",
      apiKey: "",
      model: "gemini-2.5-flash-lite",
      baseUrl: "https://api.groq.com/openai/v1",
      openaiModel: "llama-3.3-70b-versatile",
    };
  }

  function loadSettings() {
    var d = defaultSettings();
    var c = global.GAME_AI_CONFIG;
    if (!c || typeof c !== "object") {
      return d;
    }
    var usePx = c.useServerProxy;
    if (usePx === undefined) {
      usePx = d.useServerProxy;
    }
    return {
      enabled: !!c.enabled,
      useServerProxy: !!usePx,
      serverChatPath:
        (c.serverChatPath && String(c.serverChatPath).trim()) || d.serverChatPath,
      proxySecret: typeof c.proxySecret === "string" ? c.proxySecret : "",
      provider: c.provider === "openai" ? "openai" : "gemini",
      apiKey: typeof c.apiKey === "string" ? c.apiKey : "",
      model: (c.model && String(c.model).trim()) || d.model,
      baseUrl: (c.baseUrl && String(c.baseUrl).trim()) || d.baseUrl,
      openaiModel: (c.openaiModel && String(c.openaiModel).trim()) || d.openaiModel,
    };
  }

  function isAiReady() {
    var s = loadSettings();
    if (!s.enabled) return false;
    if (s.useServerProxy) return true;
    return !!(s.apiKey && s.apiKey.trim());
  }

  function trimToJsonObject(text) {
    var s = String(text || "").trim();
    var fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1].trim();
    var start = s.indexOf("{");
    var end = s.lastIndexOf("}");
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
    return s;
  }

  function extractChoicePair(obj) {
    var a =
      obj.choiceA ||
      obj.choice_a ||
      obj["选项A"] ||
      obj.optionA ||
      obj["A"];
    var b =
      obj.choiceB ||
      obj.choice_b ||
      obj["选项B"] ||
      obj.optionB ||
      obj["B"];
    if (typeof a === "string" && typeof b === "string" && a.trim() && b.trim()) {
      return { a: a.trim(), b: b.trim() };
    }
    return null;
  }

  /** 单条 story 建议篇幅下限（字）；可与上一条长短错落 */
  var STORY_SOFT_MIN_CHARS = 100;
  /** 单条 story 硬性上限（含标点与空格；与 STORY_SOFT_MIN_CHARS 构成 50～150 字弹性区间） */
  var STORY_HARD_MAX_CHARS = 200;
  /** 「本周掠影」短诗总字数上限（含标点与换行，宁短勿长） */
  var WEEKLY_GLIMPSE_MAX_CHARS = 200;
  /** 智能截断时，句读处至少保留这么长才采用（避免只剩半句话） */
  var STORY_MIN_BREAK_LEN = 12;
  var DELTA_MIN = -2;
  var DELTA_MAX = 2;

  /**
   * 将 story 限制在 STORY_HARD_MAX_CHARS 以内；超长时优先在句末（。！？；）截断，其次逗号类，最后硬截断。
   * 仅在确实截去尾部时追加省略号。
   */
  function truncateStoryWithIntegrity(s) {
    var t = String(s || "").trim();
    var chars = Array.from(t);
    var n = chars.length;
    if (n <= STORY_HARD_MAX_CHARS) return t;

    var hard = STORY_HARD_MAX_CHARS;
    var reSentence = /[。！？；]/;
    var reWeak = /[，、,:：]/;

    function cutAtRightmost(maxExclusive, re) {
      var i;
      for (i = maxExclusive - 1; i >= 0; i--) {
        if (re.test(chars[i])) return i + 1;
      }
      return -1;
    }

    var cut = cutAtRightmost(hard, reSentence);
    if (cut >= STORY_MIN_BREAK_LEN) {
      return chars.slice(0, cut).join("") + (cut < n ? "…" : "");
    }

    cut = cutAtRightmost(hard, reWeak);
    if (cut >= STORY_MIN_BREAK_LEN) {
      return chars.slice(0, cut).join("") + (cut < n ? "…" : "");
    }

    return chars.slice(0, hard).join("") + "…";
  }

  function parseIntDelta(v, def) {
    if (v === undefined || v === null) return def;
    var n = parseInt(v, 10);
    if (Number.isNaN(n)) return def;
    if (n < DELTA_MIN) return DELTA_MIN;
    if (n > DELTA_MAX) return DELTA_MAX;
    return n;
  }

  /** 怒气与疲劳至多一条轴非零；plain 与选项效果均适用；全零时默认怒气 +1 */
  function enforceSingleAxisDeltas(da, df) {
    da = parseIntDelta(da, 0);
    df = parseIntDelta(df, 0);
    if (da !== 0 && df === 0) return { deltaAnger: da, deltaFatigue: 0 };
    if (da === 0 && df !== 0) return { deltaAnger: 0, deltaFatigue: df };
    if (da !== 0 && df !== 0) {
      if (Math.abs(da) >= Math.abs(df)) return { deltaAnger: da, deltaFatigue: 0 };
      return { deltaAnger: 0, deltaFatigue: df };
    }
    return { deltaAnger: 1, deltaFatigue: 0 };
  }

  function normalizeEffectBlock(raw) {
    var o = raw && typeof raw === "object" ? raw : {};
    return enforceSingleAxisDeltas(parseIntDelta(o.deltaAnger, 0), parseIntDelta(o.deltaFatigue, 0));
  }

  function normalizeOutcomeText(v) {
    if (v === undefined || v === null) return "";
    var t = String(v).trim();
    if (t.length > 480) return t.slice(0, 480) + "…";
    return t;
  }

  function normalizeEventType(et) {
    if (typeof et !== "string") return "";
    var t = et.trim().toLowerCase();
    if (t === "选择" || t === "choice" || t === "branch" || t === "二选一" || t === "选项") {
      return "choice";
    }
    if (t === "plain" || t === "无选项" || t === "叙述" || t === "过渡") {
      return "plain";
    }
    return "";
  }

  function normalizeOneSegment(obj) {
    if (!obj || typeof obj.story !== "string") throw new Error("某段缺少 story");
    var story = truncateStoryWithIntegrity(obj.story.trim());
    var pair = extractChoicePair(obj);
    if (pair) {
      var effectA = normalizeEffectBlock(obj.effectA || obj.effect_a || obj.aEffect);
      var effectB = normalizeEffectBlock(obj.effectB || obj.effect_b || obj.bEffect);
      return {
        story: story,
        eventType: "choice",
        choiceA: pair.a,
        choiceB: pair.b,
        outcomeA: normalizeOutcomeText(obj.outcomeA || obj.outcome_a),
        outcomeB: normalizeOutcomeText(obj.outcomeB || obj.outcome_b),
        effectA: effectA,
        effectB: effectB,
      };
    }
    var etRaw = obj.eventType || obj.kind || obj.type;
    var et = normalizeEventType(etRaw);
    if (et === "choice") {
      throw new Error("某段为 choice 但缺少 choiceA/choiceB");
    }
    var plainD = enforceSingleAxisDeltas(
      parseIntDelta(obj.deltaAnger, 0),
      parseIntDelta(obj.deltaFatigue, 0),
    );
    return {
      story: story,
      eventType: "plain",
      deltaAnger: plainD.deltaAnger,
      deltaFatigue: plainD.deltaFatigue,
    };
  }

  function parseDayBatchJson(text, expectedCount) {
    var raw = trimToJsonObject(text);
    var root = JSON.parse(raw);
    var arr = root.segments || root.events;
    if (!Array.isArray(arr)) throw new Error("需要 segments 数组");
    if (arr.length !== expectedCount) {
      throw new Error("segments 长度须为 " + expectedCount + "，实际 " + arr.length);
    }
    var segments = [];
    for (var i = 0; i < expectedCount; i++) {
      segments.push(normalizeOneSegment(arr[i]));
    }
    // 不校验 plain 段数：模型常偏离约定，硬校验会导致整批失败；比例由提示词引导即可。
    return { segments: segments };
  }

  function flattenBeforeDay(weekData, choiceLog, dayIndex) {
    var storyParts = [];
    var d;
    var i;
    for (d = 0; d < dayIndex; d++) {
      var dayArr = weekData.days[d] || [];
      for (i = 0; i < dayArr.length; i++) {
        if (dayArr[i]) {
          storyParts.push("「" + weekData.dayLabels[d] + " 第" + (i + 1) + "段」" + dayArr[i]);
        }
      }
    }
    var choiceParts = [];
    for (var c = 0; c < choiceLog.length; c++) {
      var ch = choiceLog[c];
      if (typeof ch.dayIndex === "number" && ch.dayIndex < dayIndex) {
        choiceParts.push(
          ch.dayLabel + " 第" + (ch.segmentIndex + 1) + "段后：选「" + ch.label + "」",
        );
      }
    }
    var storySoFar = storyParts.join("\n");
    /** 略增保留量，减轻后半周生成时丢失周初剧情、导致模型重复同类桥段 */
    if (storySoFar.length > 3800) {
      storySoFar = "…（更早剧情省略）\n" + storySoFar.slice(-3800);
    }
    var choicesSoFar = choiceParts.join("\n");
    if (choicesSoFar.length > 2000) {
      choicesSoFar = "…（更早选择省略）\n" + choicesSoFar.slice(-2000);
    }
    return { storySoFar: storySoFar, choicesSoFar: choicesSoFar };
  }

  function buildDayBatchPrompt(player, ctx) {
    var lines = [];
    lines.push(
      "你是文字游戏《牛马体验器》的叙事引擎。**故事必须写现实职场与各行各业日常**（办公室、工地、门店、医院、学校等真实场景），禁止修仙、玄幻、法术、宗门等设定；人名地名为现实风格。",
    );
    lines.push(
      "【叙述视角】**面向玩家统一用第二人称「你」**：写「你遭遇了……」「对方朝你丢来一堆活……」「你心里一沉」；不要写成旁观第三人称（如「TA 怎样」「某某（玩家姓名）怎样」）。姓名仅用于设定与上下文，**正文里不要反复直呼玩家姓名当主语**。choiceA/choiceB 用玩家口吻的短动作即可。",
    );
    lines.push(
      "【属性与剧情的常识映射】必须让**事件正文与 delta 一眼能对上**，避免「故事很治愈数值却在狂涨」。示例（写进 story，再选对应一轴）：吃好饭/喝奶茶/午休眯一会→**疲劳降**；听八卦、同事一起吐槽、误会澄清、小胜利→**怒气降**；忍气吞声、被甩锅、被怼、憋火→**怒气升**；接了不可能的任务、通宵、连轴会、奔波跑腿→**疲劳升**；失眠、头疼、感冒硬撑→**疲劳升**。",
    );
    lines.push(
      "【数值节奏】怒气/疲劳变化**只允许 ±1 或 ±2**（禁止 ±3 及以上）。其中 **±1 应占绝大多数（约八成）**，**±2 较少（约两成）**，且须与剧情强度匹配（小别扭用 ±1，通宵、大吵等才用 ±2）。本日整体上**下降（回血）略少于上升（加压）**：约 **近三成** 段落为怒气或疲劳**降低**，**余下多为上升**；勿通篇只升或连段暴涨，也勿整天只降。",
    );
    lines.push("");
    lines.push("【固定角色】");
    var jobRoleStr =
      player.jobRole && String(player.jobRole).trim()
        ? String(player.jobRole).trim()
        : "未指定";
    lines.push(
      "姓名：" +
        player.name +
        "；性别：" +
        player.gender +
        "；年龄：" +
        player.age +
        "；行业：" +
        player.industry +
        "；**岗位（工种）**：" +
        jobRoleStr,
    );
    lines.push(
      "【岗位叙事】本日事件须**贴合该岗位真实日常**（例：程序员—需求/联调/缺陷与排期；测试—用例/缺陷/版本；产品经理—需求/排期/协调；美术—稿件/修改/风格；运营—活动/数据/投放）。避免写成与岗位无关的泛泛职场。",
    );
    lines.push(
      "能力/幸运/怒气/疲劳（上限10）：" +
        player.ability +
        " / " +
        player.luck +
        " / " +
        player.anger +
        " / " +
        player.fatigue,
    );
    var pTags = Array.isArray(player.personalityTags)
      ? player.personalityTags.filter(function (t) {
          return t && String(t).trim();
        })
      : [];
    if (pTags.length) {
      lines.push(
        "性格标签（0～3 个，影响叙事语气、内心反应与冲突处理方式；勿在正文直接罗列标签名）：" +
          pTags.join("、"),
      );
    } else {
      lines.push("性格标签：未指定（按普通打工人写即可）。");
    }
    lines.push("");
    lines.push(
      "【本日任务】一次性生成「" +
        ctx.dayLabel +
        "」全天共 " +
        ctx.eventCount +
        " 个事件，放入 JSON 的 segments 数组；数组长度必须等于 " +
        ctx.eventCount +
        "。",
    );
    lines.push(
      "【时间线铁律】这 " +
        ctx.eventCount +
        " 个事件必须严格按「一天内时间从早到晚」排列，且叙事上时间只能向前推进，禁止乱序：",
    );
    lines.push(
      "· 第 1 条应对应早晨/通勤/到岗；随后覆盖上午、午间或午休后、下午、傍晚；最后一条接近下班或夜间收束。",
    );
    lines.push(
      "· 禁止先写「下午开会」再写「中午吃饭」，禁止先写「临下班」再写「上午打卡」等逻辑倒流。",
    );
    lines.push(
      "· 每条 story 里用自然语句带出时段感即可，不要在正文里写「第1段」「第2段」编号。",
    );
    lines.push("");
    lines.push(
      "【事件类型与数量】本日共 " +
        ctx.eventCount +
        " 段：目标为 plain 恰好 " +
        ctx.plainCount +
        " 段、choice 恰好 " +
        ctx.choiceCount +
        " 段（选择占多数）。输出前请逐条核对 eventType 并计数；plain 仅写 deltaAnger/deltaFatigue，勿把无选项段标成 choice。",
    );
    lines.push(
      "① plain：eventType:\"plain\"，无选项；deltaAnger、deltaFatigue 为 **±1 或 ±2 之一轴非零**（以 ±1 为主）。**story 用「你」为主语写遭遇与感受**，写出为何涨或跌，强度与数字一致。玩家看到正文时即结算。",
    );
    lines.push(
      "② choice：除 choiceA、choiceB、effectA、effectB 外，**必须给 outcomeA、outcomeB**（各一段，约 40～120 字）：**同样以「你」为主语**写清身心变化，**须与 effect 一致**；两选项尽量一缓一耗或一升一降，避免两边都大幅加怒/加疲；**不要设计成两个选项都轻松减压**，可常见「小降 vs 小升/中升」或「一侧几乎不回血」。**每个 effect：deltaAnger 与 deltaFatigue 恰好一轴非零**，可正可负，禁止双非零或双零。",
    );
    lines.push(
      "每条 story 请写完整、可读；**篇幅建议在约 " +
        STORY_SOFT_MIN_CHARS +
        "～" +
        STORY_HARD_MAX_CHARS +
        " 字之间参差不齐**（有的可一笔带过偏短，有的可写足，但**不得超过 " +
        STORY_HARD_MAX_CHARS +
        " 字**）。**总长不得超过 " +
        STORY_HARD_MAX_CHARS +
        " 个字符**（含标点与空格）。勿写半句、勿在句中戛然而止；数值须与剧情一致，且**每条只体现一条轴**。",
    );
    lines.push("");
    lines.push("【去重与多样性】");
    lines.push(
      "· **本日各条之间**：每条须有不同场景或不同矛盾焦点；避免多条都围绕「开会」「改需求」「被催」「摸鱼被抓」「电梯/走廊偶遇领导」等同质桥段；从早到晚尽量覆盖通勤、工位、协作、对外（客户/供应商/家长等）、后勤行政、收工等不同侧面。",
    );
    if (ctx.storySoFar) {
      lines.push(
        "· **本周跨日**：下方「本周此前已发生」已列出更早剧情；本日每条须**避免**与其中事件在核心冲突、场景类型、具体梗上高度雷同（若前几日已写过同类会议室甩锅、同类客户电话、同类系统崩了，本日换其他事由与场景）；可延续人物关系与情绪线，但**具体事件须有新事因或新转折**，勿换皮重复。",
      );
    } else {
      lines.push(
        "· **本周首日**：尚无更早剧情；本日内仍须遵守上条，避免同日多条叙事套路雷同。",
      );
    }
    lines.push("");
    if (ctx.isSundayBatch) {
      lines.push("【周日】最后一条可收束全周情绪，可用 plain 或 choice 收尾。");
      lines.push("");
    }
    if (ctx.storySoFar) {
      lines.push("【本周此前已发生（按时间，早于本日）】");
      lines.push(ctx.storySoFar);
      lines.push("");
    }
    if (ctx.choicesSoFar) {
      lines.push("【玩家此前已做选择（早于本日）】");
      lines.push(ctx.choicesSoFar);
      lines.push("");
    }
    lines.push("【输出格式】只输出一个 JSON，不要 markdown。示例（字段名必须一致）：");
    lines.push(
      '{"segments":[{"eventType":"plain","story":"早高峰地铁挤到变形，你贴着门站成薄片，耳机里播着励志歌，心里在算迟到扣款。","deltaAnger":2,"deltaFatigue":0},{"eventType":"choice","story":"主管在会上把锅甩向你，全场安静。","choiceA":"据理力争","choiceB":"先认下再说","outcomeA":"你当场拆穿逻辑漏洞，同事侧目；嗓子喊哑了，但胸口那口恶气出了大半。","outcomeB":"你先咽下这口气，散会后在工位闷着；活还是落到你头上，越干越乏。","effectA":{"deltaAnger":-1,"deltaFatigue":0},"effectB":{"deltaAnger":0,"deltaFatigue":2}}]}',
    );
    lines.push("segments 内对象顺序 = 当天时间从早到晚的顺序。");
    return lines.join("\n");
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function parseRetryDelayMs(msg) {
    var m = String(msg).match(/retry in ([\d.]+)\s*s/i);
    if (m) {
      return Math.min(120000, Math.max(2000, Math.ceil(parseFloat(m[1], 10) * 1000)));
    }
    return 10000;
  }

  function isQuotaOrRateError(msg) {
    var s = String(msg).toLowerCase();
    return (
      s.indexOf("quota") >= 0 ||
      s.indexOf("rate") >= 0 ||
      s.indexOf("exceeded") >= 0 ||
      s.indexOf("resource exhausted") >= 0 ||
      s.indexOf("429") >= 0 ||
      s.indexOf("503") >= 0 ||
      s.indexOf("too many requests") >= 0
    );
  }

  function callGeminiOnce(apiKey, model, prompt, maxOutputTokens) {
    var mo = typeof maxOutputTokens === "number" ? maxOutputTokens : 1024;
    var url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.92,
          maxOutputTokens: mo,
        },
      }),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (data.error) {
          throw new Error(data.error.message || JSON.stringify(data.error));
        }
        if (!res.ok) {
          throw new Error((data && data.error && data.error.message) || res.statusText || "Gemini 请求失败");
        }
        var c0 = data.candidates && data.candidates[0];
        if (!c0) {
          var fb = data.promptFeedback || data;
          throw new Error("Gemini 无候选回复（可能被安全策略拦截）" + (fb ? "：" + JSON.stringify(fb).slice(0, 200) : ""));
        }
        var parts = c0.content && c0.content.parts;
        var text = parts && parts[0] && parts[0].text;
        if (!text) throw new Error("Gemini 返回内容为空");
        return text;
      });
    });
  }

  function callGemini(apiKey, model, prompt, maxOutputTokens) {
    var attempts = 0;
    var maxAttempts = 4;
    function tryOnce() {
      attempts++;
      return callGeminiOnce(apiKey, model, prompt, maxOutputTokens).catch(function (err) {
        if (attempts >= maxAttempts || !isQuotaOrRateError(err.message)) {
          throw err;
        }
        var waitMs = parseRetryDelayMs(err.message);
        return delay(waitMs).then(tryOnce);
      });
    }
    return tryOnce();
  }

  var SYSTEM_JSON_SEGMENTS =
    "只输出合法 JSON：segments 数组；plain 含 story、deltaAnger、deltaFatigue（±1 或 ±2，恰好一轴非零，以 ±1 为主）；choice 另含 choiceA、choiceB、outcomeA、outcomeB、effectA、effectB（同上）。story/outcome 须以第二人称「你」叙述。同一日内各条与跨日剧情避免同质重复。简体中文。";
  var SYSTEM_PLAIN_TEXT =
    "只输出用户任务要求的正文：简体中文；不要代码块与 markdown 围栏；不要 JSON；不要任何前言、标题或括号说明。若任务为「本周掠影」短诗，须遵守字数上限，语气宜真诚、可有温度与共鸣感，勿说教。";

  function callOpenAICompatible(baseUrl, apiKey, model, prompt, maxTokens, usePlainSystem) {
    var mt = typeof maxTokens === "number" ? maxTokens : 1024;
    var base = baseUrl.replace(/\/?$/, "");
    var url = base + "/chat/completions";
    var sys = usePlainSystem ? SYSTEM_PLAIN_TEXT : SYSTEM_JSON_SEGMENTS;
    return fetch(url, {
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
            content: sys,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.92,
        max_tokens: mt,
      }),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var msg =
            (data && data.error && (data.error.message || data.error)) || res.statusText;
          throw new Error(String(msg) || "接口请求失败（可检查 Base URL、模型名与跨域）");
        }
        var text =
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content;
        if (!text) throw new Error("接口返回内容为空");
        return text;
      });
    });
  }

  /**
   * 通过同源或配置的完整 URL 调用服务端 /api/game-ai/chat，不在浏览器携带模型密钥。
   */
  function callViaServerProxy(prompt, maxOutputTokens, s, outputKind) {
    var pathOrUrl = s.serverChatPath || "/api/game-ai/chat";
    var url =
      pathOrUrl.indexOf("http://") === 0 || pathOrUrl.indexOf("https://") === 0
        ? pathOrUrl
        : pathOrUrl;
    var headers = { "Content-Type": "application/json" };
    if (s.proxySecret && String(s.proxySecret).trim()) {
      headers["x-game-ai-secret"] = String(s.proxySecret).trim();
    }
    var payload = {
      prompt: prompt,
      maxOutputTokens: maxOutputTokens,
    };
    if (outputKind === "plainText") payload.outputKind = "plainText";
    return fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || !data || data.ok !== true) {
          throw new Error(
            (data && data.error) || res.statusText || "AI 代理请求失败",
          );
        }
        if (typeof data.text !== "string" || !data.text) {
          throw new Error("AI 代理返回空内容");
        }
        return data.text;
      });
    });
  }

  /**
   * 一次性生成本日全部事件（segments 顺序 = 当天从早到晚），再由前端逐条展示。
   */
  function generateDayBatch(player, weekData, choiceLog, dayIndex, eventCount, plainCount) {
    var s = loadSettings();
    if (!s.useServerProxy && (!s.apiKey || !s.apiKey.trim())) {
      return Promise.reject(new Error("未配置 API Key，或请开启 useServerProxy 使用服务端密钥"));
    }

    var k =
      typeof plainCount === "number" && plainCount >= 0
        ? Math.min(plainCount, eventCount)
        : null;
    if (k == null && eventCount >= 3) {
      var maxPlain = Math.min(3, Math.floor((eventCount - 1) / 2));
      k = maxPlain >= 1 ? 1 + Math.floor(Math.random() * maxPlain) : 0;
    } else if (k == null) {
      k = 0;
    }
    var choiceCt = Math.max(0, eventCount - k);

    var flat = flattenBeforeDay(weekData, choiceLog, dayIndex);
    var prompt = buildDayBatchPrompt(player, {
      dayLabel: weekData.dayLabels[dayIndex],
      eventCount: eventCount,
      plainCount: k,
      choiceCount: choiceCt,
      storySoFar: flat.storySoFar,
      choicesSoFar: flat.choicesSoFar,
      isSundayBatch: dayIndex === 6,
    });

    /** 单条 story 上限 150 字量级，相应收紧输出 token，减轻等待（仍 cap 4096，避免截断 JSON） */
    var maxTok = Math.min(4096, 560 + eventCount * 300);

    var chain;
    if (s.useServerProxy) {
      chain = callViaServerProxy(prompt, maxTok, s);
    } else if (s.provider === "openai") {
      chain = callOpenAICompatible(
        s.baseUrl,
        s.apiKey,
        s.openaiModel || "llama-3.3-70b-versatile",
        prompt,
        maxTok,
      );
    } else {
      chain = callGemini(s.apiKey, s.model || "gemini-2.5-flash-lite", prompt, maxTok);
    }

    return chain.then(function (raw) {
      try {
        return parseDayBatchJson(raw, eventCount);
      } catch (e) {
        var hint = String(raw || "").slice(0, 200);
        throw new Error(
          (e && e.message ? e.message : "JSON 解析失败") +
            (hint ? " — 片段：" + hint : ""),
        );
      }
    });
  }

  function sanitizeWeeklyPoemText(raw) {
    var s = String(raw || "").trim();
    var fence = s.match(/```(?:\w*)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1].trim();
    var chars = Array.from(s);
    if (chars.length > WEEKLY_GLIMPSE_MAX_CHARS) {
      s = chars.slice(0, WEEKLY_GLIMPSE_MAX_CHARS).join("") + "…";
    }
    return s || "";
  }

  /**
   * 根据本周经历摘要生成「本周掠影」短诗（纯文本，非 JSON）。
   */
  function generateWeeklyGlimpsePoem(player, contextText) {
    var ctx = String(contextText || "").trim();
    if (!ctx) return Promise.reject(new Error("无本周摘要"));
    var lines = [
      "你是《牛马体验器》周报诗人。请**只根据**下方「本周经历摘要」写一首短诗，用于「本周掠影」栏目。",
      "要求：",
      "· **总字数严格控制在约 " +
        WEEKLY_GLIMPSE_MAX_CHARS +
        " 字以内（含标点与换行），宁短勿长**；3～6 行短章或几句即可，不必写长；现代诗或仿古体均可。",
      "· 必须用第二人称「你」，与摘要中的情绪、场景**如实呼应**；在概括本周酸甜苦辣的同时，**落笔带一点温度**：可写微光、释然、笨拙的坚持、自嘲里的轻松，或安静的无评判的陪伴感，让读者感到**被理解**（避免空洞鸡汤、说教腔与廉价励志）。",
      "· 追求**共鸣**：像替玩家说出心里那句没说出口的话，语气真诚、克制；勿堆砌网络热梗，勿晦涩造作。",
      "· 不要标题、不要括号说明、不要 markdown；**只输出诗正文**，每行一句，行末可押韵可不押。",
      "· 禁止修仙玄幻；保持现实职场/行业日常气质。",
      "",
      "【本周经历摘要】",
      ctx,
    ];
    var prompt = lines.join("\n");
    var s = loadSettings();
    if (!s.useServerProxy && (!s.apiKey || !s.apiKey.trim())) {
      return Promise.reject(new Error("未配置 API Key"));
    }
    var maxTok = Math.min(512, 280);
    var chain;
    if (s.useServerProxy) {
      chain = callViaServerProxy(prompt, maxTok, s, "plainText");
    } else if (s.provider === "openai") {
      chain = callOpenAICompatible(
        s.baseUrl,
        s.apiKey,
        s.openaiModel || "llama-3.3-70b-versatile",
        prompt,
        maxTok,
        true,
      );
    } else {
      chain = callGemini(
        s.apiKey,
        s.model || "gemini-2.5-flash-lite",
        SYSTEM_PLAIN_TEXT + "\n\n" + prompt,
        maxTok,
      );
    }
    return chain.then(function (raw) {
      var t = sanitizeWeeklyPoemText(raw);
      if (!t) throw new Error("模型返回空诗稿");
      return t;
    });
  }

  global.AIClient = {
    defaultSettings: defaultSettings,
    loadSettings: loadSettings,
    isAiReady: isAiReady,
    generateDayBatch: generateDayBatch,
    generateWeeklyGlimpsePoem: generateWeeklyGlimpsePoem,
  };
})(typeof window !== "undefined" ? window : globalThis);
