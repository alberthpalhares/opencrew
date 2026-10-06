// specs/fase-r2-update-e-envio-seguros.md — R2-02a..R2-02f (rules 8 to 11): the Playwright
// server of .mcp.json is delivered once (the manifest records it), every rewrite copies the file
// first and keeps its indentation and line ending, the pinned version is never changed, and a
// file out of the expected format is left alone while the update goes on to the end.
// The record (`.mcp.json` → sha256 of the delivered text, with LF) and the messages of spec §6
// are written out here, not imported from src/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { exists } from '../src/lib/fsx.js';
import { templatesDir } from '../src/lib/paths.js';
import { mkTmp, withCwd } from './_helpers.js';
import {
  workspace, cli, ler, gravar, copias, dataDe, semData, lerCopia, registro, mudarRegistro,
  sha256, lf, versaoDoPacote, MANIFESTO, CARIMBO, SKILL,
} from './_r2-mcp.js';

const MCP = '.mcp.json';
const CONFIG = '_opencrew/config/playwright.config.json';
const SAIDA = ['--output-dir', '_opencrew/logs/playwright'];
const OUTRO = { command: 'node', args: ['meu-servidor.js'], env: { X: '1' } };
const SO_O_OUTRO = `${JSON.stringify({ mcpServers: { outro: OUTRO } }, null, 4)}\n`;

const COPIA = (data) => `(cópia do arquivo anterior em \`.opencrew-backup/${data}/.mcp.json\`)`;
const CRIADO = '`.mcp.json` criado com o servidor Playwright do OpenCrew (as skills image-creator e image-fetcher precisam dele). Se você apagou esse arquivo de propósito, pode apagar de novo: o `update` não recria mais.';
const acrescentado = (data) => `Servidor Playwright acrescentado ao \`.mcp.json\` ${COPIA(data)}. Se você o removeu de propósito, pode remover de novo: o \`update\` não repõe mais.`;
const NAO_RECRIADO = 'O `.mcp.json` não existe e não foi recriado. Sem o servidor Playwright, as skills image-creator e image-fetcher não funcionam.';
const SEM_SERVIDOR = 'O `.mcp.json` está sem o servidor Playwright do OpenCrew e ficou como está. Sem ele, as skills image-creator e image-fetcher não funcionam.';
const saidaNova = (data) => `\`.mcp.json\`: a saída do Playwright agora vai para \`_opencrew/logs/playwright/\` ${COPIA(data)}.`;
const FORA_DO_FORMATO = 'O `.mcp.json` não tem o formato esperado (um objeto com `mcpServers`) e não foi alterado. Confira o arquivo.';
const COMMENT = 'Versão do Playwright MCP fixada por estabilidade. Para trocar, edite a versão abaixo e reinicie a IDE. O `update` do OpenCrew não altera a versão que está neste arquivo.';

const template = () => fs.readFile(path.join(templatesDir, MCP), 'utf8');
const doPacote = async () => JSON.parse(await template()).mcpServers.playwright;
// The entry OpenCrew ships: the one that uses its Playwright config.
const doOpenCrew = (versao, ...mais) => ({ command: 'npx', args: [`@playwright/mcp@${versao}`, '--config', CONFIG, ...mais] });
const comRegistro = (dir) => mudarRegistro(dir, (files) => { files[MCP] = sha256('o que foi entregue'); });
const semRegistro = (dir) => mudarRegistro(dir, (files) => { delete files[MCP]; });
const semManifesto = (dir) => fs.rm(path.join(dir, MANIFESTO));

test('R2-02a: with the delivery recorded, update does not recreate a deleted .mcp.json, and the record goes on to the next update', async () => {
  const dir = await workspace();
  await comRegistro(dir);
  await fs.rm(path.join(dir, MCP));

  for (const vez of [1, 2]) {
    const { out, code } = await cli(dir, 'update');
    assert.equal(code, 0);
    assert.equal(await exists(path.join(dir, MCP)), false, `update ${vez}: not recreated`);
    assert.ok(out.includes(NAO_RECRIADO), out);
    assert.equal((await registro(dir))[MCP], sha256('o que foi entregue'), `update ${vez}: the record is carried as it was`);
  }
  assert.deepEqual(await copias(dir), []);
});

