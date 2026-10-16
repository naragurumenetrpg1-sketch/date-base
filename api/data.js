// 画面のデータ（タスク・収益記録など）の読み書き。ログイン済みの人だけ。
// 保存できるのは、下の5つの名前だけ。
const { cmd } = require('./_redis');
const auth = require('./_auth');

const KEYS = new Set([
  'tsugumo.tasks.v2', 'tsugumo.memo.v2', 'tsugumo.events.v2', 'tsugumo.ledger.v2', 'tsugumo.goals.v1',
]);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!auth.ok(req)) return res.status(401).json({ error: 'auth' });
  try {
    if (req.method === 'GET') {
      const k = req.query && req.query.k;
      if (!KEYS.has(k)) return res.status(400).json({ error: 'key' });
      const r = await cmd('GET', 'data:' + k);
      return res.status(200).json(r ? { exists: true, data: JSON.parse(r) } : { exists: false });
    }
    if (req.method === 'PUT') {
      const { k, d } = req.body || {};
      if (!KEYS.has(k) || !d || typeof d.v !== 'string') return res.status(400).json({ error: 'bad' });
      if (d.v.length > 900000) return res.status(413).json({ error: 'big' });
      await cmd('SET', 'data:' + k, JSON.stringify({ v: d.v, t: +d.t || Date.now() }));
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method' });
  } catch (e) {
    return res.status(500).json({ error: 'store' });
  }
};
