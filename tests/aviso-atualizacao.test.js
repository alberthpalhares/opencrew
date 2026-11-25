import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { mkTmp, withCwd, captureOutput, snapshot } from './_helpers.js';
import { readFile } from 'node:fs/promises';
import { parseArgs } from '../src/cli.js';
import { execucaoPendente, update } from '../src/commands/update.js';
import { comTrava } from '../templates/_opencrew/core/scripts/trava.mjs';
import { init } from '../src/commands/init.js';

const CACHE = ['_opencrew', 'logs', '.aviso-atualizacao.json'];
const importar = () => import('../templates/_opencrew/core/scripts/aviso-atualizacao.mjs');
async function projeto(t, { versao = '1.21.2', preferencias } = {}) {
  const raiz = await mkTmp('aviso-atualizacao');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew', '_memory'), { recursive: true });
  if (versao !== null) await fs.writeFile(path.join(raiz, '_opencrew', '.opencrew-version'), versao);
  if (preferencias) await fs.writeFile(path.join(raiz, '_opencrew', '_memory', 'preferences.md'), preferencias);
  return raiz;
}
async function cache(raiz, dado) {
  const arquivo = path.join(raiz, ...CACHE);
  await fs.mkdir(path.dirname(arquivo), { recursive: true });
  await fs.writeFile(arquivo, JSON.stringify(dado));
}

test('AU-01: o menu oferece prévia, atualização e adiamento sem aplicar', async (t) => {
  const raiz = await projeto(t);
  const { consultarAviso } = await importar();
  const aviso = await consultarAviso(raiz, { consultar: async () => '1.22.0' });
  assert.deepEqual(aviso, { instalada: '1.21.2', disponivel: '1.22.0', opcoes: ['Ver prévia', 'Atualizar', 'Lembrar amanhã'] });
  assert.equal(await fs.readFile(path.join(raiz, '_opencrew', '.opencrew-version'), 'utf8'), '1.21.2');
});

test('AU-02: versões iguais, menores e inválidas não geram aviso', async (t) => {
  const raiz = await projeto(t);
  const { consultarAviso } = await importar();
  for (const versao of ['1.21.2', '1.21.1', 'v1.30.0', '1.22.0-beta.1', '1.22']) {
    assert.equal(await consultarAviso(raiz, { consultar: async () => versao }), null, versao);
  }
});

test('AU-03: manifesto válido substitui carimbo ausente; sem versão válida não avisa', async (t) => {
  const raiz = await projeto(t, { versao: null });
  await fs.writeFile(path.join(raiz, '_opencrew', 'manifest.json'), JSON.stringify({ version: '1.21.2' }));
  const { consultarAviso } = await importar();
  assert.equal((await consultarAviso(raiz, { consultar: async () => '1.22.0' })).instalada, '1.21.2');
  await fs.writeFile(path.join(raiz, '_opencrew', 'manifest.json'), '{invalido');
  assert.equal(await consultarAviso(raiz, { consultar: async () => '1.22.0' }), null);
});

test('AU-04: falha, resposta inválida e consulta fora do prazo deixam o menu seguir', async (t) => {
  const raiz = await projeto(t);
  const { consultarAviso } = await importar();
  assert.equal(await consultarAviso(raiz, { consultar: async () => { throw new Error('offline'); } }), null);
  assert.equal(await consultarAviso(raiz, { consultar: async () => ({ version: '1.22.0' }) }), null);
  assert.equal(await consultarAviso(raiz, { timeoutMs: 5, consultar: () => new Promise(() => {}) }), null);
  const semCache = await projeto(t);
  await fs.writeFile(path.join(semCache, '_opencrew', 'logs'), 'pasta bloqueada');
  assert.equal(await consultarAviso(semCache, { consultar: async () => '1.22.0' }), null);
});

test('AU-05: cache recente evita consulta; cache vencido ou corrompido é renovado', async (t) => {
  const raiz = await projeto(t);
  const { consultarAviso } = await importar();
  const agora = 1_800_000_000_000;
  await cache(raiz, { versao: '1.22.0', consultadoEm: agora - 1000, adiadoAte: 0 });
  let chamadas = 0;
  assert.equal((await consultarAviso(raiz, { agora: () => agora, consultar: async () => { chamadas++; return '1.23.0'; } })).disponivel, '1.22.0');
  assert.equal(chamadas, 0);
  await cache(raiz, { versao: '1.22.0', consultadoEm: agora - 86_400_000, adiadoAte: 0 });
  assert.equal((await consultarAviso(raiz, { agora: () => agora, consultar: async () => { chamadas++; return '1.23.0'; } })).disponivel, '1.23.0');
  await fs.writeFile(path.join(raiz, ...CACHE), '{corrompido');
  assert.equal((await consultarAviso(raiz, { agora: () => agora, consultar: async () => '1.24.0' })).disponivel, '1.24.0');
});

