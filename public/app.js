(function () {
  "use strict";

  var APP_VERSION = "2.0.0";
  var DEFAULT_GAME_ID = "leader-main";
  var PLAYER_COUNT = 6;

  var COUNTRIES = [
    { id: "US", flag: "🇺🇸", icon: "🗽", name: "美國", color: "#2563eb", rival: "CN" },
    { id: "CN", flag: "🇨🇳", icon: "🏮", name: "中國", color: "#dc2626", rival: "US" },
    { id: "JP", flag: "🇯🇵", icon: "🗻", name: "日本", color: "#be123c", rival: "RU" },
    { id: "RU", flag: "🇷🇺", icon: "★", name: "俄羅斯", color: "#7c3aed", rival: "JP" },
    { id: "DE", flag: "🇩🇪", icon: "⚙", name: "德國", color: "#525252", rival: "FR" },
    { id: "FR", flag: "🇫🇷", icon: "🗼", name: "法國", color: "#0891b2", rival: "DE" },
    { id: "GB", flag: "🇬🇧", icon: "♛", name: "英國", color: "#1d4ed8", rival: "IN" },
    { id: "IN", flag: "🇮🇳", icon: "🪷", name: "印度", color: "#ea580c", rival: "GB" },
    { id: "ID", flag: "🇮🇩", icon: "🌋", name: "印尼", color: "#b91c1c", rival: "AU" },
    { id: "SA", flag: "🇸🇦", icon: "🕌", name: "沙烏地", color: "#15803d", rival: "ZA" },
    { id: "ZA", flag: "🇿🇦", icon: "◆", name: "南非", color: "#0f766e", rival: "BR" },
    { id: "BR", flag: "🇧🇷", icon: "⚽", name: "巴西", color: "#65a30d", rival: "SA" },
    { id: "AU", flag: "🇦🇺", icon: "🪃", name: "澳洲", color: "#0369a1", rival: "ID" }
  ];

  var PHASES = {
    setup: "準備中",
    discussion: "組內討論",
    voting: "秘密投票",
    event: "事件牌",
    leaderAction: "元首行動",
    block: "元首行動",
    scored: "開票計分",
    diplomacy: "外交會議",
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
    autoPeaceTarget: true,
    sanctionRatio: 0.6,
    secretBonus: 5,
    sanctionPenalty: 5,
    allianceBonus: 2,
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
    return sanitizeGameId(fromUrl || DEFAULT_GAME_ID);
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
    var nextGameId = sanitizeGameId(gameId || getGameId());
    if (nextGameId !== DEFAULT_GAME_ID) {
      url.searchParams.set("game", nextGameId);
    }
    Object.keys(extra || {}).forEach(function (key) {
      url.searchParams.set(key, extra[key]);
    });
    return url.pathname.replace(/^\//, "") + url.search;
  }

  function absoluteWithGame(path, gameId, extra, baseUrl) {
    var base = baseUrl || window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/");
    var url = new URL(path, base);
    var nextGameId = sanitizeGameId(gameId || getGameId());
    if (nextGameId !== DEFAULT_GAME_ID) {
      url.searchParams.set("game", nextGameId);
    }
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
      .filter(function (country) { return country.active !== false; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  function allCountries(state) {
    var countries = state && state.countries ? state.countries : {};
    return Object.keys(countries)
      .map(function (id) { return countries[id]; })
      .filter(Boolean)
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  function getCountryPlayerCount(state, countryId) {
    var country = state && state.countries ? state.countries[countryId] : null;
    return clampNumber(country && country.playerCount ? country.playerCount : state.settings.playersPerCountry, 1, 30);
  }

  function totalPlayerCount(state) {
    return countryList(state).reduce(function (total, country) {
      return total + getCountryPlayerCount(state, country.id);
    }, 0);
  }

  function dynamicConfig(state) {
    var countries = countryList(state);
    var playerTotal = totalPlayerCount(state);
    var countryCount = countries.length;
    var roundCount = clampNumber(state.settings && state.settings.roundCount, 1, 9);
    return {
      countryCount: countryCount,
      totalPlayers: playerTotal,
      roundCount: roundCount,
      peaceTarget: Math.max(1, Math.ceil(playerTotal * roundCount * 0.6)),
      baseGroupSize: countryCount ? Math.floor(playerTotal / countryCount) : 0,
      remainder: countryCount ? playerTotal % countryCount : 0,
      publicPoolMultiplier: 1.5,
      minRecommendedCountries: 4
    };
  }

  function applyDynamicSettings(state) {
    state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings || {});
    if (state.settings.autoPeaceTarget !== false) {
      state.settings.peaceTarget = dynamicConfig(state).peaceTarget;
    }
  }

  function getCountry(id) {
    return COUNTRIES.find(function (country) { return country.id === id; }) || null;
  }

  function getActiveRival(state, countryId) {
    var country = state.countries && state.countries[countryId] ? state.countries[countryId] : getCountry(countryId);
    if (!country) return null;
    var activeIds = countryList(state).map(function (item) { return item.id; });
    if (country.rival && activeIds.indexOf(country.rival) >= 0) return country.rival;
    return activeIds.find(function (id) { return id !== countryId; }) || null;
  }

  function shuffle(items) {
    var result = items.slice();
    for (var i = result.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }
    return result;
  }

  function combatRingComplete(state) {
    var activeIds = countryList(state).map(function (country) { return country.id; });
    if (activeIds.length <= 1) return true;
    var everyRivalIsValid = activeIds.every(function (countryId) {
      var rival = state.countries[countryId] && state.countries[countryId].rival;
      return rival && rival !== countryId && activeIds.indexOf(rival) >= 0;
    });
    if (!everyRivalIsValid) return false;
    var seen = {};
    var current = activeIds[0];
    for (var i = 0; i < activeIds.length; i += 1) {
      if (seen[current]) return false;
      seen[current] = true;
      current = state.countries[current].rival;
    }
    return current === activeIds[0] && Object.keys(seen).length === activeIds.length;
  }

  function assignCombatRing(state, randomize) {
    var ids = countryList(state).map(function (country) { return country.id; });
    var ordered = randomize ? shuffle(ids) : ids;
    ordered.forEach(function (countryId, index) {
      if (!state.countries[countryId]) return;
      state.countries[countryId].rival = ordered.length > 1 ? ordered[(index + 1) % ordered.length] : "";
    });
    state.settings.combatRingUpdatedAt = now();
    return ordered;
  }

  function roundName(roundNo) {
    var names = ["黑暗局", "外交局", "峰會局"];
    return names[Math.max(0, Math.min(names.length - 1, Number(roundNo || 1) - 1))];
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
        playerCount: PLAYER_COUNT,
        usedBlock: false,
        leaderActionUsed: false
      });
      return map;
    }, {});
  }

  function defaultState(gameId) {
    var state = {
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
    assignCombatRing(state, false);
    return state;
  }

  function ensureCountries(state) {
    state.countries = state.countries || {};
    COUNTRIES.forEach(function (country, index) {
      state.countries[country.id] = Object.assign(
        {},
        country,
        { order: index, active: true, playerCount: PLAYER_COUNT, usedBlock: false, leaderActionUsed: false },
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
    applyDynamicSettings(base);
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
    applyDynamicSettings(state);
    if (!combatRingComplete(state)) assignCombatRing(state, false);
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
      personVotes: {},
      currentVoter: 1,
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
      publicPool: 0,
      base: 0,
      allianceBonus: 0,
      score: 0,
      blockedBy: [],
      alliedWith: "",
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
    var successfulAlliances = {};

    Object.keys(round.blocks || {}).forEach(function (fromCountryId) {
      var action = round.blocks[fromCountryId];
      if (!action) return;
      action.type = action.type || (action.target ? "block" : "skip");
      action.resolvedAt = now();
      if (action.type === "skip" || !action.target) {
        action.result = "skipped";
        return;
      }
      if (state.countries[fromCountryId]) {
        state.countries[fromCountryId].usedBlock = true;
        state.countries[fromCountryId].leaderActionUsed = true;
      }
      if (action.type === "alliance") return;
      var targetVote = getVote(round, action.target);
      var success = Number(targetVote.private || 0) > 0;
      action.result = success ? "success" : "failed";
      if (success) {
        successfulBlocksByTarget[action.target] = successfulBlocksByTarget[action.target] || [];
        successfulBlocksByTarget[action.target].push(fromCountryId);
      }
    });

    Object.keys(round.blocks || {}).forEach(function (fromCountryId) {
      var action = round.blocks[fromCountryId];
      if (!action || action.type !== "alliance" || !action.target) return;
      var targetAction = round.blocks[action.target];
      var success = Boolean(targetAction && targetAction.type === "alliance" && targetAction.target === fromCountryId);
      action.result = success ? "success" : "failed";
      if (success) successfulAlliances[fromCountryId] = action.target;
    });

    var effectivePublicByCountry = {};
    var globalEffectivePublic = 0;
    countries.forEach(function (country) {
      var vote = getVote(round, country.id);
      var playerCount = getCountryPlayerCount(state, country.id);
      var publicVotes = clampNumber(vote.public || 0, 0, playerCount);
      var effectivePublic = eventId === "public_double" ? publicVotes * 2 : publicVotes;
      effectivePublicByCountry[country.id] = effectivePublic;
      globalEffectivePublic += effectivePublic;
    });

    var publicPool = countries.length ? Math.round((globalEffectivePublic * 1.5 / countries.length) * 10) / 10 : 0;

    var scores = {};
    var highest = 0;
    countries.forEach(function (country) {
      var vote = getVote(round, country.id);
      var playerCount = getCountryPlayerCount(state, country.id);
      var publicVotes = clampNumber(vote.public || 0, 0, playerCount);
      var privateVotes = clampNumber(vote.private || 0, 0, playerCount);
      var effectivePublic = effectivePublicByCountry[country.id] || 0;
      var base = publicPool + privateVotes * settings.privatePoint;

      if (eventId === "private_double") {
        base += privateVotes * settings.privatePoint;
      }

      var blockedBy = successfulBlocksByTarget[country.id] || [];
      var allianceBonus = successfulAlliances[country.id] ? Number(settings.allianceBonus || 0) : 0;
      var score = blockedBy.length ? 0 : base + allianceBonus;
      scores[country.id] = {
        public: publicVotes,
        private: privateVotes,
        effectivePublic: effectivePublic,
        publicPool: publicPool,
        base: base,
        allianceBonus: allianceBonus,
        score: score,
        blockedBy: blockedBy,
        alliedWith: successfulAlliances[country.id] || "",
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
    var threshold = Math.max(1, Math.floor(eligible.length / 2) + 1);
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
      var rivalId = getActiveRival(state, country.id);
      var rivalScore = Number(totals[rivalId] || 0);
      var ownScore = Number(totals[country.id] || 0);
      var bonus = rivalId && ownScore > rivalScore ? Number(state.settings.secretBonus || 0) : 0;
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
    return country ? (country.icon || country.flag || country.id) + " " + country.flag + " " + country.name : countryId;
  }

  function countryIcon(country, extraClass) {
    if (!country) return "";
    return [
      '<span class="country-icon ' + escapeHtml(extraClass || "") + '" style="--country-color:' + escapeHtml(country.color || "#64748b") + '">',
      '<span>' + escapeHtml(country.icon || country.flag || country.id) + '</span>',
      '</span>'
    ].join("");
  }

  function resetState(state) {
    var previousSettings = clone(state.settings || DEFAULT_SETTINGS);
    var previousCountries = clone(state.countries || defaultCountries());
    var next = defaultState(state.meta && state.meta.gameId ? state.meta.gameId : getGameId());
    next.settings = Object.assign({}, DEFAULT_SETTINGS, previousSettings);
    Object.keys(next.countries).forEach(function (countryId) {
      if (previousCountries[countryId]) {
        next.countries[countryId].active = previousCountries[countryId].active !== false;
        next.countries[countryId].playerCount = clampNumber(previousCountries[countryId].playerCount, 1, 30);
        next.countries[countryId].rival = previousCountries[countryId].rival || next.countries[countryId].rival;
      }
      next.countries[countryId].usedBlock = false;
      next.countries[countryId].leaderActionUsed = false;
    });
    applyDynamicSettings(next);
    if (!combatRingComplete(next)) assignCombatRing(next, false);
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
    defaultGameId: DEFAULT_GAME_ID,
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
    getActiveRival: getActiveRival,
    countryList: countryList,
    allCountries: allCountries,
    totalPlayerCount: totalPlayerCount,
    dynamicConfig: dynamicConfig,
    applyDynamicSettings: applyDynamicSettings,
    assignCombatRing: assignCombatRing,
    combatRingComplete: combatRingComplete,
    roundName: roundName,
    countryName: countryName,
    countryIcon: countryIcon,
    getCountryPlayerCount: getCountryPlayerCount,
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