test('R2-02a: with the delivery recorded, a .mcp.json without the playwright server does not change and gets no copy', async () => {
  const dir = await workspace();
  await comRegistro(dir);
  await gravar(dir, MCP, SO_O_OUTRO);

  for (const vez of [1, 2]) {
    const { out, code } = await cli(dir, 'update');
    assert.equal(code, 0);
    assert.equal(await ler(dir, MCP), SO_O_OUTRO, `update ${vez}: byte for byte`);
    assert.ok(out.includes(SEM_SERVIDOR), out);
  }
  assert.deepEqual(await copias(dir), []);
});

for (const [caso, preparar] of [['a manifest without the record', semRegistro], ['no manifest (installed up to 1.5.0)', semManifesto]]) {
  test(`R2-02b: with ${caso}, update creates the missing .mcp.json once; deleted again, it does not come back`, async () => {
    const dir = await workspace();
    await preparar(dir);
    await fs.rm(path.join(dir, MCP));

    const { out, code } = await cli(dir, 'update');

    assert.equal(code, 0);
    assert.equal(await ler(dir, MCP), await template(), 'the same text init writes');
    assert.ok(out.includes(CRIADO), out);
    assert.equal((await registro(dir))[MCP], sha256(lf(await template())));
    assert.deepEqual(await copias(dir), [], 'nothing of the user was replaced: no copy');

    await fs.rm(path.join(dir, MCP));
    const segundo = await cli(dir, 'update');
    assert.equal(await exists(path.join(dir, MCP)), false);
    assert.ok(segundo.out.includes(NAO_RECRIADO), segundo.out);
    assert.ok(!segundo.out.includes(CRIADO), segundo.out);
  });
}

test('R2-02b: without the record, the missing server is added with a copy of the original cited in the output; removed again, it does not come back', async () => {
  const dir = await workspace();
  await semRegistro(dir);
  await gravar(dir, MCP, SO_O_OUTRO);

  const { out, code } = await cli(dir, 'update');

  assert.equal(code, 0);
  const feitas = await copias(dir);
  assert.deepEqual(feitas.map(semData), [MCP]);
  assert.equal(await lerCopia(dir, feitas[0]), SO_O_OUTRO, 'the copy holds the file as it was');
  const novo = `${JSON.stringify({ mcpServers: { outro: OUTRO, playwright: await doPacote() } }, null, 4)}\n`;
  assert.equal(await ler(dir, MCP), novo, 'the server of the package enters; the other one and the 4 spaces stay');
  assert.ok(out.includes(acrescentado(dataDe(feitas[0]))), out);
  assert.equal((await registro(dir))[MCP], sha256(novo));

  await gravar(dir, MCP, SO_O_OUTRO);
  const segundo = await cli(dir, 'update');
  assert.equal(await ler(dir, MCP), SO_O_OUTRO, 'removed on purpose: it stays removed');
  assert.deepEqual(await copias(dir), feitas, 'and nothing else is copied');
  assert.ok(segundo.out.includes(SEM_SERVIDOR), segundo.out);
});

test('R2-02b: without the record, an object with no `mcpServers` gets the server too (2 spaces when the file has no indentation)', async () => {
  const dir = await workspace();
  await semManifesto(dir);
  await gravar(dir, MCP, '{}');

  const { code } = await cli(dir, 'update');

  assert.equal(code, 0);
  assert.equal(await ler(dir, MCP), JSON.stringify({ mcpServers: { playwright: await doPacote() } }, null, 2));
  assert.deepEqual((await copias(dir)).map(semData), [MCP]);
});

