(function () {
  "use strict";

  var App = window.LeaderApp;
  var gameId = App.getGameId();
  var input = App.$("#gameIdInput");
  var storeMode = App.$("#storeMode");
  var countryLinks = App.$("#countryLinks");

  input.value = gameId;

  App.$("#saveGameIdButton").addEventListener("click", function () {
    App.setGameId(input.value);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") App.setGameId(input.value);
  });

  function renderCountries(state) {
    countryLinks.innerHTML = App.countryList(state).map(function (country) {
      return [
        '<a class="country-tile" href="' + App.escapeHtml(App.withGame("country.html", gameId, { id: country.id })) + '">',
        '<span class="country-flag">' + country.flag + '</span>',
        '<strong>' + App.escapeHtml(country.name) + '</strong>',
        '<small>' + country.id + '</small>',
        '</a>'
      ].join("");
    }).join("");
  }

  App.bootPage(function (state, context) {
    storeMode.textContent = context.mode === "firebase" ? "Firebase 同步" : "本機 demo";
    storeMode.className = "status-pill " + (context.mode === "firebase" ? "good" : "warn");
    renderCountries(state);
  });
})();
