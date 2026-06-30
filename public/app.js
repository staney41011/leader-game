(function () {
  "use strict";

  var APP_VERSION = "1.0.0";
  var DEFAULT_GAME_ID = "leader-main";
  var PLAYER_COUNT = 6;

  var COUNTRIES = [
    { id: "US", flag: "🇺🇸", name: "美國", color: "#2563eb", rival: "CN" },
    { id: "CN", flag: "🇨🇳", name: "中國", color: "#dc2626", rival: "US" },
    { id: "JP", flag: "🇯🇵", name: "日本", color: "#be123c", rival: "RU" },
    { id: "RU", flag: "🇷🇺", name: "俄羅斯", color: "#7c3aed", rival: "JP" },
    { id: "DE", flag: "🇩🇪", name: "德國", color: "#525252", rival: "FR" },
    { id: "FR", flag: "🇫🇷", name: "法國", color: "#0891b2", rival: "DE" },
    { id: "GB", flag: "🇬🇧", name: "英國", color: "#1d4ed8", rival: "IN" },
    { id: "IN", flag: "🇮🇳", name: "印度", color: "#ea580c", rival: "GB" },
    { id: "ID", flag: "🇮🇩", name: "印尼", color: "#b91c1c", rival: "AU" },
    { id: "SA", flag: "🇸🇦", name: "沙烏地", color: "#15803d", rival: "ZA" },
    { id: "ZA", flag: "🇿🇦", name: "南非", color: "#0f766e", rival: "BR" },
    { id: "BR", flag: "🇧🇷", name: "巴西", color: "#65a30d", rival: "SA" },
    { id: "AU", flag: "🇦🇺", name: "澳洲", color: "#0369a1", rival: "ID" }
  ];

  var PHASES = {
    setup: "準備中",
    discussion: "組內討論",
    voting: "秘密投票",
    event: "事件牌",
    block: "封鎖宣告",
    scored: "開票計分",
    sanction: "制裁投票",
    final: "結局揭示",
    completed: "活動完成"
  };

  var EVENT_DECK = [
    {
      id: "public_double",
      icon: "公",
      title: "公幣加倍",
      description: "本輪公幣票在世界和平進度與本輪分數中都加倍計算。"
    },
    {
      id: "private_double",
      icon: "私",
      title: "私幣加倍",
      description: "本輪私幣分數加倍，私幣最多的壓力也更明顯。"
    },
    {
      id: "hide_country",
      icon: "隱",
      title: "結果全隱藏",
      description: "大螢幕只公布全場公幣與私幣總量，不顯示各國本輪細節。"
    },
    {
      id: "follow_highest",
      icon: "冠",
      title: "全場跟最高",
      description: "本輪所有國家得分都調整為本輪最高分。"
    }
  ];

  var DEFAULT_SETTINGS = {
    title: "立德 LEADER",
    roundCount: 3,
    playersPerCountry: PLAYER_COUNT,
    peaceTarget: 140,
    sanctionRatio: 0.6,
    secretBonus: 5,
    sanctionPenalty: 5,
    publicPoint: 1,
    privatePoint: 2
  };

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clampNumber(value, min, max) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.max(min, Math.min(max, parsed));
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function sanitizeGameId(value) {
    return String(value || DEFAULT_GAME_ID)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || DEFAULT_GAME_ID;
  }

  function getGameId() {
    var fromUrl = new URL(window.location.href).searchParams.get("game");
    if (fromUrl) {
      var sanitizedUrl = sanitizeGameId(fromUrl);
      localStorage.setItem("leader-game-id", sanitizedUrl);
      return sanitizedUrl;
    }
    return sanitizeGameId(localStorage.getItem("leader-game-id") || DEFAULT_GAME_ID);
  }

  function setGameId(gameId) {
    var nextId = sanitizeGameId(gameId);
    localStorage.setItem("leader-game-id", nextId);
    var url = new URL(window.location.href);
    url.searchParams.set("game", nextId);
    window.location.href = url.toString();
  }

  function withGame(path, gameId, extra) {
    var current = new URL(window.location.href);
    var base = current.origin + current.pathname.replace(/\/[^/]*$/, "/");
    var url = new URL(path, base);
    url.searchParams.set("game", sanitizeGameId(gameId || getGameId()));
    Object.keys(extra || {}).forEach(function (key) {
      url.searchParams.set(key, extra[key]);
    });
    return url.pathname.replace(/^\//, "") + url.search;
  }

  function absoluteWithGame(path, gameId, extra, baseUrl) {
    var base = baseUrl || window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/");
    var url = new URL(path, base);
    url.searchParams.set("game", sanitizeGameId(gameId || getGameId()));
    Object.keys(extra || {}).forEach(function (key) {
      url.searchParams.set(key, extra[key]);
    });
    return url.toString();
  }

  function countryList(state) {
    var countries = state && state.countries ? state.countries : {};
    return Object.keys(countries)
      .map(function (id) { return countries[id]; })
      .filter(Boolean)
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  function getCountry(id) {
    return COUNTRIES.find(function (country) { return country.id === id; }) || null;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function now() {
    return Date.now();
  }

  function defaultCountries() {
    return COUNTRIES.reduce(function (map, country, index) {
      map[country.id] = Object.assign({}, country, {
        order: index,
        active: true,
        usedBlock: false
      });
      return map;
    }, {});
  }

  function defaultState(gameId) {
    return {
      meta: {
        version: APP_VERSION,
        gameId: sanitizeGameId(gameId),
        createdAt: now(),
        updatedAt: now()
      },
      settings: clone(DEFAULT_SETTINGS),
      phase: "setup",
      currentRound: 1,
      countries: defaultCountries(),
      rounds: {},
      totals: {},
      final: null,
      log: []
    };
  }

  function ensureCountries(state) {
    state.countries = state.countries || {};
    COUNTRIES.forEach(function (country, index) {
      state.countries[country.id] = Object.assign(
        {},
        country,
        { order: index, active: true, usedBlock: false },
        state.countries[country.id] || {}
      );
    });
  }

  function ensureRound(state, roundNo) {
    var number = Number(roundNo || state.currentRound || 1);
    state.rounds = state.rounds || {};
    state.rounds[number] = Object.assign({
      number: number,
      startedAt: null,
      event: null,
      votes: {},
      blocks: {},
      sanctions: { votes: {}, counts: {}, result: {}, threshold: null },
      scores: {},
      scoredAt: null
    }, state.rounds[number] || {});
    state.rounds[number].votes = state.rounds[number].votes || {};
    state.rounds[number].blocks = state.rounds[number].blocks || {};
    state.rounds[number].sanctions = Object.assign(
      { votes: {}, counts: {}, result: {}, threshold: null },
      state.rounds[number].sanctions || {}
    );
    state.rounds[number].scores = state.rounds[number].scores || {};
    return state.rounds[number];
  }

  function migrateState(raw, gameId) {
    var base = raw && typeof raw === "object" ? raw : defaultState(gameId);
    base.meta = Object.assign(defaultState(gameId).meta, base.meta || {}, { gameId: sanitizeGameId(gameId) });
    base.settings = Object.assign({}, DEFAULT_SETTINGS, base.settings || {});
    base.phase = base.phase || "setup";
    base.currentRound = clampNumber(base.currentRound || 1, 1, base.settings.roundCount || 3);
    base.rounds = base.rounds || {};
    base.totals = base.totals || {};
    base.log = Array.isArray(base.log) ? base.log.slice(-80) : [];
    ensureCountries(base);
    for (var i = 1; i <= (base.settings.roundCount || 3); i += 1) {
      if (base.rounds[i]) ensureRound(base, i);
    }
    if (!base.rounds[base.currentRound]) ensureRound(base, base.currentRound);
    updateTotals(base);
    return base;
  }

  function addLog(state, message) {
    state.log = Array.isArray(state.log) ? state.log : [];
    state.log.push({ at: now(), message: String(message || "") });
    state.log = state.log.slice(-80);
  }

  function finalizeState(state) {
    ensureCountries(state);
    ensureRound(state, state.currentRound || 1);
    updateTotals(state);
    state.meta = state.meta || {};
    state.meta.version = APP_VERSION;
    state.meta.updatedAt = now();
    return state;
  }

  function isFirebaseConfigured() {
    var config = window.LEADER_FIREBASE_CONFIG || {};
    return Boolean(
      window.firebase &&
      config.apiKey &&
      config.databaseURL &&
      config.projectId
    );
  }

  function createFirebaseStore(gameId) {
    var config = window.LEADER_FIREBASE_CONFIG;
    var rootName = window.LEADER_DB_ROOT || "leaderGames";
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(config);
    }
    var ref = window.firebase.database().ref(rootName + "/" + sanitizeGameId(gameId));
    var current = null;
    var listeners = [];

    ref.on("value", function (snapshot) {
      current = finalizeState(migrateState(snapshot.val(), gameId));
      if (!snapshot.exists()) {
        ref.set(current);
      }
      listeners.forEach(function (listener) { listener(current); });
    });

    return {
      mode: "firebase",
      ref: ref,
      subscribe: function (listener) {
        listeners.push(listener);
        if (current) listener(current);
        return function () {
          listeners = listeners.filter(function (item) { return item !== listener; });
        };
      },
      update: function (mutator) {
        return ref.transaction(function (raw) {
          var draft = finalizeState(migrateState(raw, gameId));
          mutator(draft);
          return finalizeState(draft);
        });
      },
      getCurrent: function () {
        return current;
      }
    };
  }

  function createLocalStore(gameId) {
    var key = "leader-state-" + sanitizeGameId(gameId);
    var listeners = [];
    var channel = "BroadcastChannel" in window ? new BroadcastChannel(key) : null;

    function read() {
      try {
        var raw = JSON.parse(localStorage.getItem(key) || "null");
        return finalizeState(migrateState(raw, gameId));
      } catch (error) {
        return finalizeState(defaultState(gameId));
      }
    }

    function write(state) {
      localStorage.setItem(key, JSON.stringify(state));
      listeners.forEach(function (listener) { listener(state); });
      if (channel) channel.postMessage({ type: "updated" });
    }

    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(finalizeState(defaultState(gameId))));
    }

    if (channel) {
      channel.onmessage = function () {
        var state = read();
        listeners.forEach(function (listener) { listener(state); });
      };
    }

    window.addEventListener("storage", function (event) {
      if (event.key === key) {
        var state = read();
        listeners.forEach(function (listener) { listener(state); });
      }
    });

    return {
      mode: "local",
      subscribe: function (listener) {
        listeners.push(listener);
        listener(read());
        return function () {
          listeners = listeners.filter(function (item) { return item !== listener; });
        };
      },
      update: function (mutator) {
        var draft = read();
        mutator(draft);
        write(finalizeState(draft));
        return Promise.resolve();
      },
      getCurrent: read
    };
  }

  function createStore(gameId) {
    return isFirebaseConfigured() ? createFirebaseStore(gameId) : createLocalStore(gameId);
  }

  function bootPage(render) {
    var gameId = getGameId();
    var store = createStore(gameId);
    var context = {
      gameId: gameId,
      store: store,
      update: store.update,
      mode: store.mode
    };
    store.subscribe(function (state) {
      context.state = state;
      render(state, context);
      updateGameLinks(gameId);
    });
    updateGameLinks(gameId);
    return context;
  }

  function updateGameLinks(gameId) {
    $$("[data-route]").forEach(function (link) {
      link.href = withGame(link.getAttribute("data-route"), gameId);
    });
  }

  function getVote(round, countryId) {
    var vote = round && round.votes ? round.votes[countryId] : null;
    return Object.assign({
      public: 0,
      private: 0,
      submitted: false,
      submittedAt: null
    }, vote || {});
  }

  function voteTotal(vote) {
    return Number(vote.public || 0) + Number(vote.private || 0);
  }

  function getRoundScore(round, countryId) {
    return Object.assign({
      public: 0,
      private: 0,
      effectivePublic: 0,
      base: 0,
      score: 0,
      blockedBy: [],
      sanctioned: false
    }, round && round.scores ? round.scores[countryId] : null);
  }

  function countryTotals(state, countryId) {
    var totals = { score: 0, public: 0, private: 0 };
    for (var i = 1; i <= state.settings.roundCount; i += 1) {
      var round = state.rounds[i];
      if (!round) continue;
      var score = getRoundScore(round, countryId);
      totals.score += Number(score.score || 0);
      totals.public += Number(score.effectivePublic || score.public || 0);
      totals.private += Number(score.private || 0);
    }
    return totals;
  }

  function updateTotals(state) {
    var totals = {
      public: 0,
      private: 0,
      scores: {},
      peaceAchieved: false
    };
    countryList(state).forEach(function (country) {
      var countryTotal = countryTotals(state, country.id);
      totals.public += countryTotal.public;
      totals.private += countryTotal.private;
      totals.scores[country.id] = countryTotal.score;
    });
    totals.peaceTarget = Number(state.settings.peaceTarget || DEFAULT_SETTINGS.peaceTarget);
    totals.peaceAchieved = totals.public >= totals.peaceTarget;
    state.totals = totals;
    return totals;
  }

  function submittedVoteCount(state, roundNo) {
    var round = ensureRound(state, roundNo || state.currentRound);
    return countryList(state).filter(function (country) {
      return getVote(round, country.id).submitted;
    }).length;
  }

  function drawEvent(state, roundNo) {
    var round = ensureRound(state, roundNo || state.currentRound);
    var used = Object.keys(state.rounds || {}).map(function (key) {
      return state.rounds[key] && state.rounds[key].event && state.rounds[key].event.id;
    }).filter(Boolean);
    var deck = EVENT_DECK.filter(function (event) { return used.indexOf(event.id) === -1; });
    if (!deck.length) deck = EVENT_DECK.slice();
    var event = deck[Math.floor(Math.random() * deck.length)];
    round.event = clone(event);
    state.phase = "event";
    addLog(state, "第 " + round.number + " 輪抽到事件牌：" + event.title);
  }

  function scoreRound(state, roundNo) {
    var round = ensureRound(state, roundNo || state.currentRound);
    var settings = state.settings;
    var countries = countryList(state);
    var eventId = round.event && round.event.id;
    var successfulBlocksByTarget = {};

    Object.keys(round.blocks || {}).forEach(function (fromCountryId) {
      var block = round.blocks[fromCountryId];
      if (!block || !block.target) return;
      var targetVote = getVote(round, block.target);
      var success = Number(targetVote.private || 0) > 0;
      block.result = success ? "success" : "failed";
      block.resolvedAt = now();
      if (success) {
        successfulBlocksByTarget[block.target] = successfulBlocksByTarget[block.target] || [];
        successfulBlocksByTarget[block.target].push(fromCountryId);
        if (state.countries[fromCountryId]) state.countries[fromCountryId].usedBlock = true;
      }
    });

    var scores = {};
    var highest = 0;
    countries.forEach(function (country) {
      var vote = getVote(round, country.id);
      var publicVotes = clampNumber(vote.public || 0, 0, settings.playersPerCountry);
      var privateVotes = clampNumber(vote.private || 0, 0, settings.playersPerCountry);
      var effectivePublic = publicVotes;
      var base = publicVotes * settings.publicPoint + privateVotes * settings.privatePoint;

      if (eventId === "public_double") {
        effectivePublic = publicVotes * 2;
        base += publicVotes * settings.publicPoint;
      }
      if (eventId === "private_double") {
        base += privateVotes * settings.privatePoint;
      }

      var blockedBy = successfulBlocksByTarget[country.id] || [];
      var score = blockedBy.length ? 0 : base;
      scores[country.id] = {
        public: publicVotes,
        private: privateVotes,
        effectivePublic: effectivePublic,
        base: base,
        score: score,
        blockedBy: blockedBy,
        sanctioned: false
      };
      highest = Math.max(highest, score);
    });

    if (eventId === "follow_highest") {
      countries.forEach(function (country) {
        scores[country.id].score = highest;
      });
    }

    Object.keys(round.sanctions.result || {}).forEach(function (countryId) {
      if (round.sanctions.result[countryId] && scores[countryId]) {
        scores[countryId].score = Math.max(0, scores[countryId].score - Number(settings.sanctionPenalty || 0));
        scores[countryId].sanctioned = true;
      }
    });

    round.scores = scores;
    round.scoredAt = now();
    state.phase = "scored";
    updateTotals(state);
    addLog(state, "第 " + round.number + " 輪完成計分");
  }

  function sanctionEligibleCountries(state, roundNo) {
    var round = ensureRound(state, roundNo || state.currentRound);
    return countryList(state).filter(function (country) {
      return Number(getVote(round, country.id).private || 0) > 0;
    });
  }

  function resolveSanctions(state, roundNo) {
    var round = ensureRound(state, roundNo || state.currentRound);
    var eligible = sanctionEligibleCountries(state, round.number);
    var threshold = Math.max(1, Math.ceil(eligible.length * Number(state.settings.sanctionRatio || 0.6)));
    var counts = {};
    Object.keys(round.sanctions.votes || {}).forEach(function (fromCountryId) {
      var target = round.sanctions.votes[fromCountryId] && round.sanctions.votes[fromCountryId].target;
      if (!target) return;
      counts[target] = (counts[target] || 0) + 1;
    });
    var result = {};
    Object.keys(counts).forEach(function (target) {
      result[target] = counts[target] >= threshold;
    });
    round.sanctions.counts = counts;
    round.sanctions.threshold = threshold;
    round.sanctions.eligibleCount = eligible.length;
    round.sanctions.result = result;
    scoreRound(state, round.number);
    addLog(state, "第 " + round.number + " 輪制裁結算完成");
  }

  function revealFinal(state) {
    updateTotals(state);
    var totals = state.totals.scores || {};
    var finalScores = {};
    var bonuses = {};
    countryList(state).forEach(function (country) {
      var rivalScore = Number(totals[country.rival] || 0);
      var ownScore = Number(totals[country.id] || 0);
      var bonus = ownScore > rivalScore ? Number(state.settings.secretBonus || 0) : 0;
      bonuses[country.id] = bonus;
      finalScores[country.id] = ownScore + bonus;
    });

    var penalty = null;
    if (!state.totals.peaceAchieved) {
      var maxPrivate = -1;
      countryList(state).forEach(function (country) {
        var total = countryTotals(state, country.id);
        if (total.private > maxPrivate) {
          maxPrivate = total.private;
          penalty = { countryId: country.id, privateVotes: total.private };
        }
      });
      if (penalty && finalScores[penalty.countryId] != null) {
        penalty.before = finalScores[penalty.countryId];
        finalScores[penalty.countryId] = Math.floor(finalScores[penalty.countryId] / 2);
        penalty.after = finalScores[penalty.countryId];
      }
    }

    var champion = countryList(state).reduce(function (best, country) {
      var score = Number(finalScores[country.id] || 0);
      if (!best || score > best.score) return { countryId: country.id, score: score };
      return best;
    }, null);

    state.final = {
      revealedAt: now(),
      peaceAchieved: state.totals.peaceAchieved,
      publicVotes: state.totals.public,
      peaceTarget: state.totals.peaceTarget,
      bonuses: bonuses,
      penalty: penalty,
      scores: finalScores,
      champion: champion
    };
    state.phase = "final";
    addLog(state, "結局揭示完成");
  }

  function phaseLabel(phase) {
    return PHASES[phase] || phase || "準備中";
  }

  function formatTime(timestamp) {
    if (!timestamp) return "尚未記錄";
    return new Date(timestamp).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  }

  function progressPercent(value, target) {
    if (!target) return 0;
    return Math.max(0, Math.min(100, Math.round((Number(value || 0) / Number(target)) * 100)));
  }

  function statusPill(text, tone) {
    return '<span class="status-pill ' + escapeHtml(tone || "") + '">' + escapeHtml(text) + "</span>";
  }

  function countryName(state, countryId) {
    var country = state.countries && state.countries[countryId] ? state.countries[countryId] : getCountry(countryId);
    return country ? country.flag + " " + country.name : countryId;
  }

  function resetState(state) {
    var next = defaultState(state.meta && state.meta.gameId ? state.meta.gameId : getGameId());
    Object.keys(state).forEach(function (key) { delete state[key]; });
    Object.assign(state, next);
    addLog(state, "遊戲資料已重置");
  }

  function delegate(root, selector, eventName, handler) {
    root.addEventListener(eventName, function (event) {
      var target = event.target.closest(selector);
      if (target && root.contains(target)) handler(event, target);
    });
  }

  window.LeaderApp = {
    version: APP_VERSION,
    countries: COUNTRIES,
    phases: PHASES,
    events: EVENT_DECK,
    defaultSettings: DEFAULT_SETTINGS,
    $: $,
    $$: $$,
    escapeHtml: escapeHtml,
    clampNumber: clampNumber,
    getParam: getParam,
    getGameId: getGameId,
    setGameId: setGameId,
    withGame: withGame,
    absoluteWithGame: absoluteWithGame,
    getCountry: getCountry,
    countryList: countryList,
    countryName: countryName,
    defaultState: defaultState,
    ensureRound: ensureRound,
    createStore: createStore,
    bootPage: bootPage,
    updateGameLinks: updateGameLinks,
    getVote: getVote,
    voteTotal: voteTotal,
    getRoundScore: getRoundScore,
    countryTotals: countryTotals,
    submittedVoteCount: submittedVoteCount,
    drawEvent: drawEvent,
    scoreRound: scoreRound,
    sanctionEligibleCountries: sanctionEligibleCountries,
    resolveSanctions: resolveSanctions,
    revealFinal: revealFinal,
    addLog: addLog,
    resetState: resetState,
    phaseLabel: phaseLabel,
    formatTime: formatTime,
    progressPercent: progressPercent,
    statusPill: statusPill,
    sanitizeGameId: sanitizeGameId,
    delegate: delegate,
    isFirebaseConfigured: isFirebaseConfigured
  };
})();
