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
      profileModeHint.textContent = "【调试】进入本周后将使用：AI 生成";
    } else {
      profileModeHint.textContent = "【调试】进入本周后将使用：本地模板";
    }
  }

  function setWeekModeBadge(isAi) {
    if (!modeSourceBadge) return;
    modeSourceBadge.textContent = isAi
      ? "【调试】本局：AI 生成"
      : "【调试】本局：本地模板";
  }

  var STAT_MAX = 10;

  /** 临时测试：true = 在角色页点击「进入本周」时直接展示结局3（周结局），方便看效果 */
  var DEV_FORCE_WEEKLY_ENDING_ON_WEEK_START = false;

  var dayEventCounts = [];
  /** @type {Array<{dayIndex:number,segmentIndex:number,dayLabel:string,picked:string,label:string}>} */
  var choiceLog = [];
  var pendingChoices = null;
  /** @type {null | 'choice' | 'plain'} */
  var pendingSegmentKind = null;
  /** @type {null | { text: string }} */
  var aiFeedbackState = null;
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

  function clampStat(v) {
    return Math.max(0, Math.min(STAT_MAX, v));
  }

  /** 应用增量并返回一行展示文案（怒气/疲劳的实际变化，已考虑上下限） */
  function applyAngerFatigueFromDeltas(deltaAnger, deltaFatigue) {
    var da = typeof deltaAnger === "number" ? deltaAnger : 0;
    var df = typeof deltaFatigue === "number" ? deltaFatigue : 0;
    var beforeA = player.anger;
    var beforeF = player.fatigue;
    player.anger = clampStat(player.anger + da);
    player.fatigue = clampStat(player.fatigue + df);
    return formatDeltaLine(player.anger - beforeA, player.fatigue - beforeF);
  }

  function formatDeltaLine(dAnger, dFatigue) {
    function one(n, label) {
      if (n === 0) return label + "不变";
      return label + (n > 0 ? "+" + n : String(n));
    }
    return one(dAnger, "怒气") + " · " + one(dFatigue, "疲劳");
  }

  function rollInitialStats() {
    return {
      ability: randInt(1, 10),
      luck: randInt(1, 10),
      anger: randInt(0, 5),
      fatigue: randInt(0, 5),
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

  /** @type {{ name: string, gender: string, age: number, industry: string, ability: number, luck: number, anger: number, fatigue: number } | null} */
  let player = null;
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

  /** 怒气满（10）时进入结局1；返回 true 表示已切屏，调用方勿再渲染本周 UI */
  function maybeTriggerAngerEnding() {
    if (!player || player.anger < STAT_MAX) return false;
    enterEndingRageScreen();
    return true;
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

  /** 疲劳满（10）时进入结局2；怒气优先于疲劳 */
  function maybeTriggerFatigueEnding() {
    if (!player || player.fatigue < STAT_MAX) return false;
    enterEndingFatigueScreen();
    return true;
  }

  /** 抢救成功：进入下一天并继续 AI 周 */
  function resumeWeekAfterFatigueSuccess() {
    if (!player || !weekData || weekData.mode !== "ai") return;
    hideDayTransitionImmediate();
    player.fatigue = randInt(2, 5);
    player.anger = clampStat(player.anger - 1);
    weekStatsEl.textContent = formatStatsLine(player);
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
    loadAiSegment();
  }

  function runEndingRageTypewriter() {
    if (!endingRageTypewriter || !btnEndingRestart) return;
    var el = endingRageTypewriter;
    var btn = btnEndingRestart;
    var line1Base = "既然这样";
    var line2Base = "那就";
    /** 正文打字：单字间隔（毫秒） */
    var delayMin = 300;
    var delayMax = 300;
    /** 第一行「……」点阵动画结束 → 换行 → 打第二行正文 之间的停顿 */
    var pauseBetweenLines = 1000;
    /** 「……」处：1～6 个点循环动画总时长（约 2 秒） */
    var ellipsisDotCycleMs = 1800;
    /** 「那就……」全文定稿后，再过这么久才显示「换个地方当牛马吧」 */
    var delayBeforeShowRestartBtn = 1800;
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

    typeBaseChars(Array.from(line1Base), "", function () {
      runEllipsisDotCycle(line1Base, function () {
        setTimeout(function () {
          el.textContent = line1Base + "……\n";
          typeBaseChars(Array.from(line2Base), line1Base + "……\n", function () {
            runEllipsisDotCycle(line1Base + "……\n" + line2Base, function () {
              el.textContent = line1Base + "……\n" + line2Base + "……";
              setTimeout(function () {
                btn.hidden = false;
              }, delayBeforeShowRestartBtn);
            });
          });
        }, pauseBetweenLines);
      });
    });
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

  function showWeeklyEnding(reportText) {
    if (weeklyInsightEl) {
      weeklyInsightEl.textContent = pickWeeklyInsight();
    }
    if (reportBody) {
      reportBody.textContent = reportText || "";
    }
    showScreen("report");
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

    var stats = rollInitialStats();
    player = {
      name,
      gender: getGender(),
      age,
      industry: industrySelect.value,
      ability: stats.ability,
      luck: stats.luck,
      anger: stats.anger,
      fatigue: stats.fatigue,
    };

    summaryName.textContent = name;
    summaryGender.textContent = player.gender;
    summaryAge.textContent = String(age);
    summaryIndustry.textContent = player.industry;
    summaryAbility.textContent = stats.ability + " / " + STAT_MAX;
    summaryLuck.textContent = stats.luck + " / " + STAT_MAX;
    summaryAnger.textContent = stats.anger + " / " + STAT_MAX;
    summaryFatigue.textContent = stats.fatigue + " / " + STAT_MAX;

    updateProfileModeHint();
    showScreen("profile");
  });

  btnBackSetup.addEventListener("click", function () {
    showScreen("setup");
  });

  function startLocalWeek() {
    if (!player || !window.WeekGen) return;
    weekSeedExtra = (Date.now() & 0xffffffff) >>> 0;
    weekData = window.WeekGen.generateWeek(player, weekSeedExtra);
    weekData.mode = "local";
    dayEventCounts = [];
    choiceLog = [];
    pendingChoices = null;
    pendingSegmentKind = null;
    aiFeedbackState = null;
    aiLoading = false;
    aiError = false;
    currentDayIndex = 0;
    currentEventIndex = 0;
    weekPlayerLine.textContent =
      player.name + " · " + player.industry + " · " + player.age + " 岁";
    weekStatsEl.textContent = formatStatsLine(player);
    setChoiceUiVisible(false);
    btnEventNext.hidden = false;
    btnEventNext.disabled = false;
    if (eventProgress) eventProgress.hidden = false;
    if (eventStatFeedback) {
      eventStatFeedback.hidden = true;
      eventStatFeedback.textContent = "";
    }
    renderWeekTabs();
    renderCurrentEvent();
    setWeekModeBadge(false);
    showScreen("week");
  }

  function startAiWeek() {
    if (!player || !window.WeekGen || !window.AIClient) return;
    weekData = {
      mode: "ai",
      dayLabels: window.WeekGen.DAY_LABELS.slice(),
      days: [[], [], [], [], [], [], []],
      seed: Date.now(),
    };
    dayEventCounts = Array.from({ length: 7 }, function () {
      return randInt(4, 8);
    });
    choiceLog = [];
    pendingChoices = null;
    pendingSegmentKind = null;
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
    setWeekModeBadge(true);
    showScreen("week");
    loadAiSegment();
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
    aiFeedbackState = null;
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
    if (maybeTriggerAngerEnding()) return true;
    if (maybeTriggerFatigueEnding()) return true;
    aiFeedbackState = { text: "【属性变化】" + line };
    btnEventNext.hidden = false;
    btnEventNext.textContent = "继续";
    return false;
  }

  function loadAiSegment() {
    if (!player || !weekData || weekData.mode !== "ai" || !window.AIClient) return;

    aiFeedbackState = null;
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

    aiLoading = true;
    aiError = false;
    pendingChoices = null;
    pendingSegmentKind = null;
    setChoiceUiVisible(false);
    btnEventNext.hidden = false;
    btnEventNext.disabled = true;
    btnEventNext.textContent = "生成中…";
    eventCard.textContent = "";

    var plainK = computePlainCountForDay(n);

    window.AIClient
      .generateDayBatch(player, weekData, choiceLog, d, n, plainK)
      .then(function (res) {
        hideDayTransitionThen(function () {
          daySegmentCache[d] = res.segments;
          weekData.days[d] = res.segments.map(function (s) {
            return s.story;
          });
          aiLoading = false;
          var endedByEnding2 = applyAiSegmentResult(res.segments[i]);
          btnEventNext.disabled = false;
          if (!endedByEnding2) renderAiEventDisplay();
        });
      })
      .catch(function (err) {
        hideDayTransitionImmediate();
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
      });
  }

  function renderAiEventDisplay() {
    if (!weekData || weekData.mode !== "ai" || !player) return;
    var d = currentDayIndex;
    var i = currentEventIndex;
    var text = weekData.days[d][i];
    eventDayLabel.textContent = weekData.dayLabels[d];
    if (eventProgress) {
      eventProgress.hidden = true;
      eventProgress.textContent = "";
    }
    eventCard.textContent = text || "";

    if (aiFeedbackState && eventStatFeedback) {
      eventStatFeedback.hidden = false;
      eventStatFeedback.textContent = aiFeedbackState.text;
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
    if (!weekData || weekData.mode !== "ai" || !player) return;
    if (choiceEntry) {
      choiceLog.push(choiceEntry);
    }
    aiFeedbackState = null;
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
    loadAiSegment();
  }

  function onPickChoice(key) {
    if (!weekData || weekData.mode !== "ai" || !pendingChoices || aiLoading) return;
    if (pendingSegmentKind !== "choice") return;
    if (aiFeedbackState) return;

    var d = currentDayIndex;
    var i = currentEventIndex;
    var cache = daySegmentCache[d];
    if (!cache || !cache[i]) return;
    var seg = cache[i];
    if (seg.eventType !== "choice") return;

    var eff = key === "A" ? seg.effectA : seg.effectB;
    var da = eff && typeof eff.deltaAnger === "number" ? eff.deltaAnger : 0;
    var df = eff && typeof eff.deltaFatigue === "number" ? eff.deltaFatigue : 0;
    var label = key === "A" ? pendingChoices.a : pendingChoices.b;

    choiceLog.push({
      dayIndex: d,
      segmentIndex: i,
      dayLabel: weekData.dayLabels[d],
      picked: key,
      label: label,
    });

    var line = applyAngerFatigueFromDeltas(da, df);
    weekStatsEl.textContent = formatStatsLine(player);
    if (maybeTriggerAngerEnding()) return;
    if (maybeTriggerFatigueEnding()) return;
    aiFeedbackState = { text: "【属性变化】" + line };
    pendingChoices = null;
    pendingSegmentKind = null;
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

  function renderCurrentEvent() {
    if (!weekData || !player) return;

    if (weekData.mode === "ai") {
      if (!aiLoading && weekData.days[currentDayIndex][currentEventIndex]) {
        renderAiEventDisplay();
      }
      return;
    }

    const dayEvents = weekData.days[currentDayIndex];
    const label = weekData.dayLabels[currentDayIndex];
    const total = dayEvents.length;
    const idx = currentEventIndex;
    const text = dayEvents[idx];

    eventDayLabel.textContent = label;
    if (eventProgress) {
      eventProgress.hidden = false;
      eventProgress.textContent = "第 " + (idx + 1) + " / " + total + " 件事";
    }
    eventCard.textContent = text;
    setChoiceUiVisible(false);
    btnEventNext.hidden = false;
    btnEventNext.disabled = false;

    const isLastOfDay = idx >= total - 1;
    const isSunday = currentDayIndex === 6;

    if (isLastOfDay && isSunday) {
      btnEventNext.textContent = "生成本周汇报";
    } else if (isLastOfDay) {
      btnEventNext.textContent = "进入" + weekData.dayLabels[currentDayIndex + 1];
    } else {
      btnEventNext.textContent = "下一件";
    }

    renderWeekTabs();
  }

  btnEventNext.addEventListener("click", function () {
    if (!weekData || !player) return;

    if (weekData.mode === "ai") {
      if (aiLoading) return;
      if (aiError) {
        aiError = false;
        loadAiSegment();
        return;
      }
      if (aiFeedbackState) {
        proceedAfterStatFeedback();
        return;
      }
      return;
    }

    const dayEvents = weekData.days[currentDayIndex];
    const isLastOfDay = currentEventIndex >= dayEvents.length - 1;

    if (!isLastOfDay) {
      currentEventIndex++;
      renderCurrentEvent();
      return;
    }

    if (currentDayIndex < 6) {
      currentDayIndex++;
      currentEventIndex = 0;
      renderCurrentEvent();
      return;
    }

    const reportText = window.WeekGen.buildWeeklyReport(player, weekData);
    showWeeklyEnding(reportText);
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
