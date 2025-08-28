# 記法
```txt
//@Lovekapibarasan 
//=====
```
# 変更点
1. 0手目解析
* `shogihome/src/renderer/store/analysis.ts`

2. PVPreview
* `shogihome/src/renderer/view/dialog/PVPreviewDialog.vue`

```vue
:allow-move="true"
  @move="onMove">


const onMove = async (move: Move) => {

  const expectedMove = record.current.next?.move; // PVの次の手
  // 一旦ユーザーの指し手を反映
  store.appendMove({ move });
  // 0.5秒待つ
  await new Promise(resolve => setTimeout(resolve, 500));


  if (expectedMove && move.equals(expectedMove)) {
    // 正解 → PVを1手進める
    record.goForward();
  } else {
    // 不正解 → 直前の手を取り消す
    store.removeCurrentMove();
  }
};

3. BatchAnalysis
main → preload → bridge(export) → renderer(api.ts) → 呼び出し側(Vue)”

* `src/renderer/ipc/api.ts`
* `src/renderer/ipc/bridge.ts`
* `src/renderer/ipc/bridge.ts`
* `src/background/window/ipc.ts`
* `src/common/ipc/channel.ts`

Disable state check.
* `src/renderer/store/index.ts`