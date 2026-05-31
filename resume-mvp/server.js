const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
loadEnvFile(path.join(rootDir, ".env"));

const port = Number(process.env.PORT || 8788);
const apiKey = process.env.DEEPSEEK_API_KEY;
const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const apiUrl = "https://api.deepseek.com/chat/completions";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/ai") {
      await handleAiRequest(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, () => {
  console.log(`Resumate running at http://127.0.0.1:${port}`);
});

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

async function handleAiRequest(req, res) {
  if (!apiKey) {
    sendJson(res, 503, { error: "Missing DEEPSEEK_API_KEY" });
    return;
  }

  const body = await readJsonBody(req);
  const prompt = buildPrompt(body);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "你是严谨的中文求职教练，只基于用户提供的简历和岗位JD给建议。不要编造经历。输出必须是合法 JSON，不要包含 Markdown。"
        },
        { role: "user", content: prompt }
      ],
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0.35,
      max_tokens: 1800
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    sendJson(res, response.status, {
      error: data?.error?.message || "DeepSeek API request failed"
    });
    return;
  }

  const content = data?.choices?.[0]?.message?.content || "{}";
  sendJson(res, 200, {
    model: data.model,
    usage: data.usage,
    result: parseJsonContent(content)
  });
}

function buildPrompt(body) {
  const task = body?.task || "analysis";
  const payload = body?.payload || {};

  if (task === "analysis") {
    return JSON.stringify({
      instruction: "请分析简历与JD，生成STAR简历优化建议、策略和面试题。输出字段：fitSummary:string, matchedKeywords:string[], missingKeywords:string[], suggestions:{original:string, improved:string}[], strategies:string[], questions:{category:string,text:string}[]. suggestions限制6条，questions限制6条。",
      resumeText: truncate(payload.resumeText, 9000),
      jdText: truncate(payload.jdText, 5000),
      localKeywords: payload.keywords || [],
      localMatched: payload.matched || [],
      localMissing: payload.missing || []
    });
  }

  if (task === "answer") {
    return JSON.stringify({
      instruction: "请评价候选人的面试回答，并在前两轮回答后给一个自然追问。输出字段：feedback:string, followup:string。turnIndex 为 0 时追问案例细节或量化结果；turnIndex 为 1 时追问复盘、取舍或岗位迁移；turnIndex 为 2 时 followup 为空字符串。反馈要简洁、具体、可执行。",
      question: payload.question,
      category: payload.category,
      answer: truncate(payload.answer, 4000),
      turnIndex: payload.turnIndex || 0,
      previousTurns: payload.previousTurns || [],
      jdText: truncate(payload.jdText, 4000),
      resumeText: truncate(payload.resumeText, 5000)
    });
  }

  if (task === "summary") {
    return JSON.stringify({
      instruction: "请基于简历、JD和回答记录生成面试总结。输出字段：overall:string, strengths:string[], risks:string[], practices:string[]。每个列表3-5条。",
      resumeText: truncate(payload.resumeText, 7000),
      jdText: truncate(payload.jdText, 5000),
      answers: payload.answers || []
    });
  }

  return JSON.stringify({ instruction: "未知任务，请返回 {\"error\":\"unknown task\"}" });
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(rootDir, `.${cleanPath}`);
  if (!filePath.startsWith(rootDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(content);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function parseJsonContent(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return { text: content };
  }
}

function truncate(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...[truncated]` : text;
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}
