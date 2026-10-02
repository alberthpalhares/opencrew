#!/usr/bin/env node
// Instagram Carousel Publisher
// Usage: node --env-file=.env publish.js --images "a.jpg,b.jpg" --caption-file caption.txt [--dry-run]
//
// Safety rules (specs/fase-1-hotfix.md F1-10):
// - the caption comes from a FILE, never from a shell-interpolated argument;
// - only .jpg/.jpeg files inside crews/*/output/ can be uploaded (public hosting);
// - imgBB uploads expire; the Graph API token goes in POST bodies, not URLs.

import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const IMGBB_EXPIRATION_SECONDS = 86_400; // Instagram fetches the images right away; 1 day is plenty.

// ── Argument parsing ──────────────────────────────────────────

export function parseArgs(argv) {
  const args = { images: [], caption: '', captionFile: '', dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--images') {
      if (i + 1 < argv.length) args.images = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    }
    else if (argv[i] === '--caption-file') {
      if (i + 1 < argv.length) args.captionFile = argv[++i];
    }
    else if (argv[i] === '--caption') {
      // Legacy: prefer --caption-file (a caption in a shell command can execute code).
      if (i + 1 < argv.length) args.caption = argv[++i];
    }
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

export async function readCaption(args) {
  return args.captionFile ? readFile(args.captionFile, 'utf8') : args.caption;
}

/** Throws unless every path is a .jpg/.jpeg inside <cwd>/crews/<crew>/output/. */
export function validateImagePaths(images, cwd = process.cwd()) {
  const crewsDir = resolve(cwd, 'crews');
  for (const img of images) {
    const rel = relative(crewsDir, resolve(cwd, img));
    const parts = rel.split(sep);
    const inside = rel && !rel.startsWith('..') && !isAbsolute(rel) && parts.length >= 3 && parts[1] === 'output';
    const jpeg = ['.jpg', '.jpeg'].includes(extname(img).toLowerCase());
    if (!inside || !jpeg) {
      throw new Error(`Refusing to upload ${img}: only .jpg/.jpeg files inside crews/*/output/ are allowed.`);
    }
  }
}

// ── Image upload (imgBB) ──────────────────────────────────────

export async function uploadToImgBB(imagePath, apiKey) {
  const base64Image = readFileSync(resolve(imagePath)).toString('base64');
  const form = new FormData();
  form.append('key', apiKey);
  form.append('image', base64Image);
  form.append('expiration', String(IMGBB_EXPIRATION_SECONDS));
  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`imgBB upload failed [${res.status}]: ${await res.text()}`);
  const json = await res.json();
  if (!json.success) throw new Error(`imgBB upload failed: ${JSON.stringify(json)}`);
  return json.data.url;
}

// ── Instagram Graph API ───────────────────────────────────────

const IG_BASE = 'https://graph.facebook.com/v21.0';

// POST with form-encoded body: keeps the access token out of URLs (and out of server/proxy logs).
async function igPost(path, params, label) {
  const res = await fetch(`${IG_BASE}/${path}`, { method: 'POST', body: new URLSearchParams(params) });
  if (!res.ok) throw new Error(`${label} failed [${res.status}]: ${await res.text()}`);
  return (await res.json()).id;
}

export async function createChildContainer(userId, imageUrl, accessToken) {
  return igPost(`${userId}/media`, {
    image_url: imageUrl,
    is_carousel_item: 'true',
    access_token: accessToken,
  }, 'createChildContainer');
}

export async function getContainerStatus(containerId, accessToken) {
  const params = new URLSearchParams({ fields: 'status_code', access_token: accessToken });
  const res = await fetch(`${IG_BASE}/${containerId}?${params}`);
  if (!res.ok) throw new Error(`getContainerStatus failed [${res.status}]: ${await res.text()}`);
  return (await res.json()).status_code;
}

