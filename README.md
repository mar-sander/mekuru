# MEKURU — Stage P3

観測済みJSONを表示する静的UIです。ESSAY MODEはA4縦4ページ、PRESENTATION MODEはスライドと原稿、INTERPRET MODEは本文と設問の観測結果を4セクションで表示します。AIによる観測、解析、採点、添削は行いません。

## 開き方

`index.html` をブラウザで開いてください。サーバーやインストールは不要です。初期画面には従来の架空の小論文サンプルが表示されます。

フォントはGoogle Fontsから読み込みます。ネット接続がない環境では指定した代替フォントで表示します。印刷するときはフォントの読み込みが終わってからプレビューを開いてください。

- 「JSONデータを読み込む」を開き、`.json` ファイルを選ぶと表示を更新します。
- 同じ欄のテキストエリアへJSONを貼り付け、「表示を更新」を押しても反映できます。
- 上部のESSAY／PRESENTATION／INTERPRETで表示を切り替えます。JSONの読み込み時にはデータに合わせて自動切替します。
- 「サンプルを表示」は選択中のMODEのサンプルを表示します。配布用データは `sample.json`、`sample-presentation.json`、`sample-interpret.json` です。
- 「印刷」でブラウザ印刷を開きます。用紙サイズA4、縦、倍率100%、余白なし、ブラウザのヘッダー・フッターなしを推奨します。PDF保存もブラウザの印刷画面から行えます。

## ESSAY JSON（version 0.1）

`sample.json` が入力例です。`facts` は `{ "text": "...", "evidence": "..." }` の配列、`received` は文字列の配列、`inference` は `{ "text": "...", "reason": "..." }` の配列、`reconstructed` は `{ "body": "..." }` です。`evidence` と `reason` は省略可能です。`documentType` は `essay`（小論文）、`application_essay`（志願理由書）、`statement_of_purpose`（志望理由）、`motivation`（志望動機）を想定します。

画面は入力データの形式だけを確認し、観測内容を判定しません。JSONに誤りがある場合、直前の表示を保持して操作欄に理由を示します。貼り付け内容は外部へ送信せず、保存もしません。

## PRESENTATION JSON（version 0.2）

`sample-presentation.json` が入力例です。`mode` は `presentation`、`documentType` も `presentation` にしてください。`facts` は `text`、`source`（`slide`／`script`／`both`）、任意の `evidence` を持つ配列です。`received` は `text` と `source`（`slide_only`／`script_only`／`slide_script`）を持つ配列です。`inference` と `reconstructed` はESSAYと同じ構造です。

FACTSの`source`は画面上でそれぞれSLIDE ONLY／SCRIPT ONLY／SLIDE + SCRIPTと表示します。FACTSの`evidence`はJSON内に保持し、画面と印刷には表示しません。ESSAYのEVIDENCE表示は従来どおりです。

4セクションすべて、描画された内容の高さに従ってA4ページを増やします。FACTS／RECEIVEDは1項目、INFERENCEは本文とREASONのセット、RECONSTRUCTEDは句点で区切った1文を単位とし、途中で分割しません。1項目・1文だけでA4の本文領域を超える場合は、内容を省略せずエラーにします。

RECEIVEDの注記は最終ページのみ、INFERENCEの導入文は先頭ページのみ表示します。項目番号はセクション内で継続し、物理ページ番号は全セクションを通した連番です。印刷では画面で確定したページ分割を使用します。印刷前にWebフォントを読み込んでください。

## INTERPRET JSON（version 0.3）

`sample-interpret.json` が入力例です。`mode` と `documentType` はいずれも `interpret` にしてください。`facts` と `received` は `text`、`source`（`source`＝本文／`question`＝設問）を持つ配列です。`facts` は任意の文字列 `evidence` を保持できますが、紙面には表示しません。`inference` は `text` と任意の `reason`、`reconstructed` は `body` を持ちます。4セクションともPRESENTATIONと同じ描画高さによる可変ページを使用し、文章の判定や省略は行いません。

## 印刷上の範囲

ESSAYは従来どおりA4縦4枚です。ESSAYへ極端に長い項目を読み込む場合は印刷プレビューを確認してください。PRESENTATIONとINTERPRETでは4セクションすべてを必要な枚数へ分けます。どのMODEも文章の自動縮小・省略は行いません。
