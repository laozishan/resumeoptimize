const state = {
  resumeText: "",
  jdText: "",
  keywords: [],
  matched: [],
  missing: [],
  suggestions: [],
  strategies: [],
  questions: [],
  currentQuestionIndex: 0,
  answers: [],
  activeSession: null,
  aiFitSummary: ""
};

const els = {
  resumeFile: document.querySelector("#resumeFile"),
  jdFile: document.querySelector("#jdFile"),
  resumeText: document.querySelector("#resumeText"),
  jdText: document.querySelector("#jdText"),
  resumeStatus: document.querySelector("#resumeStatus"),
  jdStatus: document.querySelector("#jdStatus"),
  imagePreviewWrap: document.querySelector("#imagePreviewWrap"),
  imagePreview: document.querySelector("#imagePreview"),
  analyzeButton: document.querySelector("#analyzeButton"),
  refreshAnalysisButton: document.querySelector("#refreshAnalysisButton"),
  generateQuestionsButton: document.querySelector("#generateQuestionsButton"),
  summaryButton: document.querySelector("#summaryButton"),
  loadDemoButton: document.querySelector("#loadDemoButton"),
  resetButton: document.querySelector("#resetButton"),
  fitScore: document.querySelector("#fitScore"),
  fitSummary: document.querySelector("#fitSummary"),
  matchedKeywords: document.querySelector("#matchedKeywords"),
  missingKeywords: document.querySelector("#missingKeywords"),
  starSuggestions: document.querySelector("#starSuggestions"),
  resumeStrategy: document.querySelector("#resumeStrategy"),
  questionList: document.querySelector("#questionList"),
  questionCategory: document.querySelector("#questionCategory"),
  currentQuestion: document.querySelector("#currentQuestion"),
  conversationProgress: document.querySelector("#conversationProgress"),
  turnHistory: document.querySelector("#turnHistory"),
  answerInput: document.querySelector("#answerInput"),
  voiceButton: document.querySelector("#voiceButton"),
  submitAnswerButton: document.querySelector("#submitAnswerButton"),
  feedbackPanel: document.querySelector("#feedbackPanel"),
  answerFeedback: document.querySelector("#answerFeedback"),
  followupQuestion: document.querySelector("#followupQuestion"),
  overallSummary: document.querySelector("#overallSummary"),
  strengthList: document.querySelector("#strengthList"),
  riskList: document.querySelector("#riskList"),
  practiceList: document.querySelector("#practiceList"),
  answerHistory: document.querySelector("#answerHistory")
};

const demoResume = `王小林
产品运营 / 数据分析

项目经历
- 负责 B2B SaaS 线索转化分析，梳理渠道数据，推动销售跟进流程优化。
- 搭建用户分层看板，监控激活、留存和付费指标。
- 参与新用户 onboarding 改版，和设计、研发协作上线引导流程。
- 组织 12 场客户访谈，沉淀需求优先级并推动版本迭代。

技能
SQL、Excel、Tableau、A/B 测试、用户调研、项目管理、跨部门沟通`;

const demoJd = `岗位：增长产品经理
职责：
1. 负责用户增长、激活和留存策略，设计实验并推动落地。
2. 基于数据分析发现业务机会，搭建指标体系和数据看板。
3. 与研发、设计、运营、销售协作，推进项目上线并复盘效果。
4. 通过用户研究和竞品分析优化转化路径。

要求：
熟悉 SQL、A/B 测试、用户分层、漏斗分析、项目管理，有 SaaS 或 B2B 增长经验优先。`;

const fallbackKeywords = [
  "SQL", "Python", "Excel", "Tableau", "Power BI", "A/B", "增长", "留存", "转化",
  "用户", "数据", "看板", "项目管理", "跨部门", "SaaS", "B2B", "运营", "产品",
  "销售", "沟通", "调研", "复盘", "指标", "漏斗", "机器学习", "React", "Node"
];

const recognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