test('AU-06: preferência off não consulta nem mostra aviso', async (t) => {
  const raiz = await projeto(t, { preferencias: '- **Aviso de atualização:** off\n' });
  const { consultarAviso } = await importar();
  let chamadas = 0;
  assert.equal(await consultarAviso(raiz, { consultar: async () => { chamadas++; return '1.22.0'; } }), null);
  assert.equal(chamadas, 0);
});

test('AU-07: lembrar amanhã silencia por 24 horas e depois consulta de novo', async (t) => {
  const raiz = await projeto(t);
  const { consultarAviso, adiarAviso } = await importar();
  const agora = 1_800_000_000_000;
  await cache(raiz, { versao: '1.22.0', consultadoEm: agora, adiadoAte: 0 });
  await adiarAviso(raiz, { agora: () => agora });
  let chamadas = 0;
  assert.equal(await consultarAviso(raiz, { agora: () => agora + 1000, consultar: async () => { chamadas++; return '1.22.0'; } }), null);
  assert.equal(chamadas, 0);
  assert.equal((await consultarAviso(raiz, { agora: () => agora + 86_400_001, consultar: async () => { chamadas++; return '1.22.0'; } })).disponivel, '1.22.0');
  assert.equal(chamadas, 1);
});

test('AU-16: consulta usa o endpoint npm latest e cache fica em logs ignorados', async (t) => {
  const raiz = await projeto(t);
  const { consultarAviso } = await importar();
  let url;
  const aviso = await consultarAviso(raiz, { agora: () => 1_800_000_000_000, fetchImpl: async (alvo) => {
    url = String(alvo);
    return { ok: true, json: async () => ({ name: '@aksp/opencrew', version: '1.22.0' }) };
  } });
  assert.equal(aviso.disponivel, '1.22.0');
  assert.equal(url, 'https://registry.npmjs.org/%40aksp%2Fopencrew/latest');
  assert.equal(JSON.parse(await fs.readFile(path.join(raiz, ...CACHE), 'utf8')).versao, '1.22.0');
});

test('AU-08 e AU-09: preview é pinado e só reconhece a resposta com as duas versões', async () => {
  const menu = await readFile(new URL('../templates/AGENTS.md', import.meta.url), 'utf8');
  const update = await readFile(new URL('../src/commands/update.js', import.meta.url), 'utf8');
  assert.match(menu, /npx --yes @aksp\/opencrew@<available> update --check/);
  assert.match(menu, /exactly `ATUALIZACAO:DISPONIVEL <installed> <available>`/);
  assert.match(menu, /On any other exit\/result[\s\S]*?do not offer to apply it/);
  assert.match(update, /ATUALIZACAO:DISPONIVEL \$\{current\} \$\{version\}/);
});

test('AU-08: update --check mostra as versões exatas e não grava no projeto', async (t) => {
  const raiz = await mkTmp('aviso-preview');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await withCwd(raiz, () => init({ ide: ['codex'] }));
  await fs.writeFile(path.join(raiz, '_opencrew', '.opencrew-version'), '1.20.0');
  const antes = await snapshot(raiz);
  const versao = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
  process.exitCode = 0;
  const saida = await captureOutput(() => withCwd(raiz, () => update({ check: true })));
  const codigo = process.exitCode;
  process.exitCode = 0;
  assert.equal(codigo, 1);
  assert.ok(saida.includes(`ATUALIZACAO:DISPONIVEL 1.20.0 ${versao}`));
  assert.deepEqual(await snapshot(raiz), antes);
});

test('AU-10: --menu é explícito e separado da prévia', () => {
  assert.deepEqual(parseArgs(['update', '--menu']), { command: 'update', opts: { menu: true, _: ['update'] } });
  assert.deepEqual(parseArgs(['update', '--check']), { command: 'update', opts: { check: true, _: ['update'] } });
});

test('AU-11: execução aberta ou registro ilegível impede a atualização antes da escrita', async (t) => {
  const raiz = await projeto(t);
  const pasta = path.join(raiz, 'crews', 'redacao', 'output', 'run-1');
  await fs.mkdir(pasta, { recursive: true });
  const registro = path.join(pasta, 'execucao.json');
  await fs.writeFile(registro, JSON.stringify({ status: 'aberta' }));
  assert.match(await execucaoPendente(raiz), /execução aberta/);
  await fs.writeFile(registro, '{invalido');
  assert.match(await execucaoPendente(raiz), /não pôde ser lido/);
  await fs.writeFile(registro, JSON.stringify({ status: 'aprovada' }));
  assert.equal(await execucaoPendente(raiz), null);
});

