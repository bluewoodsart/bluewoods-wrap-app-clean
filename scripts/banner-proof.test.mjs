import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({entryPoints: ['src/lib/bannerProof.ts'], bundle: true, platform: 'node', format: 'esm', write: false});
const { resolveBannerProof, createBannerProofSvg } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const input = { bannerText: '', aiDesignPrompt: '', brandColors: '', width: '10', height: '2' };
test('reported prompt extracts copy and respects explicit colors/font', () => {
  const details = {...input, aiDesignPrompt: 'Now open red letters , white background in impact font ,'};
  const result = resolveBannerProof(details);
  assert.equal(result.text, 'Now open');
  assert.equal(result.textColor, '#dc2626');
  assert.equal(result.backgroundColor, '#ffffff');
  assert.match(result.fontFamily, /^Impact,/);
  const svg = createBannerProofSvg(details);
  assert.doesNotMatch(svg, /red letters|white background|PROOF DRAFT|Business Name|Placement photos/);
});
test('exact banner copy wins and remains complete', () => {
  const text = 'Now Open! Monday–Friday. Call 4705046622';
  const svg = createBannerProofSvg({...input, bannerText: text, aiDesignPrompt: 'Other instructions red letters'});
  assert.match(svg, /Monday–Friday/); assert.equal((svg.match(/4705046622/g) || []).length, 1);
});
test('arbitrary design instructions never become copy', () => {
  assert.throws(() => resolveBannerProof({...input, aiDesignPrompt: 'Use red text and a white background with professional styling'}), /exact words/);
});
test('quoted copy can be inferred but explicit text is never changed', () => {
  assert.equal(resolveBannerProof({...input, aiDesignPrompt: 'Say “Hello Fayetteville!” in blue text'}).text, 'Hello Fayetteville!');
  assert.equal(resolveBannerProof({...input, bannerText:'Grand Opening! Everything 50% off.'}).text, 'Grand Opening! Everything 50% off.');
});
test('preserve 1x10 and portrait ratios without minimum height clamp', () => {
  assert.match(createBannerProofSvg({...input,bannerText:'Open',width:'10',height:'1'}), /viewBox="0 0 1600 160"/);
  assert.match(createBannerProofSvg({...input,bannerText:'Open',width:'1',height:'2'}), /viewBox="0 0 1600 3200"/);
});
test('escape markup and validate dimensions', () => {
  assert.match(createBannerProofSvg({...input,bannerText:'<script>&"'}), /&lt;script&gt;&amp;&quot;/);
  for (const width of ['0','-1','Infinity','abc','2 feet']) assert.throws(() => resolveBannerProof({...input,bannerText:'Open',width}), /valid banner/);
});
test('supports alternate role syntax and safe defaults', () => {
  const result = resolveBannerProof({...input,bannerText:'Open',aiDesignPrompt:'background: black, text in white, Georgia font'});
  assert.equal(result.backgroundColor, '#000000'); assert.equal(result.textColor, '#ffffff'); assert.equal(result.fontFamily, 'Georgia, serif');
});
