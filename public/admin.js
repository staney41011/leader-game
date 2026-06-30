(function () {
  "use strict";

  var App = window.LeaderApp;
  var context = null;

  function renderStatus(state, ctx) {
    var round = App.ensureRound(state, state.currentRound);
    var submitted = App.submittedVoteCount(state, state.currentRound);
    var totalCountries = App.countryList(state).length;
    var config = App.dynamicConfig(state);
    var percent = App.progressPercent(state.totals.public, state.totals.peaceTarget);

    App.$("#statusPanel").innerHTML = [
      '<div class="section-title tight">',
      '<div><h2>' + App.escapeHtml(state.settings.title) + '</h2><p>' + (ctx.gameId === App.defaultGameId ? "正式場次" : "測試場次：" + App.escapeHtml(ctx.gameId)) + '</p></div>',
      App.statusPill(ctx.mode === "firebase" ? "Firebase 同步" : "本機 demo", ctx.mode === "firebase" ? "good" : "warn"),
      '</div>',
      '<div class="metric-row">',
      metric("目前階段", App.phaseLabel(state.phase)),
      metric("輪次", "第 " + state.currentRound + " / " + state.settings.roundCount + " 輪｜" + App.roundName(state.currentRound)),
      metric("本場人數", config.totalPlayers + " 人"),
      metric("國家數", config.countryCount + " 國"),
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
    var config = App.dynamicConfig(state);
    var activeCountries = App.countryList(state);
    var lowCountryWarning = config.countryCount < config.minRecommendedCountries
      ? '<div class="notice warn"><strong>國家數偏少</strong><span>規劃書建議至少 4 國，少於 4 國時秘密目標與外交互動會比較薄。</span></div>'
      : "";

    App.$("#settingsPanel").innerHTML = [
      '<div class="section-title tight"><h2>活動設定</h2></div>',
      '<label class="field"><span>活動名稱</span><input id="settingTitle" value="' + App.escapeHtml(state.settings.title) + '"></label>',
      '<label class="field"><span>秘密目標加分</span><input id="settingBonus" type="number" min="0" value="' + state.settings.secretBonus + '"></label>',
      '<div class="config-preview">',
      '<div class="preview-metric"><span>總人數</span><strong>' + config.totalPlayers + '</strong></div>',
      '<div class="preview-metric"><span>國家數</span><strong>' + config.countryCount + '</strong></div>',
      '<div class="preview-metric"><span>和平門檻</span><strong>' + config.peaceTarget + '</strong></div>',
      '<div class="preview-metric"><span>公幣池</span><strong>全場公幣 x 1.5 / 國家數</strong></div>',
      '</div>',
      lowCountryWarning,
      '<div class="section-title tight roster-title"><div><h2>本場組別</h2><p>勾選參與組別，並輸入各組人數。</p></div></div>',
      '<div class="roster-grid">',
      App.allCountries(state).map(function (country) {
        var checked = country.active !== false ? "checked" : "";
        var playerCount = App.getCountryPlayerCount(state, country.id);
        return [
          '<label class="roster-item">',
          '<input data-country-active="' + country.id + '" type="checkbox" ' + checked + '>',
          '<span class="roster-country">' + App.countryIcon(country) + '<span><strong>' + country.flag + ' ' + App.escapeHtml(country.name) + '</strong><small>' + country.id + '</small></span></span>',
          '<input class="roster-count" data-country-size="' + country.id + '" type="number" min="1" max="30" value="' + playerCount + '">',
          '</label>'
        ].join("");
      }).join(""),
      '</div>',
      '<div class="role-list">',
      activeCountries.map(function (country) {
        return '<div><strong>' + App.countryIcon(country, "tiny") + country.flag + ' ' + App.escapeHtml(country.name) + '</strong><span>' + App.escapeHtml(roleText(App.getCountryPlayerCount(state, country.id))) + '</span></div>';
      }).join("") || '<p class="muted">尚未選擇組別。</p>',
      '</div>',
      '<div class="section-title tight roster-title"><div><h2>秘密目標對戰圈</h2><p>每國目標是最終分數高於箭頭指向的國家。</p></div></div>',
      renderRing(state),
      '<button class="button primary full" id="saveSettingsButton" type="button">儲存設定與組別</button>',
      '<div class="split-actions">',
      '<button class="button full" data-action="assignRing" type="button">依目前順序產生對戰圈</button>',
      '<button class="button full" data-action="shuffleRing" type="button">隨機產生對戰圈</button>',
      '</div>'
    ].join("");
  }

  function roleText(playerCount) {
    if (playerCount < 4) return "人數少於 4，主持人需合併元首、外交、財政、國際事務角色";
    return "元首 1｜外交部長 1｜財政部長 1｜國際事務官 1｜人民代表 " + Math.max(0, playerCount - 4);
  }

  function renderRing(state) {
    var countries = App.countryList(state);
    if (countries.length <= 1) return '<p class="muted">至少啟用 2 國才會產生秘密目標。</p>';
    return [
      '<div class="ring-list">',
      countries.map(function (country) {
        var rivalId = App.getActiveRival(state, country.id);
        var rival = rivalId ? state.countries[rivalId] : null;
        return [
          '<div>',
          '<span>' + App.countryIcon(country, "tiny") + country.flag + ' ' + App.escapeHtml(country.name) + '</span>',
          '<strong>→</strong>',
          '<span>' + (rival ? App.countryIcon(rival, "tiny") + rival.flag + ' ' + App.escapeHtml(rival.name) : "未設定") + '</span>',
          '</div>'
        ].join("");
      }).join(""),
      '</div>'
    ].join("");
  }

  function renderFlow(state) {
    var round = App.ensureRound(state, state.currentRound);
    var canMoveOn = state.phase === "scored" || state.phase === "diplomacy";
    var canNextRound = canMoveOn && state.currentRound < state.settings.roundCount;
    var canFinal = canMoveOn && state.currentRound >= state.settings.roundCount;
    var sanctionControls = state.currentRound === 2 || state.phase === "sanction"
      ? actionButton("openSanction", "制裁投票", "sanction") + actionButton("resolveSanction", "結算制裁", "scored")
      : "";

    App.$("#flowPanel").innerHTML = [
      '<div class="section-title tight"><div><h2>流程控制</h2><p>第 ' + state.currentRound + ' 輪｜' + App.roundName(state.currentRound) + '｜' + App.phaseLabel(state.phase) + '</p></div></div>',
      '<div class="step-grid">',
      actionButton("startRound", "開始本輪", "discussion"),
      actionButton("openVoting", "開放投票", "voting"),
      actionButton("drawEvent", round.event ? "重抽事件" : "抽事件牌", "event"),
      actionButton("openLeaderAction", "元首行動", "leader-action"),
      actionButton("scoreRound", "開票計分", "scored"),
      actionButton("openDiplomacy", "外交會議", "diplomacy"),
      sanctionControls,
      canNextRound ? actionButton("nextRound", "下一輪", "discussion") : "",
      canFinal ? actionButton("revealFinal", "揭示結局", "final") : "",
      '</div>',
      '<div class="timeline">',
      flowStep(state, "discussion", "組內討論"),
      flowStep(state, "voting", "秘密投票"),
      flowStep(state, "event", "事件牌"),
      flowStep(state, "leaderAction", "元首行動"),
      flowStep(state, "scored", "開票計分"),
      flowStep(state, "diplomacy", "外交會議"),
      flowStep(state, "sanction", "制裁投票"),
      flowStep(state, "final", "結局揭示"),
      '</div>'
    ].join("");
  }

  function actionButton(action, label, tone) {
    return '<button class="button flow ' + App.escapeHtml(tone) + '" data-action="' + App.escapeHtml(action) + '" type="button">' + App.escapeHtml(label) + '</button>';
  }

  function flowStep(state, phase, label) {
    var active = state.phase === phase || (phase === "leaderAction" && state.phase === "block") ? "active" : "";
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
        '<th>' + App.countryIcon(country, "tiny") + country.flag + ' ' + App.escapeHtml(country.name) + '</th>',
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
      var playerCount = App.getCountryPlayerCount(state, country.id);
      var voted = Object.keys(vote.personVotes || {}).filter(function (key) {
        return vote.personVotes[key] === "public" || vote.personVotes[key] === "private";
      }).length;
      var action = round.blocks[country.id] || null;
      var status = vote.submitted ? App.statusPill("已投", "good") : App.statusPill("未投", "warn");
      return [
        '<tr>',
        '<th>' + App.countryIcon(country, "tiny") + country.flag + ' ' + App.escapeHtml(country.name) + '</th>',
        '<td>' + status + '</td>',
        '<td>' + voted + ' / ' + playerCount + '</td>',
        '<td>' + vote.public + '</td>',
        '<td>' + vote.private + '</td>',
        '<td>' + leaderActionLabel(state, action) + '</td>',
        '<td>' + App.formatTime(vote.submittedAt) + '</td>',
        '</tr>'
      ].join("");
    }).join("");

    App.$("#votePanel").innerHTML = [
      '<div class="section-title tight"><h2>投票狀態</h2></div>',
      '<div class="table-wrap compact">',
      '<table><thead><tr><th>國家</th><th>狀態</th><th>人民</th><th>公</th><th>私</th><th>元首</th><th>時間</th></tr></thead><tbody>',
      rows,
      '</tbody></table>',
      '</div>'
    ].join("");
  }

  function leaderActionLabel(state, action) {
    if (!action) return '<span class="muted">未選擇</span>';
    if (action.type === "skip" || !action.target) return '<span class="muted">略過</span>';
    var target = App.countryName(state, action.target);
    var type = action.type === "alliance" ? "結盟" : "封鎖";
    var result = "";
    if (action.result === "success") result = "成功";
    if (action.result === "failed") result = "失敗";
    return App.escapeHtml(type + " " + target + (result ? "：" + result : ""));
  }

  function renderDanger(state) {
    var log = (state.log || []).slice(-8).reverse().map(function (item) {
      return '<li><span>' + App.formatTime(item.at) + '</span>' + App.escapeHtml(item.message) + '</li>';
    }).join("");

    App.$("#dangerPanel").innerHTML = [
      '<div class="section-title tight"><h2>初始化與紀錄</h2></div>',
      '<p class="muted">開場前按一次初始化，會清空投票、分數、元首行動、制裁與結局資料，保留組別與人數。</p>',
      '<ul class="log-list">' + (log || '<li class="muted">尚無操作紀錄</li>') + '</ul>',
      '<button class="button danger full" data-action="resetGame" type="button">初始化本場遊戲</button>'
    ].join("");
  }

  function saveSettings() {
    context.update(function (state) {
      state.settings.title = App.$("#settingTitle").value.trim() || "立德 LEADER";
      state.settings.secretBonus = App.clampNumber(App.$("#settingBonus").value, 0, 99);
      state.settings.autoPeaceTarget = true;
      App.allCountries(state).forEach(function (country) {
        var activeInput = App.$('[data-country-active="' + country.id + '"]');
        var sizeInput = App.$('[data-country-size="' + country.id + '"]');
        state.countries[country.id].active = Boolean(activeInput && activeInput.checked);
        state.countries[country.id].playerCount = App.clampNumber(sizeInput && sizeInput.value, 1, 30);
      });
      if (!App.countryList(state).length && state.countries.US) {
        state.countries.US.active = true;
      }
      App.assignCombatRing(state, false);
      App.applyDynamicSettings(state);
      App.addLog(state, "活動設定、組別與秘密目標已更新");
    });
  }

  function handleAction(action) {
    if (action === "resetGame") {
      if (!window.confirm("確定要初始化本場遊戲？這會清空目前投票、分數與流程資料。")) return;
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
      if (action === "openLeaderAction" || action === "openBlock") {
        state.phase = "leaderAction";
        round.leaderActionOpenedAt = Date.now();
        App.addLog(state, "第 " + state.currentRound + " 輪開放元首行動");
      }
      if (action === "scoreRound") App.scoreRound(state, state.currentRound);
      if (action === "openDiplomacy") {
        state.phase = "diplomacy";
        round.diplomacyOpenedAt = Date.now();
        App.addLog(state, "第 " + state.currentRound + " 輪進入外交會議");
      }
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
      if (action === "assignRing") {
        App.assignCombatRing(state, false);
        App.addLog(state, "已依目前國家順序產生秘密目標對戰圈");
      }
      if (action === "shuffleRing") {
        App.assignCombatRing(state, true);
        App.addLog(state, "已隨機產生秘密目標對戰圈");
      }
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