document.querySelectorAll(".step-button").forEach((button) => {
  button.addEventListener("click", () => switchStep(button.dataset.step));
});

els.resumeText.addEventListener("input", () => {
  state.resumeText = els.resumeText.value.trim();
  updateInputStatus();
});

els.jdText.addEventListener("input", () => {
  state.jdText = els.jdText.value.trim();
  updateInputStatus();
});

els.resumeFile.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  els.resumeStatus.textContent = "解析中...";
  try {
    const text = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      ? await extractPdfText(file)
      : await file.text();
    els.resumeText.value = text.trim();
    state.resumeText = els.resumeText.value;
    els.resumeStatus.textContent = text.trim() ? "已读取" : "未识别到文本";
  } catch (error) {
    els.resumeStatus.textContent = "解析失败，请粘贴文本";
  }
});

els.jdFile.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  els.jdStatus.textContent = "解析中...";
  try {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      els.imagePreview.src = url;
      els.imagePreviewWrap.classList.remove("hidden");
      const text = await extractImageText(file);
      if (text.trim()) {
        els.jdText.value = text.trim();
        state.jdText = els.jdText.value;
        els.jdStatus.textContent = "OCR 已完成";
      } else {
        els.jdStatus.textContent = "OCR 无结果，请粘贴文本";
      }
    } else {
      const text = await file.text();
      els.jdText.value = text.trim();
      state.jdText = els.jdText.value;
      els.jdStatus.textContent = text.trim() ? "已读取" : "未识别到文本";
    }
  } catch (error) {
    els.jdStatus.textContent = "解析失败，请粘贴文本";
  }
});

els.analyzeButton.addEventListener("click", async () => {
  await runAnalysis();
  switchStep("optimize");
});

els.refreshAnalysisButton.addEventListener("click", runAnalysis);
els.generateQuestionsButton.addEventListener("click", async () => {
  if (!state.keywords.length) {
    await runAnalysis();
    return;
  }
  state.questions = state.questions.length ? state.questions : buildQuestions();
  renderQuestions();
});

els.submitAnswerButton.addEventListener("click", submitAnswer);
els.summaryButton.addEventListener("click", async () => {
  await generateAiSummary();
  switchStep("summary");
});

els.loadDemoButton.addEventListener("click", async () => {
  els.resumeText.value = demoResume;
  els.jdText.value = demoJd;
  state.resumeText = demoResume;
  state.jdText = demoJd;
  updateInputStatus();
  await runAnalysis();
  switchStep("optimize");
});

els.resetButton.addEventListener("click", () => {
  els.resumeText.value = "";
  els.jdText.value = "";
  els.answerInput.value = "";
  els.feedbackPanel.classList.add("hidden");
  els.imagePreviewWrap.classList.add("hidden");
  Object.assign(state, {
    resumeText: "",
    jdText: "",
    keywords: [],
    matched: [],
    missing: [],
    suggestions: [],
    strategies: [],
    questions: [],
    currentQuestionIndex: 0,
    answers: [],
    activeSession: null,
    aiFitSummary: ""
  });
  updateInputStatus();
  renderAnalysis();
  renderQuestions();
  renderSummary();
  switchStep("source");
});

els.voiceButton.addEventListener("click", () => {
  if (!recognitionApi) {
    els.answerFeedback.textContent = "当前浏览器不支持内置语音识别。可以先用文字回答，或用 Chrome 再试。";
    els.feedbackPanel.classList.remove("hidden");
    return;
  }

  if (recognition) {
    recognition.stop();
    recognition = null;
    els.voiceButton.classList.remove("recording");
    els.voiceButton.textContent = "录音";
    return;
  }

  recognition = new recognitionApi();
  recognition.lang = "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = true;
  let finalText = els.answerInput.value.trim();
  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText = `${finalText} ${transcript}`.trim();
      } else {
        interim += transcript;
      }
    }
    els.answerInput.value = `${finalText} ${interim}`.trim();
  };
  recognition.onend = () => {
    recognition = null;
    els.voiceButton.classList.remove("recording");
    els.voiceButton.textContent = "录音";
  };
  recognition.start();
  els.voiceButton.classList.add("recording");
  els.voiceButton.textContent = "停止";
});

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js is not loaded");
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const data = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data }).promise;
  const chunks = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    chunks.push(content.items.map((item) => item.str).join(" "));
  }
  return chunks.join("\n\n");
}

