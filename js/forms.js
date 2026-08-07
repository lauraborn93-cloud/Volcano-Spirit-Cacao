(function () {
  "use strict";

  function wireAjaxForm(form) {
    form.addEventListener("submit", function (e) {
      var action = form.getAttribute("action") || "";
      var status = form.querySelector(".form-status");

      if (action.indexOf("YOUR_") !== -1) {
        e.preventDefault();
        if (status) {
          status.textContent = "This form isn't connected to an email service yet. See the README for a 2-minute Formspree setup.";
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
              status.textContent = form.getAttribute("data-success-message") || "Thank you, you're on the list.";
              status.className = "form-status show ok";
            }
            form.dispatchEvent(new CustomEvent("vsc:form-success"));
          } else {
            throw new Error("submit failed");
          }
        })
        .catch(function () {
          if (status) {
            status.textContent = "Something went wrong, please try again, or email us directly at " + (window.VSC ? VSC.contactEmail : "our team") + ".";
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
