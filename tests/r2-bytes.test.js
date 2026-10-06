// specs/fase-r2-update-e-envio-seguros.md — review of the code before the 1.6.3 tag (§14):
// bytes of the user outside the OpenCrew block never change, whatever the encoding of the file
// (rule 4); the summary never says "já estavam em dia" after rewriting a bridge (rule 13); a
// .mcp.json with a UTF-8 BOM is valid JSON (rule 11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { deliverBlock } from '../src/lib/blocos.js';
import { newDelivery } from '../src/lib/manifest.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp } from './_helpers.js';
import { USER_FILE_TITLES } from '../src/lib/deteccao.js';
import { workspace, cli, gravar } from './_r2-mcp.js';

const ANSI = Buffer.from('# sa\xEDda e relat\xF3rios\nrelat\xF3rios/\n', 'latin1'); // Windows-1252
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
// What versions up to 1.2.2 wrote in CLAUDE.md, below the title (written out here on purpose).
const ATE_A_122 = [
  'This project uses **opencrew**, a multi-agent orchestration framework.',
  'The full system definition lives in `AGENTS.md` — read it and adopt that role.',
  '',
  'Type `/opencrew` to open the main menu.',
  '',
  '## Notes for Claude Code',
  '',
  '- All checkpoint questions use `AskUserQuestion`.',
  '- opencrew ships its own Playwright MCP (`.mcp.json`); disable the native Playwright plugin.',
  "- Do not manually edit files under `_opencrew/core/` unless you know what you're doing.",
].join('\n');

async function entregar(arquivo, bytes, conteudo = 'node_modules/') {
  const dir = await mkTmp('r2bytes');
  await fs.writeFile(path.join(dir, arquivo), bytes);
  const ctx = newDelivery(dir, null);
  const r = await deliverBlock(ctx, arquivo, conteudo);
  return { dir, ctx, r, depois: await fs.readFile(path.join(dir, arquivo)) };
}

test('R2-01i: a .gitignore in Windows-1252 gets the block and keeps every byte of the user', async () => {
  const { r, depois } = await entregar('.gitignore', ANSI);
  assert.equal(r.action, 'added');
  assert.ok(depois.subarray(0, ANSI.length - 1).equals(ANSI.subarray(0, ANSI.length - 1)), 'user bytes intact');
  assert.ok(depois.includes(Buffer.from('# opencrew:start\nnode_modules/\n# opencrew:end')));
  assert.ok(!depois.includes(Buffer.from([0xef, 0xbf, 0xbd])), 'no replacement character');
});

test('R2-01h: an AGENTS.md in Windows-1252 with an edited block is copied and keeps the user bytes outside it', async () => {
  const fora = Buffer.from('\n- n\xE3o; a\xE7\xE3o\n', 'latin1');
  const antes = Buffer.concat([Buffer.from('<!-- opencrew:start -->\nvelho\n<!-- opencrew:end -->\n'), fora]);
  const { dir, r, depois } = await entregar('AGENTS.md', antes, 'novo');
  assert.deepEqual([r.action, r.copied], ['updated', true]);
  assert.ok(depois.subarray(depois.length - fora.length).equals(fora), 'tail intact');
  assert.ok(depois.includes(Buffer.from('<!-- opencrew:start -->\nnovo\n<!-- opencrew:end -->')));
  const [data] = await fs.readdir(path.join(dir, '.opencrew-backup'));
  assert.ok((await fs.readFile(path.join(dir, '.opencrew-backup', data, 'AGENTS.md'))).equals(antes));
});

test('R2-01i: a UTF-8 BOM stays the first bytes when the block goes at the top; accents ending the file are kept', async () => {
  const corpo = Buffer.from('# Instruções\nvoltar à', 'utf8'); // "à" ends in the byte A0
  const { depois } = await entregar('AGENTS.md', Buffer.concat([BOM, corpo]), 'x');
  assert.ok(depois.subarray(0, 3).equals(BOM));
  assert.ok(depois.subarray(depois.length - corpo.length).equals(corpo));
  const fim = await entregar('.gitignore', corpo);
  assert.ok(fim.depois.subarray(0, corpo.length).equals(corpo), 'the byte A0 is not trimmed as a space');
});

test('R2-01i: a file in UTF-16 is copied whole before the block is written', async () => {
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('minhas notas\n', 'utf16le')]);
  const { dir, ctx } = await entregar('CLAUDE.md', utf16, 'x');
  assert.deepEqual(ctx.copied, ['CLAUDE.md']);
  const [data] = await fs.readdir(path.join(dir, '.opencrew-backup'));
  assert.ok((await fs.readFile(path.join(dir, '.opencrew-backup', data, 'CLAUDE.md'))).equals(utf16));
});

test('R2-03b: after removing the legacy text of a bridge, the summary does not say "já estavam em dia"', async () => {
  const dir = await workspace();
  const claude = await fs.readFile(path.join(dir, 'CLAUDE.md'), 'utf8');
  await gravar(dir, 'CLAUDE.md', `${claude.trimEnd()}\n\n${USER_FILE_TITLES['CLAUDE.md']}\n\n${ATE_A_122}\n`);
  const { out, code } = await cli(dir, 'update');
  assert.equal(code, 0);
  assert.match(out, /CLAUDE\.md: removi o texto antigo do OpenCrew/);
  assert.doesNotMatch(out, /já estavam em dia/);
  assert.match(out, /Pontes atualizadas: Claude Code\./);
});

test('R2-02e: a .mcp.json with a UTF-8 BOM is valid JSON — no warning, and the BOM stays when it is rewritten', async () => {
  const dir = await workspace();
  const mcp = path.join(dir, '.mcp.json');
  const dados = JSON.parse(await fs.readFile(mcp, 'utf8'));
  dados.mcpServers.playwright.args = dados.mcpServers.playwright.args.filter((a) => !/output-dir|logs\/playwright/.test(a));
  await fs.writeFile(mcp, Buffer.concat([BOM, Buffer.from(JSON.stringify(dados, null, 2))]));
  const { out, code } = await cli(dir, 'update');
  assert.equal(code, 0);
  assert.doesNotMatch(out, /não é um JSON válido/);
  const depois = await fs.readFile(mcp);
  assert.ok(depois.subarray(0, 3).equals(BOM));
  assert.ok(JSON.parse(depois.subarray(3).toString('utf8')).mcpServers.playwright.args.includes('--output-dir'));
  assert.equal(await exists(path.join(dir, '.opencrew-backup')), true);
});
