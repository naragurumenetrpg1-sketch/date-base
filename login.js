// パスコードの確認。5回間違えたら、全体でロック（15分 → 1時間 → 24時間と長くなる）。
// 間違えた回数は Redis の INCR（1つずつ確実に数える命令）で数えるので、同時に大量に試されても5回までしか確認しない。
const crypto = require('crypto');
const { cmd } = require('./_redis');
const auth = require('./_auth');

const MAX = 5;
const LOCK_SEC = [900, 3600, 86400];
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!auth.configured()) return res.status(500).json({ error: 'not_configured' });
  try {
    const ttl = await cmd('PTTL', 'login:lock');
    if (ttl > 0) return res.status(429).json({ error: 'locked', wait: Math.ceil(ttl / 60000) });

    const n = await cmd('INCR', 'login:cnt');
    await cmd('EXPIRE', 'login:cnt', 900);
    if (n > MAX) return res.status(429).json({ error: 'locked', wait: 15 });

    const pin = String((req.body && req.body.pin) || '').slice(0, 64);
    if (crypto.timingSafeEqual(sha(pin), sha(process.env.APP_PIN))) {
      await cmd('DEL', 'login:cnt');
      await cmd('DEL', 'login:lvl');
      res.setHeader('Set-Cookie', `tsugumo_session=${auth.make()}; Max-Age=${auth.maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`);
      return res.status(200).json({ ok: true });
    }
    if (n >= MAX) {
      const lvl = await cmd('INCR', 'login:lvl');
      await cmd('EXPIRE', 'login:lvl', 604800);
      const sec = LOCK_SEC[Math.min(lvl - 1, LOCK_SEC.length - 1)];
      await cmd('SET', 'login:lock', '1', 'EX', sec);
      await cmd('DEL', 'login:cnt');
      return res.status(429).json({ error: 'locked', wait: Math.ceil(sec / 60) });
    }
    return res.status(401).json({ error: 'bad', left: MAX - n });
  } catch (e) {
    return res.status(500).json({ error: 'store' });
  }
};