async function extractImageText(file) {
  if (!window.Tesseract) {
    throw new Error("Tesseract is not loaded");
  }
  const result = await window.Tesseract.recognize(file, "chi_sim+eng");
  return result.data.text || "";
}

function switchStep(step) {
  document.querySelectorAll(".step-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.step === step);
  });
  document.querySelectorAll(".step-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${step}Panel`);
  });
}

function updateInputStatus() {
  els.resumeStatus.textContent = state.resumeText ? `${state.resumeText.length} 字` : "等待输入";
  els.jdStatus.textContent = state.jdText ? `${state.jdText.length} 字` : "等待输入";
}

async function runAnalysis() {
  state.resumeText = els.resumeText.value.trim();
  state.jdText = els.jdText.value.trim();
  state.keywords = extractKeywords(state.jdText);
  state.matched = state.keywords.filter((keyword) => containsLoose(state.resumeText, keyword));
  state.missing = state.keywords.filter((keyword) => !containsLoose(state.resumeText, keyword)).slice(0, 10);
  state.suggestions = buildStarSuggestions();
  state.strategies = buildStrategies();
  state.aiFitSummary = "";
  state.questions = buildQuestions();
  renderAnalysis();
  renderQuestions();
  await enrichAnalysisWithAi();
}

function extractKeywords(text) {
  const normalized = text.replace(/\s+/g, " ");
  const picked = fallbackKeywords.filter((keyword) => containsLoose(normalized, keyword));
  const englishTerms = normalized.match(/\b[A-Za-z][A-Za-z0-9+#./-]{1,}\b/g) || [];
  const cnTerms = normalized.match(/[\u4e00-\u9fa5]{2,8}/g) || [];
  const terms = [...picked, ...englishTerms, ...cnTerms]
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !/^(岗位|职责|要求|负责|以及|通过|进行|相关|优先)$/.test(item));
  return [...new Set(terms)].slice(0, 24);
}

function containsLoose(source, keyword) {
  if (!source || !keyword) return false;
  return source.toLowerCase().includes(keyword.toLowerCase());
}

function buildStarSuggestions() {
  const bullets = state.resumeText
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.、\s]+/, "").trim())
    .filter((line) => line.length >= 12)
    .slice(0, 6);

  if (!bullets.length) {
    return [{
      original: "请先输入至少一段项目或工作经历。",
      improved: "建议补充：项目背景、你的职责、关键行动、量化结果，再生成 STAR 优化。"
    }];
  }

  return bullets.map((line, index) => {
    const keyword = state.matched[index % Math.max(state.matched.length, 1)] || state.keywords[index % Math.max(state.keywords.length, 1)] || "岗位目标";
    const resultHint = hasMetric(line) ? "保留原有量化结果" : "补充具体指标，例如转化率、周期、成本、用户数或收入变化";
    return {
      original: line,
      improved: `在 ${keyword} 相关场景中，面对「补充业务背景/目标」的任务，我负责${softenVerb(line)}；通过拆解问题、协调相关方并持续复盘，最终实现「${resultHint}」，体现了和该岗位要求的直接匹配。`
    };
  });
}

function softenVerb(text) {
  return text
    .replace(/^(负责|参与|协助|主导|推动|搭建|组织)/, "")
    .replace(/[。；;]$/, "")
    .trim();
}

function hasMetric(text) {
  return /\d|%|倍|万|千|百|提升|降低|增长|减少/.test(text);
}

