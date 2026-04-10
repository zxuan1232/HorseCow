/**
 * 前端配置：不要在这里写 GEMINI 等 API Key。
 * Key 只放在部署平台的环境变量（如 Render 里的 GEMINI_API_KEY），见 DEPLOY.md。
 */
window.GAME_AI_CONFIG = {
  enabled: true,
  useServerProxy: true,
  serverChatPath: "/api/game-ai/chat",
  proxySecret: "",

  provider: "gemini",
  apiKey: "",
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
