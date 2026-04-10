(function () {
  const screens = {
    introQuestion: document.getElementById("screen-intro-question"),
    introYes: document.getElementById("screen-intro-yes"),
    introNo: document.getElementById("screen-intro-no"),
    setup: document.getElementById("screen-setup"),
    profile: document.getElementById("screen-profile"),
    week: document.getElementById("screen-week"),
    report: document.getElementById("screen-report"),
    endingRage: document.getElementById("screen-ending-rage"),
    endingRage2: document.getElementById("screen-ending-rage-2"),
    endingFatigue1: document.getElementById("screen-ending-fatigue-1"),
    endingFatigue2: document.getElementById("screen-ending-fatigue-2"),
    endingFatigue3: document.getElementById("screen-ending-fatigue-3"),
    endingFatigueSuccess: document.getElementById("screen-ending-fatigue-success"),
    endingFatigueFail: document.getElementById("screen-ending-fatigue-fail"),
  };

  const form = document.getElementById("setup-form");
  const errorEl = document.getElementById("setup-error");
  const nameInput = document.getElementById("player-name");
  const ageInput = document.getElementById("player-age");
  const industrySelect = document.getElementById("industry");

  const summaryName = document.getElementById("summary-name");
  const summaryGender = document.getElementById("summary-gender");
  const summaryAge = document.getElementById("summary-age");
  const summaryIndustry = document.getElementById("summary-industry");
  const summaryPersonality = document.getElementById("summary-personality");
  const summaryAbility = document.getElementById("summary-ability");
  const summaryLuck = document.getElementById("summary-luck");
  const summaryAnger = document.getElementById("summary-anger");
  const summaryFatigue = document.getElementById("summary-fatigue");

  const btnStartWeek = document.getElementById("btn-start-week");
  const btnBackSetup = document.getElementById("btn-back-setup");
  const btnIntroYes = document.getElementById("btn-intro-yes");
  const btnIntroNo = document.getElementById("btn-intro-no");
  const btnIntroYesNext = document.getElementById("btn-intro-yes-next");
  const btnIntroNoNext = document.getElementById("btn-intro-no-next");

  const weekPlayerLine = document.getElementById("week-player-line");
  const weekStatsEl = document.getElementById("week-stats");
  const weekTabs = document.getElementById("week-tabs");
  const eventDayLabel = document.getElementById("event-day-label");
  const eventProgress = document.getElementById("event-progress");
  const eventCard = document.getElementById("event-card");
  const eventStatFeedback = document.getElementById("event-stat-feedback");
  const btnEventNext = document.getElementById("btn-event-next");
  const choiceRow = document.getElementById("choice-row");
  const choiceHint = document.getElementById("choice-hint");
  const btnChoiceA = document.getElementById("btn-choice-a");
  const btnChoiceB = document.getElementById("btn-choice-b");

  function setChoiceUiVisible(visible) {
    if (choiceRow) choiceRow.classList.toggle("choice-row--visible", !!visible);
    if (choiceHint) {
      choiceHint.classList.toggle("choice-hint--visible", !!visible);
      choiceHint.textContent = visible ? "你会怎么做？" : "";
      choiceHint.setAttribute("aria-hidden", visible ? "false" : "true");
    }
  }

  const reportBody = document.getElementById("report-body");
  const weeklyInsightEl = document.getElementById("weekly-insight");
  const reportGlimpseEl = document.getElementById("report-glimpse");
  const btnReportAgain = document.getElementById("btn-report-again");
  const btnReportHome = document.getElementById("btn-report-home");
  const profileModeHint = document.getElementById("profile-mode-hint");
  const modeSourceBadge = document.getElementById("mode-source-badge");
  const dayTransitionOverlay = document.getElementById("day-transition-overlay");
  const dayTransitionText = document.getElementById("day-transition-text");

  const endingRageTypewriter = document.getElementById("ending-rage-typewriter");
  const btnEndingResign = document.getElementById("btn-ending-resign");
  const btnEndingRestart = document.getElementById("btn-ending-restart");
  const btnFatigueRescue = document.getElementById("btn-fatigue-rescue");
  const btnFatigueSuccess = document.getElementById("btn-fatigue-success");
  const btnFatigueFailRestart = document.getElementById("btn-fatigue-fail-restart");

  var DAY_TRANSITION_FADE_MS = 460;
  /** 点阵与结局「……」动画同节奏（每步间隔 ms） */
  var ELLIPSIS_DOT_STEP_MS = 300;
  var dayTransitionDotIntervalId = null;

  function clearDayTransitionDotAnimation() {
    if (dayTransitionDotIntervalId !== null) {
      clearInterval(dayTransitionDotIntervalId);
      dayTransitionDotIntervalId = null;
    }
  }

  /**
   * 点阵第 1～5 拍为 1～5 个英文句点，第 6 拍为中文「……」（与播完定稿一致，避免出现「······」）
   */
  function ellipsisDotSuffixFromPhase(phase) {
    var n = (phase % 6) + 1;
    if (n === 6) return "……";
    return ".".repeat(n);
  }

  function showDayTransitionForDay(dayIndex) {
    if (!dayTransitionOverlay || !dayTransitionText) return;
    clearDayTransitionDotAnimation();
    var base = dayIndex === 0 ? "新的一天开始了" : "又活了一天";
    var phase = 0;
    function tick() {
      dayTransitionText.textContent = base + ellipsisDotSuffixFromPhase(phase);
      phase++;
    }
    tick();
    dayTransitionDotIntervalId = setInterval(tick, ELLIPSIS_DOT_STEP_MS);
    dayTransitionOverlay.setAttribute("aria-hidden", "false");
    dayTransitionOverlay.classList.add("day-transition--open");
  }

  function hideDayTransitionThen(runAfter) {
    clearDayTransitionDotAnimation();
    if (!dayTransitionOverlay) {
      if (runAfter) runAfter();
      return;
    }
    dayTransitionOverlay.setAttribute("aria-hidden", "true");
    dayTransitionOverlay.classList.remove("day-transition--open");
    setTimeout(function () {
      if (runAfter) runAfter();
    }, DAY_TRANSITION_FADE_MS);
  }

  function hideDayTransitionImmediate() {
    clearDayTransitionDotAnimation();
    if (!dayTransitionOverlay) return;
    dayTransitionOverlay.setAttribute("aria-hidden", "true");
    dayTransitionOverlay.classList.remove("day-transition--open");
  }

  function updateProfileModeHint() {
    if (!profileModeHint) return;
    if (window.AIClient && window.AIClient.isAiReady()) {
      profileModeHint.textContent =
        "本周将优先由大模型（AI）生成每日事件；若请求失败会自动改为本地模板（非 AI）。";
    } else {
      profileModeHint.textContent = "本周事件由本地模板生成（非 AI）。";
    }
  }

  function isSegmentWeek() {
    return weekData && (weekData.mode === "ai" || weekData.mode === "local");
  }

  /** 事件区上方：是否「本局实际由大模型生成」 */
  function refreshWeekModeBadge() {
    if (!modeSourceBadge || !weekData) return;
    if (weekData.segmentsFromAi) {
      modeSourceBadge.textContent = "本局事件：AI 生成";
    } else {
      modeSourceBadge.textContent = "本局事件：非 AI 生成";
    }
  }

  var STAT_MAX = 10;

  /** 临时测试：true = 在角色页点击「进入本周」时直接展示结局3（周结局），方便看效果 */
  var DEV_FORCE_WEEKLY_ENDING_ON_WEEK_START = false;

  var dayEventCounts = [];
  /** 与 dayEventCounts 同日索引；开局一次随机，保证预取与正式请求 plain/choice 计数一致 */
  var dayPlainCounts = [];
  /** 每周递增，用于丢弃过期的在途 AI 请求写入缓存 */
  var weekAiBatchGeneration = 0;
  /** 同一天仅一条在途 AI 批请求 */
  var aiDayBatchPromises = {};
  /** @type {Array<{dayIndex:number,segmentIndex:number,dayLabel:string,picked:string,label:string}>} */
  var choiceLog = [];
  var pendingChoices = null;
  /** @type {null | 'choice' | 'plain' | 'choiceOutcome'} */
  var pendingSegmentKind = null;
  /** 选择后：结果页文案 + 已结算的属性变化展示 */
  /** @type {null | { outcomeText: string, statLine: string }} */
  var pendingChoiceOutcome = null;
  /** @type {null | { text: string | null }} */
  var aiFeedbackState = null;
  /** plain 段结算后已满怒/满疲劳时，先展示事件再点「继续」进结局 */
  /** @type {null | 'rage' | 'fatigue'} */
  var pendingPlainEnding = null;
  var aiLoading = false;
  var aiError = false;
  /** 各日由 AI 一次性生成的事件列表（顺序=当天从早到晚）；null 表示尚未拉取 */
  var daySegmentCache = [null, null, null, null, null, null, null];

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /** 非选择段数量 K∈[1,3]（在可保证 choice 占多数的前提下）；n 小于 3 时为 0 */
  function computePlainCountForDay(n) {
    if (n < 3) return 0;
    var maxPlain = Math.min(3, Math.floor((n - 1) / 2));
    if (maxPlain < 1) return 0;
    return randInt(1, maxPlain);
  }

  function buildDayPlainCountsFromEventCounts() {
    var out = [];
    var di;
    for (di = 0; di < dayEventCounts.length; di++) {
      out.push(computePlainCountForDay(dayEventCounts[di]));
    }
    return out;
  }

  /** 同一天的 AI 批只发起一次；预取与进入该天时共用同一 Promise */
  function ensureAiDayBatch(dayIndex, n, plainK) {
    if (!window.AIClient) {
      return Promise.reject(new Error("AI 未就绪"));
    }
    var cache = daySegmentCache[dayIndex];
    if (cache && cache.length >= n) {
      return Promise.resolve({ segments: cache });
    }
    var existing = aiDayBatchPromises[dayIndex];
    if (existing) return existing;
    var gen = weekAiBatchGeneration;
    var p = window.AIClient
      .generateDayBatch(player, weekData, choiceLog, dayIndex, n, plainK)
      .then(function (res) {
        if (gen !== weekAiBatchGeneration) return res;
        daySegmentCache[dayIndex] = res.segments;
        weekData.days[dayIndex] = res.segments.map(function (s) {
          return s.story;
        });
        return res;
      })
      .finally(function () {
        delete aiDayBatchPromises[dayIndex];
      });
    aiDayBatchPromises[dayIndex] = p;
    return p;
  }

  /** 在「当天最后一段」且已具备完整 choiceLog 时后台拉取下一天，减少跨日等待 */
  function schedulePrefetchAiNextDayIfReady(dayIndex, segmentIndex) {
    if (!weekData || weekData.mode !== "ai" || !weekData.segmentsFromAi) return;
    if (!window.AIClient || !window.AIClient.isAiReady()) return;
    var next = dayIndex + 1;
    if (next > 6) return;
    var nCur = dayEventCounts[dayIndex];
    if (segmentIndex !== nCur - 1) return;
    var c = daySegmentCache[dayIndex];
    if (!c || !c[segmentIndex]) return;
    if (c[segmentIndex].eventType === "choice") return;
    var nNext = dayEventCounts[next];
    var pk = dayPlainCounts[next];
    ensureAiDayBatch(next, nNext, pk).catch(function () {});
  }

  function clampStat(v) {
    return Math.max(0, Math.min(STAT_MAX, v));
  }

  /** 与 AI/本地事件一致：单条事件仅一轴 ±1～±2；解析失败按 0 再兜底 */
  var EVENT_DELTA_MIN = -2;
  var EVENT_DELTA_MAX = 2;

  function coerceStatDelta(v) {
    var n =
      typeof v === "number" && !Number.isNaN(v) ? Math.trunc(v) : parseInt(v, 10);
    if (Number.isNaN(n)) return 0;
    if (n < EVENT_DELTA_MIN) return EVENT_DELTA_MIN;
    if (n > EVENT_DELTA_MAX) return EVENT_DELTA_MAX;
    return n;
  }

  /** 恰好一轴非零；全零时默认怒气 +1（避免「无属性变化」） */
  function normalizeSingleAxisEventDelta(deltaAnger, deltaFatigue) {
    var da = coerceStatDelta(deltaAnger);
    var df = coerceStatDelta(deltaFatigue);
    if (da !== 0 && df === 0) return { deltaAnger: da, deltaFatigue: 0 };
    if (da === 0 && df !== 0) return { deltaAnger: 0, deltaFatigue: df };
    if (da !== 0 && df !== 0) {
      if (Math.abs(da) >= Math.abs(df)) return { deltaAnger: da, deltaFatigue: 0 };
      return { deltaAnger: 0, deltaFatigue: df };
    }
    return { deltaAnger: 1, deltaFatigue: 0 };
  }

  /** 应用增量并返回一行展示文案（含被上下限截断时的说明，避免空反馈） */
  function applyAngerFatigueFromDeltas(deltaAnger, deltaFatigue) {
    var norm = normalizeSingleAxisEventDelta(deltaAnger, deltaFatigue);
    var da = norm.deltaAnger;
    var df = norm.deltaFatigue;
    var beforeA = player.anger;
    var beforeF = player.fatigue;
    player.anger = clampStat(player.anger + da);
    player.fatigue = clampStat(player.fatigue + df);
    var actualA = player.anger - beforeA;
    var actualF = player.fatigue - beforeF;
    return formatDeltaLineForEvent(da, df, actualA, actualF);
  }

  /** 只展示实际有变化的项 */
  function formatDeltaLine(dAnger, dFatigue) {
    var parts = [];
    if (dAnger !== 0) {
      parts.push("怒气" + (dAnger > 0 ? "+" + dAnger : String(dAnger)));
    }
    if (dFatigue !== 0) {
      parts.push("疲劳" + (dFatigue > 0 ? "+" + dFatigue : String(dFatigue)));
    }
    return parts.join(" · ");
  }

  /**
   * 优先显示真实数值变化；若被 0～10 上限吃掉，则附带「已满/已触底」说明，仍展示事件意图。
   */
  function formatDeltaLineForEvent(nominalA, nominalF, actualA, actualF) {
    var line = formatDeltaLine(actualA, actualF);
    if (line) return line;
    var intent = formatDeltaLine(nominalA, nominalF);
    if (!intent) return "";
    var notes = [];
    if (nominalA !== 0 && actualA === 0) {
      notes.push(nominalA > 0 ? "怒气已满" : "怒气已触底");
    }
    if (nominalF !== 0 && actualF === 0) {
      notes.push(nominalF > 0 ? "疲劳已满" : "疲劳已触底");
    }
    if (!notes.length) return intent;
    return intent + "（" + notes.join(" · ") + "）";
  }

  function rollInitialStats() {
    return {
      ability: randInt(1, 10),
      luck: randInt(1, 10),
      anger: 0,
      fatigue: 0,
    };
  }

  function formatStatsLine(s) {
    return (
      "能力 " +
      s.ability +
      "/" +
      STAT_MAX +
      " · 幸运 " +
      s.luck +
      "/" +
      STAT_MAX +
      " · 怒气 " +
      s.anger +
      "/" +
      STAT_MAX +
      " · 疲劳 " +
      s.fatigue +
      "/" +
      STAT_MAX
    );
  }

  /** @type {{ name: string, gender: string, age: number, industry: string, personalityTags: string[], ability: number, luck: number, anger: number, fatigue: number } | null} */
  let player = null;

  const PERSONALITY_TAG_ALL = [
    "内向",
    "外向",
    "敏感",
    "佛系",
    "好胜",
    "焦虑型",
    "乐天派",
    "完美主义",
    "拖延症",
    "较真",
    "随和",
    "急性子",
    "夜猫子",
    "社恐",
    "爱吐槽",
  ];

  function getPersonalityTagsFromForm() {
    if (!form) return [];
    return Array.from(form.querySelectorAll('input[name="personality"]:checked'))
      .map(function (el) {
        return el.value;
      })
      .sort();
  }

  function updatePersonalityTagLimit() {
    if (!form) return;
    const boxes = form.querySelectorAll('input[name="personality"]');
    const checked = Array.from(boxes).filter(function (b) {
      return b.checked;
    });
    const n = checked.length;
    boxes.forEach(function (b) {
      b.disabled = !b.checked && n >= 3;
    });
  }

  if (form) {
    form.querySelectorAll('input[name="personality"]').forEach(function (el) {
      el.addEventListener("change", updatePersonalityTagLimit);
    });
    updatePersonalityTagLimit();
  }
  /** @type {{ days: string[][], seed: number, dayLabels: string[], mode?: string } | null} */
  let weekData = null;
  let weekSeedExtra = 0;
  let currentDayIndex = 0;
  let currentEventIndex = 0;

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }

  function getGender() {
    const checked = form.querySelector('input[name="gender"]:checked');
    return checked ? checked.value : "";
  }

  function showScreen(id) {
    Object.keys(screens).forEach(function (key) {
      const el = screens[key];
      const on = key === id;
      el.classList.toggle("screen--active", on);
      el.hidden = !on;
    });
  }

  function setWeekAiLoadingUi(busy) {
    if (screens.week) {
      screens.week.classList.toggle("week-screen--ai-loading", !!busy);
    }
  }

  function resetEndingRageUi() {
    if (endingRageTypewriter) endingRageTypewriter.textContent = "";
    if (btnEndingRestart) btnEndingRestart.hidden = true;
  }

  /** 进入结局1 屏：先「老子不干了」+ 辞职，再打字机与返回首页 */
  function enterEndingRageScreen() {
    hideDayTransitionImmediate();
    resetEndingRageUi();
    showScreen("endingRage");
  }

  var fatigueEnding1Timer = null;

  function resetEndingFatigue1Ui() {
    var blink = document.getElementById("ending-fatigue-blink");
    var lids = document.getElementById("ending-fatigue-eyelids");
    if (blink) blink.classList.remove("ending-fatigue-blink--play");
    if (lids) lids.classList.remove("ending-fatigue-eyelids--close");
  }

  function clearFatigueEnding1Timer() {
    if (fatigueEnding1Timer !== null) {
      clearTimeout(fatigueEnding1Timer);
      fatigueEnding1Timer = null;
    }
  }

  /** 结局2 第1屏：微晃 → 眨眼 → 闭眼，再进入第2屏 */
  function startEndingFatigue1Sequence() {
    clearFatigueEnding1Timer();
    resetEndingFatigue1Ui();
    var blink = document.getElementById("ending-fatigue-blink");
    var lids = document.getElementById("ending-fatigue-eyelids");
    if (blink) {
      blink.classList.remove("ending-fatigue-blink--play");
      void blink.offsetWidth;
      blink.classList.add("ending-fatigue-blink--play");
    }
    if (lids) lids.classList.remove("ending-fatigue-eyelids--close");

    setTimeout(function () {
      if (lids) lids.classList.add("ending-fatigue-eyelids--close");
    }, 1900);

    fatigueEnding1Timer = setTimeout(function () {
      fatigueEnding1Timer = null;
      showScreen("endingFatigue2");
    }, 5000);
  }

  function enterEndingFatigueScreen() {
    hideDayTransitionImmediate();
    clearDayTransitionDotAnimation();
    clearFatigueEnding1Timer();
    resetEndingFatigue1Ui();
    showScreen("endingFatigue1");
    startEndingFatigue1Sequence();
  }

  /** 抢救成功：进入下一天并继续本周（AI/本地同流程）；幸运急救耗运，幸运 -3（不低于 0） */
  function resumeWeekAfterFatigueSuccess() {
    if (!player || !weekData || !isSegmentWeek()) return;
    hideDayTransitionImmediate();
    player.fatigue = 0;
    player.anger = 0;
    player.luck = Math.max(0, player.luck - 3);
    weekStatsEl.textContent = formatStatsLine(player);
    weekAiBatchGeneration++;
    aiDayBatchPromises = {};
    if (currentDayIndex >= 6) {
      var reportText = window.WeekGen.buildWeeklyReport(player, weekData, {
        choiceLog: choiceLog,
      });
      showWeeklyEnding(reportText);
      return;
    }
    currentDayIndex++;
    currentEventIndex = 0;
    daySegmentCache[currentDayIndex] = null;
    weekData.days[currentDayIndex] = [];
    showScreen("week");
    loadWeekSegment();
  }

  function runEndingRageTypewriter() {
    if (!endingRageTypewriter || !btnEndingRestart) return;
    var el = endingRageTypewriter;
    var btn = btnEndingRestart;
    /** 正文来源：config.js → window.GAME_ENDING_RAGE_TYPEWRITER_LINES */
    var lib = window.GAME_ENDING_RAGE_TYPEWRITER_LINES;
    var lines = [];
    if (Array.isArray(lib)) {
      for (var li = 0; li < lib.length; li++) {
        var s = String(lib[li] == null ? "" : lib[li]).trim();
        if (s) lines.push(s);
      }
    }
    if (!lines.length) lines = ["于是", "那就"];
    /** 正文打字：单字间隔（毫秒） */
    var delayMin = 200;
    var delayMax = 200;
    /** 一段「……」点阵结束 → 换行 → 打下一段 之间的停顿 */
    var pauseBetweenLines = 1000;
    /** 「……」处：1～6 个点循环动画总时长（约 2 秒） */
    var ellipsisDotCycleMs = 1000;
    /** 全文定稿后，再过这么久才显示「换个地方当牛马吧」 */
    var delayBeforeShowRestartBtn = 1000;
    el.textContent = "";
    btn.hidden = true;

    function typeBaseChars(chars, basePrefix, onDone) {
      var pos = 0;
      function tick() {
        if (pos >= chars.length) {
          onDone();
          return;
        }
        el.textContent = basePrefix + chars.slice(0, pos + 1).join("");
        pos++;
        var d = delayMin + Math.floor(Math.random() * (delayMax - delayMin + 1));
        setTimeout(tick, d);
      }
      tick();
    }

    /** 点阵节奏与 ELLIPSIS_DOT_STEP_MS、ellipsisDotSuffixFromPhase 与每日过渡一致 */
    function runEllipsisDotCycle(baseText, onDone) {
      var start = Date.now();
      var phase = 0;
      function tick() {
        if (Date.now() - start >= ellipsisDotCycleMs) {
          el.textContent = baseText + "……";
          onDone();
          return;
        }
        el.textContent = baseText + ellipsisDotSuffixFromPhase(phase);
        phase++;
        setTimeout(tick, ELLIPSIS_DOT_STEP_MS);
      }
      tick();
    }

    function runSegment(segIndex, accumulatedPrefix) {
      if (segIndex >= lines.length) return;
      var line = lines[segIndex];
      var isLast = segIndex === lines.length - 1;
      typeBaseChars(Array.from(line), accumulatedPrefix, function () {
        runEllipsisDotCycle(accumulatedPrefix + line, function () {
          if (isLast) {
            el.textContent = accumulatedPrefix + line + "……";
            setTimeout(function () {
              btn.hidden = false;
            }, delayBeforeShowRestartBtn);
            return;
          }
          setTimeout(function () {
            var nextPrefix = accumulatedPrefix + line + "……\n";
            el.textContent = nextPrefix;
            runSegment(segIndex + 1, nextPrefix);
          }, pauseBetweenLines);
        });
      });
    }

    runSegment(0, "");
  }

  function validateAge(raw) {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 16 || n > 80) {
      return null;
    }
    return n;
  }

  function pickWeeklyInsight() {
    var lib = window.GAME_WEEK_INSIGHTS;
    if (!Array.isArray(lib) || !lib.length) {
      lib = [
        "本周 KPI：活着。",
        "少生气，多睡觉。",
        "下周再说，先下班。",
      ];
    }
    var idx = Math.floor(Math.random() * lib.length);
    return String(lib[idx] || "").trim();
  }

  function runWeeklyGlimpsePoem() {
    if (!reportGlimpseEl || !player || !weekData || !window.WeekGen) {
      if (reportGlimpseEl) {
        reportGlimpseEl.textContent = "";
        reportGlimpseEl.hidden = true;
      }
      return;
    }
    var extra = { choiceLog: choiceLog };
    reportGlimpseEl.hidden = false;
    reportGlimpseEl.textContent = "掠影生成中…";

    function applyLocalFallback() {
      reportGlimpseEl.textContent = window.WeekGen.generateLocalGlimpsePoem(
        player,
        weekData,
        extra,
      );
    }

    var ctx = window.WeekGen.buildWeeklyGlimpseContext(player, weekData, extra);
    if (window.AIClient && window.AIClient.isAiReady()) {
      window.AIClient
        .generateWeeklyGlimpsePoem(player, ctx)
        .then(function (poem) {
          if (reportGlimpseEl) reportGlimpseEl.textContent = poem;
        })
        .catch(function () {
          applyLocalFallback();
        });
    } else {
      applyLocalFallback();
    }
  }

  function showWeeklyEnding(reportResult) {
    var body = "";
    if (
      reportResult &&
      typeof reportResult === "object" &&
      typeof reportResult.body === "string"
    ) {
      body = reportResult.body;
    } else if (typeof reportResult === "string") {
      body = reportResult;
    }
    if (weeklyInsightEl) {
      weeklyInsightEl.textContent = pickWeeklyInsight();
    }
    if (reportBody) {
      reportBody.textContent = body;
    }
    showScreen("report");
    runWeeklyGlimpsePoem();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();

    const name = nameInput.value.trim();
    if (!name) {
      showError("请填写姓名。");
      nameInput.focus();
      return;
    }

    const age = validateAge(ageInput.value);
    if (age === null) {
      showError("请填写有效年龄（16–80）。");
      ageInput.focus();
      return;
    }

    if (!industrySelect.value) {
      showError("请选择行业。");
      industrySelect.focus();
      return;
    }

    const personalityTags = getPersonalityTagsFromForm();
    if (personalityTags.length > 3) {
      showError("性格标签最多选择 3 个。");
      return;
    }

    var stats = rollInitialStats();
    player = {
      name,
      gender: getGender(),
      age,
      industry: industrySelect.value,
      personalityTags: personalityTags,
      ability: stats.ability,
      luck: stats.luck,
      anger: stats.anger,
      fatigue: stats.fatigue,
    };

    summaryName.textContent = name;
    summaryGender.textContent = player.gender;
    summaryAge.textContent = String(age);
    summaryIndustry.textContent = player.industry;
    if (summaryPersonality) {
      summaryPersonality.textContent = personalityTags.length ? personalityTags.join("、") : "未选";
    }
    summaryAbility.textContent = stats.ability + " / " + STAT_MAX;
    summaryLuck.textContent = stats.luck + " / " + STAT_MAX;
    summaryAnger.textContent = stats.anger + " / " + STAT_MAX;
    summaryFatigue.textContent = stats.fatigue + " / " + STAT_MAX;

    updateProfileModeHint();
    showScreen("profile");
  });

  btnBackSetup.addEventListener("click", function () {
    updatePersonalityTagLimit();
    showScreen("setup");
  });

  function startLocalWeek() {
    if (!player || !window.WeekGen) return;
    weekSeedExtra = (Date.now() & 0xffffffff) >>> 0;
    weekData = {
      mode: "local",
      dayLabels: window.WeekGen.DAY_LABELS.slice(),
      days: [[], [], [], [], [], [], []],
      seed: (window.WeekGen.hashProfile(player) ^ weekSeedExtra) >>> 0,
      fallbackFromAi: false,
      segmentsFromAi: false,
    };
    dayEventCounts = Array.from({ length: 7 }, function () {
      return randInt(4, 8);
    });
    dayPlainCounts = buildDayPlainCountsFromEventCounts();
    weekAiBatchGeneration++;
    aiDayBatchPromises = {};
    choiceLog = [];
    pendingChoices = null;
    pendingSegmentKind = null;
    pendingChoiceOutcome = null;
    pendingPlainEnding = null;
    aiFeedbackState = null;
    aiLoading = false;
    aiError = false;
    currentDayIndex = 0;
    currentEventIndex = 0;
    daySegmentCache = [null, null, null, null, null, null, null];
    weekPlayerLine.textContent =
      player.name + " · " + player.industry + " · " + player.age + " 岁";
    weekStatsEl.textContent = formatStatsLine(player);
    setChoiceUiVisible(false);
    btnEventNext.hidden = true;
    btnEventNext.disabled = false;
    if (eventProgress) eventProgress.hidden = true;
    if (eventStatFeedback) {
      eventStatFeedback.hidden = true;
      eventStatFeedback.textContent = "";
    }
    renderWeekTabs();
    refreshWeekModeBadge();
    showScreen("week");
    loadWeekSegment();
  }

  function startAiWeek() {
    if (!player || !window.WeekGen || !window.AIClient) return;
    weekData = {
      mode: "ai",
      dayLabels: window.WeekGen.DAY_LABELS.slice(),
      days: [[], [], [], [], [], [], []],
      seed: Date.now(),
      fallbackFromAi: false,
      segmentsFromAi: true,
    };
    dayEventCounts = Array.from({ length: 7 }, function () {
      return randInt(4, 8);
    });
    dayPlainCounts = buildDayPlainCountsFromEventCounts();
    weekAiBatchGeneration++;
    aiDayBatchPromises = {};
    choiceLog = [];
    pendingChoices = null;
    pendingSegmentKind = null;
    pendingChoiceOutcome = null;
    pendingPlainEnding = null;
    aiFeedbackState = null;
    aiLoading = false;
    aiError = false;
    currentDayIndex = 0;
    currentEventIndex = 0;
    daySegmentCache = [null, null, null, null, null, null, null];
    weekPlayerLine.textContent =
      player.name + " · " + player.industry + " · " + player.age + " 岁";
    weekStatsEl.textContent = formatStatsLine(player);
    setChoiceUiVisible(false);
    btnEventNext.hidden = true;
    if (eventProgress) eventProgress.hidden = true;
    if (eventStatFeedback) {
      eventStatFeedback.hidden = true;
      eventStatFeedback.textContent = "";
    }
    renderWeekTabs();
    refreshWeekModeBadge();
    showScreen("week");
    loadWeekSegment();
  }

  btnStartWeek.addEventListener("click", function () {
    if (!player) return;
    if (DEV_FORCE_WEEKLY_ENDING_ON_WEEK_START) {
      var fakeReport =
        "【本周记录】\n" +
        "· 周一：活着\n" +
        "· 周二：活着\n" +
        "· 周三：活着\n" +
        "· 周四：活着\n" +
        "· 周五：活着\n" +
        "· 周六：活着\n" +
        "· 周日：活着\n";
      showWeeklyEnding(fakeReport);
      return;
    }
    if (window.AIClient && window.AIClient.isAiReady()) {
      startAiWeek();
    } else {
      startLocalWeek();
    }
  });

  function applyAiSegmentResult(seg) {
    if (!seg) return false;
    pendingPlainEnding = null;
    aiFeedbackState = null;
    pendingChoiceOutcome = null;
    if (eventStatFeedback) {
      eventStatFeedback.hidden = true;
      eventStatFeedback.textContent = "";
    }
    if (seg.eventType === "choice") {
      pendingSegmentKind = "choice";
      pendingChoices = { a: seg.choiceA, b: seg.choiceB };
      btnEventNext.hidden = true;
      return false;
    }
    pendingSegmentKind = "plain";
    pendingChoices = null;
    var line = applyAngerFatigueFromDeltas(seg.deltaAnger, seg.deltaFatigue);
    weekStatsEl.textContent = formatStatsLine(player);
    if (player.anger >= STAT_MAX) {
      pendingPlainEnding = "rage";
    } else if (player.fatigue >= STAT_MAX) {
      pendingPlainEnding = "fatigue";
    }
    aiFeedbackState = line
      ? { text: "【属性变化】" + line }
      : { text: null };
    btnEventNext.hidden = false;
    btnEventNext.textContent = "继续";
    return false;
  }

  function loadWeekSegment() {
    if (!player || !weekData || !isSegmentWeek()) return;

    setWeekAiLoadingUi(false);

    aiFeedbackState = null;
    pendingChoiceOutcome = null;
    if (eventStatFeedback) {
      eventStatFeedback.hidden = true;
      eventStatFeedback.textContent = "";
    }

    var d = currentDayIndex;
    var i = currentEventIndex;
    var n = dayEventCounts[d];
    var cache = daySegmentCache[d];

    if (cache && cache.length > i) {
      aiLoading = false;
      aiError = false;
      var endedByEnding = applyAiSegmentResult(cache[i]);
      btnEventNext.disabled = false;
      if (!endedByEnding) renderAiEventDisplay();
      schedulePrefetchAiNextDayIfReady(d, i);
      return;
    }

    if (cache && cache.length <= i) {
      eventCard.textContent = "本日事件数据异常，请重试本周。";
      aiError = true;
      btnEventNext.textContent = "重试";
      btnEventNext.hidden = false;
      btnEventNext.disabled = false;
      setChoiceUiVisible(false);
      return;
    }

    showDayTransitionForDay(d);

    setWeekAiLoadingUi(true);
    aiLoading = true;
    aiError = false;
    pendingChoices = null;
    pendingSegmentKind = null;
    setChoiceUiVisible(false);
    btnEventNext.hidden = false;
    btnEventNext.disabled = true;
    btnEventNext.textContent = "生成中…";
    eventCard.textContent = "";

    var plainK = dayPlainCounts[d] !== undefined ? dayPlainCounts[d] : computePlainCountForDay(n);

    if (weekData.mode === "local") {
      setTimeout(function () {
        try {
          var resLocal = window.WeekGen.generateLocalDayBatch(
            player,
            weekData,
            choiceLog,
            d,
            n,
            plainK,
          );
          hideDayTransitionThen(function () {
            setWeekAiLoadingUi(false);
            daySegmentCache[d] = resLocal.segments;
            weekData.days[d] = resLocal.segments.map(function (s) {
              return s.story;
            });
            aiLoading = false;
            aiError = false;
            var endedLoc = applyAiSegmentResult(resLocal.segments[i]);
            btnEventNext.disabled = false;
            if (!endedLoc) renderAiEventDisplay();
          });
        } catch (genErr) {
          hideDayTransitionImmediate();
          setWeekAiLoadingUi(false);
          aiLoading = false;
          aiError = true;
          daySegmentCache[d] = null;
          weekData.days[d] = [];
          eventCard.textContent =
            "本地生成异常：" +
            (genErr && genErr.message ? genErr.message : String(genErr));
          btnEventNext.textContent = "重试";
          btnEventNext.hidden = false;
          btnEventNext.disabled = false;
          setChoiceUiVisible(false);
        }
      }, 100);
      return;
    }

    if (!window.AIClient) {
      hideDayTransitionImmediate();
      setWeekAiLoadingUi(false);
      aiLoading = false;
      weekData.mode = "local";
      weekData.fallbackFromAi = true;
      weekData.segmentsFromAi = false;
      refreshWeekModeBadge();
      loadWeekSegment();
      return;
    }

    ensureAiDayBatch(d, n, plainK)
      .then(function (res) {
        hideDayTransitionThen(function () {
          setWeekAiLoadingUi(false);
          aiLoading = false;
          var endedByEnding2 = applyAiSegmentResult(res.segments[i]);
          btnEventNext.disabled = false;
          if (!endedByEnding2) renderAiEventDisplay();
          schedulePrefetchAiNextDayIfReady(d, i);
        });
      })
      .catch(function (err) {
        try {
          var resFb = window.WeekGen.generateLocalDayBatch(
            player,
            weekData,
            choiceLog,
            d,
            n,
            plainK,
          );
          hideDayTransitionImmediate();
          setWeekAiLoadingUi(false);
          weekData.mode = "local";
          weekData.fallbackFromAi = true;
          weekData.segmentsFromAi = false;
          daySegmentCache[d] = resFb.segments;
          weekData.days[d] = resFb.segments.map(function (s) {
            return s.story;
          });
          aiLoading = false;
          aiError = false;
          refreshWeekModeBadge();
          applyAiSegmentResult(resFb.segments[i]);
          btnEventNext.disabled = false;
          renderAiEventDisplay();
        } catch (e2) {
          hideDayTransitionImmediate();
          setWeekAiLoadingUi(false);
          aiLoading = false;
          aiError = true;
          daySegmentCache[d] = null;
          weekData.days[d] = [];
          eventCard.textContent =
            "生成失败：" +
            (err && err.message ? err.message : String(err)) +
            "\n\n请稍后点击「重试」。";
          btnEventNext.textContent = "重试";
          btnEventNext.hidden = false;
          btnEventNext.disabled = false;
          setChoiceUiVisible(false);
        }
      });
  }

  function renderAiEventDisplay() {
    if (!weekData || !isSegmentWeek() || !player) return;
    var d = currentDayIndex;
    var i = currentEventIndex;
    var text = weekData.days[d][i];
    eventDayLabel.textContent = weekData.dayLabels[d];
    if (eventProgress) {
      eventProgress.hidden = true;
      eventProgress.textContent = "";
    }

    if (pendingChoiceOutcome) {
      eventCard.textContent = pendingChoiceOutcome.outcomeText || "";
      if (eventStatFeedback) {
        if (pendingChoiceOutcome.statLine) {
          eventStatFeedback.hidden = false;
          eventStatFeedback.textContent = "【属性变化】" + pendingChoiceOutcome.statLine;
        } else {
          eventStatFeedback.hidden = true;
          eventStatFeedback.textContent = "";
        }
      }
      setChoiceUiVisible(false);
      btnEventNext.hidden = false;
      btnEventNext.textContent = "继续";
      btnEventNext.disabled = false;
      renderWeekTabs();
      return;
    }

    eventCard.textContent = text || "";

    if (aiFeedbackState && eventStatFeedback) {
      if (aiFeedbackState.text) {
        eventStatFeedback.hidden = false;
        eventStatFeedback.textContent = aiFeedbackState.text;
      } else {
        eventStatFeedback.hidden = true;
        eventStatFeedback.textContent = "";
      }
      setChoiceUiVisible(false);
      btnEventNext.hidden = false;
      btnEventNext.textContent = "继续";
      btnEventNext.disabled = false;
      renderWeekTabs();
      return;
    }

    if (eventStatFeedback) {
      eventStatFeedback.hidden = true;
      eventStatFeedback.textContent = "";
    }

    if (pendingSegmentKind === "choice" && pendingChoices) {
      setChoiceUiVisible(true);
      btnChoiceA.textContent = pendingChoices.a;
      btnChoiceB.textContent = pendingChoices.b;
      btnEventNext.hidden = true;
    } else {
      setChoiceUiVisible(false);
    }
    renderWeekTabs();
  }

  function proceedAfterStatFeedback() {
    aiFeedbackState = null;
    if (eventStatFeedback) {
      eventStatFeedback.hidden = true;
      eventStatFeedback.textContent = "";
    }
    advanceAfterAiSegment(null);
  }

  function advanceAfterAiSegment(choiceEntry) {
    if (!weekData || !isSegmentWeek() || !player) return;
    if (choiceEntry) {
      choiceLog.push(choiceEntry);
    }
    pendingPlainEnding = null;
    aiFeedbackState = null;
    pendingChoiceOutcome = null;
    if (eventStatFeedback) {
      eventStatFeedback.hidden = true;
      eventStatFeedback.textContent = "";
    }
    pendingChoices = null;
    pendingSegmentKind = null;
    setChoiceUiVisible(false);

    var d = currentDayIndex;
    var i = currentEventIndex;
    var lastOfWeek = d === 6 && i === dayEventCounts[6] - 1;
    if (lastOfWeek) {
      var reportText = window.WeekGen.buildWeeklyReport(player, weekData, {
        choiceLog: choiceLog,
      });
      showWeeklyEnding(reportText);
      return;
    }

    if (i < dayEventCounts[d] - 1) {
      currentEventIndex++;
    } else {
      currentDayIndex++;
      currentEventIndex = 0;
    }
    loadWeekSegment();
  }

  function onPickChoice(key) {
    if (!weekData || !isSegmentWeek() || !pendingChoices || aiLoading) return;
    if (pendingSegmentKind !== "choice") return;
    if (aiFeedbackState) return;
    if (pendingChoiceOutcome) return;

    var d = currentDayIndex;
    var i = currentEventIndex;
    var cache = daySegmentCache[d];
    if (!cache || !cache[i]) return;
    var seg = cache[i];
    if (seg.eventType !== "choice") return;

    var eff = key === "A" ? seg.effectA : seg.effectB;
    var label = key === "A" ? pendingChoices.a : pendingChoices.b;

    choiceLog.push({
      dayIndex: d,
      segmentIndex: i,
      dayLabel: weekData.dayLabels[d],
      picked: key,
      label: label,
    });

    if (
      weekData.mode === "ai" &&
      weekData.segmentsFromAi &&
      window.AIClient &&
      window.AIClient.isAiReady() &&
      d < 6 &&
      i === dayEventCounts[d] - 1
    ) {
      ensureAiDayBatch(d + 1, dayEventCounts[d + 1], dayPlainCounts[d + 1]).catch(function () {});
    }

    var line = applyAngerFatigueFromDeltas(
      eff && eff.deltaAnger,
      eff && eff.deltaFatigue,
    );
    weekStatsEl.textContent = formatStatsLine(player);

    var outcomeRaw =
      key === "A"
        ? seg.outcomeA !== undefined && seg.outcomeA !== null
          ? String(seg.outcomeA).trim()
          : ""
        : seg.outcomeB !== undefined && seg.outcomeB !== null
          ? String(seg.outcomeB).trim()
          : "";
    var outcomeText =
      outcomeRaw ||
      "你选了「" +
        label +
        "」。事情就这样落了地——有得有失，明天还得接着干。";

    pendingChoices = null;
    pendingSegmentKind = "choiceOutcome";
    aiFeedbackState = null;
    pendingPlainEnding = null;
    pendingChoiceOutcome = {
      outcomeText: outcomeText,
      statLine: line,
    };
    setChoiceUiVisible(false);
    renderAiEventDisplay();
  }

  if (btnChoiceA) btnChoiceA.addEventListener("click", function () { onPickChoice("A"); });
  if (btnChoiceB) btnChoiceB.addEventListener("click", function () { onPickChoice("B"); });

  function renderWeekTabs() {
    if (!weekData) return;
    weekTabs.innerHTML = "";
    weekData.dayLabels.forEach(function (label, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "week-tab";
      btn.textContent = label;
      btn.dataset.dayIndex = String(i);

      if (i < currentDayIndex) {
        btn.classList.add("week-tab--done");
        btn.setAttribute("aria-label", label + " 已完成");
      } else if (i === currentDayIndex) {
        btn.classList.add("week-tab--current");
        btn.setAttribute("aria-current", "step");
      } else {
        btn.classList.add("week-tab--locked");
        btn.disabled = true;
        btn.setAttribute("aria-label", label + " 未解锁");
      }

      weekTabs.appendChild(btn);
    });
  }

  btnEventNext.addEventListener("click", function () {
    if (!weekData || !player) return;

    if (isSegmentWeek()) {
      if (aiLoading) return;
      if (aiError) {
        aiError = false;
        loadWeekSegment();
        return;
      }
      if (pendingChoiceOutcome) {
        pendingChoiceOutcome = null;
        pendingSegmentKind = null;
        if (eventStatFeedback) {
          eventStatFeedback.hidden = true;
          eventStatFeedback.textContent = "";
        }
        if (player.anger >= STAT_MAX) {
          enterEndingRageScreen();
          return;
        }
        if (player.fatigue >= STAT_MAX) {
          enterEndingFatigueScreen();
          return;
        }
        advanceAfterAiSegment(null);
        return;
      }
      if (aiFeedbackState) {
        if (pendingPlainEnding === "rage") {
          pendingPlainEnding = null;
          aiFeedbackState = null;
          if (eventStatFeedback) {
            eventStatFeedback.hidden = true;
            eventStatFeedback.textContent = "";
          }
          enterEndingRageScreen();
          return;
        }
        if (pendingPlainEnding === "fatigue") {
          pendingPlainEnding = null;
          aiFeedbackState = null;
          if (eventStatFeedback) {
            eventStatFeedback.hidden = true;
            eventStatFeedback.textContent = "";
          }
          enterEndingFatigueScreen();
          return;
        }
        proceedAfterStatFeedback();
        return;
      }
      return;
    }
  });

  btnReportAgain.addEventListener("click", function () {
    if (!player || !window.WeekGen) return;
    if (window.AIClient && window.AIClient.isAiReady()) {
      startAiWeek();
    } else {
      startLocalWeek();
    }
  });

  btnReportHome.addEventListener("click", function () {
    updateProfileModeHint();
    showScreen("setup");
  });

  if (btnEndingResign) {
    btnEndingResign.addEventListener("click", function () {
      resetEndingRageUi();
      showScreen("endingRage2");
      runEndingRageTypewriter();
    });
  }

  if (btnEndingRestart) {
    btnEndingRestart.addEventListener("click", function () {
      hideDayTransitionImmediate();
      showScreen("setup");
    });
  }

  var fatigueRescueResultTimer = null;

  if (btnFatigueRescue) {
    btnFatigueRescue.addEventListener("click", function () {
      if (fatigueRescueResultTimer !== null) {
        clearTimeout(fatigueRescueResultTimer);
        fatigueRescueResultTimer = null;
      }
      showScreen("endingFatigue3");
      var ambulanceMs = 3000;
      fatigueRescueResultTimer = setTimeout(function () {
        fatigueRescueResultTimer = null;
        if (!player) return;
        var ok = Math.random() < player.luck / STAT_MAX;
        showScreen(ok ? "endingFatigueSuccess" : "endingFatigueFail");
      }, ambulanceMs);
    });
  }

  if (btnFatigueSuccess) {
    btnFatigueSuccess.addEventListener("click", function () {
      resumeWeekAfterFatigueSuccess();
    });
  }

  if (btnFatigueFailRestart) {
    btnFatigueFailRestart.addEventListener("click", function () {
      hideDayTransitionImmediate();
      showScreen("setup");
    });
  }

  /** 临时测试：自动随机填资料（当前关闭，保持手动填写） */
  var DEV_AUTO_FILL_SETUP = false;

  function fillRandomSetupForDev() {
    if (!DEV_AUTO_FILL_SETUP) return;
    if (!form || !nameInput || !ageInput || !industrySelect) return;

    var names = [
      "王小明",
      "李思琪",
      "陈浩然",
      "刘雨桐",
      "赵文博",
      "周晓雯",
      "孙宇航",
      "吴若溪",
      "郑一凡",
      "钱佳怡",
    ];
    nameInput.value = names[randInt(0, names.length - 1)];
    ageInput.value = String(randInt(22, 45));

    var genders = ["男", "女", "其他"];
    var g = genders[randInt(0, genders.length - 1)];
    var radios = form.querySelectorAll('input[name="gender"]');
    for (var gi = 0; gi < radios.length; gi++) {
      radios[gi].checked = radios[gi].value === g;
    }

    var optEls = industrySelect.querySelectorAll("option");
    var industries = [];
    for (var oi = 0; oi < optEls.length; oi++) {
      var v = optEls[oi].value;
      if (v) industries.push(v);
    }
    if (industries.length) {
      industrySelect.value = industries[randInt(0, industries.length - 1)];
    }

    var pBoxes = form.querySelectorAll('input[name="personality"]');
    for (var pi = 0; pi < pBoxes.length; pi++) {
      pBoxes[pi].checked = false;
    }
    var nTags = randInt(0, 3);
    if (nTags > 0) {
      var tagCopy = PERSONALITY_TAG_ALL.slice();
      for (var tj = tagCopy.length - 1; tj > 0; tj--) {
        var rj = randInt(0, tj);
        var swap = tagCopy[tj];
        tagCopy[tj] = tagCopy[rj];
        tagCopy[rj] = swap;
      }
      for (var tk = 0; tk < nTags; tk++) {
        var want = tagCopy[tk];
        for (var pi2 = 0; pi2 < pBoxes.length; pi2++) {
          if (pBoxes[pi2].value === want) {
            pBoxes[pi2].checked = true;
            break;
          }
        }
      }
    }
    updatePersonalityTagLimit();

    clearError();
  }

  fillRandomSetupForDev();

  if (btnIntroYes) {
    btnIntroYes.addEventListener("click", function () {
      showScreen("introYes");
    });
  }
  if (btnIntroNo) {
    btnIntroNo.addEventListener("click", function () {
      showScreen("introNo");
    });
  }
  if (btnIntroYesNext) {
    btnIntroYesNext.addEventListener("click", function () {
      showScreen("setup");
    });
  }
  if (btnIntroNoNext) {
    btnIntroNoNext.addEventListener("click", function () {
      showScreen("setup");
    });
  }
})();
