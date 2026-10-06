"use strict";

const factSources = {
  slide: "SLIDE ONLY",
  script: "SCRIPT ONLY",
  both: "SLIDE + SCRIPT"
};
const receivedSources = {
  slide_only: "SLIDE ONLY",
  script_only: "SCRIPT ONLY",
  slide_script: "SLIDE + SCRIPT"
};

/* 発表用JSONの形と情報源の分類だけを確認する。内容の判定はしない。 */
function validatePresentationData(data) {
  const isText = value => typeof value === "string" && value.trim().length > 0;
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  if (!isObject(data) || data.version !== "0.2" || data.mode !== "presentation") {
    throw new Error('PRESENTATIONは version "0.2"、mode "presentation" にしてください。');
  }
  if (!isText(data.title) || data.documentType !== "presentation") {
    throw new Error('title と documentType "presentation" を指定してください。');
  }
  if (!Array.isArray(data.facts) || !data.facts.every(item =>
    isObject(item) && isText(item.text) && Object.hasOwn(factSources, item.source) &&
    (item.evidence === undefined || typeof item.evidence === "string"))) {
    throw new Error("facts は text、source（slide / script / both）、任意の evidence を持つ配列にしてください。");
  }
  if (!Array.isArray(data.received) || !data.received.every(item =>
    isObject(item) && isText(item.text) && Object.hasOwn(receivedSources, item.source))) {
    throw new Error("received は text と source（slide_only / script_only / slide_script）を持つ配列にしてください。");
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

/* 既存の紙面を雛形に使うが、ESSAYの4ページDOMには手を加えない。 */
function createPresentationSheet(section, data, sequence) {
  const sheet = document.querySelector(`#${section}`).cloneNode(true);
  sheet.classList.add("presentation-sheet");
  sheet.removeAttribute("id");
  sheet.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
  if (sequence === 0) sheet.id = `presentation-${section}`;

  const heading = sheet.querySelector(".heading-block h1");
  heading.id = `presentation-${section}-heading-${sequence}`;
  sheet.setAttribute("aria-labelledby", heading.id);
  if (section === "facts") {
    sheet.querySelector(".japanese-caption").textContent = "スライドと原稿に存在する情報";
  }
  sheet.querySelector(".document-label").textContent = `発表 · ${data.title}`;

  const content = sheet.querySelector(".sheet-content");
  content.replaceChildren();
  let list = null;
  if (section !== "reconstructed") {
    list = document.createElement("ol");
    list.className = "observations";
    if (section === "facts" || section === "received") {
      list.classList.add("presentation-observations");
    }
    if (section === "inference") {
      const intro = document.querySelector("#inference .section-intro").cloneNode(true);
      content.append(intro);
    }
    content.append(list);
  }
  return { sheet, content, list };
}

function makeSourcedObservation(text, source, number) {
  const item = makeObservation(text);
  const index = document.createElement("span");
  const label = document.createElement("span");
  index.className = "presentation-index structural-label";
  index.textContent = String(number).padStart(2, "0");
  label.className = "source-label structural-label";
  label.textContent = source;
  item.prepend(index, label);
  return item;
}

/* 実際に描画した項目の高さを用いて、項目を壊さず次のA4紙面へ送る。 */
function renderPresentation(data) {
  const container = document.querySelector("#presentation-sheets");
  container.replaceChildren();

  function appendPage(section, sequence) {
    const page = createPresentationSheet(section, data, sequence);
    container.append(page.sheet);
    return page;
  }

  function fits(page, element) {
    return element.getBoundingClientRect().bottom <=
      page.sheet.querySelector(".sheet-footer").getBoundingClientRect().top - 8;
  }

  for (const section of ["facts", "received"]) {
    let sequence = 0;
    let page = appendPage(section, sequence);
    data[section].forEach((observation, index) => {
      const sources = section === "facts" ? factSources : receivedSources;
      const item = makeSourcedObservation(
        observation.text, sources[observation.source], index + 1
      );
      page.list.append(item);
      if (!fits(page, item)) {
        item.remove();
        if (page.list.children.length === 0) {
          throw new Error(`${section.toUpperCase()} の項目 ${index + 1} がA4一枚の本文領域を超えています。`);
        }
        page = appendPage(section, ++sequence);
        page.list.append(item);
        if (!fits(page, item)) {
          throw new Error(`${section.toUpperCase()} の項目 ${index + 1} がA4一枚の本文領域を超えています。`);
        }
      }
    });

    if (section === "received") {
      const note = document.querySelector("#received .quiet-note").cloneNode(true);
      note.textContent = "ここに記載されていない内容は、スライドと原稿だけからは明確に確認できなかった情報です。";
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

  const inference = appendPage("inference", 0);
  inference.list.replaceChildren(...data.inference.map(item =>
    makeObservation(item.text, item.reason, "REASON")));

  const reconstructed = appendPage("reconstructed", 0);
  const body = document.createElement("div");
  body.className = "reconstructed-body reading-text";
  reconstructed.content.append(body);
  renderReconstructed(data.reconstructed.body, body);

  const pages = [...container.querySelectorAll(".sheet")];
  pages.forEach((sheet, index) => {
    const count = sheet.querySelector(".page-count");
    const total = document.createElement("span");
    total.textContent = ` / ${String(pages.length).padStart(2, "0")}`;
    count.replaceChildren(document.createTextNode(String(index + 1).padStart(2, "0") + " "), total);
  });
  return pages.length;
}