export async function pollUntilFinished(containerId, accessToken, timeoutMs = 60_000, intervalMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await getContainerStatus(containerId, accessToken);
    if (status === 'FINISHED') return;
    if (status === 'ERROR') throw new Error(`Container ${containerId} entered ERROR state`);
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Container ${containerId} timed out after ${timeoutMs}ms`);
}

export async function createCarouselContainer(userId, childIds, caption, accessToken) {
  return igPost(`${userId}/media`, {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
    access_token: accessToken,
  }, 'createCarouselContainer');
}

export async function publishMedia(userId, containerId, accessToken) {
  return igPost(`${userId}/media_publish`, { creation_id: containerId, access_token: accessToken }, 'publishMedia');
}

export async function getPermalink(mediaId, accessToken) {
  const params = new URLSearchParams({ fields: 'permalink', access_token: accessToken });
  const res = await fetch(`${IG_BASE}/${mediaId}?${params}`);
  if (!res.ok) return null; // non-fatal — just skip the URL display
  const json = await res.json();
  return json.permalink ?? null;
}

// ── Main ──────────────────────────────────────────────────────

export async function main(argv = process.argv, { env = process.env, cwd = process.cwd() } = {}) {
  const args = parseArgs(argv);
  const { images, dryRun } = args;

  if (!images.length) throw new Error('--images is required (e.g. --images "slide1.jpg,slide2.jpg")');
  if (images.length < 2 || images.length > 10) {
    throw new Error(`Instagram carousels require 2–10 images (got ${images.length})`);
  }
  validateImagePaths(images, cwd);

  const caption = await readCaption(args);
  if (!caption) throw new Error('--caption-file is required');
  if (caption.length > 2200) {
    throw new Error(`Caption exceeds Instagram's 2200-character limit (got ${caption.length})`);
  }

  const { INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID, IMGBB_API_KEY } = env;
  if (!INSTAGRAM_ACCESS_TOKEN) throw new Error('INSTAGRAM_ACCESS_TOKEN is not set in environment');
  if (!INSTAGRAM_USER_ID) throw new Error('INSTAGRAM_USER_ID is not set in environment');
  if (!IMGBB_API_KEY) throw new Error('IMGBB_API_KEY is not set in environment. Get one at https://api.imgbb.com/');

  console.log(`📸 Uploading ${images.length} image(s) to imgBB (expire in 24h)...`);
  const imageUrls = await Promise.all(images.map(p => uploadToImgBB(resolve(cwd, p), IMGBB_API_KEY)));
  imageUrls.forEach((url, i) => console.log(`   [${i + 1}] ${url}`));

  console.log('\n📦 Creating Instagram media containers...');
  const childIds = await Promise.all(
    imageUrls.map(url => createChildContainer(INSTAGRAM_USER_ID, url, INSTAGRAM_ACCESS_TOKEN))
  );
  console.log(`   Container IDs: ${childIds.join(', ')}`);

  console.log('\n⏳ Waiting for containers to finish processing...');
  await Promise.all(childIds.map(id => pollUntilFinished(id, INSTAGRAM_ACCESS_TOKEN)));
  console.log('   All containers ready.');

  console.log('\n🎠 Creating carousel container...');
  const carouselId = await createCarouselContainer(
    INSTAGRAM_USER_ID, childIds, caption, INSTAGRAM_ACCESS_TOKEN
  );
  await pollUntilFinished(carouselId, INSTAGRAM_ACCESS_TOKEN);
  console.log(`   Carousel container ID: ${carouselId}`);

  if (dryRun) {
    console.log('\n✅ DRY RUN complete — skipping final publish call.');
    console.log(`   Carousel container ready: ${carouselId}`);
    return;
  }

  console.log('\n🚀 Publishing to Instagram...');
  const postId = await publishMedia(INSTAGRAM_USER_ID, carouselId, INSTAGRAM_ACCESS_TOKEN);
  const permalink = await getPermalink(postId, INSTAGRAM_ACCESS_TOKEN);
  console.log(`\n✅ Published successfully!`);
  console.log(`   Post ID: ${postId}`);
  if (permalink) console.log(`   URL: ${permalink}`);
}

// Run only when executed directly (not when imported for tests)
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(err => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  });
}
