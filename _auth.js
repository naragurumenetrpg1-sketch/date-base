// ログイン済みの印（Cookie）を作る・確かめる。
// 署名には SESSION_SECRET と APP_PIN を使う。APP_PIN を変えると、これまでの印はすべて無効になる。
const crypto = require('crypto');

const DAYS = 30;
const key = () =>
  crypto.createHash('sha256').update((process.env.SESSION_SECRET || '') + '|' + (process.env.APP_PIN || '')).digest();
const sign = (exp) => crypto.createHmac('sha256', key()).update(String(exp)).digest('hex');
const configured = () => !!(process.env.SESSION_SECRET && process.env.APP_PIN);

module.exports.configured = configured;
module.exports.maxAge = DAYS * 86400;

module.exports.make = () => {
  const exp = Date.now() + DAYS * 86400000;
  return exp + '.' + sign(exp);
};

module.exports.ok = (req) => {
  if (!configured()) return false;
  const m = /(?:^|;\s*)tsugumo_session=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || !(+exp > Date.now())) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
