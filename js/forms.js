(function () {
  "use strict";

  function pageLang() {
    return (document.documentElement.lang || "").toLowerCase().indexOf("de") === 0 ? "de" : "en";
  }

  function wireAjaxForm(form) {
    form.addEventListener("submit", function (e) {
      var action = form.getAttribute("action") || "";
      var status = form.querySelector(".form-status");

      if (action.indexOf("YOUR_") !== -1) {
        e.preventDefault();
        if (status) {
          status.textContent = pageLang() === "de"
            ? "Dieses Formular ist noch nicht mit einem E-Mail-Dienst verbunden. Siehe README für die 2-Minuten-Formspree-Einrichtung."
            : "This form isn't connected to an email service yet. See the README for a 2-minute Formspree setup.";
          status.className = "form-status show err";
        }
        return;
      }

      e.preventDefault();
      var data = new FormData(form);
      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(action, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            if (status) {
              status.textContent = form.getAttribute("data-success-message") ||
                (pageLang() === "de" ? "Danke, du bist jetzt auf der Liste." : "Thank you, you're on the list.");
              status.className = "form-status show ok";
            }
            form.dispatchEvent(new CustomEvent("vsc:form-success"));
          } else {
            throw new Error("submit failed");
          }
        })
        .catch(function () {
          if (status) {
            var team = window.VSC ? VSC.contactEmail : (pageLang() === "de" ? "unser Team" : "our team");
            status.textContent = pageLang() === "de"
              ? "Etwas ist schiefgelaufen. Bitte versuche es erneut oder schreibe uns direkt an " + team + "."
              : "Something went wrong, please try again, or email us directly at " + team + ".";
            status.className = "form-status show err";
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form[data-ajax]").forEach(wireAjaxForm);
  });
})();
