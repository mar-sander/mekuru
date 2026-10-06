# MEKURU — Stage P2

観測済みJSONを表示する静的UIです。ESSAY MODEはP1.8のA4縦4ページを維持し、PRESENTATION MODEはスライドと発表原稿の観測結果を4セクションで表示します。AIによる観測、解析、採点、添削は行いません。

## 開き方

`index.html` をブラウザで開いてください。サーバーやインストールは不要です。初期画面には従来の架空の小論文サンプルが表示されます。

フォントはGoogle Fontsから読み込みます。ネット接続がない環境では指定した代替フォントで表示します。印刷するときはフォントの読み込みが終わってからプレビューを開いてください。

- 「JSONデータを読み込む」を開き、`.json` ファイルを選ぶと表示を更新します。
- 同じ欄のテキストエリアへJSONを貼り付け、「表示を更新」を押しても反映できます。
- 上部のESSAY／PRESENTATIONで表示を切り替えます。JSONの読み込み時にはデータに合わせて自動切替します。
- 「サンプルを表示」は選択中のMODEのサンプルを表示します。配布用データは `sample.json` と `sample-presentation.json` です。
- 「印刷」でブラウザ印刷を開きます。用紙サイズA4、縦、倍率100%、余白なし、ブラウザのヘッダー・フッターなしを推奨します。PDF保存もブラウザの印刷画面から行えます。

## ESSAY JSON（version 0.1）

`sample.json` が入力例です。`facts` は `{ "text": "...", "evidence": "..." }` の配列、`received` は文字列の配列、`inference` は `{ "text": "...", "reason": "..." }` の配列、`reconstructed` は `{ "body": "..." }` です。`evidence` と `reason` は省略可能です。`documentType` は `essay`（小論文）、`application_essay`（志願理由書）、`statement_of_purpose`（志望理由）、`motivation`（志望動機）を想定します。

画面は入力データの形式だけを確認し、観測内容を判定しません。JSONに誤りがある場合、直前の表示を保持して操作欄に理由を示します。貼り付け内容は外部へ送信せず、保存もしません。

## PRESENTATION JSON（version 0.2）

`sample-presentation.json` が入力例です。`mode` は `presentation`、`documentType` も `presentation` にしてください。`facts` は `text`、`source`（`slide`／`script`／`both`）、任意の `evidence` を持つ配列です。`received` は `text` と `source`（`slide_only`／`script_only`／`slide_script`）を持つ配列です。`inference` と `reconstructed` はESSAYと同じ構造です。

FACTSの`source`は画面上でそれぞれSLIDE ONLY／SCRIPT ONLY／SLIDE + SCRIPTと表示します。FACTSの`evidence`はJSON内に保持し、画面と印刷には表示しません。ESSAYのEVIDENCE表示は従来どおりです。

FACTSとRECEIVEDは描画された項目高さに従ってA4ページを増やし、各項目を途中で分割しません。1項目だけでA4の本文領域を超える場合はエラーにします。INFERENCEとRECONSTRUCTEDは各1ページです。印刷前にWebフォントを読み込んでください。

## 印刷上の範囲

ESSAYは従来どおりA4縦4枚です。ESSAYへ極端に長い項目を読み込む場合は印刷プレビューを確認してください。PRESENTATIONではFACTS／RECEIVEDを必要な枚数へ分けます。どちらのMODEも文章の自動縮小・省略は行いません。
