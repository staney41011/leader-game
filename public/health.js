(function () {
  "use strict";

  var App = window.LeaderApp;

  App.bootPage(function (state, context) {
    var panel = App.$("#healthPanel");
    var config = window.LEADER_FIREBASE_CONFIG || {};
    var missing = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"].filter(function (key) {
      return !config[key];
    });
    panel.innerHTML = [
      '<div class="section-title tight"><div><h2>目前連線</h2><p>遊戲代碼：' + App.escapeHtml(context.gameId) + '</p></div>' + App.statusPill(context.mode === "firebase" ? "Firebase 同步" : "本機 demo", context.mode === "firebase" ? "good" : "warn") + '</div>',
      '<div class="metric-row">',
      '<div class="metric"><span>Project ID</span><strong>' + App.escapeHtml(config.projectId || "未設定") + '</strong></div>',
      '<div class="metric"><span>Database URL</span><strong>' + App.escapeHtml(config.databaseURL ? "已設定" : "未設定") + '</strong></div>',
      '<div class="metric"><span>最後更新</span><strong>' + App.escapeHtml(App.formatTime(state.meta.updatedAt)) + '</strong></div>',
      '</div>',
      missing.length ? '<div class="notice warn"><strong>尚未填入 Firebase config</strong><span>缺少：' + App.escapeHtml(missing.join(", ")) + '。目前只會在這台電腦用本機 demo 模式同步。</span></div>' : '<div class="notice good">Firebase config 已填入。若規則允許讀寫，所有裝置會即時同步。</div>',
      '<div class="code-block">public/firebase-config.js</div>'
    ].join("");
  });
})();
