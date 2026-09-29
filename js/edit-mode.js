/*
 * Live text editor. Does nothing unless the URL has ?edit in it, so it has
 * zero effect on normal visitors (a few KB of unexecuted JS).
 *
 * How it works: elements are matched to their source file by a structural
 * path (child index chain from #main), not by their text, so edits survive
 * even if the same text appears twice on a page. Saving sends {path, edits}
 * to /api/save-content, which fetches the current file from GitHub, replaces
 * only the targeted elements' inner text (byte-precise, nothing else in the
 * file is touched), and commits straight to main. Vercel then rebuilds.
 *
 * Only plain text is editable (elements with no nested tags), and only
 * within <main> -- shared header/nav/footer chrome is duplicated across
 * every page's own HTML file, so editing it here would only change the one
 * page you're on, not the rest of the site.
 */
(function () {
  "use strict";
  if (!/[?&]edit(=|&|$)/.test(location.search)) return;

  var EDITABLE_TAGS = ["H1", "H2", "H3", "H4", "H5", "P", "LI", "SPAN", "A", "BLOCKQUOTE", "BUTTON", "TD", "TH", "LABEL", "FIGCAPTION"];
  var EXCLUDE_CLOSEST = "[data-buy-box], .qty-stepper, .cart-badge, #year, .form-status, .summary, .cart-toast, .newsletter-form";
  var STORAGE_KEY = "vsc_edit_password";

  var pageRelPath = location.pathname.replace(/^\//, "");
  if (pageRelPath === "") pageRelPath = "index.html";

  var mainEl, dirty = {}, pathCache = new Map(), barEl;

  function getPath(el) {
    if (pathCache.has(el)) return pathCache.get(el);
    var path = [];
    var node = el;
    while (node && node !== mainEl) {
      var parent = node.parentElement;
      if (!parent) return null;
      path.unshift(Array.prototype.indexOf.call(parent.children, node));
      node = parent;
    }
    pathCache.set(el, path);
    return path;
  }

  function isEligible(el) {
    if (el.children.length !== 0) return false;
    if (!el.textContent || !el.textContent.trim()) return false;
    if (EDITABLE_TAGS.indexOf(el.tagName) === -1) return false;
    if (el.closest(EXCLUDE_CLOSEST)) return false;
    if (el.hasAttribute("data-price")) return false;
    return true;
  }

  function injectStyles() {
    var style = document.createElement("style");
    style.textContent =
      ".vsc-edit-target{outline:1px dashed rgba(168,90,52,.5);outline-offset:2px;cursor:text}" +
      ".vsc-edit-target:hover{outline:1px dashed rgba(168,90,52,.9);background:rgba(168,90,52,.06)}" +
      ".vsc-edit-target:focus{outline:2px solid #a85a34;background:rgba(168,90,52,.1)}" +
      ".vsc-edit-dirty{background:rgba(90,150,60,.14) !important;outline-color:#5a963c !important}" +
      "#vsc-edit-bar{position:fixed;left:0;right:0;bottom:0;z-index:5000;background:#2d3624;color:#f1e3c9;padding:14px 20px;display:none;align-items:center;justify-content:space-between;gap:16px;font-family:sans-serif;font-size:14px;box-shadow:0 -10px 30px rgba(0,0,0,.35)}" +
      "#vsc-edit-bar button{font-family:inherit;font-size:13px;padding:10px 18px;border-radius:999px;border:1px solid transparent;cursor:pointer}" +
      "#vsc-edit-save{background:#a85a34;color:#f1e3c9}" +
      "#vsc-edit-save:disabled{opacity:.6;cursor:default}" +
      "#vsc-edit-discard{background:transparent;color:#f1e3c9;border-color:rgba(241,227,201,.4)}" +
      "#vsc-edit-lock-overlay{position:fixed;inset:0;z-index:6000;background:rgba(27,23,18,.75);display:flex;align-items:center;justify-content:center}" +
      "#vsc-edit-lock-box{background:#f5ede1;color:#3d2718;padding:32px;border-radius:8px;width:320px;max-width:90vw;font-family:sans-serif}" +
      "#vsc-edit-lock-box h3{margin:0 0 14px}" +
      "#vsc-edit-lock-box input{width:100%;padding:10px 12px;margin-bottom:12px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;font-size:14px}" +
      "#vsc-edit-lock-box button{width:100%;padding:12px;background:#a85a34;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px}" +
      "#vsc-edit-lock-error{color:#a32020;font-size:13px;margin-bottom:10px;min-height:16px}" +
      "#vsc-edit-badge{position:fixed;top:70px;right:14px;z-index:4999;background:#a85a34;color:#f1e3c9;font-family:sans-serif;font-size:11px;letter-spacing:.06em;text-transform:uppercase;padding:6px 12px;border-radius:999px;pointer-events:none}";
    document.head.appendChild(style);
  }

  function showLockScreen(cb) {
    var overlay = document.createElement("div");
    overlay.id = "vsc-edit-lock-overlay";
    overlay.innerHTML =
      '<div id="vsc-edit-lock-box">' +
      "<h3>Edit Mode</h3>" +
      '<div id="vsc-edit-lock-error"></div>' +
      '<input type="password" id="vsc-edit-lock-input" placeholder="Password" autocomplete="current-password" />' +
      '<button id="vsc-edit-lock-btn" type="button">Unlock</button>' +
      "</div>";
    document.body.appendChild(overlay);
    var input = overlay.querySelector("#vsc-edit-lock-input");
    var errorEl = overlay.querySelector("#vsc-edit-lock-error");
    var btn = overlay.querySelector("#vsc-edit-lock-btn");

    function attempt() {
      var pw = input.value;
      if (!pw) return;
      btn.disabled = true;
      btn.textContent = "Checking...";
      fetch("/api/edit-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) {
            sessionStorage.setItem(STORAGE_KEY, pw);
            overlay.remove();
            cb();
          } else {
            errorEl.textContent = "Incorrect password.";
            btn.disabled = false;
            btn.textContent = "Unlock";
          }
        })
        .catch(function () {
          errorEl.textContent = "Couldn't reach the server. Try again.";
          btn.disabled = false;
          btn.textContent = "Unlock";
        });
    }
    btn.addEventListener("click", attempt);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") attempt();
    });
    setTimeout(function () { input.focus(); }, 50);
  }

  function updateBar() {
    var count = Object.keys(dirty).length;
    if (!barEl) return;
    barEl.style.display = count === 0 ? "none" : "flex";
    if (count) barEl.querySelector("#vsc-edit-count").textContent = "— " + count + (count === 1 ? " change" : " changes");
  }

  function buildBar() {
    barEl = document.createElement("div");
    barEl.id = "vsc-edit-bar";
    barEl.innerHTML =
      '<span>Edit mode: click any dashed text to change it <span id="vsc-edit-count"></span></span>' +
      '<span><button id="vsc-edit-discard" type="button">Discard</button> ' +
      '<button id="vsc-edit-save" type="button">Save &amp; Publish</button></span>';
    document.body.appendChild(barEl);
    barEl.querySelector("#vsc-edit-discard").addEventListener("click", function () {
      if (Object.keys(dirty).length && !confirm("Discard unsaved changes?")) return;
      location.reload();
    });
    barEl.querySelector("#vsc-edit-save").addEventListener("click", save);

    var badge = document.createElement("div");
    badge.id = "vsc-edit-badge";
    badge.textContent = "Edit mode — " + pageRelPath;
    document.body.appendChild(badge);
  }

  function markEditable() {
    mainEl = document.querySelector("#main");
    if (!mainEl) return;
    var all = mainEl.querySelectorAll(EDITABLE_TAGS.join(","));
    all.forEach(function (el) {
      if (!isEligible(el)) return;
      el.classList.add("vsc-edit-target");
      el.setAttribute("contenteditable", "true");
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") e.preventDefault();
      });
      el.addEventListener("paste", function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData("text/plain");
        document.execCommand("insertText", false, text);
      });
      el.addEventListener("input", function () {
        if (el.children.length > 0) el.textContent = el.textContent;
        var path = getPath(el);
        if (!path) return;
        dirty[path.join(".")] = { path: path, text: el.textContent };
        el.classList.add("vsc-edit-dirty");
        updateBar();
      });
    });
  }

  function save() {
    var edits = Object.keys(dirty).map(function (k) { return dirty[k]; });
    if (!edits.length) return;
    var pw = sessionStorage.getItem(STORAGE_KEY);
    var saveBtn = document.getElementById("vsc-edit-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    fetch("/api/save-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw, path: pageRelPath, edits: edits }),
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (res.ok && res.data.ok) {
          saveBtn.textContent = "Saved!";
          dirty = {};
          updateBar();
          setTimeout(function () {
            alert("Published to GitHub. The live site will update in about a minute while it rebuilds.");
            saveBtn.disabled = false;
            saveBtn.textContent = "Save & Publish";
          }, 300);
        } else {
          alert("Save failed: " + (res.data && res.data.error ? res.data.error : "unknown error"));
          saveBtn.disabled = false;
          saveBtn.textContent = "Save & Publish";
        }
      })
      .catch(function () {
        alert("Save failed: couldn't reach the server.");
        saveBtn.disabled = false;
        saveBtn.textContent = "Save & Publish";
      });
  }

  function init() {
    injectStyles();
    buildBar();
    markEditable();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var savedPw = sessionStorage.getItem(STORAGE_KEY);
    if (!savedPw) {
      showLockScreen(init);
      return;
    }
    fetch("/api/edit-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: savedPw }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) init();
        else { sessionStorage.removeItem(STORAGE_KEY); showLockScreen(init); }
      })
      .catch(function () { showLockScreen(init); });
  });
})();
