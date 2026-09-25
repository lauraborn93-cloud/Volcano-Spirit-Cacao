const crypto = require("crypto");

function safeEqual(a, b) {
  var bufA = Buffer.from(String(a));
  var bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  var expected = process.env.EDIT_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: "Server not configured (missing EDIT_PASSWORD)" });
    return;
  }
  var password = req.body && req.body.password;
  var ok = typeof password === "string" && password.length > 0 && safeEqual(password, expected);
  res.status(200).json({ ok: ok });
};