test('AU-11: update --menu preserva a árvore inteira quando existe execução aberta', async (t) => {
  const raiz = await mkTmp('aviso-bloqueio');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await withCwd(raiz, () => init({ ide: ['codex'] }));
  await fs.writeFile(path.join(raiz, '_opencrew', '.opencrew-version'), '1.20.0');
  const pasta = path.join(raiz, 'crews', 'redacao', 'output', 'run-aberto');
  await fs.mkdir(pasta, { recursive: true });
  await fs.writeFile(path.join(pasta, 'execucao.json'), JSON.stringify({ status: 'aberta' }));
  const antes = await snapshot(raiz);
  process.exitCode = 0;
  const saida = await captureOutput(() => withCwd(raiz, () => update({ menu: true })));
  const codigo = process.exitCode;
  process.exitCode = 0;
  assert.equal(codigo, 1);
  assert.match(saida, /há uma execução aberta/);
  assert.deepEqual(await snapshot(raiz), antes);
});

test('AU-12: início e atualização que usam a trava do projeto nunca se sobrepõem', async (t) => {
  const raiz = await projeto(t);
  const arquivo = path.join(raiz, '_opencrew', '.projeto-opencrew');
  const ordem = [];
  let ativo = false;
  const iniciar = (nome, demora) => comTrava(arquivo, async () => {
    assert.equal(ativo, false);
    ativo = true;
    ordem.push(`${nome}:início`);
    await new Promise((resolver) => setTimeout(resolver, demora));
    ordem.push(`${nome}:fim`);
    ativo = false;
  });
  await Promise.all([iniciar('atualização', 35), iniciar('run', 5)]);
  assert.equal(ordem.filter((item) => item.endsWith(':início')).length, 2);
  assert.equal(ordem.filter((item) => item.endsWith(':fim')).length, 2);
  assert.ok(ordem.indexOf('atualização:fim') < ordem.indexOf('run:início') || ordem.indexOf('run:fim') < ordem.indexOf('atualização:início'));
  const caminho = await readFile(new URL('../templates/_opencrew/core/scripts/caminho/reserva.mjs', import.meta.url), 'utf8');
  const updater = await readFile(new URL('../src/commands/update-guard.js', import.meta.url), 'utf8');
  assert.match(caminho, /\.projeto-opencrew/);
  assert.match(updater, /\.projeto-opencrew/);
});

test('AU-13 e AU-14: o update existente mantém backup e nunca mascara erro como sucesso', async () => {
  const updater = await readFile(new URL('../src/commands/update.js', import.meta.url), 'utf8');
  assert.match(updater, /backupFile/);
  assert.match(updater, /Atualização cancelada/);
  assert.match(updater, /Atualização interrompida/);
  assert.match(updater, /if \(!\(await writeManifest\(target, version, ctx.files\)\)\)/);
});

test('AU-15: um update instala o verificador de atualização e conserva os dados gerenciados do usuário', async () => {
  const update = await readFile(new URL('../src/commands/update.js', import.meta.url), 'utf8');
  const template = await readFile(new URL('../templates/_opencrew/core/scripts/aviso-atualizacao.mjs', import.meta.url), 'utf8');
  assert.match(update, /deliverTree\(ctx, tpl\('_opencrew', 'core'\)/);
  assert.match(update, /crews the user created, _opencrew\/_memory\//);
  assert.match(template, /lerPreferencia/);
  assert.match(template, /\.aviso-atualizacao\.json/);
});

test('AU-16: cache não atravessa pasta de logs protegida nem deixa temporário', async (t) => {
  const raiz = await projeto(t);
  const logs = path.join(raiz, '_opencrew', 'logs');
  const fora = await mkTmp('aviso-cache-fora');
  t.after(() => fs.rm(fora, { recursive: true, force: true, maxRetries: 3 }));
  try { await fs.symlink(fora, logs, 'junction'); }
  catch (erro) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(erro.code)) return t.skip(`este Windows não permite criar link simbólico: ${erro.code}`);
    throw erro;
  }
  const { consultarAviso } = await importar();
  assert.equal(await consultarAviso(raiz, { fetchImpl: async () => ({ ok: true, json: async () => ({ name: '@aksp/opencrew', version: '1.22.0' }) }) }), null);
  assert.deepEqual(await fs.readdir(fora), []);
});

test('AU-17: o roteiro do aceite confere a entrega local com cópias externas e recibos', async () => {
  const spec = await readFile(new URL('../specs/fase-aviso-atualizacao-1-22.md', import.meta.url), 'utf8');
  assert.match(spec, /pasta sincronizada real e HD ou SSD externo real/);
  assert.match(spec, /arquivos e recibos correspondem ao pacote aprovado/);
});
