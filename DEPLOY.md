# API Key 在服务器 + 用 GitHub 得到网址

**GitHub Pages 只能放静态页，没法安全存 Key。** 所以 Key 要写在 **Render / Railway 这类平台的「环境变量」** 里，平台用你的 GitHub 代码自动构建并给一个 `https://…` 地址。

## 你要做的（以 Render 为例）

1. 把本项目推到 **GitHub** 仓库。
2. 打开 [render.com](https://render.com)，用 GitHub 登录。
3. **New → Blueprint**，选中该仓库（会读到根目录的 `render.yaml`）；或 **New → Web Service** 手动选同一仓库，Build：`npm install`，Start：`npm start`。
4. 在服务的 **Environment** 里添加 **`GEMINI_API_KEY`**，粘贴你的密钥（**不要**写进 `config.js`、不要提交到 Git）。
5. 部署完成后，用页面上的 **`https://xxx.onrender.com`** 访问即可。

前端已默认 `useServerProxy: true`，浏览器只会请求本站 `/api/game-ai/chat`，由服务器代调 Gemini。

## 换用 Groq 等 OpenAI 兼容接口

在平台 Environment 增加：`AI_PROVIDER=openai`、`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`（见 `.env.example`）。

## 本机想试一下

`npm install` → 本地建 `.env` 填 `GEMINI_API_KEY` → `npm start` → 打开 `http://localhost:3000`。
