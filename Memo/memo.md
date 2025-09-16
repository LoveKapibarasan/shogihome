## mergeするときにわかりやすいように追加した記法
```txt
//@Lovekapibarasan 
//=====
```
# 変更点
1. 0手目解析結果の保存
理由: 将棋ウォーズのsprintの解析では０手目の解析結果も重要であるため
* `shogihome/src/renderer/store/analysis.ts`

2. PVPreview
* `src/renderer/view/dialog/PVPreviewDialog.vue`
* `src/renderer/view/App.vue` propの調整
* PVPreviewの画面でPVを正解とするクイズを作成。旧棋神クイズみたいに。
* 無視してください。

3. BatchAnalysis
**`listFiles()`の追加**
* `src/renderer/ipcの追加/api.ts`
* `src/renderer/ipc/bridge.ts`
* `src/renderer/ipc/preload.ts`
* `src/renderer/ipc/web.ts`

* `src/common/ipc/channel.ts`
* `src/background/window/ipc.ts`

* `src/command/common/preload.ts`

* AnalysisDialog


### Memo
1. i18n openRecord
2. openRecord, saveRecord, startAnalysis を Promise を返すように直す
(openRecord = format 判定付き)
(path を指定して呼んだときは ダイアログは開かない)
3. private abortControllers = new Map<string, AbortController>();
で
 


**Analysis**
「Cancel」ボタン（@click="onCancel()"）は、**解析ダイアログを開いているとき（AppState.ANALYSIS_DIALOG）**に出現

### Notes

# **Electron** = Web技術（HTML/CSS/JS）でデスクトップアプリを作れる仕組み

    ###  Main Renderer
    1. Main プロセス

        * Node.js として動いている

        * OS 機能に触れる（ファイルI/O, ネイティブAPI, ショートカットキー, 通知など）

        * ipcMain を持ってる

    2. Renderer プロセス

        * Chromium（Chromeブラウザ）が動いている

        * Vue/React/HTML/CSS でUIを描く

        * 直接 OS に触れない（セキュリティのため）

        * ipcRenderer を持ってる

    → 両者は IPC (Inter Process Communication) でやり取りする

    ### preload の役割

    * Main と Renderer の橋渡し役。

    * Main の機能をそのまま Renderer に渡すと危険

    * なので preload で「安全に制御された API」だけを公開する

    * これが contextBridge.exposeInMainWorld("bridge", api)

    ### Merit

    * 1つのコードで Win/Mac/Linux 全部に配布できる,Android / iOS には対応していない（Flutter (Dart)）。

    * Web技術の資産（Vue, React, npmライブラリ）がそのまま使える

    * 有名アプリも Electron 製（VSCode, Slack, Discord, Figma, etc.）


```bash
main → preload → export(ipc/bridge) → renderer(ipc/api.ts) → 呼び出し側(Vue)”
```

* フロントエンド（UI 部分）
→ ユーザーが操作する画面（Vue/React/Svelte など）。

* バックエンド（ロジック/永続化部分）
→ 設定ファイルの読み書き、対局エンジンの起動、研究処理、ログ保存など。

    * フロントは「設定を読みたい／保存したい」と思っても、自分では直接ファイルを触ったりエンジンを操作したりできない
    * そこで「API」という共通の窓口を作って、フロントエンドからは API を呼ぶだけ





* `export(ipc/bridge)` = interface
    * string = serializable IPC (inter-process communication) 
    * Promise<type> = type is returned by asnc process
    

* `src/renderer/ipc/preload.ts` = implementation of bridge for renderer
    * ipcRenderer を使って main プロセスとやりとりする生の実装
    * `contextBridge.exposeInMainWorld("electronShogiAPI", api);`
        * UI can use `window.electronShogiAPI` without import
    * ipcRenderer / ipcMain = sender(Renderer) / receiever(Main, Node.js)

            ```ts
            // 1.
            // renderer
            ipcRenderer.send("ping");

            // main
            ipcMain.on("ping", () => {
            console.log("pong");
            });

            // 2. 
            // .invoke() / .handle() = async
            // renderer
            const result = await ipcRenderer.invoke(Background.UPDATE_APP_STATE);

            // main
            ipcMain.handle(Background.UPDATE_APP_STATE, async () => {
            return await fs.readFile("config.json", "utf-8");
            });

            ```
            * `src/common/ipc/channel.ts` = IPC channel name like Background.UPDATE_APP_STATE
                * Hard Coding = プログラムの中に 値や文字列をそのまま直接書いてしまうこと
                * BACKGROUND = renderer → main
                * RENDER = main → renderer 

    * preload スクリプト = Renderer プロセス（ブラウザ環境）が読み込まれる「前に」実行される JS ファイル。

* `renderer(ipc/api.ts)`
    * UI 用にpreload のを整えた橋渡し(Parse JSON)
    * ...bridge = オブジェクトスプレッド構文。bridge オブジェクトが持っているすべてのメソッド・プロパティを そのまま api にコピー

* `src/renderer/ipc/setup.ts`
    * UI の状態 (store.appState, researchState) を監視して、変化したら bridge(API).xxx を呼ぶ。

* `src/renderer/ipc/web.ts`
    * Electron の preload.js が動かない環境
    * Fallback `export const bridge: Bridge =  getWindowObject().electronShogiAPI || webAPI;`

* `src/background/window/ipc.ts`
    * ipcMain.handle → preload 側の ipcRenderer.invoke(...) に対応

    * ipcMain.on → preload 側の ipcRenderer.send(...) に対応

* `src/command/common/preload.ts`
    * `CLI`
* `background`
* `renderer`
* `common`

### busyState()

* 処理開始時に retain() → Busy 状態に
* 処理終了時に release() → Busy 状態解除


### Vue
```vue
<button @click="onXXX()">
const onXXX = async () => {
```
