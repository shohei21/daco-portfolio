/* ============================================================
   編集モードの設定ファイル
   ※ パスワードの「平文」はここには入りません（SHA-256ハッシュのみ）。
   ============================================================ */
window.DACO_EDIT_CONFIG = {
  // パスワードのSHA-256ハッシュ（16進64文字）。空 = 未設定
  passHash: '2868408087e603fa0ee7672b021a74df5bde5dcd94e51d135ce75979a94d3c09',

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
