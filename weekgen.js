/**
 * 根据角色信息生成一周七天事件（可复现随机 + 行业/年龄差异）
 */
(function (global) {
  const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  function hashProfile(p) {
    const str = [p.name, p.gender, p.industry, String(p.age)].join("|");
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const INDUSTRY_KW = {
    互联网: {
      scene: "会议室与工位之间",
      tool: "需求文档与排期表",
      crisis: "线上告警",
      peer: "产品经理",
    },
    金融: {
      scene: "营业大厅与风控室",
      tool: "报表与合规流程",
      crisis: "抽查与复核",
      peer: "客户与合规",
    },
    制造业: {
      scene: "车间与计划室",
      tool: "工单与质检单",
      crisis: "产线异常",
      peer: "班组长",
    },
    教育: {
      scene: "教室与教研室",
      tool: "课表与教案",
      crisis: "临时调课",
      peer: "教务与家长",
    },
    医疗: {
      scene: "诊室与护士站",
      tool: "病历与医嘱系统",
      crisis: "急诊加塞",
      peer: "患者与科室",
    },
    零售: {
      scene: "卖场与库房",
      tool: "库存与促销方案",
      crisis: "断货与客诉",
      peer: "顾客与平台",
    },
    建筑: {
      scene: "工地与项目部",
      tool: "图纸与签证单",
      crisis: "安全巡检",
      peer: "甲方与监理",
    },
    公共服务: {
      scene: "窗口与办公室",
      tool: "材料与审批单",
      crisis: "突击检查",
      peer: "群众与上级",
    },
    自由职业: {
      scene: "家里与咖啡馆",
      tool: "合同与发票",
      crisis: "尾款拖延",
      peer: "甲方与平台",
    },
    其他: {
      scene: "办公室与现场",
      tool: "邮件与表格",
      crisis: "临时任务",
      peer: "同事与领导",
    },
  };

  function getKw(industry) {
    return INDUSTRY_KW[industry] || INDUSTRY_KW["其他"];
  }

  function ageBand(age) {
    const a = Number(age);
    if (a < 28) return "junior";
    if (a <= 42) return "mid";
    return "senior";
  }

  function genderTone(g) {
    if (g === "女") return "她";
    if (g === "男") return "他";
    return "TA";
  }

  function buildStepGenerators() {
    return [
      // 周一
      function step(p, kw, band, rnd) {
        const g = genderTone(p.gender);
        const lines = [
          () =>
            `${p.name} 在 ${kw.scene} 打卡，${DAY_LABELS[0]} 的闹钟比周末狠三倍。`,
          () =>
            band === "junior"
              ? `早会前，${g} 偷偷看了一眼昨晚没回完的消息，深吸一口气。`
              : `晨会一开始，${kw.peer} 就把「本周重点」写满了白板。`,
          () =>
            `你打开 ${kw.tool}，未办事项像滚雪球，${kw.crisis} 的字样一闪而过。`,
          () =>
            band === "senior"
              ? `午饭时你想起体检报告还没取，又默默把外卖换成清淡款。`
              : `下午第一个会结束，你才发现水杯一上午没动过。`,
          () =>
            `${DAY_LABELS[0]} 收工前，领导一句「明天对齐一下」为本周埋下伏笔。`,
        ];
        return pickLines(lines, rnd, 3 + Math.floor(rnd() * 3));
      },
      // 周二
      function step(p, kw, band, rnd) {
        const lines = [
          () =>
            `${DAY_LABELS[1]} 一上班，协作群里有人 @全体成员，节奏瞬间拉满。`,
          () =>
            `你与 ${kw.peer} 来回沟通，方案改到第三版，文件名后缀已经「final_v9」。`,
          () =>
            band === "junior"
              ? `前辈丢来一个「小问题」，你查资料查到眼睛发酸。`
              : `你一边推进手头事，一边给新人擦了一次屁股。`,
          () =>
            `傍晚突发的 ${kw.crisis} 让你差点错过末班车，好在有惊无险。`,
          () => `睡前你刷到同行吐槽，默默点了个赞，然后设了七个闹钟。`,
        ];
        return pickLines(lines, rnd, 3 + Math.floor(rnd() * 2));
      },
      // 周三
      function step(p, kw, band, rnd) {
        const lines = [
          () =>
            `一周过半，${DAY_LABELS[2]} 的空气里写着「还能撑住」四个大字。`,
          () =>
            `你在 ${kw.tool} 里勾选完成两项，又新增五项，成就感与无力感同框。`,
          () =>
            `午饭搭子问「周末去哪」，你笑了笑：先把今天活完再说。`,
          () =>
            band === "mid"
              ? `家里发来消息问近况，你回复「还行」，其实键盘敲出火星。`
              : `下午你被迫参加跨部门会议，会议主题只有一个：再对齐一次。`,
          () =>
            `下班路上耳机里随机到励志歌，你差点笑出声——太应景了。`,
        ];
        return pickLines(lines, rnd, 3 + Math.floor(rnd() * 2));
      },
      // 周四
      function step(p, kw, band, rnd) {
        const lines = [
          () =>
            `${DAY_LABELS[3]}，传说中最漫长的一天；你信了。`,
          () =>
            `deadline 像贴在脑门上的便利贴，${kw.crisis} 与日常事项抢时间。`,
          () =>
            `你拒绝了两次无效社交，第三次没好意思拒绝，损失了四十分钟。`,
          () =>
            band === "senior"
              ? `腰与肩开始抗议，你站起来接水，顺便眺望窗外假装诗和远方。`
              : `晚上你终于把拖了很久的一件事收尾，心里轻了半公斤。`,
          () =>
            `临睡前你想起明天还有汇报材料，把闹钟又往前拨了十分钟。`,
        ];
        return pickLines(lines, rnd, 3 + Math.floor(rnd() * 2));
      },
      // 周五
      function step(p, kw, band, rnd) {
        const lines = [
          () =>
            `${DAY_LABELS[4]}，办公室里漂浮着「快放假了」的微弱希望。`,
          () =>
            `你在 ${kw.scene} 来回穿梭，把能推的推到下周，不能推的硬啃下来。`,
          () =>
            `午饭时有人提议周末团建，你礼貌围观，内心算盘打得噼啪响。`,
          () =>
            `下班前一小时，${kw.peer} 发来「小改动」——经典款。`,
          () =>
            `你还是在天黑前离开了工位，${DAY_LABELS[4]} 的胜利，值得一杯奶茶。`,
        ];
        return pickLines(lines, rnd, 3 + Math.floor(rnd() * 2));
      },
      // 周六
      function step(p, kw, band, rnd) {
        const lines = [
          () =>
            `${DAY_LABELS[5]}，有人补觉，有人加班；你属于哪一种，心里清楚。`,
          () =>
            p.industry === "自由职业"
              ? `你在「工作与生活平衡」的夹缝里改合同、催尾款、回消息。`
              : `消息提示音偶尔响起，你把手机翻了个面，与世界短暂和解。`,
          () =>
            `下午你处理了一件拖了一周的私事，感觉比完成项目还解压。`,
          () =>
            `傍晚你出门走走，风里有周末的味道，也有下周一的预告。`,
          () =>
            `夜深时你刷到「牛马」表情包，截图发给自己，算是一种自嘲式疗愈。`,
        ];
        return pickLines(lines, rnd, 2 + Math.floor(rnd() * 2));
      },
      // 周日
      function step(p, kw, band, rnd) {
        const g = genderTone(p.gender);
        const lines = [
          () =>
            `${DAY_LABELS[6]}，洗好的衣服、没写完的总结、和隐隐发作的「明天恐惧症」。`,
          () =>
            `你把 ${kw.tool} 粗略过了一遍，给下周列了三个「必须搞定」。`,
          () =>
            band === "junior"
              ? `${g} 给爸妈回了语音，说「都挺好」，背景是键盘声。`
              : `你给自己留了一小段完全空白的时间，什么都不为，很难得。`,
          () =>
            `傍晚你开始整理本周碎片：截图、便签、聊天记录里的待办。`,
          () =>
            `夜深，你设好闹钟，对屏幕里的自己说：新的一周，又是好汉一条。`,
        ];
        return pickLines(lines, rnd, 3 + Math.floor(rnd() * 2));
      },
    ];
  }

  function pickLines(lineFns, rnd, count) {
    const idx = lineFns.map((_, i) => i);
    shuffle(idx, rnd);
    const n = Math.min(count, lineFns.length);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(lineFns[idx[i]]());
    }
    return out;
  }

  function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
  }

  function personalize(text, p) {
    return text.replace(/\{name\}/g, p.name).replace(/\{age\}/g, String(p.age));
  }

  function generateWeek(profile, seedExtra) {
    const seed = (hashProfile(profile) ^ (seedExtra >>> 0)) >>> 0;
    const rnd = mulberry32(seed);
    const kw = getKw(profile.industry);
    const band = ageBand(profile.age);
    const gens = buildStepGenerators();
    const days = [];

    for (let d = 0; d < 7; d++) {
      const raw = gens[d](profile, kw, band, rnd);
      const events = raw.map((s) => personalize(s, profile));
      days.push(events);
    }

    return { days, seed, dayLabels: DAY_LABELS };
  }

  function buildWeeklyReport(profile, daysData, extra) {
    extra = extra || {};
    const kw = getKw(profile.industry);
    const lines = [];
    lines.push(
      `${profile.name}（${profile.gender}，${profile.age} 岁 · ${profile.industry}）`,
    );
    lines.push("");
    lines.push("【属性】（上限 10）");
    if (
      typeof profile.ability === "number" &&
      typeof profile.luck === "number" &&
      typeof profile.anger === "number" &&
      typeof profile.fatigue === "number"
    ) {
      lines.push(
        `· 能力 ${profile.ability}/10 · 幸运 ${profile.luck}/10 · 怒气 ${profile.anger}/10 · 疲劳 ${profile.fatigue}/10`,
      );
    } else {
      lines.push("· （未记录属性）");
    }
    lines.push("");
    if (extra.choiceLog && extra.choiceLog.length) {
      lines.push("【本周抉择】");
      extra.choiceLog.forEach((c) => {
        lines.push(
          `· ${c.dayLabel} 第${c.segmentIndex + 1} 段后：选 ${c.picked}（${c.label}）`,
        );
      });
      lines.push("");
    }
    lines.push("【本周掠影】");
    daysData.dayLabels.forEach((label, i) => {
      const evs = daysData.days[i];
      const hook = (evs && evs[0]) || "（平静的一天）";
      lines.push(`· ${label}：${hook}`);
    });
    lines.push("");
    lines.push("【数据向吐槽】");
    const total = daysData.days.reduce((a, b) => a + (b ? b.length : 0), 0);
    lines.push(`· 本周遭遇事件条数：${total}（含心理活动与物理伤害）`);
    lines.push(`· 高频场景：${kw.scene}；高频工具：${kw.tool}`);
    lines.push(`· 危机/插曲关键词：${kw.crisis}`);
    lines.push("");
    const closings = [
      "总结：牛马虽累，班还是要上；下周继续对齐颗粒度。",
      "汇报完毕。建议：多喝水，少生气，工资到账那一刻一切都是值得的。",
      "本周 KPI：活着。恭喜超额完成。",
    ];
    const idx = Math.abs(hashProfile(profile) + total) % closings.length;
    lines.push(closings[idx]);
    return lines.join("\n");
  }

  global.WeekGen = {
    DAY_LABELS,
    generateWeek,
    buildWeeklyReport,
    hashProfile,
  };
})(typeof window !== "undefined" ? window : globalThis);
