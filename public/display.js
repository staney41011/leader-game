(function () {
  "use strict";

  var App = window.LeaderApp;

  function renderMeta(state, context) {
    var config = App.dynamicConfig(state);
    App.$("#displayMeta").innerHTML = [
      '<span>' + App.escapeHtml(App.phaseLabel(state.phase)) + '</span>',
      '<span>第 ' + state.currentRound + ' / ' + state.settings.roundCount + ' 輪｜' + App.roundName(state.currentRound) + '</span>',
      '<span>' + config.countryCount + ' 國｜' + config.totalPlayers + ' 人</span>',
      '<span>' + (context.mode === "firebase" ? "Firebase 同步" : "本機 demo") + '</span>'
    ].join("");
  }

  function renderPeace(state) {
    var percent = App.progressPercent(state.totals.public, state.totals.peaceTarget);
    App.$("#peacePanel").innerHTML = [
      '<div class="section-title tight"><div><h2>世界和平進度</h2><p>依本場總人數自動計算和平門檻。</p></div></div>',
      '<div class="display-number">' + state.totals.public + '<small>/ ' + state.totals.peaceTarget + '</small></div>',
      '<div class="progress large"><span style="width:' + percent + '%"></span></div>',
      state.totals.peaceAchieved ? '<div class="notice good">世界和平已達成</div>' : '<div class="notice warn">尚差 ' + Math.max(0, state.totals.peaceTarget - state.totals.public) + ' 公幣</div>'
    ].join("");
  }

  function renderPhase(state) {
    var submitted = App.submittedVoteCount(state, state.currentRound);
    var config = App.dynamicConfig(state);
    App.$("#phasePanel").innerHTML = [
      '<div class="section-title tight"><h2>流程狀態</h2></div>',
      '<div class="display-phase">' + App.escapeHtml(App.phaseLabel(state.phase)) + '</div>',
      '<p class="muted">' + App.escapeHtml(App.roundName(state.currentRound)) + '</p>',
      '<div class="metric-row single">',
      '<div class="metric"><span>投票完成</span><strong>' + submitted + ' / ' + App.countryList(state).length + '</strong></div>',
      '<div class="metric"><span>本場人數</span><strong>' + config.totalPlayers + '</strong></div>',
      '<div class="metric"><span>私幣累計</span><strong>' + state.totals.private + '</strong></div>',
      '</div>'
    ].join("");
  }

  function renderScoreboard(state) {
    var sorted = App.countryList(state).sort(function (a, b) {
      return (App.countryTotals(state, b.id).score || 0) - (App.countryTotals(state, a.id).score || 0);
    });
    var rows = sorted.map(function (country, index) {
      var totals = App.countryTotals(state, country.id);
      return [
        '<tr>',
        '<td class="rank">' + (index + 1) + '</td>',
        '<th>' + App.countryIcon(country, "tiny") + country.flag + ' ' + App.escapeHtml(country.name) + '</th>',
        '<td>' + totals.public + '</td>',
        '<td>' + totals.private + '</td>',
        '<td><strong>' + totals.score + '</strong></td>',
        '</tr>'
      ].join("");
    }).join("");
    App.$("#displayScoreboard").innerHTML = [
      '<div class="section-title tight"><h2>即時排名</h2></div>',
      '<div class="table-wrap"><table><thead><tr><th>#</th><th>國家</th><th>公幣</th><th>私幣</th><th>總分</th></tr></thead><tbody>',
      rows,
      '</tbody></table></div>'
    ].join("");
  }

  function renderEvent(state) {
    var round = App.ensureRound(state, state.currentRound);
    var event = round.event;
    App.$("#displayEvent").innerHTML = [
      '<div class="section-title tight"><h2>本輪事件與元首行動</h2></div>',
      event ? [
        '<div class="event-card display-event">',
        '<span>' + App.escapeHtml(event.icon) + '</span>',
        '<strong>' + App.escapeHtml(event.title) + '</strong>',
        '<p>' + App.escapeHtml(event.description) + '</p>',
        '</div>'
      ].join("") : '<p class="muted">等待主持人抽取事件牌。</p>'
      ,
      '<div class="leader-action-list">',
      App.countryList(state).map(function (country) {
        var action = round.blocks[country.id] || null;
        return '<div><span>' + App.countryIcon(country, "tiny") + country.flag + ' ' + App.escapeHtml(country.name) + '</span><strong>' + leaderActionSummary(state, action) + '</strong></div>';
      }).join(""),
      '</div>'
    ].join("");
  }

  function leaderActionSummary(state, action) {
    if (!action) return "未選擇";
    if (action.type === "skip" || !action.target) return "略過";
    var type = action.type === "alliance" ? "結盟" : "封鎖";
    var result = "";
    if (action.result === "success") result = "成功";
    if (action.result === "failed") result = "失敗";
    return App.escapeHtml(type + " " + App.countryName(state, action.target) + (result ? "：" + result : ""));
  }

  function renderFinal(state) {
    var final = state.final;
    if (!final) {
      App.$("#displayFinal").innerHTML = '<div class="section-title tight"><h2>結局</h2></div><p class="muted">第三輪結束後揭示。</p>';
      return;
    }
    var champion = final.champion ? App.countryName(state, final.champion.countryId) : "尚未產生";
    App.$("#displayFinal").innerHTML = [
      '<div class="section-title tight"><h2>結局揭示</h2></div>',
      final.peaceAchieved ? '<div class="notice good">世界和平達成</div>' : '<div class="notice warn">世界和平未達成</div>',
      '<div class="display-champion"><span>冠軍</span><strong>' + App.escapeHtml(champion) + '</strong><small>' + (final.champion ? final.champion.score : 0) + ' 分</small></div>',
      final.penalty ? '<p class="muted">私幣最多懲罰：' + App.escapeHtml(App.countryName(state, final.penalty.countryId)) + '，' + final.penalty.before + ' → ' + final.penalty.after + ' 分。</p>' : "",
      '<div class="ring-list display-ring">',
      App.countryList(state).map(function (country) {
        var rivalId = App.getActiveRival(state, country.id);
        var rival = rivalId ? state.countries[rivalId] : null;
        return '<div><span>' + App.countryIcon(country, "tiny") + country.flag + ' ' + App.escapeHtml(country.name) + '</span><strong>→</strong><span>' + (rival ? App.countryIcon(rival, "tiny") + rival.flag + ' ' + App.escapeHtml(rival.name) : "未設定") + '</span></div>';
      }).join(""),
      '</div>'
    ].join("");
  }

  App.bootPage(function (state, context) {
    renderMeta(state, context);
    renderPeace(state);
    renderPhase(state);
    renderScoreboard(state);
    renderEvent(state);
    renderFinal(state);
  });
})();
