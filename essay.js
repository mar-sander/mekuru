"use strict";

/* ESSAYの語彙・補助情報を保ち、テンプレートからA4用紙を作る。 */
function createEssaySheet(section, data, sequence) {
  const sheet = getSectionTemplate(section).cloneNode(true);
  sheet.classList.add("essay-sheet", "canonical-sheet");
  sheet.removeAttribute("id");
  sheet.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
  if (sequence === 0) sheet.id = section;
  const heading = sheet.querySelector(".heading-block h1");
  heading.id = `essay-${section}-heading-${sequence}`;
  sheet.setAttribute("aria-labelledby", heading.id);
  const type = documentTypeLabels[data.documentType] || data.documentType;
  sheet.querySelector(".document-label").textContent = `${type} · ${data.title}`;

  const content = sheet.querySelector(".sheet-content");
  content.replaceChildren();
  let list = null;
  if (section !== "reconstructed") {
    list = document.createElement("ol");
    list.className = "observations";
    if (section === "inference" && sequence === 0) {
      content.append(getSectionTemplate("inference").querySelector(".section-intro").cloneNode(true));
    }
    content.append(list);
  }
  return { sheet, content, list };
}

/* 項目の一組・一文を壊さず、実描画の高さで分割する。失敗時は前の紙面を戻す。 */
function renderEssay(data) {
  const container = document.querySelector("#sheets");
  const previousPages = [...container.children];
  container.replaceChildren();

  function appendPage(section, sequence, itemOffset = 0) {
    const page = createEssaySheet(section, data, sequence);
    if (page.list) page.list.style.counterReset = `item ${itemOffset}`;
    container.append(page.sheet);
    return page;
  }

  try {
    for (const section of ["facts", "received", "inference"]) {
      let sequence = 0;
      let page = appendPage(section, sequence);
      data[section].forEach((observation, index) => {
        const item = section === "received"
          ? makeObservation(observation)
          : makeObservation(observation.text,
            section === "facts" ? observation.evidence : observation.reason,
            section === "facts" ? "EVIDENCE" : "REASON");
        page.list.append(item);
        if (fitsA4Page(page, item)) return;
        item.remove();
        // 導入文だけが残る先頭用紙の次では、本文領域をすべて使える。
        const hasIntro = section === "inference" && sequence === 0;
        if (page.list.children.length === 0 && !hasIntro) {
          throw new Error(`${section.toUpperCase()} の項目 ${index + 1} がA4一枚の本文領域を超えています。`);
        }
        page = appendPage(section, ++sequence, index);
        page.list.append(item);
        if (!fitsA4Page(page, item)) {
          throw new Error(`${section.toUpperCase()} の項目 ${index + 1} がA4一枚の本文領域を超えています。`);
        }
      });

      if (section === "received") {
        const note = getSectionTemplate("received").querySelector(".quiet-note").cloneNode(true);
        page.content.append(note);
        if (!fitsA4Page(page, note)) {
          note.remove();
          const previousPage = page;
          const lastItem = page.list.children.length > 1 ? page.list.lastElementChild : null;
          const offset = data.received.length - (lastItem ? 1 : 0);
          page = appendPage(section, ++sequence, offset);
          if (lastItem) page.list.append(lastItem);
          page.content.append(note);
          if (!fitsA4Page(page, note)) {
            if (lastItem) previousPage.list.append(lastItem);
            if (!fitsA4Page(page, note)) {
              throw new Error("RECEIVED の注記がA4一枚の本文領域を超えています。");
            }
          }
        }
      }
    }

    // 従来の句点改行処理をそのまま用い、JSON本文には触れない。
    const sentences = document.createElement("div");
    renderReconstructed(data.reconstructed.body, sentences);
    let sequence = 0;
    let page;
    let body;
    function appendReconstructedPage() {
      page = appendPage("reconstructed", sequence++);
      body = document.createElement("div");
      body.className = "reconstructed-body reading-text";
      if (sequence === 1) body.id = "reconstructed-body";
      page.content.append(body);
    }
    appendReconstructedPage();
    [...sentences.childNodes].filter(node => node.nodeType === Node.TEXT_NODE)
      .forEach((sentence, index) => {
        const lineBreak = body.childNodes.length ? document.createElement("br") : null;
        if (lineBreak) body.append(lineBreak);
        body.append(sentence);
        if (fitsA4Page(page, body)) return;
        sentence.remove();
        if (lineBreak) lineBreak.remove();
        if (body.childNodes.length === 0) {
          throw new Error(`RECONSTRUCTED の文 ${index + 1} がA4一枚の本文領域を超えています。`);
        }
        appendReconstructedPage();
        body.append(sentence);
        if (!fitsA4Page(page, body)) {
          throw new Error(`RECONSTRUCTED の文 ${index + 1} がA4一枚の本文領域を超えています。`);
        }
      });

    const pages = [...container.querySelectorAll(".sheet")];
    pages.forEach((sheet, index) => {
      const total = document.createElement("span");
      total.textContent = ` / ${String(pages.length).padStart(2, "0")}`;
      sheet.querySelector(".page-count").replaceChildren(
        document.createTextNode(String(index + 1).padStart(2, "0") + " "), total);
    });
    document.title = `${data.title} | MEKURU`;
    return pages.length;
  } catch (error) {
    container.replaceChildren(...previousPages);
    throw error;
  }
}
