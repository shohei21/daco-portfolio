/* ============================================================
   編集モードの設定ファイル
   ※ パスワードの「平文」はここには入りません（SHA-256ハッシュのみ）。
      passHash が空のときは、初回アクセス時にパスワード設定画面が出ます。
      設定後に「このパスワードを確定して公開」を押すと、このファイルが
      GitHubへ自動コミットされ、パスワードが確定します。
   ============================================================ */
window.DACO_EDIT_CONFIG = {
  // パスワードのSHA-256ハッシュ（16進64文字）。空 = 未設定
  passHash: '',

  // GitHub直接公開のデフォルト設定（トークンはここに書かず、ブラウザに保存されます）
  github: {
    owner: 'shohei21',
    repo: 'daco-portfolio',
    branch: 'main'
  },

  // 公開時に更新するファイルのパス
  paths: {
    works: 'assets/data/works.js',
    config: 'assets/js/edit-config.js',
    imageDir: 'assets/img/uploads'
  }
};