function renderAnalysis() {
  const score = state.keywords.length
    ? Math.round((state.matched.length / state.keywords.length) * 100)
    : 0;
  els.fitScore.textContent = state.keywords.length ? `${score}%` : "--";
  els.fitSummary.textContent = state.aiFitSummary || (state.keywords.length
    ? `已从 JD 中识别 ${state.keywords.length} 个关键词，简历当前命中 ${state.matched.length} 个。`
    : "请先输入简历和 JD。");
  renderChips(els.matchedKeywords, state.matched.length ? state.matched : ["暂无"]);
  renderChips(els.missingKeywords, state.missing.length ? state.missing : ["暂无"]);

  els.starSuggestions.innerHTML = "";
  state.suggestions.forEach((item) => {
    const card = document.createElement("article");
    card.className = "suggestion-card";
    card.innerHTML = `
      <small>原句</small>
      <p>${escapeHtml(item.original)}</p>
      <small>STAR 改写方向</small>
      <p>${escapeHtml(item.improved)}</p>
    `;
    els.starSuggestions.appendChild(card);
  });

  renderList(els.resumeStrategy, state.strategies.length ? state.strategies : buildStrategies());
}

function buildStrategies() {
  return [
    state.missing.length ? `把「${state.missing.slice(0, 3).join("、")}」相关经历前移，提升 JD 贴合度。` : "关键词覆盖较好，重点打磨结果表达。",
    "每条经历尽量加入业务背景和可验证结果，避免只写职责。",
    "面试中准备 2 个最能证明岗位能力的案例，并把失败复盘讲清楚。"
  ];
}

async function enrichAnalysisWithAi() {
  if (!state.resumeText || !state.jdText) return;
  setBusy(els.analyzeButton, true, "AI 生成中");
  setBusy(els.refreshAnalysisButton, true, "AI 生成中");
  els.fitSummary.textContent = "正在调用 DeepSeek 生成更精细的优化建议...";
  try {
    const ai = await requestAi("analysis", {
      resumeText: state.resumeText,
      jdText: state.jdText,
      keywords: state.keywords,
      matched: state.matched,
      missing: state.missing
    });
    if (Array.isArray(ai.matchedKeywords) && ai.matchedKeywords.length) {
      state.matched = ai.matchedKeywords.slice(0, 16);
    }
    if (Array.isArray(ai.missingKeywords)) {
      state.missing = ai.missingKeywords.slice(0, 12);
    }
    if (Array.isArray(ai.suggestions) && ai.suggestions.length) {
      state.suggestions = ai.suggestions
        .filter((item) => item.original && item.improved)
        .slice(0, 6);
    }
    if (Array.isArray(ai.strategies) && ai.strategies.length) {
      state.strategies = ai.strategies.slice(0, 6);
    }
    if (Array.isArray(ai.questions) && ai.questions.length) {
      state.questions = ai.questions
        .filter((item) => item.category && item.text)
        .slice(0, 8);
      state.currentQuestionIndex = 0;
    }
    state.aiFitSummary = ai.fitSummary || "DeepSeek 已生成优化建议。";
  } catch (error) {
    state.aiFitSummary = `DeepSeek 暂不可用，已使用本地规则版结果。原因：${error.message}`;
  } finally {
    setBusy(els.analyzeButton, false, "生成分析");
    setBusy(els.refreshAnalysisButton, false, "重新生成");
    renderAnalysis();
    renderQuestions();
  }
}

function renderChips(container, items) {
  container.innerHTML = "";
  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = item;
    container.appendChild(chip);
  });
}

