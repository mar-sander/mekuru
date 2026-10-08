"use strict";

const jsonInput = document.querySelector("#json-input");
const jsonFile = document.querySelector("#json-file");
const status = document.querySelector("#status");
let currentMode = "essay";
const currentData = {
  essay: SAMPLE_DATA,
  presentation: PRESENTATION_SAMPLE_DATA,
  interpret: INTERPRET_SAMPLE_DATA
};
const documentTypeLabels = {
  essay: "小論文",
  application_essay: "志願理由書",
  statement_of_purpose: "志望理由",
  motivation: "志望動機"
};

/* データの形だけを確認する。文章の意味や妥当性は判定しない。 */
function validateEssayData(data) {
  const isText = value => typeof value === "string" && value.trim().length > 0;
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("JSONの最上位はオブジェクトにしてください。");
  }
  if (data.version !== "0.1") {
    throw new Error('version は "0.1" にしてください。');
  }
  if (!isText(data.title) || !isText(data.documentType)) {
    throw new Error("title と documentType には文字列を指定してください。");
  }
  if (!Array.isArray(data.facts) || !data.facts.every(item =>
    item && !Array.isArray(item) && isText(item.text) &&
    (item.evidence === undefined || typeof item.evidence === "string"))) {
    throw new Error("facts は text と任意の evidence を持つオブジェクトの配列にしてください。");
  }
  if (!Array.isArray(data.received) || !data.received.every(isText)) {
    throw new Error("received は文字列の配列にしてください。");
  }
  if (!Array.isArray(data.inference) || !data.inference.every(item =>
    item && !Array.isArray(item) && isText(item.text) &&
    (item.reason === undefined || typeof item.reason === "string"))) {
    throw new Error("inference は text と任意の reason を持つオブジェクトの配列にしてください。");
  }
  if (!data.reconstructed || !isText(data.reconstructed.body)) {
    throw new Error("reconstructed.body に文章を指定してください。");
  }
  return data;
}

