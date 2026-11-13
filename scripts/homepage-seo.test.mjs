import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

const home = await readFile(new URL('../dist/home.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

test('homepage has rendered real content and service links before JavaScript', () => {
  assert.match(home, /<h1[^>]*>Vehicle wraps/);
  assert.match(home, /Fayetteville, Georgia/);
  assert.match(home, /Real vehicles\. Real business graphics/);
  for (const slug of ['vehicle-wraps', 'custom-banners', 'vehicle-magnets', 'stickers-decals', 'business-signs', 'window-graphics']) {
    assert.ok(home.includes(`href="/services/${slug}"`));
  }
  assert.match(home, /href="\/wraps"/);
  assert.match(home, /href="\/wraps\/full"/);
});

test('homepage has one canonical and matching organization schema', () => {
  assert.equal((home.match(/rel="canonical"/g) || []).length, 1);
  assert.match(home, /rel="canonical" href="https:\/\/www\.slapwrapz\.com\/"/);
  const json = home.match(/<script id="slapwrapz-organization" type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
  assert.equal(JSON.parse(json).url, 'https://www.slapwrapz.com');
  assert.doesNotMatch(home, /noindex/);
});

test('app assets are retained and private/unknown routes use unchanged SPA shell', () => {
  for (const asset of app.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) assert.ok(home.includes(asset[1]));
  assert.match(home, /type="module"/);
  assert.match(app, /<div id="root"><\/div>/);
  assert.doesNotMatch(app, /rel="canonical"|<h1/);
  assert.deepEqual(config.rewrites[0], {source:'/', destination:'/home.html'});
  assert.equal(config.rewrites.at(-1).destination, '/index.html');
  assert.equal(config.rewrites.filter(r => r.destination === '/home.html').length, 1);
  assert.ok(!config.rewrites.some(r => r.source === '/banner'));
});
