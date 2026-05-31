# Resumate MVP

一个简历优化与模拟面试 MVP，用于演示：

- 上传 PDF/TXT 简历并提取文本
- 粘贴或上传 JD 文本/截图
- 调用 DeepSeek API 生成 STAR 简历优化建议
- 生成模拟面试题
- 支持浏览器语音输入回答
- 根据回答生成反馈、追问和面试总结

## 本地运行

1. 复制环境变量文件：

   ```bash
   cp .env.example .env
   ```

2. 在 `.env` 里填入：

   ```bash
   DEEPSEEK_API_KEY=sk-your-deepseek-key
   ```

3. 启动：

   ```bash
   npm start
   ```

4. 打开：

   ```text
   http://127.0.0.1:8788
   ```

如果没有配置 API key，页面会自动回退到本地规则版结果。PDF 解析和截图 OCR 依赖外部 CDN；如果网络不可用，可以直接粘贴简历和 JD 文本。

## 部署

启用 DeepSeek 后需要部署 Node 服务，可以部署到：

- Cloudflare Pages
- Render
- Railway
- Fly.io
- Vercel

部署时设置环境变量 `DEEPSEEK_API_KEY`。启动命令使用 `npm start`。

## 后续接真实 AI

当前版本已经有轻量后端代理。产品级版本建议继续增加：

- 简历/JD 解析任务队列
- 语音转文字 API
- 用户登录、数据加密、删除机制
- 面试记录和报告持久化