function buildQuestions() {
  const topKeywords = [...state.matched, ...state.missing, ...state.keywords].slice(0, 6);
  const focus = topKeywords[0] || "这个岗位";
  const second = topKeywords[1] || "核心指标";
  const third = topKeywords[2] || "跨部门协作";
  return [
    { category: "开场", text: `请用 2 分钟介绍一下你自己，并说明为什么适合${focus}相关岗位。` },
    { category: "项目深挖", text: `简历里最能体现${focus}能力的项目是哪一个？请按 STAR 讲完整。` },
    { category: "数据分析", text: `如果让你负责${second}，你会如何设计指标体系和分析路径？` },
    { category: "行为面", text: `讲一次你和${third}相关方意见不一致的经历，你如何推进？` },
    { category: "结果复盘", text: "讲一个结果没有达到预期的项目，你后来做了哪些复盘和调整？" },
    { category: "岗位匹配", text: `JD 中提到「${state.missing[0] || focus}」，你有哪些经历可以证明自己能胜任？` }
  ];
}

function renderQuestions() {
  els.questionList.innerHTML = "";
  if (!state.questions.length) {
    els.currentQuestion.textContent = "请先生成分析。";
    els.questionCategory.textContent = "等待开始";
    return;
  }

  state.questions.forEach((question, index) => {
    const button = document.createElement("button");
    button.className = `question-item${index === state.currentQuestionIndex ? " active" : ""}`;
    button.type = "button";
    button.innerHTML = `<span>${escapeHtml(question.category)}</span>${escapeHtml(question.text)}`;
    button.addEventListener("click", () => {
      state.currentQuestionIndex = index;
      state.activeSession = null;
      els.answerInput.value = "";
      els.feedbackPanel.classList.add("hidden");
      renderQuestions();
    });
    els.questionList.appendChild(button);
  });

  const current = state.questions[state.currentQuestionIndex];
  const session = getActiveSession();
  els.questionCategory.textContent = current.category;
  els.currentQuestion.textContent = session.currentPrompt;
  els.submitAnswerButton.textContent = session.turnIndex === 0 ? "提交回答" : `提交追问 ${session.turnIndex}`;
  renderConversationProgress();
  renderTurnHistory();
}

function getActiveSession() {
  const question = state.questions[state.currentQuestionIndex];
  if (
    !state.activeSession ||
    state.activeSession.questionIndex !== state.currentQuestionIndex ||
    state.activeSession.question !== question.text
  ) {
    state.activeSession = {
      questionIndex: state.currentQuestionIndex,
      category: question.category,
      question: question.text,
      currentPrompt: question.text,
      turnIndex: 0,
      turns: [],
      completed: false
    };
  }
  return state.activeSession;
}

function renderConversationProgress() {
  if (!els.conversationProgress) return;
  const labels = ["主问题", "追问 1", "追问 2"];
  const session = state.activeSession;
  els.conversationProgress.innerHTML = "";
  labels.forEach((label, index) => {
    const marker = document.createElement("span");
    marker.textContent = label;
    marker.className = index === session.turnIndex ? "active" : "";
    if (index < session.turns.length) marker.classList.add("done");
    els.conversationProgress.appendChild(marker);
  });
}

function renderTurnHistory() {
  if (!els.turnHistory) return;
  const session = state.activeSession;
  els.turnHistory.innerHTML = "";
  if (!session || !session.turns.length) {
    els.turnHistory.classList.add("hidden");
    return;
  }
  els.turnHistory.classList.remove("hidden");
  session.turns.forEach((turn, index) => {
    const item = document.createElement("article");
    item.className = "turn-card";
    item.innerHTML = `
      <span>第 ${index + 1} 轮</span>
      <strong>${escapeHtml(turn.prompt)}</strong>
      <p>${escapeHtml(turn.answer)}</p>
    `;
    els.turnHistory.appendChild(item);
  });
}

