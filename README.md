# DACO｜AI CREATIVE PORTFOLIO

AIクリエイター DACO のポートフォリオサイト。
Notionのポートフォリオページをもとに、企業・クライアント向けに見やすく再構成したシングルページサイトです。

**公開URL:** https://shohei21.github.io/daco-portfolio/

## 更新の反映方法

ファイルを編集後、以下でGitHub Pagesに自動反映されます(反映まで1〜2分):

```
git add -A
git commit -m "変更内容"
git push
```

## 構成

```
index.html          … 本体(全セクション)
assets/css/style.css … スタイル(ダーク/ブランドカラー: ライム×パープル×ネオンピンク)
assets/js/main.js    … ナビ・スクロール演出・YouTube再生・ギャラリー
assets/img/          … 画像(WORK04・キャラシート・チビキャラ切り抜き・ロゴ・favicon)
give/               … 元素材(キャラシート原本・ロゴ原本)
```

配色はブランドキャラクター「DACO」のカラーパレット(キャラシート記載)に準拠:
ライム `#C6FF00` / パープル `#7A3CFF` / ネオンピンク `#FF4DFF` / ネイビー `#0A0E2B`

## セクション

Hero(MVP受賞バッジ+マスコット) → 01 Selected Works(5作品・実績を最優先) → ✦ Character(ブランドキャラ紹介+シート2枚) → 02 Profile / About → 03 Production(できること) → 04 Strength → 05 Tools → 06 Workflow → 07 Available Work → 08 Contact

※「実績とクリエイティブを冒頭に」というアドバイスを受け、WorksとCharacterをProfileより前に配置。

## 確認方法

`index.html` をブラウザで開くだけで動作します(ビルド不要)。
YouTubeサムネイル・Google Fontsの取得にインターネット接続が必要です。

## 更新のしかた

- 作品の追加: `index.html` の `<!-- WORK 0x -->` ブロックをコピーして編集
  - YouTube動画は `data-yt="動画ID"` とサムネイルURLのIDを差し替え
- 色の変更: `style.css` 冒頭の `:root` 内 `--c1` `--c2` `--c3`(アクセント3色)
- 公開: GitHub Pages / Netlify / Vercel などにこのフォルダをそのままアップロードすればOK
