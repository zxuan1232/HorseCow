/**
 * 前端配置：不要在这里写百炼 / 方舟 / Gemini 等 API Key。
 * 本地：根目录 .env 配置 DASHSCOPE_API_KEY 等（见 .env.example），npm start。
 * 线上：在 Render 等平台 Environment 配置同名变量。实际模型由服务端 AI_PROVIDER 决定，见 DEPLOY.md。
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
  "牛会眸，马会叫，牛马会收到",
  "哦。",
  "111",
  "当一天牛马撞一天砖",
  "砖是搬不完的，牛马是当不完的",
  "骑着单车逛酒吧，该省省，该花花",
  "你加班这么多，一定挣了不少钱吧",
  "少走弯路，直奔正途",
  "坚持就是胜利，活着就会嗝屁",
  "搬砖不积极，思想有问题",
  "我多努努力，争取给老板换一辆车",
  "你们都是开玩笑，只有我是真牛马",
  "《重生之我是老板》",
  "蒜鸟蒜鸟，都不容易",
  "送你一朵小红花，感受每个命运的挣扎",
];