async function submitAnswer() {
  if (!state.questions.length) {
    await runAnalysis();
  }
  const answer = els.answerInput.value.trim();
  if (!answer) {
    els.answerFeedback.textContent = "先输入一段回答，再提交。";
    els.feedbackPanel.classList.remove("hidden");
    return;
  }

  const session = getActiveSession();
  if (session.completed) {
    state.activeSession = null;
    renderQuestions();
    els.answerFeedback.textContent = "这一题已经完成。已为你重开同一题，可以重新练一遍。";
    els.feedbackPanel.classList.remove("hidden");
    return;
  }
  const question = {
    text: session.currentPrompt,
    category: session.turnIndex === 0 ? session.category : `追问 ${session.turnIndex}`
  };
  setBusy(els.submitAnswerButton, true, "评估中");
  let feedback = scoreAnswer(answer);
  let followup = session.turnIndex < 2 ? buildFollowup(answer, question, session.turnIndex) : "";
  try {
    const ai = await requestAi("answer", {
      question: question.text,
      category: question.category,
      answer,
      turnIndex: session.turnIndex,
      previousTurns: session.turns,
      resumeText: state.resumeText,
      jdText: state.jdText
    });
    feedback = ai.feedback || feedback;
    followup = session.turnIndex < 2 ? (ai.followup || followup) : "";
  } catch (error) {
    feedback = `${feedback} DeepSeek 暂不可用，本次使用本地反馈。`;
  } finally {
    setBusy(els.submitAnswerButton, false, "提交回答");
  }

  session.turns.push({
    prompt: question.text,
    category: question.category,
    answer,
    feedback,
    followup
  });

  els.answerFeedback.textContent = feedback;
  els.answerInput.value = "";

  if (session.turnIndex < 2 && followup) {
    session.turnIndex += 1;
    session.currentPrompt = followup;
    els.followupQuestion.textContent = followup;
    els.submitAnswerButton.textContent = session.turnIndex === 1 ? "提交追问 1" : "提交追问 2";
  } else {
    session.completed = true;
    state.answers.push(structuredClone(session));
    els.followupQuestion.textContent = "这一题已完成 2 轮追问。你可以切换下一题，或生成面试总结。";
    els.submitAnswerButton.textContent = "继续练这一题";
  }

  els.feedbackPanel.classList.remove("hidden");
  els.currentQuestion.textContent = session.currentPrompt;
  renderConversationProgress();
  renderTurnHistory();
  renderSummary();
}

function scoreAnswer(answer) {
  const signals = [
    { ok: answer.length >= 120, good: "信息量足够", bad: "回答略短，可以补充背景和行动细节" },
    { ok: hasMetric(answer), good: "包含量化或结果信号", bad: "缺少可验证结果，建议加入数字或影响" },
    { ok: /我|负责|主导|推动|设计|分析|协调|落地/.test(answer), good: "个人贡献比较清晰", bad: "个人贡献还不够明确" },
    { ok: /复盘|学到|后来|改进|调整|下次/.test(answer), good: "有复盘意识", bad: "可以补一句复盘和改进" }
  ];
  const passed = signals.filter((signal) => signal.ok);
  return `当前回答亮点：${passed.map((signal) => signal.good).join("、") || "已经给出基础信息"}。建议补强：${signals.filter((signal) => !signal.ok).map((signal) => signal.bad).join("；") || "结构已经比较完整，可以继续压缩表达。"}。`;
}

function buildFollowup(answer, question, turnIndex = 0) {
  if (turnIndex === 1) {
    if (!/复盘|学到|后来|改进|调整|下次/.test(answer)) {
      return "如果这件事重来一次，你会保留什么做法，又会具体调整哪一步？";
    }
    return `把刚才这个案例迁移到目标岗位，入职前 30 天你会优先做哪三件事？`;
  }
  if (!hasMetric(answer)) {
    return "你刚才提到的结果能否用一个具体指标说明？比如提升、降低、节省或覆盖了多少用户。";
  }
  if (!/我|负责|主导|推动|设计|分析|协调|落地/.test(answer)) {
    return "这个项目里你个人最关键的决策或动作是什么？如果没有你，结果会有什么不同？";
  }
  if (!/难点|挑战|冲突|阻力|失败|问题/.test(answer)) {
    return "这个案例最大的难点是什么？你当时如何判断优先级并推进解决？";
  }
  return `如果面试官继续追问「${question.category}」，你会如何把这个案例迁移到新岗位的工作场景？`;
}

