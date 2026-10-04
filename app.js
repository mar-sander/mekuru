"use strict";

const jsonInput = document.querySelector("#json-input");
const jsonFile = document.querySelector("#json-file");
const status = document.querySelector("#status");
const documentTypeLabels = {
  essay: "小論文",
  application_essay: "志願理由書",
  statement_of_purpose: "志望理由",
  motivation: "志望動機"
};

/* データの形だけを確認する。文章の意味や妥当性は判定しない。 */
function validateData(data) {
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

function render(data) {
  replaceList("#facts-list", data.facts.map(item =>
    makeObservation(item.text, item.evidence, "EVIDENCE")));
  replaceList("#received-list", data.received.map(text =>
    makeObservation(text)));
  replaceList("#inference-list", data.inference.map(item =>
    makeObservation(item.text, item.reason, "REASON")));

  document.querySelector("#reconstructed-body").textContent = data.reconstructed.body;
  const type = documentTypeLabels[data.documentType] || data.documentType;
  document.querySelectorAll(".document-label").forEach(label => {
    label.textContent = `${type} · ${data.title}`;
  });
  document.title = `${data.title} | MEKURU`;
}

function applyJson(raw, successMessage) {
  try {
    const data = validateData(JSON.parse(raw));
    render(data);
    setStatus(successMessage);
  } catch (error) {
    // 読み込み失敗時は現在の4ページを保持する。
    setStatus(`読み込めませんでした：${error.message}`, true);
  }
}

/* サンプルと貼り付けは同じ描画経路を使用する。 */
document.querySelector("#sample-button").addEventListener("click", () => {
  jsonInput.value = JSON.stringify(SAMPLE_DATA, null, 2);
  applyJson(jsonInput.value, "サンプルデータを表示しました。");
});

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
    render(data);
    setStatus(`${file.name} を表示しました。`);
  } catch (error) {
    setStatus(`読み込めませんでした：${error.message}`, true);
  } finally {
    jsonFile.value = "";
  }
});

document.querySelector("#print-button").addEventListener("click", () => window.print());

render(validateData(SAMPLE_DATA));
setStatus("サンプルデータを表示しています。");
