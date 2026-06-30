(function () {
  "use strict";

  var App = window.LeaderApp;
  var countryId = (App.getParam("id") || "US").toUpperCase();
  var context = null;

  function header(state, country) {
    var round = App.ensureRound(state, state.currentRound);
    var vote = App.getVote(round, country.id);
    App.$("#countryHeader").innerHTML = [
      '<div class="country-badge" style="--country-color:' + App.escapeHtml(country.color) + '">',
      '<span>' + country.flag + '</span>',
      '<div><strong>' + App.escapeHtml(country.name) + '</strong><small>' + country.id + '｜第 ' + state.currentRound + ' 輪</small></div>',
      '</div>',
      '<div class="country-state">',
      App.statusPill(App.phaseLabel(state.phase), state.phase === "voting" ? "good" : ""),
      '<span>公 ' + vote.public + '｜私 ' + vote.private + '</span>',
      '</div>'
    ].join("");
  }

  function voteScreen(state, country) {
    var round = App.ensureRound(state, state.currentRound);
    var vote = App.getVote(round, country.id);
    var submitted = vote.submitted;
    var publicCount = Number(vote.public || 0);
    var privateCount = Number(vote.private || 0);
    var total = publicCount + privateCount;
    var remaining = Math.max(0, state.settings.playersPerCountry - total);
    var allSubmitted = App.submittedVoteCount(state, state.currentRound);

    return [
      '<section class="mobile-card">',
      '<div class="section-title tight"><div><h2>秘密投票</h2><p>每組 ' + state.settings.playersPerCountry + ' 人，各投一次。</p></div></div>',
      round.event ? '<div class="notice"><strong>' + App.escapeHtml(round.event.title) + '</strong><span>' + App.escapeHtml(round.event.description) + '</span></div>' : '<div class="notice">主持人尚未抽事件牌。</div>',
      '<div class="vote-counter">',
      '<button class="counter-button" data-vote="public" data-delta="-1" type="button">−</button>',
      '<div><span>公幣</span><strong>' + publicCount + '</strong></div>',
      '<button class="counter-button" data-vote="public" data-delta="1" type="button">＋</button>',
      '</div>',
      '<div class="vote-counter private">',
      '<button class="counter-button" data-vote="private" data-delta="-1" type="button">−</button>',
      '<div><span>私幣</span><strong>' + privateCount + '</strong></div>',
      '<button class="counter-button" data-vote="private" data-delta="1" type="button">＋</button>',
      '</div>',
      '<p class="mobile-hint">已記錄 ' + total + ' 人，剩餘 ' + remaining + ' 人。</p>',
      '<button class="button primary full" data-country-action="submitVote" type="button" ' + (total !== state.settings.playersPerCountry ? "disabled" : "") + '>' + (submitted ? "重新送出投票" : "送出本組投票") + '</button>',
      submitted ? '<div class="notice good">本組投票已送出。全場完成：' + allSubmitted + ' / ' + App.countryList(state).length + ' 國。</div>' : "",
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
    var usedBlock = Boolean(country.usedBlock);
    var ownBlock = round.blocks[country.id] || null;
    var options = App.countryList(state).filter(function (item) {
      return item.id !== country.id;
    }).map(function (item) {
      return '<button class="choice-button" data-country-action="submitBlock" data-target="' + item.id + '" type="button" ' + (usedBlock ? "disabled" : "") + '>' + item.flag + ' ' + App.escapeHtml(item.name) + '</button>';
    }).join("");

    return [
      '<section class="mobile-card">',
      '<div class="section-title tight"><div><h2>封鎖宣告</h2><p>元首每場活動可封鎖一次。</p></div></div>',
      usedBlock ? '<div class="notice warn">你已使用封鎖機會。</div>' : '<div class="notice">若目標國本輪有私幣票，封鎖成功並使該國本輪分數歸零。</div>',
      ownBlock ? '<div class="notice good">已申報封鎖 ' + App.escapeHtml(App.countryName(state, ownBlock.target)) + '。結果：' + blockResultText(ownBlock.result) + '</div>' : "",
      '<div class="choice-grid">' + options + '</div>',
      '<button class="button full" data-country-action="skipBlock" type="button">不發動封鎖</button>',
      '</section>'
    ].join("");
  }

  function blockResultText(result) {
    if (result === "success") return "成功";
    if (result === "failed") return "失敗";
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
      return '<button class="choice-button" data-country-action="submitSanction" data-target="' + item.id + '" type="button" ' + (!canVote ? "disabled" : "") + '>' + item.flag + ' ' + App.escapeHtml(item.name) + '</button>';
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
    var rival = state.countries[country.rival] || App.getCountry(country.rival);
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
      '<div class="notice"><strong>秘密目標</strong><span>最終總分高於 ' + (rival ? rival.flag + ' ' + App.escapeHtml(rival.name) : country.rival) + ' 可獲得 +' + state.settings.secretBonus + ' 分。</span></div>',
      '</section>',
      finalBlock
    ].join("");
  }

  function render(state) {
    var country = state.countries[countryId] || App.getCountry(countryId);
    if (!country) {
      App.$("#countryBody").innerHTML = '<section class="mobile-card"><h2>找不到國家</h2><p>請回首頁重新選擇。</p></section>';
      return;
    }
    header(state, country);

    var screens = [];
    if (state.phase === "voting") screens.push(voteScreen(state, country));
    else if (state.phase === "block") screens.push(blockScreen(state, country));
    else if (state.phase === "sanction") screens.push(sanctionScreen(state, country));
    else screens.push(waitingScreen(state, country));
    screens.push(infoScreen(state, country));
    App.$("#countryBody").innerHTML = screens.join("");
  }

  function updateVote(kind, delta) {
    context.update(function (state) {
      var round = App.ensureRound(state, state.currentRound);
      var vote = App.getVote(round, countryId);
      var other = kind === "public" ? "private" : "public";
      vote[kind] = App.clampNumber(Number(vote[kind] || 0) + Number(delta || 0), 0, state.settings.playersPerCountry);
      var total = Number(vote.public || 0) + Number(vote.private || 0);
      if (total > state.settings.playersPerCountry) {
        vote[other] = Math.max(0, Number(vote[other] || 0) - (total - state.settings.playersPerCountry));
      }
      vote.submitted = false;
      round.votes[countryId] = vote;
    });
  }

  function submitVote() {
    context.update(function (state) {
      var round = App.ensureRound(state, state.currentRound);
      var vote = App.getVote(round, countryId);
      var total = Number(vote.public || 0) + Number(vote.private || 0);
      if (total !== state.settings.playersPerCountry) return;
      vote.submitted = true;
      vote.submittedAt = Date.now();
      round.votes[countryId] = vote;
      App.addLog(state, App.countryName(state, countryId) + " 已送出投票");
    });
  }

  function submitBlock(target) {
    context.update(function (state) {
      var country = state.countries[countryId];
      if (!country || country.usedBlock) return;
      var round = App.ensureRound(state, state.currentRound);
      round.blocks[countryId] = { target: target, submittedAt: Date.now(), result: "pending" };
      App.addLog(state, App.countryName(state, countryId) + " 申報封鎖 " + App.countryName(state, target));
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

  App.delegate(document, "[data-country-action]", "click", function (event, target) {
    var action = target.getAttribute("data-country-action");
    if (action === "submitVote") submitVote();
    if (action === "submitBlock") submitBlock(target.getAttribute("data-target"));
    if (action === "skipBlock") submitBlock("");
    if (action === "submitSanction") submitSanction(target.getAttribute("data-target"));
    if (action === "skipSanction") submitSanction("");
  });

  context = App.bootPage(render);
})();