test('R2-02b: without the record and with nothing missing, update only records — a server removed later does not come back', async () => {
  const dir = await workspace();
  await semRegistro(dir);
  const instalado = await ler(dir, MCP);

  const { out } = await cli(dir, 'update');

  assert.equal(await ler(dir, MCP), instalado);
  assert.ok(!out.includes(MCP), out);
  assert.equal((await registro(dir))[MCP], sha256(lf(instalado)));

  await gravar(dir, MCP, SO_O_OUTRO);
  await cli(dir, 'update');
  assert.equal(await ler(dir, MCP), SO_O_OUTRO);
  assert.deepEqual(await copias(dir), []);
});

for (const [caso, indentacao, eol, fim] of [['a tab and CRLF', '\t', '\r\n', '\r\n'], ['4 spaces, LF and no line break at the end', '    ', '\n', '']]) {
  test(`R2-02c: the OpenCrew entry without --output-dir gets the pair, the file keeps ${caso}, and it is copied first`, async () => {
    const dir = await workspace();
    const arquivo = (playwright) => JSON.stringify({ mcpServers: { outro: OUTRO, playwright } }, null, indentacao).replace(/\n/g, eol) + fim;
    const antes = arquivo(doOpenCrew('0.0.78'));
    await gravar(dir, MCP, antes);

    const { out, code } = await cli(dir, 'update');

    assert.equal(code, 0);
    const depois = arquivo(doOpenCrew('0.0.78', ...SAIDA));
    assert.equal(await ler(dir, MCP), depois);
    const feitas = await copias(dir);
    assert.deepEqual(feitas.map(semData), [MCP]);
    assert.equal(await lerCopia(dir, feitas[0]), antes, 'the copy holds the file as it was');
    assert.ok(out.includes(saidaNova(dataDe(feitas[0]))), out);

    const segundo = await cli(dir, 'update');
    assert.equal(await ler(dir, MCP), depois);
    assert.deepEqual(await copias(dir), feitas, 'the second update copies nothing');
    assert.ok(!segundo.out.includes(MCP), segundo.out);
  });
}

test('R2-02d: the Playwright version in the OpenCrew entry is never changed', async () => {
  const dir = await workspace();
  for (const versao of ['0.0.40', 'latest']) {
    await gravar(dir, MCP, JSON.stringify({ mcpServers: { playwright: doOpenCrew(versao) } }, null, 2));
    await cli(dir, 'update');
    const comPar = await ler(dir, MCP);
    assert.deepEqual(JSON.parse(comPar).mcpServers.playwright, doOpenCrew(versao, ...SAIDA), `${versao}: only the pair enters`);

    await cli(dir, 'update');
    assert.equal(await ler(dir, MCP), comPar, `${versao}: complete entry, nothing to do`);
  }
});

const INTOCADOS = {
  'a playwright server put by the user (not the OpenCrew config)': { command: 'npx', args: ['@playwright/mcp@latest', '--headless'] },
  'a playwright server of the user with no args': { url: 'http://localhost:8931/sse' },
  'the OpenCrew entry already with --output-dir=x': doOpenCrew('0.0.78', '--output-dir=minha/pasta'),
  'the OpenCrew entry already with --output-dir x': doOpenCrew('0.0.40', '--output-dir', 'minha/pasta'),
};
for (const [caso, playwright] of Object.entries(INTOCADOS)) {
  test(`R2-02d: ${caso} — the file does not change, with or without the record`, async () => {
    const dir = await workspace();
    const meu = JSON.stringify({ mcpServers: { playwright } }, null, '\t');
    await gravar(dir, MCP, meu);

    for (const preparar of [semRegistro, comRegistro]) {
      await preparar(dir);
      const { out, code } = await cli(dir, 'update');
      assert.equal(code, 0);
      assert.equal(await ler(dir, MCP), meu, 'byte for byte');
      assert.ok(!out.includes(MCP), out);
    }
    assert.deepEqual(await copias(dir), []);
  });
}

