// ログイン済みかどうかを返すだけ。
const auth = require('./_auth');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(auth.ok(req) ? 200 : 401).json({ ok: auth.ok(req) });
};
