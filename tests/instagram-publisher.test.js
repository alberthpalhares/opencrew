// specs/fase-1-hotfix.md F1-10 — the Instagram publisher never runs web text as shell,
// never uploads anything but the crew's own JPEGs, and keeps the token out of URLs.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  parseArgs, readCaption, validateImagePaths, uploadToImgBB,
  createChildContainer, createCarouselContainer, publishMedia, main,
} from '../templates/skills/instagram-publisher/scripts/publish.js';
import { mkTmp } from './_helpers.js';

const realFetch = globalThis.fetch;
const calls = [];
function stubFetch(json = { id: '42', success: true, data: { url: 'https://i.ibb.co/x.jpg' } }) {
  calls.length = 0;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return { ok: true, json: async () => json, text: async () => JSON.stringify(json) };
  };
}
afterEach(() => { globalThis.fetch = realFetch; });

const SKILL = new URL('../templates/skills/instagram-publisher/SKILL.md', import.meta.url);

test('F1-10a: --caption-file is read verbatim, with no shell interpretation', async () => {
  const dir = await mkTmp('ig');
  const nasty = 'Oferta "imperdível" $(rm -rf ~) `whoami` ; && \'aspas\'\nlinha 2 ✨';
  const file = path.join(dir, 'caption.txt');
  await fs.writeFile(file, nasty);
  const args = parseArgs(['node', 'publish.js', '--images', 'a.jpg,b.jpg', '--caption-file', file]);
  assert.equal(args.captionFile, file);
  assert.equal(await readCaption(args), nasty);
});

test('F1-10b: only .jpg/.jpeg inside crews/*/output/ may be uploaded', () => {
  const cwd = path.resolve('/proj');
  assert.doesNotThrow(() => validateImagePaths(['crews/acme/output/run-1/v1/slide-01.jpg', 'crews/acme/output/run-1/v1/slide-02.JPEG'], cwd));
  for (const bad of ['.env', 'crews/acme/output/slide.png', '../secrets/x.jpg', 'crews/acme/x.jpg', '/etc/passwd.jpg', 'crews/../.env.jpg']) {
    assert.throws(() => validateImagePaths([bad], cwd), /Refusing to upload/, `should refuse ${bad}`);
  }
});

test('F1-10b: main refuses a bad path before any network call', async () => {
  stubFetch();
  const env = { INSTAGRAM_ACCESS_TOKEN: 't', INSTAGRAM_USER_ID: 'u', IMGBB_API_KEY: 'k' };
  const argv = ['node', 'publish.js', '--images', '.env,crews/a/output/x.jpg', '--caption', 'hi'];
  await assert.rejects(main(argv, { env, cwd: path.resolve('/proj') }), /Refusing to upload/);
  assert.equal(calls.length, 0);
});

test('F1-10c: imgBB uploads expire', async () => {
  const dir = await mkTmp('ig');
  const img = path.join(dir, 'slide.jpg');
  await fs.writeFile(img, Buffer.from([0xff, 0xd8, 0xff]));
  stubFetch();
  await uploadToImgBB(img, 'KEY');
  const body = calls[0].init.body;
  assert.ok(body.get('expiration'), 'expiration must be sent');
  assert.ok(Number(body.get('expiration')) > 0);
});

test('F1-10d: Graph API POSTs never put the access token in the URL', async () => {
  stubFetch();
  await createChildContainer('UID', 'https://i.ibb.co/x.jpg', 'SECRET_TOKEN');
  await createCarouselContainer('UID', ['1', '2'], 'caption', 'SECRET_TOKEN');
  await publishMedia('UID', '99', 'SECRET_TOKEN');
  assert.equal(calls.length, 3);
  for (const { url, init } of calls) {
    assert.equal(init.method, 'POST');
    assert.doesNotMatch(url, /SECRET_TOKEN/);
    assert.equal(new URLSearchParams(init.body).get('access_token'), 'SECRET_TOKEN');
  }
});

test('F1-10e: SKILL.md uses --caption-file and requires preview → dry-run → explicit confirmation', async () => {
  const md = await fs.readFile(SKILL, 'utf8');
  const invoke = md.match(/^\s*invoke: (.*)$/m)[1];
  assert.match(invoke, /--caption-file/);
  assert.doesNotMatch(md, /--caption "/, 'no caption interpolated into a shell command');
  const workflow = md.slice(md.indexOf('### Workflow'), md.indexOf('### Constraints'));
  const preview = workflow.search(/preview/i);
  const dry = workflow.indexOf('--dry-run');
  const confirm = workflow.search(/explicit confirmation/i);
  const live = workflow.search(/live publish/i);
  assert.ok(preview > -1 && dry > preview && confirm > dry && live > confirm,
    'order must be preview → --dry-run → explicit confirmation → live publish');
});
