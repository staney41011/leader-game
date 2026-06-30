(function () {
  "use strict";

  var App = window.LeaderApp;
  var baseInput = App.$("#baseUrlInput");
  var sheet = App.$("#qrSheet");
  var context = null;

  function defaultBase() {
    return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/");
  }

  function qrItem(title, subtitle, url) {
    return [
      '<article class="qr-card">',
      '<div class="qr-box" data-url="' + App.escapeHtml(url) + '"></div>',
      '<div><strong>' + App.escapeHtml(title) + '</strong><span>' + App.escapeHtml(subtitle) + '</span><small>' + App.escapeHtml(url) + '</small></div>',
      '</article>'
    ].join("");
  }

  function render(state) {
    var base = baseInput.value || defaultBase();
    var gameId = context ? context.gameId : App.getGameId();
    var items = [
      qrItem("主持人主控台", "admin", App.absoluteWithGame("admin.html", gameId, {}, base)),
      qrItem("大螢幕", "display", App.absoluteWithGame("display.html", gameId, {}, base)),
      qrItem("連線狀態", "health", App.absoluteWithGame("health.html", gameId, {}, base))
    ];

    App.countryList(state).forEach(function (country) {
      items.push(qrItem(country.flag + " " + country.name, country.id, App.absoluteWithGame("country.html", gameId, { id: country.id }, base)));
    });

    sheet.innerHTML = items.join("");
    renderQrCodes();
  }

  function renderQrCodes() {
    if (!window.QRCode) {
      App.$$(".qr-box").forEach(function (box) {
        box.textContent = "QR library loading";
      });
      return;
    }
    App.$$(".qr-box").forEach(function (box) {
      var url = box.getAttribute("data-url");
      box.innerHTML = "";
      new window.QRCode(box, {
        text: url,
        width: 112,
        height: 112,
        colorDark: "#1f2937",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M
      });
    });
  }

  baseInput.value = defaultBase();
  App.$("#renderQrButton").addEventListener("click", function () {
    if (context && context.state) render(context.state);
  });
  App.$("#printButton").addEventListener("click", function () {
    window.print();
  });

  context = App.bootPage(function (state, ctx) {
    context = ctx;
    render(state);
  });
})();
