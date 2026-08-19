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
index.html             … 本体(全セクション)
assets/data/works.js   … 作品データ(Selected Works の中身はここ ← 編集モードが書き換える)
assets/css/style.css   … スタイル(ダーク/ブランドカラー: ライム×パープル×ネオンピンク)
assets/css/edit.css    … 編集モードのUI
assets/js/works.js     … 作品カードの描画
assets/js/main.js      … ナビ・スクロール演出・YouTube再生・ギャラリー
assets/js/edit.js      … 編集モード本体
assets/js/edit-config.js … 編集モードの設定(パスワードのハッシュ・GitHub設定)
assets/img/            … 画像(WORK04・キャラシート・チビキャラ切り抜き・ロゴ・favicon)
assets/img/uploads/    … 編集モードからアップロードした画像
give/                  … 元素材(キャラシート原本・ロゴ原本)
```

配色はブランドキャラクター「DACO」のカラーパレット(キャラシート記載)に準拠:
ライム `#C6FF00` / パープル `#7A3CFF` / ネオンピンク `#FF4DFF` / ネイビー `#0A0E2B`

## セクション

Hero(MVP受賞バッジ+マスコット) → 01 Selected Works(5作品・実績を最優先) → ✦ Character(ブランドキャラ紹介+シート2枚) → 02 Profile / About → 03 Production(できること) → 04 Strength → 05 Tools → 06 Workflow → 07 Available Work → 08 Contact

※「実績とクリエイティブを冒頭に」というアドバイスを受け、WorksとCharacterをProfileより前に配置。

## 確認方法

`index.html` をブラウザで開くだけで動作します(ビルド不要)。
YouTubeサムネイル・Google Fontsの取得にインターネット接続が必要です。

## 作品の追加・編集(編集モード)

作品はブラウザ上の**編集モード**から追加・編集・並び替え・削除できます。HTMLを触る必要はありません。

### 開き方(隠しトリガー / いずれか)

| 方法 | 操作 |
|---|---|
| ① フッターのドット | ページ最下部「DACO**.**」の **ドット「.」を3回続けてクリック**(スマホは1秒長押し) |
| ② キーボード | **Ctrl + Shift + E** |
| ③ URL | URLの末尾に **`#edit`** を付けて開く |

いずれもパスワード入力画面が出るだけで、正しいパスワードを入れないとパネルは開きません。
パスワードは**平文では保存されず**、SHA-256ハッシュ(`assets/js/edit-config.js` の `passHash`)と照合されます。

> **初回セットアップは手元のPCでのみ可能です**(公開サイト上では「未設定です」と出るだけで開けません)。
> `index.html` をダブルクリックで開く → 上のいずれかの方法で編集モードを呼び出す → パスワードを決める。
> そのあと **設定タブ →「パスワードを確定して公開」** を押すと `assets/js/edit-config.js` にハッシュが
> コミットされ、公開サイトでも編集モードが使えるようになります。
> (GitHubトークン未登録の場合は、貼り付け用のファイル内容が表示されます)

### 使い方

1. **作品タブ** … 「＋ 新しい作品を追加」で追加。カードのドラッグ or ▲▼で並び替え、👁で一時的に非表示、⧉で複製、🗑で削除。
2. **入力フォーム** … メディアの種類を選んで入力します。
   - **動画** … YouTubeのURLを貼るだけでID自動判別・Shorts自動判定。**「＋ 動画を追加」で1つの作品に何本でも登録可能**(各動画にラベルと自作サムネイルを設定可)。2本以上でプレイヤーの下に切り替えボタンが並び、1本だけなら従来通り単体表示。
   - **画像** … ドラッグ&ドロップで複数枚、自動で1600pxに縮小。1枚目がメイン。
   - あわせて タイトル/概要/バッジ/アピールポイント/ツール/担当範囲/リンク を入力。
3. **保存すると即プレビュー** … サイト側の表示がその場で切り替わります。この時点ではまだ公開されていません(左下に「下書きをプレビュー中」と表示)。下書きはブラウザに保存されるので、閉じても消えません。
4. **公開タブ** … 「🚀 GitHubへ公開する」でそのまま公開(1〜2分で反映)。手動派は「⬇ works.js をダウンロード」して `assets/data/works.js` に上書き → `git push`。

### GitHub直接公開の初期設定(初回のみ)

**設定タブ**で、オーナー(`shohei21`)/リポジトリ(`daco-portfolio`)/ブランチ(`main`)と、アクセストークンを登録します。

トークンは GitHub → Settings → Developer settings → **Fine-grained personal access tokens** で作成:

- Repository access: **Only select repositories** → `daco-portfolio` のみ
- Permissions → Repository permissions → **Contents: Read and write**

トークンはリポジトリには保存されず、ブラウザ(localStorage / sessionStorage)にのみ保存されます。
共用PCで使う場合は「このブラウザに保存する」のチェックを外してください(タブを閉じると消えます)。

### 注意

- 編集モードのパスワードは、あくまで**うっかり開かれないための鍵**です。サイトは静的サイトなので、本当の防御はGitHubトークン(これが無いと誰も公開できない)です。
- 「⬇ works.js をダウンロード」で書き出すと、まだアップロードしていない画像はファイル内に埋め込まれます(サイズが大きくなります)。GitHub公開を使えば画像は `assets/img/uploads/` に個別ファイルとして保存されます。

## その他の更新

- 色の変更: `style.css` 冒頭の `:root` 内 `--c1` `--c2` `--c3`(アクセント3色)
- Works以外のセクション(Profile・Strengthなど)は `index.html` を直接編集
- 公開: GitHub Pages / Netlify / Vercel などにこのフォルダをそのままアップロードすればOK
