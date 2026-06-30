(function () {
  "use strict";

  var App = window.LeaderApp;
  var gameId = App.getGameId();
  var storeMode = App.$("#storeMode");
  var countryLinks = App.$("#countryLinks");

  function renderCountries(state) {
    countryLinks.innerHTML = App.countryList(state).map(function (country) {
      return [
        '<a class="country-tile" href="' + App.escapeHtml(App.withGame("country.html", gameId, { id: country.id })) + '">',
        App.countryIcon(country, "large"),
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