// Each one used to stop the update halfway (or be rewritten): valid JSON, not the expected shape.
for (const conteudo of ['null', '[]', '{"mcpServers":"x"}', '{"mcpServers":[]}', '{"mcpServers":null}', '"x"']) {
  test(`R2-02e: .mcp.json with ${conteudo} — exit 0, file intact, format warning, full summary and the stamp of the package`, async () => {
    const dir = await workspace();
    if (conteudo.startsWith('{')) await semRegistro(dir); // with or without the record: the same
    await gravar(dir, MCP, conteudo);
    await gravar(dir, SKILL, 'minha versão da skill');
    await gravar(dir, CARIMBO, '1.0.0\n');

    const { out, code } = await cli(dir, 'update');

    assert.equal(code, 0);
    assert.equal(await ler(dir, MCP), conteudo);
    assert.ok(out.includes(FORA_DO_FORMATO), out);
    assert.doesNotMatch(out, /Cannot (read|create)|TypeError/);
    // The update went on to the end: the copies are listed, the manifest and the stamp are written.
    const feitas = await copias(dir);
    assert.deepEqual(feitas.map(semData), [SKILL]);
    assert.ok(out.includes(SKILL), out);
    const reg = await registro(dir);
    assert.equal(typeof reg[SKILL], 'string');
    assert.equal(Object.hasOwn(reg, MCP), !conteudo.startsWith('{'), 'nothing was delivered: the record is neither made nor lost');
    assert.equal((await ler(dir, CARIMBO)).trim(), await versaoDoPacote());
  });
}

test('R2-02e: .mcp.json that is not JSON at all keeps its own warning, and the update goes on to the end', async () => {
  const dir = await workspace();
  const quebrado = '{\n  "mcpServers": {},\n}\n';
  await semRegistro(dir);
  await gravar(dir, MCP, quebrado);
  await gravar(dir, CARIMBO, '1.0.0\n');

  const { out, code } = await cli(dir, 'update');

  assert.equal(code, 0);
  assert.equal(await ler(dir, MCP), quebrado);
  assert.ok(out.includes('.mcp.json não é um JSON válido — não alterado. Confira o arquivo.'), out);
  assert.ok(!out.includes(FORA_DO_FORMATO), out);
  assert.equal((await ler(dir, CARIMBO)).trim(), await versaoDoPacote());

  // Nothing was delivered, so nothing was recorded: once the file is fixed, the server arrives.
  await gravar(dir, MCP, '{\n  "mcpServers": {}\n}\n');
  await cli(dir, 'update');
  assert.deepEqual(JSON.parse(await ler(dir, MCP)).mcpServers.playwright, await doPacote());
});

test('R2-02f: init in a folder with no .mcp.json records the delivery; in a folder that already had one, it does not', async () => {
  const nova = await workspace();
  assert.equal(await ler(nova, MCP), await template());
  assert.equal((await registro(nova))[MCP], sha256(lf(await template())), '.mcp.json → sha256 of the delivered text, with LF');

  const dir = await mkTmp('r2b');
  const meu = '{"mcpServers":{"custom":{}}}';
  await gravar(dir, MCP, meu);
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  assert.equal(await ler(dir, MCP), meu, 'the file of the user is kept');
  assert.equal(Object.hasOwn(await registro(dir), MCP), false, 'nothing was delivered: no record');
});

test('R2-02f: the _comment of the template does not promise that update changes the version', async () => {
  const entregue = JSON.parse(await template());
  assert.equal(entregue._comment, COMMENT);
  assert.doesNotMatch(await template(), /refresh|opencrew update/);
  // The entry `update` recognises as its own: the OpenCrew config, already with the output dir.
  assert.deepEqual(entregue.mcpServers.playwright.args.slice(1), ['--config', CONFIG, ...SAIDA]);
});