async function generateAiSummary() {
  if (!state.answers.length) {
    renderSummary();
    return;
  }
  setBusy(els.summaryButton, true, "总结中");
  try {
    const ai = await requestAi("summary", {
      resumeText: state.resumeText,
      jdText: state.jdText,
      answers: state.answers
    });
    els.overallSummary.textContent = ai.overall || els.overallSummary.textContent;
    renderList(els.strengthList, Array.isArray(ai.strengths) ? ai.strengths : []);
    renderList(els.riskList, Array.isArray(ai.risks) ? ai.risks : []);
    renderList(els.practiceList, Array.isArray(ai.practices) ? ai.practices : []);
  } catch {
    renderSummary();
  } finally {
    setBusy(els.summaryButton, false, "生成总结");
  }
}

function renderSummary() {
  if (!state.answers.length) {
    els.overallSummary.textContent = "还没有面试记录。完成至少 1 个回答后，可以生成更有价值的总结。";
    renderList(els.strengthList, ["等待回答"]);
    renderList(els.riskList, ["等待回答"]);
    renderList(els.practiceList, ["先用 STAR 结构准备 2 个项目案例"]);
    els.answerHistory.innerHTML = "";
    return;
  }

  const allTurns = state.answers.flatMap((session) => session.turns || []);
  const avgLength = Math.round(allTurns.reduce((sum, item) => sum + item.answer.length, 0) / allTurns.length);
  const metricCount = allTurns.filter((item) => hasMetric(item.answer)).length;
  els.overallSummary.textContent = `本轮已完成 ${state.answers.length} 个主问题、${allTurns.length} 轮回答，平均回答长度 ${avgLength} 字，${metricCount} 轮回答包含量化结果。整体可以继续强化“个人贡献 + 业务结果 + 复盘迁移”。`;
  renderList(els.strengthList, [
    state.matched.length ? `简历已覆盖 ${state.matched.slice(0, 4).join("、")} 等关键词。` : "已经完成基础资料输入。",
    metricCount ? "部分回答能够给出结果信号。" : "回答已经有案例基础，适合继续打磨。",
    "可以围绕同一段经历延展出行为面、项目面和岗位匹配回答。"
  ]);
  renderList(els.riskList, [
    state.missing.length ? `JD 里的 ${state.missing.slice(0, 4).join("、")} 暂未在简历中明显出现。` : "关键词缺口较少，风险主要在表达深度。",
    metricCount < allTurns.length ? "部分回答缺少数字或结果，会削弱可信度。" : "结果表达较好，但仍需准备追问细节。",
    "如果案例只讲团队成果，面试官可能继续追问个人贡献。"
  ]);
  renderList(els.practiceList, [
    "把最重要的 2 段经历分别整理成 90 秒和 3 分钟版本。",
    "每个案例补齐：目标、指标、你的动作、结果、复盘。",
    state.missing[0] ? `准备一个能证明「${state.missing[0]}」能力的备用案例。` : "练习把项目经验迁移到目标岗位场景。"
  ]);

  els.answerHistory.innerHTML = "";
  state.answers.slice().reverse().forEach((item) => {
    const card = document.createElement("article");
    card.className = "history-item";
    const turns = (item.turns || []).map((turn, index) => `
      <div class="history-turn">
        <span>第 ${index + 1} 轮</span>
        <p><strong>${escapeHtml(turn.prompt)}</strong></p>
        <p>${escapeHtml(turn.answer)}</p>
        <p>${escapeHtml(turn.feedback)}</p>
      </div>
    `).join("");
    card.innerHTML = `
      <strong>${escapeHtml(item.category)}：${escapeHtml(item.question)}</strong>
      ${turns}
    `;
    els.answerHistory.appendChild(card);
  });
}

function renderList(container, items) {
  container.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function requestAi(task, payload) {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data.result || {};
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = label;
}

updateInputStatus();
renderAnalysis();
renderQuestions();
renderSummary();
