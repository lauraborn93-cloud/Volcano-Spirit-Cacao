const crypto = require("crypto");
const { parse } = require("node-html-parser");

const OWNER = "lauraborn93-cloud";
const REPO = "Volcano-Spirit-Cacao";
const BRANCH = "main";

// Only these files can ever be written to -- prevents the editor from being
// used to touch anything outside the known set of site pages.
const ALLOWED_FILES = new Set([
  "index.html", "about.html", "spirit-of-cacao.html", "shop.html", "recipes.html",
  "blog.html", "blog-what-is-artificial-chocolate.html", "blog-what-is-ceremonial-cacao.html",
  "contact.html", "cart.html", "checkout.html", "order-received.html",
  "legal/terms.html", "legal/privacy-policy.html", "legal/cookie-policy.html", "legal/shipping-returns.html",
]);

function safeEqual(a, b) {
  var bufA = Buffer.from(String(a));
  var bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Walks the same child-index path the client computed (relative to #main)
// so both sides agree on which element is being edited, independent of
// text content -- this is what lets two identical strings on a page be
// edited independently and precisely.
function resolvePath(node, path) {
  for (var i = 0; i < path.length; i++) {
    var kids = node.childNodes.filter(function (n) { return !!n.tagName; });
    node = kids[path[i]];
    if (!node) return null;
  }
  return node;
}

// Replaces only the exact character range of each target element's inner
// text in the ORIGINAL file string (via node-html-parser's per-node source
// `range`), rather than re-serializing the whole document. Re-serializing
// the full tree would silently rewrite unrelated formatting throughout the
// file (e.g. node-html-parser drops the trailing "/" on self-closing void
// tags like <img />), turning a one-line edit into a huge, noisy diff.
function applyEdits(fileContent, edits) {
  var root = parse(fileContent, { comment: true });
  var mainEl = root.querySelector("#main");
  if (!mainEl) throw new Error("Could not find #main in the page source");

  var replacements = [];
  edits.forEach(function (edit) {
    if (!Array.isArray(edit.path) || typeof edit.text !== "string") return;
    var target = resolvePath(mainEl, edit.path);
    if (!target || !target.range) return;
    var start = target.range[0];
    var end = target.range[1];
    var origSlice = fileContent.slice(start, end);
    var openEnd = origSlice.indexOf(">") + 1;
    var closeStart = origSlice.lastIndexOf("<");
    if (openEnd <= 0 || closeStart <= openEnd) return;
    var openTag = origSlice.slice(0, openEnd);
    var closeTag = origSlice.slice(closeStart);
    var cleanText = edit.text.replace(/\s+/g, " ").trim();
    replacements.push({ start: start, end: end, newSlice: openTag + escapeHtml(cleanText) + closeTag });
  });

  // Apply back-to-front so earlier offsets in the string stay valid as
  // later-in-string replacements change the string's length.
  replacements.sort(function (a, b) { return b.start - a.start; });
  var out = fileContent;
  replacements.forEach(function (r) {
    out = out.slice(0, r.start) + r.newSlice + out.slice(r.end);
  });
  return { out: out, applied: replacements.length };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  var expected = process.env.EDIT_PASSWORD;
  var token = process.env.GITHUB_TOKEN;
  if (!expected || !token) {
    res.status(500).json({ error: "Server not configured (missing EDIT_PASSWORD or GITHUB_TOKEN)" });
    return;
  }

  var body = req.body || {};
  var password = body.password;
  var path = body.path;
  var edits = body.edits;

  if (typeof password !== "string" || !safeEqual(password, expected)) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  if (typeof path !== "string" || !ALLOWED_FILES.has(path)) {
    res.status(400).json({ error: "Invalid or disallowed file path" });
    return;
  }
  if (!Array.isArray(edits) || edits.length === 0) {
    res.status(400).json({ error: "No edits provided" });
    return;
  }

  var ghHeaders = {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "User-Agent": "volcano-spirit-cacao-editor",
  };
  var apiPath = path.split("/").map(encodeURIComponent).join("/");

  try {
    var getResp = await fetch(
      "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + apiPath + "?ref=" + BRANCH,
      { headers: ghHeaders }
    );
    if (!getResp.ok) {
      res.status(502).json({ error: "Failed to fetch current file from GitHub (" + getResp.status + ")" });
      return;
    }
    var fileData = await getResp.json();
    var currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");

    var result = applyEdits(currentContent, edits);
    if (result.applied === 0) {
      res.status(400).json({ error: "None of the submitted edits matched an element on the page (it may have changed since you loaded it -- reload and try again)" });
      return;
    }

    var putResp = await fetch(
      "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + apiPath,
      {
        method: "PUT",
        headers: Object.assign({ "Content-Type": "application/json" }, ghHeaders),
        body: JSON.stringify({
          message: "Edit " + path + " via live editor",
          content: Buffer.from(result.out, "utf-8").toString("base64"),
          sha: fileData.sha,
          branch: BRANCH,
        }),
      }
    );
    if (!putResp.ok) {
      var errText = await putResp.text();
      res.status(502).json({ error: "Failed to commit change to GitHub", details: errText });
      return;
    }
    var putData = await putResp.json();
    res.status(200).json({
      ok: true,
      applied: result.applied,
      commitUrl: putData.commit && putData.commit.html_url,
    });
  } catch (err) {
    res.status(500).json({ error: "Unexpected server error", details: String((err && err.message) || err) });
  }
};
