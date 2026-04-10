# API Key 在服务器 + 用 GitHub 得到网址

**GitHub Pages 只能放静态页，没法安全存 Key。** Key 写在 **Render / Railway** 等平台的 **Environment** 里。

## 默认：阿里云百炼（千问，OpenAI 兼容）

1. 打开 [阿里云百炼控制台](https://bailian.console.aliyun.com/)，开通模型服务并创建 **API-KEY**（文档里常称 DashScope API Key）。
2. 部署时在平台 **Environment** 配置：
   - **`AI_PROVIDER`** = `bailian`（可省略：服务端未设置时默认即为 `bailian`）
   - **`DASHSCOPE_API_KEY`** = 控制台复制的 API Key
3. 可选：
   - **`DASHSCOPE_MODEL`**：模型名，默认 `qwen-plus`（也可用 `qwen-turbo`、`qwen-max` 等，以控制台为准）
   - **`DASHSCOPE_BASE_URL`**：默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`（北京）；新加坡等国际地域见[阿里云说明](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)
4. 与官方习惯一致时，也可用别名 **`BAILIAN_API_KEY`** / **`BAILIAN_MODEL`** / **`BAILIAN_BASE_URL`**（与上列三变量等价，二选一即可）。

前端保持 `config.js` 里 **`useServerProxy: true`**，请求走本站 **`/api/game-ai/chat`**，由 `server.js` 转发百炼的 OpenAI 兼容接口（`POST .../chat/completions`）。

## Render 步骤摘要

1. 项目推送到 GitHub → Render **New → Blueprint** 选仓库（或 **Web Service**）。
2. Build：`npm install`，Start：`npm start`。
3. Environment 填入 **`DASHSCOPE_API_KEY`**（及按需 **`DASHSCOPE_MODEL`**），见 `render.yaml`。
4. 使用分配的 `https://xxx.onrender.com` 访问。

## 其它模型

- **火山方舟**：`AI_PROVIDER=ark` + `ARK_API_KEY`、`ARK_ENDPOINT_ID`（可选 `ARK_BASE_URL`）
- **Gemini**：`AI_PROVIDER=gemini` + `GEMINI_API_KEY`
- **Groq 等 OpenAI 兼容**：`AI_PROVIDER=openai` + `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`

详见根目录 **`.env.example`**。

## 本机

1. `npm install`
2. 复制 `.env.example` 为 `.env`，填写 **`DASHSCOPE_API_KEY`**（`AI_PROVIDER` 可省略或设为 `bailian`）
3. `npm start` → 打开 `http://localhost:3000`

若仍用火山方舟，在 `.env` 中设 **`AI_PROVIDER=ark`** 并配置 **`ARK_*`** 即可。
