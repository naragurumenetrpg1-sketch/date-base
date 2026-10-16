// Upstash Redis（Vercel Marketplace で追加）の REST API を呼ぶだけの小さな関数。
// 環境変数 KV_REST_API_URL / KV_REST_API_TOKEN は、Redis を追加すると自動で入る。
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

module.exports.cmd = async (...args) => {
  if (!url || !token) throw new Error('redis_not_configured');
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
};
