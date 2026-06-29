#!/bin/bash

echo "--- Starting ShogiHome Setup on Azure ---"

# 1. 依存関係のインストール（デプロイ時に完了していない場合の保険）
if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Running npm ci..."
  npm ci --production
fi

# 2. プロダクション用にビルドを実行（もし事前ビルドしていない場合）
# ※ package.json に build コマンドがあるか確認してください
if [ -d "dist" ]; then
  echo "Production build found."
else
  echo "Building the web app..."
  npm run build
fi

# 3. アプリケーションの起動
# 注: 'npm run serve' が開発サーバー（Vite等）の場合は、
# 本番用に preview コマンドなどを使うか、静的ホスティング用の設定が必要です。
# ここでは一旦指定のコマンドで起動します。
echo "Launching Web App..."
exec npm run serve -- --host 0.0.0.0 --port $PORT