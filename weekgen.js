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

  function fingerprintStory(txt) {
    return String(txt || "")
      .replace(/\s+/g, "")
      .slice(0, 64);
  }

  function clampDelta(n) {
    return Math.max(-5, Math.min(5, n));
  }

  /** 无选项段：怒气与疲劳二选一，必有非零整数增量 */
  function rollSingleAxisPlainDelta(rnd) {
    const mag = 1 + Math.floor(rnd() * 3);
    const val = clampDelta((rnd() < 0.5 ? 1 : -1) * mag);
    if (rnd() < 0.5) {
      return { deltaAnger: val, deltaFatigue: 0 };
    }
    return { deltaAnger: 0, deltaFatigue: val };
  }

  /** 选项效果：仅一条轴非零；规格写错时兜底 */
  function singleAxisEffectFromSpec(eff, rnd) {
    let da = clampDelta(Number(eff.deltaAnger) || 0);
    let df = clampDelta(Number(eff.deltaFatigue) || 0);
    if (da !== 0 && df === 0) return { deltaAnger: da, deltaFatigue: 0 };
    if (da === 0 && df !== 0) return { deltaAnger: 0, deltaFatigue: df };
    if (da !== 0 && df !== 0) {
      return rnd() < 0.5
        ? { deltaAnger: da, deltaFatigue: 0 }
        : { deltaAnger: 0, deltaFatigue: df };
    }
    const v = clampDelta((rnd() < 0.5 ? 1 : -1) * (1 + Math.floor(rnd() * 2)));
    return rnd() < 0.5
      ? { deltaAnger: v, deltaFatigue: 0 }
      : { deltaAnger: 0, deltaFatigue: v };
  }

  /** 与 AI 段结构一致：plain / choice */
  function fillTpl(s, p, kw, g, dayLabel) {
    return String(s)
      .replace(/NAME/g, p.name)
      .replace(/GENDER/g, g)
      .replace(/SCENE/g, kw.scene)
      .replace(/TOOL/g, kw.tool)
      .replace(/CRISIS/g, kw.crisis)
      .replace(/PEER/g, kw.peer)
      .replace(/DAY/g, dayLabel);
  }

  /** 通用池：按天用不同子区间轮换，降低连玩重复感 */
  const SHARED_PLAIN = [
    "DAY，NAME 在 SCENE 到岗，电梯里听见有人叹气，像合唱。",
    "TOOL 弹出「紧急」标记，你深吸一口气，假装自己是机器人。",
    "PEER 路过拍了拍你肩：「顺便帮看下？」你嘴角上扬三毫米。",
    "午休排队时，你盯着手机日历，感觉 CRISIS 在对你招手。",
    "下午开会，主题从三点扩成十二点，白板写不下人间疾苦。",
    "傍晚 NAME 关掉三个提醒，又冒出两个，像打地鼠。",
    "DAY 收工前，领导说「简单对齐」，你听懂是「今晚别走」。",
    "地铁里 NAME 刷到离职帖，点赞又取消，像做贼。",
    "NAME 给自己泡了第二杯咖啡，苦味和 KPI 很配。",
    "SCENE 的空调永远要么冻死要么闷死，没有中间态。",
    "TOOL 里待办折叠了七层，你怀疑自己在玩套娃。",
    "PEER 在群里发长语音，你转文字，省流量也省命。",
    "CRISIS 解决一半，另一半改名叫「下周再说」。",
    "NAME 盯着屏幕发呆，光标一闪一闪，像在嘲笑。",
    "午饭凉了，你边吃边看表，嚼的是时间不是饭。",
    "DAY，NAME 收到「辛苦一下」四个字，自动翻译成「加班」。",
    "会议室椅子硌腰，你换了个姿势，硌另一边。",
    "TOOL 同步失败，你刷新三次，怀疑宇宙在卡 bug。",
    "PEER 说「就改一点点」，你打开 diff，像看小说。",
    "NAME 去洗手间照镜子，眼神写满「还能撑」。",
    "下班路上红灯格外多，像在帮你拖延回家。",
    "DAY，NAME 梦见 deadline，醒来发现不是梦。",
    "SCENE 饮水机空了，你接空气，接了个寂寞。",
    "群里有人发「收到」，你跟了一条，像对暗号。",
    "NAME 把闹钟往前拨五分钟，多偷一点幻觉。",
    "TOOL 搜索框里躺着上周没删的关键词，扎心。",
    "PEER 分享养生文，你收藏了，然后继续熬夜。",
    "CRISIS 铃声和外卖铃同时响，你先救哪个都是错。",
    "NAME 脖子响了一声，像给身体点了个赞。",
    "DAY 阳光不错，可惜在工位上只能看玻璃反光。",
    "你给自己定规矩：再刷五分钟群就工作，然后刷了五十分钟。",
    "SCENE 里有人讨论周末，你微笑旁听，心里算排期。",
    "TOOL 导出报表转圈，你盯着百分比，像看命运。",
    "PEER 说「上次那个事」，你大脑飞速检索是哪八百件事。",
    "NAME 喝水时发现杯子里有昨天的茶渍，像考古。",
    "午饭搭子跳槽了，位子空了，饭也不香了。",
    "DAY，NAME 在楼梯间接电话，回声里全是「好的」。",
    "键盘帽掉了一个，你装回去，像给战甲补漆。",
    "领导转发鸡汤，你回玫瑰表情，礼仪满分。",
    "TOOL 自动保存失败提示弹出，你心跳漏一拍。",
    "PEER 问「在吗」，你盯着两个字，思考宇宙起源。",
    "NAME 揉眼睛，屏幕上的字会跳舞了。",
    "下班电梯满员，你等下一趟，像等下一世。",
    "DAY，NAME 发现袜子穿反了，决定将错就错一整天。",
    "SCENE 的 Wi‑Fi 时好时坏，跟心情同步。",
    "你把 CRISIS 标成已读，问题不会消失但你会。",
    "NAME 偷偷搜「颈椎自救」，然后继续低头。",
    "会议室里有人说「我补充两句」，你知道两小时没了。",
    "TOOL 弹窗问是否更新，你点稍后，点了第三十次。",
    "PEER 递来零食，你道谢，觉得人类还有救。",
    "NAME 看窗外飞鸟，羡慕它没有周报。",
    "DAY 下雨，你没带伞，带的是一堆待办。",
    "打印机卡纸，你修好它，觉得自己也能修人生。",
    "群里庆祝项目上线，你鼓掌表情，手在桌上敲。",
    "NAME 把「稍等」复制粘贴成肌肉记忆。",
    "SCENE 灯管闪了一下，像给你打 Morse 码。",
    "TOOL 里同名文件 final、final2、final真，你笑了。",
    "PEER 说「你比较熟」，你熟的是背锅姿势。",
    "NAME 伸懒腰，听到骨节响，像小型烟花。",
    "DAY 你发誓早睡，夜里又和 CRISIS 对线。",
    "外卖迟到二十分钟，你原谅了小哥，没原谅排期。",
    "NAME 把头像换成佛系，行为依然暴躁。",
    "晨会 stand‑up，你站着，灵魂坐着。",
    "TOOL 表格公式报错，你改完发现是少了个括号，人生也是。",
    "PEER 语音条 60 秒，你两倍速听完，仍不知道要点。",
    "NAME 给绿植浇水，它黄了，你觉得自己也快。",
    "DAY，电梯里遇见领导，你研究地板花纹。",
    "SCENE 有人吃螺蛳粉，全楼层共享味觉。",
    "你把会议记录写成诗，押不押韵无所谓。",
    "NAME 发现工位蟑螂，和它谈判划分地盘。",
    "TOOL 云端同步把旧版本盖了新版本，你学会深呼吸。",
    "PEER 请假了，活像雪片飞来，你接住。",
    "NAME 下班关屏幕，反光里看见自己还在。",
  ];

  const DAY_PLAIN_EXTRA = [
    [
      "周一早晨，NAME 与闹钟搏斗险胜，SCENE 的打卡机在笑。",
      "周一例会拖到午饭，你学会用眼神吃外卖。",
      "周一 PEER 说「本周轻松」，你礼貌地没接话。",
      "周一 TOOL 提醒年度复盘，你假装断网。",
      "周一 NAME 给自己打气：才第一天，还有四天。",
    ],
    [
      "周二协作群又 @全体，NAME 把通知免打扰打开又关上。",
      "周二 PEER 甩来「小需求」，你量了一下是巨石。",
      "周二 CRISIS 与日常并行，你学会分身失败。",
      "周二 NAME 发现上周的坑本周还在，像老朋友。",
      "周二下午困成狗，咖啡续命，命说只赊账。",
    ],
    [
      "周三 DAY，空气里飘着「撑到周末」的弹幕。",
      "周三 NAME 在 TOOL 里删了两条又加五条，净亏。",
      "周三午饭聊旅游，你附和大家，心里是 deadline。",
      "周三 PEER 开会迟到，PPT 还是你昨晚改的。",
      "周三 NAME 觉得自己是电池，还剩一格绿。",
    ],
    [
      "周四传说最漫长，NAME 看表怀疑指针装反。",
      "周四 CRISIS 插队，你说「好的」时牙咬碎了。",
      "周四 NAME 拒绝第三次闲聊，第四次没拒绝，恨自己。",
      "周四傍晚窗外好看，你拍了一张，没发。",
      "周四夜里 NAME 想起明天汇报， sleep 离线。",
    ],
    [
      "周五 SCENE 飘着「快放假」的幻觉与真实加班。",
      "周五 NAME 把能推的活推到下周，推不动的硬啃。",
      "周五 PEER 说团建，你算路程与社交耗能。",
      "周五下班前一小时「小改动」到达，经典永流传。",
      "周五 NAME 天黑前离开，觉得自己赢了又像逃。",
    ],
    [
      "周六 NAME 手机静音又忍不住看，CRISIS 阴魂不散。",
      "周六你补觉到中午，梦里还在回消息。",
      "周六处理私事一件，成就感超过本周任何交付。",
      "周六傍晚散步，风不错，周一在路口等你。",
      "周六深夜刷牛马梗图，笑着笑着沉默了。",
    ],
    [
      "周日 NAME 晾衣服、写总结、焦虑三件套齐活。",
      "周日你把 TOOL 扫一遍，列三条「下周必须」。",
      "周日家里问还好吗，你说挺好，背景是键盘声。",
      "周日傍晚整理截图便签，像收拾战场。",
      "周日夜里设闹钟，对屏幕说：下周又是好汉。",
    ],
  ];

  /** 接在无选项主句后，加长叙事（与主句同一人物与世界） */
  const PLAIN_SECOND = [
    "NAME 看了眼时间，发现离下一个节点还远。",
    "走廊里脚步声一顿一顿，像在敲倒计时。",
    "NAME 把涌到嘴边的话咽下去，算今日有氧运动。",
    "键盘声里你突然想起水杯一上午没动。",
    "窗外天色又暗一格，你心里默默给今天记账。",
    "PEER 的背影消失在转角，问题还留在原处。",
    "NAME 深吸一口气，把「算了」两个字练得很熟。",
    "TOOL 弹出提醒，像故意挑最忙的时候。",
    "你盯着 CRISIS 这俩字，感觉自己也在预警名单里。",
    "收工前的十分钟总是最难熬，像马拉松最后一百米。",
    "NAME 揉了揉眼，屏幕上的字开始跳舞。",
    "电梯门开合三次，你才想起要下楼。",
    "群里又有人发「收到」，你也跟着复制粘贴一份。",
    "SCENE 的灯白得过分，照得人无处可藏。",
    "NAME 把便签撕了又贴，像给自己的小刑场。",
    "午饭还远，胃已经先开始抗议。",
    "NAME 假装看邮件，其实在发呆数格子。",
    "手机震了一下，你决定十秒后再看。",
    "窗外有人笑很大声，你分不清是羡慕还是讽刺。",
  ];

  const CHOICE_SPECS = [
    {
      story: "PEER 把 CRISIS 甩给 NAME：「你熟，你来。」",
      choiceA: "当场怼回去",
      choiceB: "先接下来再说",
      effectA: { deltaAnger: -2, deltaFatigue: 0 },
      effectB: { deltaAnger: 2, deltaFatigue: 0 },
    },
    {
      story: "领导让 NAME 周末「抽空」加个班，语气像商量。",
      choiceA: "委婉拒绝",
      choiceB: "答应下来",
      effectA: { deltaAnger: 1, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 2 },
    },
    {
      story: "TOOL 里两项 deadline 撞车，NAME 只能保一个。",
      choiceA: "保上级看的",
      choiceB: "保自己负责的",
      effectA: { deltaAnger: 0, deltaFatigue: 1 },
      effectB: { deltaAnger: 2, deltaFatigue: 0 },
    },
    {
      story: "午饭搭子吐槽 PEER，问 NAME 站哪边。",
      choiceA: "和稀泥",
      choiceB: "一起吐槽",
      effectA: { deltaAnger: 0, deltaFatigue: 1 },
      effectB: { deltaAnger: -2, deltaFatigue: 0 },
    },
    {
      story: "群里有人甩锅，暗指 NAME，你看见了。",
      choiceA: "公开澄清",
      choiceB: "私聊说明",
      effectA: { deltaAnger: -2, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 1 },
    },
    {
      story: "SCENE 里设备坏了，NAME 被喊去「顺便看看」。",
      choiceA: "推给运维",
      choiceB: "自己折腾",
      effectA: { deltaAnger: 1, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 2 },
    },
    {
      story: "PEER 要借 NAME 的 TOOL 账号「用一下」。",
      choiceA: "拒绝",
      choiceB: "给只读",
      effectA: { deltaAnger: 1, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 1 },
    },
    {
      story: "开会时 NAME 被点名即兴发言，大脑空白。",
      choiceA: "实话实说还没准备",
      choiceB: "胡诌几句撑过去",
      effectA: { deltaAnger: 0, deltaFatigue: 1 },
      effectB: { deltaAnger: 2, deltaFatigue: 0 },
    },
    {
      story: "下班前 PEER 说「改最后一版」，NAME 看着夕阳。",
      choiceA: "说明天再说",
      choiceB: "今晚改完",
      effectA: { deltaAnger: 1, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 3 },
    },
    {
      story: "CRISIS 需要有人背锅，眼神飘向 NAME。",
      choiceA: "摆证据",
      choiceB: "认一部分",
      effectA: { deltaAnger: -1, deltaFatigue: 0 },
      effectB: { deltaAnger: 2, deltaFatigue: 0 },
    },
    {
      story: "NAME 发现同事摸鱼却领功，心里不平衡。",
      choiceA: "找上级反映",
      choiceB: "忍气吞声",
      effectA: { deltaAnger: 1, deltaFatigue: 0 },
      effectB: { deltaAnger: 3, deltaFatigue: 0 },
    },
    {
      story: "培训占用晚上，NAME 可以请假或硬上。",
      choiceA: "请假",
      choiceB: "参加",
      effectA: { deltaAnger: 0, deltaFatigue: -1 },
      effectB: { deltaAnger: 0, deltaFatigue: 2 },
    },
    {
      story: "客户临时改需求，PEER 让你「配合一下」。",
      choiceA: "要求补排期",
      choiceB: "默默加班赶",
      effectA: { deltaAnger: 2, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 3 },
    },
    {
      story: "NAME 身体不舒服，手上还有活。",
      choiceA: "请假休息",
      choiceB: "硬撑做完",
      effectA: { deltaAnger: 0, deltaFatigue: -2 },
      effectB: { deltaAnger: 0, deltaFatigue: 3 },
    },
    {
      story: "团建喝酒，有人劝 NAME「给个面子」。",
      choiceA: "坚决不喝",
      choiceB: "抿一口意思",
      effectA: { deltaAnger: 1, deltaFatigue: 0 },
      effectB: { deltaAnger: -1, deltaFatigue: 0 },
    },
    {
      story: "PEER 在领导面前抢功，NAME 在场。",
      choiceA: "当场补充事实",
      choiceB: "会后私聊",
      effectA: { deltaAnger: -2, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 1 },
    },
    {
      story: "TOOL 数据异常，NAME 可能是操作问题。",
      choiceA: "先自查",
      choiceB: "先甩系统",
      effectA: { deltaAnger: 0, deltaFatigue: 2 },
      effectB: { deltaAnger: 2, deltaFatigue: 0 },
    },
    {
      story: "NAME 收到猎头消息，心动又心虚。",
      choiceA: "聊聊看",
      choiceB: "直接忽略",
      effectA: { deltaAnger: -1, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 1 },
    },
    {
      story: "跨部门扯皮，PEER 让 NAME 去「沟通」。",
      choiceA: "拉群对线",
      choiceB: "单独约聊",
      effectA: { deltaAnger: 2, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 1 },
    },
    {
      story: "加班餐报销要贴票，NAME 嫌烦。",
      choiceA: "不报了",
      choiceB: "慢慢贴",
      effectA: { deltaAnger: 2, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 2 },
    },
    {
      story: "领导表扬团队，没提 NAME，你也在场。",
      choiceA: "笑笑算了",
      choiceB: "会后委婉提醒",
      effectA: { deltaAnger: 2, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 1 },
    },
    {
      story: "DAY 系统维护，NAME 的工作流断了。",
      choiceA: "摸鱼等恢复",
      choiceB: "找替代方案",
      effectA: { deltaAnger: 0, deltaFatigue: -1 },
      effectB: { deltaAnger: 0, deltaFatigue: 2 },
    },
    {
      story: "PEER 求 NAME 替开一次会。",
      choiceA: "拒绝",
      choiceB: "帮忙去",
      effectA: { deltaAnger: 1, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 2 },
    },
    {
      story: "NAME 发现排期被悄悄往前挪了一天。",
      choiceA: "群里质问",
      choiceB: "私聊协调",
      effectA: { deltaAnger: 2, deltaFatigue: 0 },
      effectB: { deltaAnger: 0, deltaFatigue: 1 },
    },
    {
      story: "SCENE 空调太冷，NAME 瑟瑟发抖。",
      choiceA: "忍",
      choiceB: "去关小点",
      effectA: { deltaAnger: 0, deltaFatigue: 1 },
      effectB: { deltaAnger: 1, deltaFatigue: 0 },
    },
    {
      story: "下班电梯里领导问 NAME「最近累吗」。",
      choiceA: "说不累",
      choiceB: "实话有点累",
      effectA: { deltaAnger: 1, deltaFatigue: 0 },
      effectB: { deltaAnger: -1, deltaFatigue: 0 },
    },
  ];

  function pickPlainSegmentLocal(p, kw, band, g, dayIndex, slot, rnd, usedFp) {
    const dayLabel = DAY_LABELS[dayIndex];
    const poolMain = SHARED_PLAIN;
    const poolDay = DAY_PLAIN_EXTRA[dayIndex] || [];
    const span = poolMain.length + poolDay.length;
    let story = "";
    let fp = "";
    let attempt;
    let plainOk = false;
    for (attempt = 0; attempt < 30; attempt++) {
      const pick = Math.floor(rnd() * span);
      const raw =
        pick < poolDay.length
          ? poolDay[pick]
          : poolMain[pick - poolDay.length];
      story = fillTpl(raw, p, kw, g, dayLabel);
      if (band === "junior" && rnd() < 0.25) {
        story += "（心里嘀咕：我才来多久。）";
      } else if (band === "senior" && rnd() < 0.25) {
        story += "（表面淡定，内心在算退休金。）";
      }
      if (rnd() < 0.92) {
        const sec = PLAIN_SECOND[Math.floor(rnd() * PLAIN_SECOND.length)];
        story += fillTpl(sec, p, kw, g, dayLabel);
      }
      fp = fingerprintStory(story);
      if (!usedFp.has(fp)) {
        usedFp.add(fp);
        plainOk = true;
        break;
      }
      story = story + "·" + slot + "·" + attempt;
      fp = fingerprintStory(story);
      if (!usedFp.has(fp)) {
        usedFp.add(fp);
        plainOk = true;
        break;
      }
    }
    if (!plainOk) {
      story =
        fillTpl(story || "DAY 平凡一刻", p, kw, g, dayLabel) +
        "·记" +
        slot +
        String(Math.floor(rnd() * 1e9));
      usedFp.add(fingerprintStory(story));
    }
    const axis = rollSingleAxisPlainDelta(rnd);
    return {
      eventType: "plain",
      story,
      deltaAnger: axis.deltaAnger,
      deltaFatigue: axis.deltaFatigue,
    };
  }

  function pickChoiceSegmentLocal(p, kw, band, g, dayIndex, slot, rnd, usedFp) {
    const dayLabel = DAY_LABELS[dayIndex];
    let ci = Math.floor(rnd() * CHOICE_SPECS.length);
    let spec = CHOICE_SPECS[ci];
    let story = fillTpl(spec.story, p, kw, g, dayLabel);
    let attempt;
    let found = false;
    for (attempt = 0; attempt < 25; attempt++) {
      const fp = fingerprintStory(story + spec.choiceA + spec.choiceB);
      if (!usedFp.has(fp)) {
        usedFp.add(fp);
        found = true;
        break;
      }
      ci = (ci + 11 + attempt) % CHOICE_SPECS.length;
      spec = CHOICE_SPECS[ci];
      story = fillTpl(spec.story, p, kw, g, dayLabel);
    }
    if (!found) {
      story += "（段" + slot + "）";
      usedFp.add(fingerprintStory(story + spec.choiceA + spec.choiceB));
    }
    const ea = singleAxisEffectFromSpec(spec.effectA, rnd);
    const eb = singleAxisEffectFromSpec(spec.effectB, rnd);
    return {
      eventType: "choice",
      story,
      choiceA: spec.choiceA,
      choiceB: spec.choiceB,
      effectA: ea,
      effectB: eb,
    };
  }

  /**
   * 生成本日 segments，结构与 AI 批一致；usedFp 跨段去重降低重复。
   */
  function generateLocalDayBatch(player, weekData, choiceLog, dayIndex, eventCount, plainCount) {
    const kw = getKw(player.industry);
    const band = ageBand(player.age);
    const g = genderTone(player.gender);
    const seed =
      (hashProfile(player) ^
        (Number(weekData.seed) || 0) ^
        dayIndex * 0x9e3779b1 ^
        eventCount * 0x517cc1b7) >>>
      0;
    const rnd = mulberry32(seed);
    const usedFp = new Set();
    let d;
    let j;
    for (d = 0; d < dayIndex; d++) {
      const arr = (weekData.days && weekData.days[d]) || [];
      for (j = 0; j < arr.length; j++) {
        if (arr[j]) usedFp.add(fingerprintStory(arr[j]));
      }
    }
    const k = Math.min(Math.max(0, plainCount), eventCount);
    const types = [];
    let t;
    for (t = 0; t < k; t++) types.push("plain");
    for (t = 0; t < eventCount - k; t++) types.push("choice");
    shuffle(types, rnd);
    const segments = [];
    for (t = 0; t < eventCount; t++) {
      if (types[t] === "choice") {
        segments.push(
          pickChoiceSegmentLocal(player, kw, band, g, dayIndex, t, rnd, usedFp),
        );
      } else {
        segments.push(
          pickPlainSegmentLocal(player, kw, band, g, dayIndex, t, rnd, usedFp),
        );
      }
    }
    return { segments };
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
    generateLocalDayBatch,
    buildWeeklyReport,
    hashProfile,
  };
})(typeof window !== "undefined" ? window : globalThis);
