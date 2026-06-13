# Tsumori（積もり）

## 概要

日本語学習のパーソナル・コレクション。

## 機能

1. 単語帳 - SM-2記憶アルゴリズム
2. 語句庫 - フレーズ記録と復習
3. 毎日ニュース - NHK記事取得
4. スピーキング - 業界別AI生成
5. 毎朝レポート - デイリーダッシュボード
6. 設定 - APIキー、ユーザー管理

## アーキテクチャ

- vanilla JS + CSS Variables
- localStorage（Storage抽象レイヤーでクラウド移行対応）
- OpenAI API（GPT-4o-mini）
- Web Speech API（無料音声）
- NHK News Web Easy API

## ディレクトリ

tsumori/
+-- index.html
+-- css/
+-- js/
|   +-- storage.js
|   +-- api.js
|   +-- sm2.js
|   +-- nhk.js
|   +-- app.js
|   +-- views/
|   +-- components/
+-- assets/

## 実装スケジュール

Q1: プロジェクト構造 & Storage抽象
Q2: ユーザー設定 & APIキー管理
Q3: 単語帳 + SM-2
Q4: 語句庫 + 復習
Q5: 毎日ニュース
Q6: スピーキング訓練
Q7: 毎朝レポート
Q8: UI磨き上げ

