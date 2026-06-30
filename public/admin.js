(function () {
  "use strict";

  var App = window.LeaderApp;
  var context = null;

  function renderStatus(state, ctx) {
    var round = App.ensureRound(state, state.currentRound);
    var submitted = App.submittedVoteCount(state, state.currentRound);
    var totalCountries = App.countryList(state).length;
    var percent = App.progressPercent(state.totals.public, state.totals.peaceTarget);

    App.$("#statusPanel").innerHTML = [
      '<div class="section-title tight">',
      '<div><h2>' + App.escapeHtml(state.settings.title) + '</h2><p>遊戲代碼：' + App.escapeHtml(ctx.gameId) + '</p></div>',
      App.statusPill(ctx.mode === "firebase" ? "Firebase 同步" : "本機 demo", ctx.mode === "firebase" ? "good" : "warn"),
      '</div>',
      '<div class="metric-row">',
      metric("目前階段", App.phaseLabel(state.phase)),
      metric("輪次", "第 " + state.currentRound + " / " + state.settings.roundCount + " 輪"),
      metric("投票", submitted + " / " + totalCountries + " 國"),
      metric("更新", App.formatTime(state.meta.updatedAt)),
      '</div>',
      '<div class="progress-block">',
      '<div class="progress-label"><span>世界和平公幣</span><strong>' + state.totals.public + ' / ' + state.totals.peaceTarget + '</strong></div>',
      '<div class="progress"><span style="width:' + percent + '%"></span></div>',
      '</div>',
      round.event ? '<p class="event-line">本輪事件：<strong>' + App.escapeHtml(round.event.title) + '</strong> - ' + App.escapeHtml(round.event.description) + '</p>' : '<p class="muted">尚未抽取本輪事件牌。</p>'
    ].join("");
  }

  function metric(label, value) {
    return '<div class="metric"><span>' + App.escapeHtml(label) + '</span><strong>' + App.escapeHtml(value) + '</strong></div>';
  }

  function renderSettings(state) {
    App.$("#settingsPanel").innerHTML = [
      '<div class="section-title tight"><h2>活動設定</h2></div>',
      '<label class="field"><span>活動名稱</span><input id="settingTitle" value="' + App.escapeHtml(state.settings.title) + '"></label>',
      '<label class="field"><span>世界和平門檻</span><input id="settingPeace" type="number" min="1" value="' + state.settings.peaceTarget + '"></label>',
      '<label class="field"><span>制裁比例</span><input id="settingSanction" type="number" min="0.1" max="1" step="0.05" value="' + state.settings.sanctionRatio + '"></label>',
      '<label class="field"><span>秘密目標加分</span><input id="settingBonus" type="number" min="0" value="' + state.settings.secretBonus + '"></label>',
      '<button class="button primary full" id="saveSettingsButton" type="button">儲存設定</button>'
    ].join("");
  }

  function renderFlow(state) {
    var round = App.ensureRound(state, state.currentRound);
    var canNextRound = state.phase === "scored" && state.currentRound < state.settings.roundCount;
    var canFinal = state.currentRound >= state.settings.roundCount && state.phase === "scored";

    App.$("#flowPanel").innerHTML = [
      '<div class="section-title tight"><div><h2>流程控制</h2><p>' + App.phaseLabel(state.phase) + '</p></div></div>',
      '<div class="step-grid">',
      actionButton("startRound", "開始本輪", "discussion"),
      actionButton("openVoting", "開放投票", "voting"),
      actionButton("drawEvent", round.event ? "重抽事件" : "抽事件牌", "event"),
      actionButton("openBlock", "封鎖宣告", "block"),
      actionButton("scoreRound", "開票計分", "scored"),
      actionButton("openSanction", "制裁投票", "sanction"),
      actionButton("resolveSanction", "結算制裁", "scored"),
      canNextRound ? actionButton("nextRound", "下一輪", "discussion") : "",
      canFinal ? actionButton("revealFinal", "揭示結局", "final") : "",
      '</div>',
      '<div class="timeline">',
      flowStep(state, "discussion", "組內討論"),
      flowStep(state, "voting", "秘密投票"),
      flowStep(state, "event", "事件牌"),
      flowStep(state, "block", "封鎖宣告"),
      flowStep(state, "scored", "開票計分"),
      flowStep(state, "sanction", "制裁投票"),
      flowStep(state, "final", "結局揭示"),
      '</div>'
    ].join("");
  }

  function actionButton(action, label, tone) {
    return '<button class="button flow ' + App.escapeHtml(tone) + '" data-action="' + App.escapeHtml(action) + '" type="button">' + App.escapeHtml(label) + '</button>';
  }

  function flowStep(state, phase, label) {
    var active = state.phase === phase ? "active" : "";
    return '<span class="timeline-step ' + active + '">' + App.escapeHtml(label) + '</span>';
  }

  function renderEvent(state) {
    var round = App.ensureRound(state, state.currentRound);
    var used = Object.keys(state.rounds).map(function (key) {
      return state.rounds[key] && state.rounds[key].event && state.rounds[key].event.id;
    }).filter(Boolean);

    App.$("#eventPanel").innerHTML = [
      '<div class="section-title tight"><h2>事件牌</h2></div>',
      round.event ? [
        '<div class="event-card">',
        '<span>' + App.escapeHtml(round.event.icon) + '</span>',
        '<strong>' + App.escapeHtml(round.event.title) + '</strong>',
        '<p>' + App.escapeHtml(round.event.description) + '</p>',
        '</div>'
      ].join("") : '<p class="muted">本輪尚未抽牌。</p>',
      '<div class="mini-list">',
      App.events.map(function (event) {
        return '<span class="' + (used.indexOf(event.id) >= 0 ? "done" : "") + '">' + App.escapeHtml(event.title) + '</span>';
      }).join(""),
      '</div>'
    ].join("");
  }

  function renderScoreboard(state) {
    var rows = App.countryList(state).map(function (country) {
      var totals = App.countryTotals(state, country.id);
      var roundCells = [];
      for (var i = 1; i <= state.settings.roundCount; i += 1) {
        var round = state.rounds[i];
        var score = round ? App.getRoundScore(round, country.id).score : null;
        roundCells.push('<td>' + (round && round.scoredAt ? score : "—") + '</td>');
      }
      return [
        '<tr>',
        '<th><span class="country-dot" style="background:' + App.escapeHtml(country.color) + '"></span>' + country.flag + ' ' + App.escapeHtml(country.name) + '</th>',
        roundCells.join(""),
        '<td>' + totals.public + '</td>',
        '<td>' + totals.private + '</td>',
        '<td><strong>' + totals.score + '</strong></td>',
        '</tr>'
      ].join("");
    }).join("");

    var roundHeaders = [];
    for (var i = 1; i <= state.settings.roundCount; i += 1) {
      roundHeaders.push('<th>第 ' + i + ' 輪</th>');
    }

    App.$("#scoreboardPanel").innerHTML = [
      '<div class="section-title tight"><h2>即時計分板</h2></div>',
      '<div class="table-wrap">',
      '<table><thead><tr><th>國家</th>' + roundHeaders.join("") + '<th>公幣</th><th>私幣</th><th>總分</th></tr></thead>',
      '<tbody>' + rows + '</tbody></table>',
      '</div>'
    ].join("");
  }

  function renderVotes(state) {
    var round = App.ensureRound(state, state.currentRound);
    var rows = App.countryList(state).map(function (country) {
      var vote = App.getVote(round, country.id);
      var status = vote.submitted ? App.statusPill("已投", "good") : App.statusPill("未投", "warn");
      return [
        '<tr>',
        '<th>' + country.flag + ' ' + App.escapeHtml(country.name) + '</th>',
        '<td>' + status + '</td>',
        '<td>' + vote.public + '</td>',
        '<td>' + vote.private + '</td>',
        '<td>' + App.formatTime(vote.submittedAt) + '</td>',
        '</tr>'
      ].join("");
    }).join("");

    App.$("#votePanel").innerHTML = [
      '<div class="section-title tight"><h2>投票狀態</h2></div>',
      '<div class="table-wrap compact">',
      '<table><thead><tr><th>國家</th><th>狀態</th><th>公</th><th>私</th><th>時間</th></tr></thead><tbody>',
      rows,
      '</tbody></table>',
      '</div>'
    ].join("");
  }

  function renderDanger(state) {
    var log = (state.log || []).slice(-8).reverse().map(function (item) {
      return '<li><span>' + App.formatTime(item.at) + '</span>' + App.escapeHtml(item.message) + '</li>';
    }).join("");

    App.$("#dangerPanel").innerHTML = [
      '<div class="section-title tight"><h2>紀錄與重置</h2></div>',
      '<ul class="log-list">' + (log || '<li class="muted">尚無操作紀錄</li>') + '</ul>',
      '<button class="button danger full" data-action="resetGame" type="button">重置本遊戲</button>'
    ].join("");
  }

  function saveSettings() {
    context.update(function (state) {
      state.settings.title = App.$("#settingTitle").value.trim() || "立德 LEADER";
      state.settings.peaceTarget = App.clampNumber(App.$("#settingPeace").value, 1, 999);
      state.settings.sanctionRatio = App.clampNumber(App.$("#settingSanction").value, 0.1, 1);
      state.settings.secretBonus = App.clampNumber(App.$("#settingBonus").value, 0, 99);
      App.addLog(state, "活動設定已更新");
    });
  }

  function handleAction(action) {
    if (action === "resetGame") {
      if (!window.confirm("確定要重置這個遊戲代碼的所有資料？")) return;
    }
    context.update(function (state) {
      var round = App.ensureRound(state, state.currentRound);
      if (action === "startRound") {
        round.startedAt = Date.now();
        state.phase = "discussion";
        App.addLog(state, "第 " + state.currentRound + " 輪開始");
      }
      if (action === "openVoting") {
        state.phase = "voting";
        App.addLog(state, "第 " + state.currentRound + " 輪開放投票");
      }
      if (action === "drawEvent") App.drawEvent(state, state.currentRound);
      if (action === "openBlock") {
        state.phase = "block";
        round.blockOpenedAt = Date.now();
        App.addLog(state, "第 " + state.currentRound + " 輪開放封鎖宣告");
      }
      if (action === "scoreRound") App.scoreRound(state, state.currentRound);
      if (action === "openSanction") {
        state.phase = "sanction";
        round.sanctionOpenedAt = Date.now();
        App.addLog(state, "第 " + state.currentRound + " 輪開放制裁投票");
      }
      if (action === "resolveSanction") App.resolveSanctions(state, state.currentRound);
      if (action === "nextRound") {
        state.currentRound = Math.min(state.currentRound + 1, state.settings.roundCount);
        App.ensureRound(state, state.currentRound).startedAt = Date.now();
        state.phase = "discussion";
        App.addLog(state, "進入第 " + state.currentRound + " 輪");
      }
      if (action === "revealFinal") App.revealFinal(state);
      if (action === "resetGame") App.resetState(state);
    });
  }

  App.delegate(document, "[data-action]", "click", function (event, target) {
    handleAction(target.getAttribute("data-action"));
  });

  document.addEventListener("click", function (event) {
    if (event.target && event.target.id === "saveSettingsButton") saveSettings();
  });

  context = App.bootPage(function (state, ctx) {
    renderStatus(state, ctx);
    renderSettings(state);
    renderFlow(state);
    renderEvent(state);
    renderScoreboard(state);
    renderVotes(state);
    renderDanger(state);
  });
})();