/* スキーマごとに検証責務を分け、既存のversion 0.1はmode不要で受け取る。 */
function validateData(data) {
  if (data && data.version === "0.1" && data.mode === undefined) {
    return validateEssayData(data);
  }
  if (data && data.version === "0.2" && data.mode === "presentation") {
    return validatePresentationData(data);
  }
  if (data && data.version === "0.3" && data.mode === "interpret") {
    return validateInterpretData(data);
  }
  throw new Error('version 0.1（modeなし）、0.2 / mode "presentation"、または0.3 / mode "interpret" を指定してください。');
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

/* 文字列は textContent だけで挿入し、貼り付けデータをHTMLとして実行しない。 */
function makeObservation(text, detail, detailLabel) {
  const item = document.createElement("li");
  const mainText = document.createElement("p");
  mainText.className = "observation-text reading-text";
  mainText.textContent = text;
  item.append(mainText);

  if (detail && detail.trim()) {
    const label = document.createElement("span");
    const smallText = document.createElement("p");
    label.className = "detail-label structural-label";
    label.textContent = detailLabel;
    smallText.className = "observation-detail reading-text";
    smallText.textContent = detail;
    item.append(label, smallText);
  }
  return item;
}

function replaceList(selector, items) {
  const list = document.querySelector(selector);
  list.replaceChildren(...items);
}

/* JSONはそのままに、句点ごとに一文を表示する。既存の文頭改行は重ねない。 */
function renderReconstructed(body, container = document.querySelector("#reconstructed-body")) {
  const nodes = [];
  let sentenceStart = 0;

  function appendSentence(sentence) {
    const text = sentence.trimStart();
    if (!text.trim()) return;
    if (nodes.length) nodes.push(document.createElement("br"));
    nodes.push(document.createTextNode(text));
  }

  for (let index = 0; index < body.length; index += 1) {
    if (body[index] !== "。") continue;

    appendSentence(body.slice(sentenceStart, index + 1));
    sentenceStart = index + 1;
  }

  if (sentenceStart < body.length) {
    appendSentence(body.slice(sentenceStart));
  }
  container.replaceChildren(...nodes);
}

function renderEssay(data) {
  replaceList("#facts-list", data.facts.map(item =>
    makeObservation(item.text, item.evidence, "EVIDENCE")));
  replaceList("#received-list", data.received.map(text =>
    makeObservation(text)));
  replaceList("#inference-list", data.inference.map(item =>
    makeObservation(item.text, item.reason, "REASON")));

  renderReconstructed(data.reconstructed.body);
  const type = documentTypeLabels[data.documentType] || data.documentType;
  document.querySelectorAll("#sheets .document-label").forEach(label => {
    label.textContent = `${type} · ${data.title}`;
  });
  document.title = `${data.title} | MEKURU`;
}

/* MODE切替は操作領域だけで行い、ESSAYの紙面DOMを維持する。 */
function updateModeVisibility() {
  const presentation = currentMode === "presentation";
  const interpret = currentMode === "interpret";
  document.querySelector("#sheets").classList.toggle("mode-hidden", presentation || interpret);
  document.querySelector("#essay-nav").classList.toggle("mode-hidden", presentation || interpret);
  document.querySelector("#presentation-sheets").classList.toggle("mode-hidden", !presentation);
  document.querySelector("#presentation-nav").classList.toggle("mode-hidden", !presentation);
  document.querySelector("#interpret-sheets").classList.toggle("mode-hidden", !interpret);
  document.querySelector("#interpret-nav").classList.toggle("mode-hidden", !interpret);
  document.querySelector("#essay-mode").setAttribute("aria-pressed", String(!presentation && !interpret));
  document.querySelector("#presentation-mode").setAttribute("aria-pressed", String(presentation));
  document.querySelector("#interpret-mode").setAttribute("aria-pressed", String(interpret));
}

function showData(data) {
  const nextMode = data.mode || "essay";
  const previousMode = currentMode;
  currentMode = nextMode;
  updateModeVisibility();
  try {
    if (nextMode === "presentation") renderPresentation(data);
    else if (nextMode === "interpret") renderInterpret(data);
    else renderEssay(data);
  } catch (error) {
    currentMode = previousMode;
    updateModeVisibility();
    if (previousMode === "presentation") renderPresentation(currentData.presentation);
    if (previousMode === "interpret") renderInterpret(currentData.interpret);
    throw error;
  }
  currentData[nextMode] = data;
  document.title = `${data.title} | MEKURU`;
}

function switchMode(mode) {
  if (mode === currentMode) return;
  try {
    showData(currentData[mode]);
    setStatus(`${mode.toUpperCase()} MODEを表示しています。`);
  } catch (error) {
    setStatus(`表示できませんでした：${error.message}`, true);
  }
}

function applyJson(raw, successMessage) {
  try {
    const data = validateData(JSON.parse(raw));
    showData(data);
    setStatus(successMessage);
  } catch (error) {
    // 読み込み失敗時は現在の表示を保持する。
    setStatus(`読み込めませんでした：${error.message}`, true);
  }
}

/* サンプルと貼り付けは同じ描画経路を使用する。 */
document.querySelector("#sample-button").addEventListener("click", () => {
  jsonInput.value = JSON.stringify(
    { essay: SAMPLE_DATA, presentation: PRESENTATION_SAMPLE_DATA, interpret: INTERPRET_SAMPLE_DATA }[currentMode],
    null, 2
  );
  applyJson(jsonInput.value, "サンプルデータを表示しました。");
});

document.querySelector("#essay-mode").addEventListener("click", () => switchMode("essay"));
document.querySelector("#presentation-mode").addEventListener("click", () => switchMode("presentation"));
document.querySelector("#interpret-mode").addEventListener("click", () => switchMode("interpret"));

document.querySelector("#apply-button").addEventListener("click", () => {
  applyJson(jsonInput.value, "貼り付けたJSONを反映しました。");
});

jsonFile.addEventListener("change", async () => {
  const file = jsonFile.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    setStatus("1MB以下のJSONファイルを選択してください。", true);
    jsonFile.value = "";
    return;
  }
  try {
    const content = await file.text();
    const data = validateData(JSON.parse(content));
    jsonInput.value = content;
    showData(data);
    setStatus(`${file.name} を表示しました。`);
  } catch (error) {
    setStatus(`読み込めませんでした：${error.message}`, true);
  } finally {
    jsonFile.value = "";
  }
});

document.querySelector("#print-button").addEventListener("click", async () => {
  await document.fonts.ready;
  refreshPresentationPages();
  window.print();
});

/* 可変ページは常にA4で組版する。画面幅の変更はプレビュー倍率だけへ反映する。 */
let presentationPrintActive = false;
function updatePaperPreviewScale() {
  const scale = Math.min(1, (document.documentElement.clientWidth - 24) / A4_PAGE_WIDTH_PX);
  document.documentElement.style.setProperty("--paper-preview-scale", String(scale));
}
function refreshPresentationPages(forPrint = false) {
  if (currentMode === "essay" || (presentationPrintActive && !forPrint)) return;
  try {
    if (currentMode === "presentation") renderPresentation(currentData.presentation);
    else renderInterpret(currentData.interpret);
  } catch (error) {
    setStatus(`表示できませんでした：${error.message}`, true);
  }
}

updatePaperPreviewScale();
document.fonts.ready.then(refreshPresentationPages);
window.addEventListener("resize", updatePaperPreviewScale);
// 直接の印刷操作でも最新のデータをA4条件で確定する。
window.addEventListener("beforeprint", () => {
  refreshPresentationPages(true);
  presentationPrintActive = true;
});
window.addEventListener("afterprint", () => {
  presentationPrintActive = false;
});

renderEssay(validateData(SAMPLE_DATA));
setStatus("サンプルデータを表示しています。");
