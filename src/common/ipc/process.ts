import { LayoutProfile } from "@/common/settings/layout.js";

export type ProcessArgs = {
  path?: string;
  ply?: number;
  layoutProfile?: LayoutProfile;

  //@LoveKapibarasan
  // 追加: コマンドラインで指定できるバッチ解析用オプション
  batchAnalysisDir?: string;
  batchAnalysisEngine?: string;
  //=====
};
