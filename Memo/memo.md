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


3. BatchAnalysis
main → preload → bridge(export) → renderer(api.ts) → 呼び出し側(Vue)”

* `src/renderer/ipc/api.ts`
* `src/renderer/ipc/bridge.ts`
* `src/renderer/ipc/bridge.ts`
* `src/background/window/ipc.ts`
* `src/common/ipc/channel.ts`
*  src/command/common/preload.ts
* `src/renderer/ipc/web.ts`

* `src/renderer/store/analysis.ts` -- once
Disable state check.
* `src/renderer/store/index.ts` -- save, open files, startAnalysis, onFinish

* `src/renderer/store/record.ts` -- export