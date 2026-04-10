/**
 * 发行者专用：玩家界面不会看到这些选项。
 *
 * 【仅 Gemini】保持 provider: "gemini"，填写 apiKey（Google AI Studio 免费 Key 即可）。
 * 默认 model 为官方文档中的「最省成本 / 适合高频」型号，一般免费层可用：
 *   gemini-2.5-flash-lite（默认）
 * 若不可用可改为：gemini-2.5-flash、gemini-flash-latest（以官方模型列表为准）
 *
 * 【baseUrl / openaiModel】仅在 provider 改为 "openai"（Groq 等）时使用；用 Gemini 时可忽略。
 *
 * enabled: true 且 apiKey 非空 → 走 AI；否则本地模板。
 */
window.GAME_AI_CONFIG = {
  enabled: true,
  provider: "gemini",
  apiKey: "AIzaSyD_aHnDUIKjVdILYtr51XkVRejRf0A2fG4",
  model: "gemini-2.5-flash-lite",
  baseUrl: "https://api.groq.com/openai/v1",
  openaiModel: "llama-3.3-70b-versatile",
};

/**
 * 结局3「本周感悟」文本库：从这里配置。
 * - 每周结算会随机抽取一句展示（加粗加大）。
 * - 建议 10～50 条，保持一句话、适合当结尾。
 */
window.GAME_WEEK_INSIGHTS = [
  "活着就行，别太较真。",
  "把情绪放下，KPI 才能上去。",
  "不争一时，争下一次发薪日。",
  "今天不加班，明天也不一定幸福。",
  "别怕出错，怕的是还要写复盘。",
];
