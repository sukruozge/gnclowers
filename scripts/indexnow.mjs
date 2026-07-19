/**
 * Submit every sitemap URL to IndexNow (Bing/Yandex/Seznam pick these up
 * within hours instead of waiting for a recrawl). Google does not support
 * IndexNow — use Search Console for Google.
 *
 * Run AFTER a deploy so the key file is live:  npm run indexnow
 */
const SITE = process.env.SITE_URL || 'https://aseloves.com';
const KEY = 'bd48fc0ba0aa42d6b8dd1c9a159eb24d'; // public/<key>.txt must be deployed

const res = await fetch(`${SITE}/sitemap.xml`);
if (!res.ok) {
  console.error(`sitemap fetch failed: ${res.status}`);
  process.exit(1);
}
const xml = await res.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) {
  console.error('no URLs found in sitemap');
  process.exit(1);
}

const body = {
  host: new URL(SITE).host,
  key: KEY,
  keyLocation: `${SITE}/${KEY}.txt`,
  urlList: urls,
};
const submit = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});
// 200 = accepted, 202 = accepted (key validation pending)
console.log(`submitted ${urls.length} URLs → IndexNow responded ${submit.status}`);
if (![200, 202].includes(submit.status)) {
  console.error(await submit.text());
  process.exit(1);
}
