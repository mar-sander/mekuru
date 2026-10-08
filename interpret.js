"use strict";

const interpretSources = { source: "SOURCE", question: "QUESTION" };

/* INTERPRET用JSONの形だけを検証し、観測内容の評価はしない。 */
function validateInterpretData(data) {
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const isText = value => typeof value === "string" && value.trim().length > 0;
  if (!isObject(data) || data.version !== "0.3" || data.mode !== "interpret" ||
      data.documentType !== "interpret" || !isText(data.title)) {
    throw new Error('INTERPRETは version "0.3"、mode / documentType "interpret"、title を指定してください。');
  }
  if (!["facts", "received"].every(section => Array.isArray(data[section]) &&
      data[section].every(item => isObject(item) && isText(item.text) &&
        Object.hasOwn(interpretSources, item.source) &&
        (section !== "facts" || item.evidence === undefined || typeof item.evidence === "string")))) {
    throw new Error("facts / received は text と source（source / question）を持つ配列にしてください。facts の evidence は任意の文字列です。");
  }
  if (!Array.isArray(data.inference) || !data.inference.every(item =>
      isObject(item) && isText(item.text) &&
      (item.reason === undefined || typeof item.reason === "string"))) {
    throw new Error("inference は text と任意の reason を持つ配列にしてください。");
  }
  if (!isObject(data.reconstructed) || !isText(data.reconstructed.body)) {
    throw new Error("reconstructed.body に文章を指定してください。");
  }
  return data;
}

/* 紙面・余白・書体はPRESENTATIONの雛形と計測方式を使用する。 */
function createInterpretSheet(section, data, sequence) {
  const page = createPresentationSheet(section, data, sequence);
  const sheet = page.sheet;
  sheet.classList.add("interpret-sheet");
  sheet.id = sequence === 0 ? `interpret-${section}` : "";
  const heading = sheet.querySelector(".heading-block h1");
  heading.id = `interpret-${section}-heading-${sequence}`;
  sheet.setAttribute("aria-labelledby", heading.id);
  if (section === "facts") {
    sheet.querySelector(".japanese-caption").textContent = "本文と設問に存在する情報";
  }
  sheet.querySelector(".document-label").textContent = `資料 · ${data.title}`;
  return page;
}

function renderInterpret(data) {
  const container = document.querySelector("#interpret-sheets");
  container.replaceChildren();

  function appendPage(section, sequence) {
    const page = createInterpretSheet(section, data, sequence);
    container.append(page.sheet);
    return page;
  }

  const fits = fitsA4Page;

  for (const section of ["facts", "received", "inference"]) {
    let sequence = 0;
    let page = appendPage(section, sequence);
    data[section].forEach((observation, index) => {
      const item = section === "inference"
        ? makeObservation(observation.text, observation.reason, "REASON")
        : makeSourcedObservation(observation.text, interpretSources[observation.source], index + 1);
      page.list.append(item);
      if (!fits(page, item)) {
        item.remove();
        if (page.list.children.length === 0) {
          throw new Error(`${section.toUpperCase()} の項目 ${index + 1} がA4一枚の本文領域を超えています。`);
        }
        page = appendPage(section, ++sequence);
        if (section === "inference") page.list.style.counterReset = `item ${index}`;
        page.list.append(item);
        if (!fits(page, item)) {
          throw new Error(`${section.toUpperCase()} の項目 ${index + 1} がA4一枚の本文領域を超えています。`);
        }
      }
    });

    if (section === "received") {
      const note = document.querySelector("#received .quiet-note").cloneNode(true);
      note.textContent = "ここに記載されていない内容は、本文と設問だけからは明確に確認できなかった情報です。";
      page.content.append(note);
      if (!fits(page, note)) {
        note.remove();
        const previousPage = page;
        const lastItem = page.list.children.length > 1 ? page.list.lastElementChild : null;
        page = appendPage(section, ++sequence);
        if (lastItem) page.list.append(lastItem);
        page.content.append(note);
        if (!fits(page, note)) {
          if (lastItem) previousPage.list.append(lastItem);
          if (!fits(page, note)) throw new Error("RECEIVED の注記がA4一枚の本文領域を超えています。");
        }
      }
    }
  }

  // P1.8の安全なテキストノード生成を通して、句点単位でページに配置する。
  const sentences = document.createElement("div");
  renderReconstructed(data.reconstructed.body, sentences);
  let sequence = 0;
  let page;
  let body;
  function appendReconstructedPage() {
    page = appendPage("reconstructed", sequence++);
    body = document.createElement("div");
    body.className = "reconstructed-body reading-text";
    page.content.append(body);
  }
  appendReconstructedPage();
  [...sentences.childNodes].filter(node => node.nodeType === Node.TEXT_NODE)
    .forEach((sentence, index) => {
      const lineBreak = body.childNodes.length ? document.createElement("br") : null;
      if (lineBreak) body.append(lineBreak);
      body.append(sentence);
      if (fits(page, body)) return;
      sentence.remove();
      if (lineBreak) lineBreak.remove();
      if (body.childNodes.length === 0) {
        throw new Error(`RECONSTRUCTED の文 ${index + 1} がA4一枚の本文領域を超えています。`);
      }
      appendReconstructedPage();
      body.append(sentence);
      if (!fits(page, body)) {
        throw new Error(`RECONSTRUCTED の文 ${index + 1} がA4一枚の本文領域を超えています。`);
      }
    });

  const pages = [...container.querySelectorAll(".sheet")];
  pages.forEach((sheet, index) => {
    const count = sheet.querySelector(".page-count");
    const total = document.createElement("span");
    total.textContent = ` / ${String(pages.length).padStart(2, "0")}`;
    count.replaceChildren(document.createTextNode(String(index + 1).padStart(2, "0") + " "), total);
  });
  return pages.length;
}
