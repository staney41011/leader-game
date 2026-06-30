(function () {
  "use strict";

  var App = window.LeaderApp;
  var countryId = (App.getParam("id") || "US").toUpperCase();
  var context = null;

  function header(state, country) {
    var round = App.ensureRound(state, state.currentRound);
    var vote = App.getVote(round, country.id);
    var playerCount = App.getCountryPlayerCount(state, country.id);
    var votedCount = personVoteCount(vote, playerCount);
    var voteStatus = state.phase === "voting" && !vote.submitted
      ? "已投 " + votedCount + " / " + playerCount
      : "公 " + vote.public + "｜私 " + vote.private;
    App.$("#countryHeader").innerHTML = [
      '<div class="country-badge" style="--country-color:' + App.escapeHtml(country.color) + '">',
      App.countryIcon(country, "header"),
      '<div><strong>' + App.escapeHtml(country.name) + '</strong><small>' + country.id + '｜第 ' + state.currentRound + ' 輪</small></div>',
      '</div>',
      '<div class="country-state">',
      App.statusPill(App.phaseLabel(state.phase), state.phase === "voting" ? "good" : ""),
      '<span>' + App.escapeHtml(voteStatus) + '</span>',
      '</div>'
    ].join("");
  }

  function normalizedPersonVotes(vote, playerCount) {
    var source = vote && vote.personVotes ? vote.personVotes : {};
    var result = {};
    for (var i = 1; i <= playerCount; i += 1) {
      var value = source[String(i)];
      if (value === "public" || value === "private") result[String(i)] = value;
    }
    return result;
  }

  function tallyPersonVotes(personVotes) {
    return Object.keys(personVotes).reduce(function (totals, key) {
      if (personVotes[key] === "public") totals.public += 1;
      if (personVotes[key] === "private") totals.private += 1;
      return totals;
    }, { public: 0, private: 0 });
  }

  function personVoteCount(vote, playerCount) {
    return Object.keys(normalizedPersonVotes(vote, playerCount)).length;
  }

  function firstPendingPerson(playerCount, personVotes) {
    for (var i = 1; i <= playerCount; i += 1) {
      if (!personVotes[String(i)]) return i;
    }
    return playerCount;
  }

  function voteScreen(state, country) {
    var round = App.ensureRound(state, state.currentRound);
    var vote = App.getVote(round, country.id);
    var submitted = vote.submitted;
    var playerCount = App.getCountryPlayerCount(state, country.id);
    var personVotes = normalizedPersonVotes(vote, playerCount);
    var tallies = tallyPersonVotes(personVotes);
    var publicCount = tallies.public;
    var privateCount = tallies.private;
    var total = publicCount + privateCount;
    var remaining = Math.max(0, playerCount - total);
    var allSubmitted = App.submittedVoteCount(state, state.currentRound);
    var currentPerson = App.clampNumber(vote.currentVoter || firstPendingPerson(playerCount, personVotes), 1, playerCount);
    var currentDone = Boolean(personVotes[String(currentPerson)]);

    if (submitted) {
      return [
        '<section class="mobile-card">',
        '<div class="section-title tight"><div><h2>投票完成</h2><p>等待其他國家投票與主持人開票。</p></div></div>',
        '<div class="notice good">本組已送出。全場完成：' + allSubmitted + ' / ' + App.countryList(state).length + ' 國。</div>',
        '<div class="metric-row single">',
        '<div class="metric"><span>本組公幣</span><strong>' + publicCount + '</strong></div>',
        '<div class="metric"><span>本組私幣</span><strong>' + privateCount + '</strong></div>',
        '<div class="metric"><span>人數</span><strong>' + playerCount + '</strong></div>',
        '</div>',
        '</section>'
      ].join("");
    }

    if (total >= playerCount) {
      return [
        '<section class="mobile-card">',
        '<div class="section-title tight"><div><h2>本組全員已完成</h2><p>確認後送出給主持人。</p></div></div>',
        '<div class="metric-row single">',
        '<div class="metric"><span>公幣</span><strong>' + publicCount + '</strong></div>',
        '<div class="metric"><span>私幣</span><strong>' + privateCount + '</strong></div>',
        '<div class="metric"><span>完成</span><strong>' + total + ' / ' + playerCount + '</strong></div>',
        '</div>',
        '<button class="button primary full" data-country-action="submitVote" type="button">送出本組投票</button>',
        '<button class="button full" data-country-action="restartPeopleVote" type="button">重新從 1 號開始投票</button>',
        '</section>'
      ].join("");
    }

    return [
      '<section class="mobile-card">',
      '<div class="section-title tight"><div><h2>秘密投票</h2><p>請依人民編號輪流投票。</p></div></div>',
      round.event ? '<div class="notice"><strong>' + App.escapeHtml(round.event.title) + '</strong><span>' + App.escapeHtml(round.event.description) + '</span></div>' : '<div class="notice">主持人尚未抽事件牌。</div>',
      '<div class="person-vote-card">',
      '<span class="person-kicker">現在投票</span>',
      '<strong>' + currentPerson + ' 號人民</strong>',
      '<small>已完成 ' + total + ' / ' + playerCount + ' 位，剩餘 ' + remaining + ' 位</small>',
      '</div>',
      currentDone ? [
        '<div class="notice good"><strong>' + currentPerson + ' 號人民已完成投票</strong><span>請把裝置交給下一位人民。</span></div>',
        '<button class="button primary full" data-country-action="nextVoter" type="button">交給下一位</button>',
        '<button class="button full" data-country-action="redoCurrentVoter" type="button">重新投 ' + currentPerson + ' 號</button>'
      ].join("") : [
        '<div class="person-choice-grid">',
        '<button class="person-choice public" data-person-vote="public" type="button"><span>公幣</span><small>貢獻世界和平</small></button>',
        '<button class="person-choice private" data-person-vote="private" type="button"><span>私幣</span><small>保留給自己</small></button>',
        '</div>'
      ].join(""),
      '</section>'
    ].join("");
  }

  function waitingScreen(state, country) {
    var round = App.ensureRound(state, state.currentRound);
    var vote = App.getVote(round, country.id);
    var totals = App.countryTotals(state, country.id);

    return [
      '<section class="mobile-card">',
      '<div class="section-title tight"><h2>目前等待主持人</h2></div>',
      '<div class="metric-row single">',
      '<div class="metric"><span>階段</span><strong>' + App.escapeHtml(App.phaseLabel(state.phase)) + '</strong></div>',
      '<div class="metric"><span>本輪投票</span><strong>公 ' + vote.public + '｜私 ' + vote.private + '</strong></div>',
      '<div class="metric"><span>累積分</span><strong>' + totals.score + '</strong></div>',
      '</div>',
      round.event ? '<div class="notice"><strong>本輪事件</strong><span>' + App.escapeHtml(round.event.title) + '：' + App.escapeHtml(round.event.description) + '</span></div>' : "",
      '</section>'
    ].join("");
  }

  function blockScreen(state, country) {
    var round = App.ensureRound(state, state.currentRound);
    var usedAction = Boolean(country.leaderActionUsed || country.usedBlock);
    var ownAction = round.blocks[country.id] || null;
    var locked = usedAction || Boolean(ownAction && ownAction.type !== "skip" && ownAction.target);
    var rivalId = App.getActiveRival(state, country.id);
    var targets = App.countryList(state).filter(function (item) { return item.id !== country.id; });
    var allianceTargets = targets.filter(function (item) { return item.id !== rivalId; });
    if (!allianceTargets.length) allianceTargets = targets;
    var blockOptions = targets.map(function (item) {
      return targetButton("block", item, locked);
    }).join("");
    var allianceOptions = allianceTargets.map(function (item) {
      return targetButton("alliance", item, locked);
    }).join("");

    return [
      '<section class="mobile-card">',
      '<div class="section-title tight"><div><h2>元首行動</h2><p>整場活動可發動一次封鎖或結盟。</p></div></div>',
      usedAction ? '<div class="notice warn">你已使用本場元首行動。</div>' : '<div class="notice">封鎖：目標本輪有私幣即成功，目標本輪分數歸零。結盟：雙方互選才成功，雙方本輪各 +' + state.settings.allianceBonus + ' 分。</div>',
      ownAction ? '<div class="notice good">已選擇：' + leaderActionText(state, ownAction) + '。結果：' + actionResultText(ownAction.result) + '</div>' : "",
      '<div class="action-section"><strong>封鎖</strong><div class="choice-grid">' + (blockOptions || '<p class="muted">沒有可封鎖目標。</p>') + '</div></div>',
      '<div class="action-section"><strong>結盟</strong><div class="choice-grid">' + (allianceOptions || '<p class="muted">沒有可結盟目標。</p>') + '</div></div>',
      '<button class="button full" data-country-action="skipLeaderAction" type="button" ' + (locked ? "disabled" : "") + '>本輪略過元首行動</button>',
      '</section>'
    ].join("");
  }

  function targetButton(kind, item, locked) {
    return '<button class="choice-button" data-country-action="submitLeaderAction" data-action-kind="' + kind + '" data-target="' + item.id + '" type="button" ' + (locked ? "disabled" : "") + '>' + App.countryIcon(item, "tiny") + item.flag + ' ' + App.escapeHtml(item.name) + '</button>';
  }

  function leaderActionText(state, action) {
    if (!action || action.type === "skip" || !action.target) return "略過";
    var type = action.type === "alliance" ? "結盟" : "封鎖";
    return App.escapeHtml(type + " " + App.countryName(state, action.target));
  }

  function actionResultText(result) {
    if (result === "success") return "成功";
    if (result === "failed") return "失敗";
    if (result === "skipped") return "略過";
    return "等待結算";
  }

  function sanctionScreen(state, country) {
    var round = App.ensureRound(state, state.currentRound);
    var eligible = App.sanctionEligibleCountries(state, state.currentRound);
    var canVote = eligible.some(function (item) { return item.id === country.id; });
    var vote = round.sanctions.votes[country.id] || null;
    var targets = App.countryList(state).filter(function (item) {
      return item.id !== country.id;
    }).map(function (item) {
      return '<button class="choice-button" data-country-action="submitSanction" data-target="' + item.id + '" type="button" ' + (!canVote ? "disabled" : "") + '>' + App.countryIcon(item, "tiny") + item.flag + ' ' + App.escapeHtml(item.name) + '</button>';
    }).join("");

    return [
      '<section class="mobile-card">',
      '<div class="section-title tight"><div><h2>制裁投票</h2><p>本輪有私幣票的國家有投票資格。</p></div></div>',
      canVote ? '<div class="notice good">你有制裁投票資格。</div>' : '<div class="notice warn">本組本輪沒有私幣票，不能參與制裁投票。</div>',
      vote ? '<div class="notice">已投：' + (vote.target ? App.escapeHtml(App.countryName(state, vote.target)) : "不投票") + '</div>' : "",
      '<div class="choice-grid">' + targets + '</div>',
      '<button class="button full" data-country-action="skipSanction" type="button" ' + (!canVote ? "disabled" : "") + '>不投票</button>',
      '</section>'
    ].join("");
  }

  function infoScreen(state, country) {
    var totals = App.countryTotals(state, country.id);
    var rivalId = App.getActiveRival(state, country.id);
    var rival = rivalId ? (state.countries[rivalId] || App.getCountry(rivalId)) : null;
    var final = state.final;
    var finalBlock = final ? [
      '<section class="mobile-card">',
      '<div class="section-title tight"><h2>結局</h2></div>',
      '<div class="metric-row single">',
      '<div class="metric"><span>最終分</span><strong>' + (final.scores[country.id] || 0) + '</strong></div>',
      '<div class="metric"><span>秘密加分</span><strong>' + (final.bonuses[country.id] || 0) + '</strong></div>',
      '</div>',
      final.champion && final.champion.countryId === country.id ? '<div class="notice good">本組是峰會最強國家。</div>' : "",
      '</section>'
    ].join("") : "";

    return [
      '<section class="mobile-card">',
      '<div class="section-title tight"><h2>資訊中心</h2></div>',
      '<div class="metric-row single">',
      '<div class="metric"><span>累積分</span><strong>' + totals.score + '</strong></div>',
      '<div class="metric"><span>公幣</span><strong>' + totals.public + '</strong></div>',
      '<div class="metric"><span>私幣</span><strong>' + totals.private + '</strong></div>',
      '</div>',
      '<div class="notice"><strong>秘密目標</strong><span>' + (rival ? '最終總分高於 ' + App.escapeHtml(App.countryName(state, rival.id)) + ' 可獲得 +' + state.settings.secretBonus + ' 分。' : '目前只有本組啟用，秘密目標暫停。') + '</span></div>',
      '</section>',
      finalBlock
    ].join("");
  }

  function render(state) {
    var country = state.countries[countryId] || App.getCountry(countryId);
    if (!country || country.active === false) {
      App.$("#countryBody").innerHTML = '<section class="mobile-card"><h2>本組未啟用</h2><p>請向主持人確認本場組別設定。</p></section>';
      return;
    }
    header(state, country);

    var screens = [];
    if (state.phase === "voting") screens.push(voteScreen(state, country));
    else if (state.phase === "leaderAction" || state.phase === "block") screens.push(blockScreen(state, country));
    else if (state.phase === "sanction") screens.push(sanctionScreen(state, country));
    else screens.push(waitingScreen(state, country));
    screens.push(infoScreen(state, country));
    App.$("#countryBody").innerHTML = screens.join("");
  }

  function updateVote(kind, delta) {
    context.update(function (state) {
      var round = App.ensureRound(state, state.currentRound);
      var vote = App.getVote(round, countryId);
      var playerCount = App.getCountryPlayerCount(state, countryId);
      var other = kind === "public" ? "private" : "public";
      vote[kind] = App.clampNumber(Number(vote[kind] || 0) + Number(delta || 0), 0, playerCount);
      var total = Number(vote.public || 0) + Number(vote.private || 0);
      if (total > playerCount) {
        vote[other] = Math.max(0, Number(vote[other] || 0) - (total - playerCount));
      }
      vote.submitted = false;
      round.votes[countryId] = vote;
    });
  }

  function recomputeVoteFromPeople(vote, playerCount) {
    var personVotes = normalizedPersonVotes(vote, playerCount);
    var tallies = tallyPersonVotes(personVotes);
    vote.personVotes = personVotes;
    vote.public = tallies.public;
    vote.private = tallies.private;
    return tallies;
  }

  function submitPersonVote(kind) {
    context.update(function (state) {
      var round = App.ensureRound(state, state.currentRound);
      var vote = App.getVote(round, countryId);
      var playerCount = App.getCountryPlayerCount(state, countryId);
      var personVotes = normalizedPersonVotes(vote, playerCount);
      var currentPerson = App.clampNumber(vote.currentVoter || firstPendingPerson(playerCount, personVotes), 1, playerCount);
      personVotes[String(currentPerson)] = kind;
      vote.personVotes = personVotes;
      vote.currentVoter = currentPerson;
      vote.submitted = false;
      vote.submittedAt = null;
      recomputeVoteFromPeople(vote, playerCount);
      round.votes[countryId] = vote;
    });
  }

  function nextVoter() {
    context.update(function (state) {
      var round = App.ensureRound(state, state.currentRound);
      var vote = App.getVote(round, countryId);
      var playerCount = App.getCountryPlayerCount(state, countryId);
      var personVotes = normalizedPersonVotes(vote, playerCount);
      vote.currentVoter = firstPendingPerson(playerCount, personVotes);
      recomputeVoteFromPeople(vote, playerCount);
      round.votes[countryId] = vote;
    });
  }

  function redoCurrentVoter() {
    context.update(function (state) {
      var round = App.ensureRound(state, state.currentRound);
      var vote = App.getVote(round, countryId);
      var playerCount = App.getCountryPlayerCount(state, countryId);
      var currentPerson = App.clampNumber(vote.currentVoter || 1, 1, playerCount);
      var personVotes = normalizedPersonVotes(vote, playerCount);
      delete personVotes[String(currentPerson)];
      vote.personVotes = personVotes;
      vote.currentVoter = currentPerson;
      vote.submitted = false;
      vote.submittedAt = null;
      recomputeVoteFromPeople(vote, playerCount);
      round.votes[countryId] = vote;
    });
  }

  function restartPeopleVote() {
    context.update(function (state) {
      var round = App.ensureRound(state, state.currentRound);
      var vote = App.getVote(round, countryId);
      vote.personVotes = {};
      vote.public = 0;
      vote.private = 0;
      vote.currentVoter = 1;
      vote.submitted = false;
      vote.submittedAt = null;
      round.votes[countryId] = vote;
    });
  }

  function submitVote() {
    context.update(function (state) {
      var round = App.ensureRound(state, state.currentRound);
      var vote = App.getVote(round, countryId);
      var playerCount = App.getCountryPlayerCount(state, countryId);
      var tallies = recomputeVoteFromPeople(vote, playerCount);
      var total = tallies.public + tallies.private;
      if (total !== playerCount) return;
      vote.submitted = true;
      vote.submittedAt = Date.now();
      round.votes[countryId] = vote;
      App.addLog(state, App.countryName(state, countryId) + " 已送出投票");
    });
  }

  function submitLeaderAction(kind, target) {
    context.update(function (state) {
      var country = state.countries[countryId];
      if (!country) return;
      var round = App.ensureRound(state, state.currentRound);
      var existing = round.blocks[countryId] || null;
      var usedAction = Boolean(country.leaderActionUsed || country.usedBlock);
      var locked = usedAction || Boolean(existing && existing.type !== "skip" && existing.target);
      var actionType = kind || "skip";
      if (locked) return;
      if (actionType === "skip" || !target) {
        round.blocks[countryId] = { type: "skip", target: "", submittedAt: Date.now(), result: "skipped" };
        App.addLog(state, App.countryName(state, countryId) + " 本輪略過元首行動");
        return;
      }
      round.blocks[countryId] = { type: actionType, target: target, submittedAt: Date.now(), result: "pending" };
      App.addLog(state, App.countryName(state, countryId) + " 選擇" + (actionType === "alliance" ? "結盟 " : "封鎖 ") + App.countryName(state, target));
    });
  }

  function submitSanction(target) {
    context.update(function (state) {
      var eligible = App.sanctionEligibleCountries(state, state.currentRound);
      var canVote = eligible.some(function (item) { return item.id === countryId; });
      if (!canVote) return;
      var round = App.ensureRound(state, state.currentRound);
      round.sanctions.votes[countryId] = { target: target || "", submittedAt: Date.now() };
      App.addLog(state, App.countryName(state, countryId) + " 已送出制裁票");
    });
  }

  App.delegate(document, "[data-vote]", "click", function (event, target) {
    updateVote(target.getAttribute("data-vote"), target.getAttribute("data-delta"));
  });

  App.delegate(document, "[data-person-vote]", "click", function (event, target) {
    submitPersonVote(target.getAttribute("data-person-vote"));
  });

  App.delegate(document, "[data-country-action]", "click", function (event, target) {
    var action = target.getAttribute("data-country-action");
    if (action === "submitVote") submitVote();
    if (action === "nextVoter") nextVoter();
    if (action === "redoCurrentVoter") redoCurrentVoter();
    if (action === "restartPeopleVote") restartPeopleVote();
    if (action === "submitLeaderAction") submitLeaderAction(target.getAttribute("data-action-kind"), target.getAttribute("data-target"));
    if (action === "submitBlock") submitLeaderAction("block", target.getAttribute("data-target"));
    if (action === "skipLeaderAction" || action === "skipBlock") submitLeaderAction("skip", "");
    if (action === "submitSanction") submitSanction(target.getAttribute("data-target"));
    if (action === "skipSanction") submitSanction("");
  });

  context = App.bootPage(render);
})();
