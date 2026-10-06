// specs/fase-e1-escritorio-ao-vivo.md — E1-02: the shell of the state script (arguments, preference, reading, the
// all-or-nothing write, last line, exit code). E1-02d was withdrawn together with rule 4; the ID is not reused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { main } from '../templates/_opencrew/core/scripts/estado.mjs';
import { mkTmp, snapshot } from './_helpers.js';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/scripts/estado.mjs');
const CSV = `id,displayName,title,icon,path,execution
a,"Ana Apura","Pesquisadora, de tendências",🔎,./agents/a.agent.md,subagent
b,"Beto Borda",Redator,✍️,./agents/b.agent.md,inline
c,"Caio Confere",Revisor,✅,./agents/c.agent.md,inline
`;
const LIGADO = '# opencrew Preferences\n\n- **User Name:** Ana\n- **Dashboard:** enabled\n';
const USO = 'Uso: node _opencrew/core/scripts/estado.mjs <crew> <evento> [opções]';
const [OK, RECRIADO] = ['ESTADO:OK', 'ESTADO:OK — estado recriado'];
const DESLIGADO = 'ESTADO:IGNORADO — escritório desligado (ligue com /opencrew dashboard)';
const SEM_ESTADO = 'ESTADO:IGNORADO — sem estado desta execução';
const NAO_GRAVOU = 'ESTADO:IGNORADO — não foi possível gravar o estado';
const CORTADO = '{\n  "crew": "teste",\n  "status": "runn';
// One character on screen each: a family (7 code points), a thumbs-up with skin tone, a flag.
const [FAMILIA, JOINHA, BANDEIRA] = ['\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}', '\u{1F44D}\u{1F3FB}', '\u{1F1E7}\u{1F1F7}'];

/** A temporary folder that goes away when the test `t` ends. */
async function pastaTemporaria(t, prefixo) {
  const pasta = await mkTmp(prefixo);
  t.after(() => fs.rm(pasta, { recursive: true, force: true, maxRetries: 3 }));
  return pasta;
}

/** A fake installed project with one crew, `teste`. A null option leaves that file out. */
async function projeto(t, { preferencia = LIGADO, csv = CSV, estado = null } = {}) {
  const raiz = await pastaTemporaria(t, 'estado');
  await fs.mkdir(path.join(raiz, '_opencrew', '_memory'), { recursive: true });
  await fs.mkdir(path.join(raiz, 'crews', 'teste'), { recursive: true });
  if (preferencia != null) await fs.writeFile(path.join(raiz, '_opencrew', '_memory', 'preferences.md'), preferencia);
  if (csv != null) await fs.writeFile(path.join(raiz, 'crews', 'teste', 'crew-party.csv'), csv);
  if (estado != null) await fs.writeFile(arquivo(raiz), estado);
  return raiz;
}

let segundo = 0;
const agora = () => new Date(Date.UTC(2026, 9, 5, 12, 0, segundo++)).toISOString();

/** Runs the command line in `raiz` (crew `teste` unless `crew` says otherwise). */
async function rodar(raiz, argv, { crew = 'teste', ...deps } = {}) {
  const linhas = [];
  const escrever = (s) => linhas.push(...String(s).split('\n'));
  const code = await main([...(crew ? [crew] : []), ...argv], { cwd: raiz, escrever, agora, ...deps });
  return { code, linhas };
}
const rodarTodos = async (raiz, eventos) => { for (const argv of eventos) await rodar(raiz, argv); };

const arquivo = (raiz) => path.join(raiz, 'crews', 'teste', 'state.json');
const ler = async (raiz) => JSON.parse(await fs.readFile(arquivo(raiz), 'utf8'));
const status = (estado) => Object.fromEntries(estado.agents.map((a) => [a.id, a.status]));
const semEspera = () => { const esperas = []; return { esperas, esperar: async (ms) => { esperas.push(ms); } }; };
const recusa = (code) => Object.assign(new Error(`${code}: operation not permitted, rename`), { code });

test('E1-02a: an agent that is not in the cast — file untouched, the last line lists every valid id, exit 0', async (t) => {
  const raiz = await projeto(t);
  await rodar(raiz, ['iniciar', '--passos', '3']);
  const antes = await snapshot(raiz);
  for (const evento of ['passo', 'checkpoint', 'pular']) {
    const { code, linhas } = await rodar(raiz, [evento, '--n', '1', '--agente', 'fantasma']);
    assert.deepEqual([code, linhas], [0, ['ESTADO:IGNORADO — agente "fantasma" não está no elenco da crew. Ids válidos: a, b, c']]);
    assert.deepEqual(await snapshot(raiz), antes);
  }
});

const ILEGIVEIS = [['no state.json', null], ['a state.json cut in half', CORTADO], ['a state.json without the agents list', '{ "crew": "teste" }']];
for (const [caso, estado] of ILEGIVEIS) {
  test(`E1-02b: ${caso} — passo and checkpoint rebuild the state from the cast`, async (t) => {
    const raiz = await projeto(t, { estado });
    const passo = await rodar(raiz, ['passo', '--n', '1', '--agente', 'a', '--rotulo', 'Pesquisar']);
    assert.deepEqual([passo.code, passo.linhas], [0, [RECRIADO]]);
    const criado = await ler(raiz);
    assert.deepEqual(criado.agents.map((a) => [a.id, a.name, a.icon, a.status]), [['a', 'Ana Apura', '🔎', 'working'], ['b', 'Beto Borda', '✍️', 'idle'], ['c', 'Caio Confere', '✅', 'idle']]);
    assert.deepEqual([criado.crew, criado.status, criado.step, criado.handoff], ['teste', 'running', { current: 1, total: null, label: 'Pesquisar' }, null]);
    assert.deepEqual((await rodar(raiz, ['passo', '--n', '2', '--agente', 'b'])).linhas, [OK], 'a legible state is not rebuilt');

    const outro = await projeto(t, { estado });
    const checkpoint = await rodar(outro, ['checkpoint', '--n', '1', '--rotulo', 'Aprovar pauta']);
    assert.deepEqual([checkpoint.code, checkpoint.linhas], [0, [RECRIADO]]);
    const parado = await ler(outro);
    assert.deepEqual([parado.status, status(parado), parado.step.label], ['checkpoint', { a: 'idle', b: 'idle', c: 'idle' }, 'Aprovar pauta']);
  });

  test(`E1-02b: ${caso} — pular, concluir and falhar are ignored; the file is neither created nor changed`, async (t) => {
    const raiz = await projeto(t, { estado });
    const antes = await snapshot(raiz);
    for (const argv of [['pular', '--agente', 'a'], ['concluir'], ['falhar', '--motivo', 'sem acesso']]) {
      assert.deepEqual(await rodar(raiz, argv), { code: 0, linhas: [SEM_ESTADO] });
      assert.deepEqual(await snapshot(raiz), antes);
    }
  });
}

test('E1-02b: a state whose cast lacks the agent of the event (cast edited, no iniciar since) is rebuilt too', async (t) => {
  const velho = { crew: 'teste', status: 'running', step: { current: 1, total: 6, label: '' }, agents: [{ id: 'a', name: 'Ana', icon: '', status: 'working' }] };
  const raiz = await projeto(t, { estado: `\uFEFF${JSON.stringify(velho)}` }); // saved with a byte order mark: still legible
  assert.deepEqual(await rodar(raiz, ['passo', '--n', '2', '--agente', 'b']), { code: 0, linhas: [RECRIADO] });
  const novo = await ler(raiz);
  assert.deepEqual([status(novo), novo.step, novo.handoff], [{ a: 'idle', b: 'working', c: 'idle' }, { current: 2, total: 6, label: '' }, null]);
});

test('E1-02b: a crew without crew-party.csv, or with no agent in it — iniciar creates nothing, ESTADO:IGNORADO, exit 0', async (t) => {
  for (const csv of [null, 'id,displayName,title,icon,path,execution\n']) {
    const raiz = await projeto(t, { csv });
    const antes = await snapshot(raiz);
    const { code, linhas } = await rodar(raiz, ['iniciar', '--passos', '3']);
    assert.deepEqual([code, linhas], [0, ['ESTADO:IGNORADO — crew-party.csv ausente ou sem agentes']]);
    assert.deepEqual(await snapshot(raiz), antes);
  }
});

test('E1-02c: a crew that does not exist, or outside crews/ — exit 1, no ESTADO: line, nothing written', async (t) => {
  const raiz = await projeto(t);
  for (const pasta of [path.join(raiz, 'fora'), path.join(raiz, 'crews', 'teste', 'agents')]) {
    await fs.mkdir(pasta);
    await fs.writeFile(path.join(pasta, 'crew-party.csv'), CSV);
  }
  const antes = await snapshot(raiz);
  const fora = ['../fora', '../../fora', path.join(raiz, 'fora')].map((crew) => [crew, `Caminho fora do projeto: ${crew}`]);
  const casos = [['nao-existe', 'Crew não encontrada: nao-existe'], ['teste/agents', 'Crew não encontrada: teste/agents'], ...fora];
  for (const [crew, motivo] of casos) {
    for (const evento of [['iniciar', '--passos', '3'], ['passo', '--n', '1', '--agente', 'a']]) {
      assert.deepEqual(await rodar(raiz, evento, { crew }), { code: 1, linhas: [USO, motivo] }, crew);
    }
  }
  assert.deepEqual(await snapshot(raiz), antes);
});

test('E1-02c: crew or event missing, an event out of the list, a folder without _opencrew/ — usage error, exit 1', async (t) => {
  const raiz = await projeto(t);
  const semRaiz = await pastaTemporaria(t, 'estado-vazio');
  const eventos = 'iniciar, passo, checkpoint, pular, concluir, falhar';
  const casos = [
    [raiz, [], null, 'Falta o nome da crew.'],
    [raiz, [], 'teste', `Falta o evento. Eventos: ${eventos}.`],
    [raiz, ['handoff', '--agente', 'a'], 'teste', `Evento desconhecido: handoff. Eventos: ${eventos}.`],
    [semRaiz, ['iniciar'], 'teste', 'Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto.'],
  ];
  for (const [cwd, argv, crew, motivo] of casos) assert.deepEqual(await rodar(cwd, argv, { crew }), { code: 1, linhas: [USO, motivo] });
  assert.deepEqual(await fs.readdir(path.dirname(arquivo(raiz))), ['crew-party.csv']);
});

test('E1-02c: run as a real process — exit 0 with the ESTADO: line last (crews/<name> and --option=value work too), exit 1 on a usage error', async (t) => {
  const raiz = await projeto(t);
  const processo = (...argv) => spawnSync(process.execPath, [SCRIPT, ...argv], { cwd: raiz, encoding: 'utf8' });
  const ok = processo('teste', 'iniciar', '--passos', '3');
  assert.deepEqual([ok.status, ok.stdout, ok.stderr], [0, `${OK}\n`, '']);
  assert.deepEqual([processo('crews/teste', 'passo', '--n=1', '--agente=a').stdout, (await ler(raiz)).step, status(await ler(raiz)).a], [`${OK}\n`, { current: 1, total: 3, label: '' }, 'working']);
  const ignorado = processo('teste', 'pular', '--agente', 'fantasma');
  assert.deepEqual([ignorado.status, ignorado.stdout.split(' — ')[0]], [0, 'ESTADO:IGNORADO']);
  const erro = processo('nao-existe', 'iniciar');
  assert.deepEqual([erro.status, erro.stdout], [1, `${USO}\nCrew não encontrada: nao-existe\n`]);
});

test('E1-02e: a 300-character --mensagem with a line break and <b> — 120 characters, one line, <b> kept as text', async (t) => {
  const raiz = await projeto(t);
  const longo = `<b>Pauta</b> pronta,\r\ncom "aspas" e $HOME ${'x'.repeat(300)}`;
  await rodarTodos(raiz, [['iniciar'], ['passo', '--n', '1', '--agente', 'a'],
    ['passo', '--n', '2', '--agente', 'b', '--mensagem', longo, '--rotulo', `Escrever\n${'y'.repeat(300)}`]]);
  const { handoff, step, agents } = await ler(raiz);
  assert.equal(handoff.message, longo.replace('\r\n', ' ').slice(0, 120));
  assert.ok(handoff.message.length === 120 && handoff.message.startsWith('<b>Pauta</b> pronta, com "aspas" e $HOME xxx'), handoff.message);
  assert.deepEqual([step.label, agents[1].label], Array(2).fill(`Escrever ${'y'.repeat(111)}`));
  await rodar(raiz, ['falhar', '--motivo', `\n  ${'z'.repeat(300)}`]);
  assert.equal((await ler(raiz)).motivo, 'z'.repeat(120));
});

test('E1-02e: the cut at 120 characters never splits an emoji', async (t) => {
  const raiz = await projeto(t);
  await rodar(raiz, ['iniciar']);
  const casos = [[119, FAMILIA, FAMILIA], [120, FAMILIA, ''], [118, `${JOINHA}${BANDEIRA}${FAMILIA}`, `${JOINHA}${BANDEIRA}`]];
  for (const [letras, emojis, sobram] of casos) {
    await rodar(raiz, ['checkpoint', '--rotulo', `${'a'.repeat(letras)}${emojis}zzz`]);
    assert.equal((await ler(raiz)).step.label, `${'a'.repeat(letras)}${sobram}`, `${letras} letters before the emoji`);
  }
});

test('E1-02f: after a whole sequence of events the only new or changed file is state.json', async (t) => {
  const raiz = await projeto(t);
  const antes = await snapshot(raiz);
  const sequencia = [['iniciar', '--passos', '4'], ['pular', '--agente', 'c'], ['passo', '--n', '1', '--agente', 'a', '--rotulo', 'Pesquisar'],
    ['checkpoint', '--n', '2', '--rotulo', 'Aprovar pauta'], ['passo', '--n', '3', '--agente', 'b', '--mensagem', 'Pauta pronta'],
    ['falhar', '--motivo', 'sem acesso'], ['passo', '--n', '3', '--agente', 'b'], ['concluir']];
  for (const argv of sequencia) assert.deepEqual(await rodar(raiz, argv), { code: 0, linhas: [OK] }, argv.join(' '));
  const depois = await snapshot(raiz);
  assert.deepEqual(depois.filter((l) => !antes.includes(l)).map((l) => l.split(':')[0]), [path.join('crews', 'teste', 'state.json')]);
  assert.deepEqual(antes.filter((l) => !depois.includes(l)), []);
  const fim = await ler(raiz);
  assert.deepEqual([fim.status, status(fim), fim.handoff.message], ['completed', { a: 'done', b: 'done', c: 'skipped' }, 'Pauta pronta']);
});

const SEIS = [['iniciar', '--passos', '3'], ['passo', '--n', '1', '--agente', 'a'], ['checkpoint'], ['pular', '--agente', 'c'], ['concluir'], ['falhar']];
const DESLIGADOS = { 'no preferences.md': null, 'no Dashboard line': '# opencrew Preferences\n\n- **User Name:** Ana\n', 'Dashboard: disabled': '- **Dashboard:** disabled\n' };
for (const [caso, preferencia] of Object.entries(DESLIGADOS)) {
  test(`E1-02g: ${caso} — no event creates a file, not even iniciar; the "desligado" line, exit 0`, async (t) => {
    for (const estado of [null, CORTADO, '{ "crew": "teste", "status": "running", "agents": [] }']) {
      const raiz = await projeto(t, { preferencia, estado });
      const antes = await snapshot(raiz);
      for (const argv of SEIS) assert.deepEqual(await rodar(raiz, argv), { code: 0, linhas: [DESLIGADO] });
      assert.deepEqual(await snapshot(raiz), antes);
    }
  });
}

test('E1-02g: the two forms of the line turn the office on, in any letter case; anything else does not', async (t) => {
  for (const linha of ['- **Dashboard:** enabled', 'Dashboard: enabled', '- **DASHBOARD:** ENABLED', 'dashboard: Enabled']) {
    const raiz = await projeto(t, { preferencia: `# opencrew Preferences\r\n\r\n- **Default Tier:** standard\r\n${linha}\r\n` });
    assert.deepEqual((await rodar(raiz, ['iniciar'])).linhas, [OK], linha);
    assert.equal((await ler(raiz)).status, 'running', linha);
  }
  assert.deepEqual((await rodar(await projeto(t, { preferencia: '\uFEFF- **Dashboard:** enabled' }), ['iniciar'])).linhas, [OK]); // the line alone, after a byte order mark
  const desligam = ['- **Dashboard:** enabledx\n', 'Dashboard: disabled\nenabled\n', '<!-- Dashboard: enabled -->\n- **Dashboard:** disabled\n'];
  for (const texto of desligam) assert.deepEqual((await rodar(await projeto(t, { preferencia: texto }), ['iniciar'])).linhas, [DESLIGADO], texto);
});

test('E1-02h: a rename refused twice with EPERM passes on the third try — the state is written', async (t) => {
  const raiz = await projeto(t);
  const { esperas, esperar } = semEspera();
  const trocas = []; // each [from, to] asked for — rule 3: from `state.json.<pid>.tmp`, in the same folder
  const renomear = async (de, para) => {
    if (trocas.push([de, para]) <= 2) throw recusa('EPERM');
    return fs.rename(de, para);
  };
  assert.deepEqual(await rodar(raiz, ['iniciar', '--passos', '3'], { renomear, esperar }), { code: 0, linhas: [OK] });
  assert.deepEqual([trocas, esperas.length, (await ler(raiz)).step.total], [Array(3).fill([`${arquivo(raiz)}.${process.pid}.tmp`, arquivo(raiz)]), 2, 3]);
  assert.deepEqual((await fs.readdir(path.dirname(arquivo(raiz)))).sort(), ['crew-party.csv', 'state.json']);
});

test('E1-02h: a rename that always fails — ESTADO:IGNORADO, exit 0, no temporary left, the old state intact', async (t) => {
  for (const codigo of ['EPERM', 'EBUSY', 'EACCES', 'ENOSPC']) {
    const raiz = await projeto(t);
    await rodar(raiz, ['iniciar', '--passos', '3']);
    const antes = await snapshot(raiz);
    const { esperas, esperar } = semEspera();
    let chamadas = 0;
    const renomear = async () => { chamadas++; throw recusa(codigo); };
    assert.deepEqual(await rodar(raiz, ['passo', '--n', '1', '--agente', 'a'], { renomear, esperar }), { code: 0, linhas: [NAO_GRAVOU] });
    assert.deepEqual(await snapshot(raiz), antes, codigo);
    const total = esperas.reduce((soma, ms) => soma + ms, 0);
    assert.deepEqual([chamadas, total], codigo === 'ENOSPC' ? [1, 0] : [4, 300], `${codigo}: the first try plus 3 repeats, about 300 ms in all; an error of another kind is not repeated`);
  }
});

test('E1-02h: with the real wait, giving up takes about 300 ms and leaves no timer open', async (t) => {
  const raiz = await projeto(t);
  const inicio = performance.now();
  const renomear = async () => { throw recusa('EBUSY'); };
  assert.deepEqual(await rodar(raiz, ['iniciar'], { renomear }), { code: 0, linhas: [NAO_GRAVOU] });
  const demora = performance.now() - inicio;
  assert.ok(demora >= 250 && demora < 3000, `${Math.round(demora)} ms`);
  assert.deepEqual(await fs.readdir(path.dirname(arquivo(raiz))), ['crew-party.csv']);
});

for (const fim of [['concluir'], ['falhar', '--motivo', 'sem acesso']]) {
  test(`E1-02i: passo --n 1 over an execution ended by ${fim[0]} starts over — cast idle, no handoff, new startedAt, same total`, async (t) => {
    const raiz = await projeto(t);
    await rodarTodos(raiz, [['iniciar', '--passos', '4'], ['pular', '--agente', 'c'], ['passo', '--n', '1', '--agente', 'a'],
      ['passo', '--n', '2', '--agente', 'b', '--mensagem', 'Pauta pronta'], fim]);
    const antigo = await ler(raiz);
    assert.deepEqual([antigo.handoff.from, status(antigo).c], ['a', 'skipped']);
    assert.deepEqual(await rodar(raiz, ['passo', '--n', '2', '--agente', 'b']), { code: 0, linhas: [OK] }, 'only --n 1 starts over');
    assert.equal((await ler(raiz)).startedAt, antigo.startedAt);
    await rodar(raiz, fim);
    assert.deepEqual(await rodar(raiz, ['passo', '--n', '1', '--agente', 'a', '--rotulo', 'Pesquisar']), { code: 0, linhas: [RECRIADO] });
    const novo = await ler(raiz);
    assert.deepEqual([novo.status, status(novo), novo.handoff], ['running', { a: 'working', b: 'idle', c: 'idle' }, null]);
    assert.deepEqual(novo.step, { current: 1, total: 4, label: 'Pesquisar' });
    assert.ok(novo.startedAt > antigo.startedAt && novo.startedAt === novo.updatedAt, `${antigo.startedAt} → ${novo.startedAt}`);
    assert.deepEqual(Object.keys(novo), ['crew', 'status', 'step', 'agents', 'handoff', 'startedAt', 'updatedAt']);
  });
}

test('E1-02 (§3): --passos or --n that is not an integer from 1 up leaves the total empty and the step where it was', async (t) => {
  const raiz = await projeto(t);
  await rodarTodos(raiz, [['iniciar', '--passos', 'cinco'], ['passo', '--n', '2', '--agente', 'a'], ['passo', '--n', '0', '--agente', 'a'], ['checkpoint', '--n', '1.5']]);
  assert.deepEqual((await ler(raiz)).step, { current: 2, total: null, label: '' });
  await rodarTodos(raiz, [['iniciar', '--passos', '0'], ['passo', '--agente', 'a', '--rotulo', '--mensagem', 'Pauta pronta']]);
  assert.deepEqual((await ler(raiz)).step, { current: 0, total: null, label: '' }, 'an option with no value takes nothing from the next one');
});

test('E1-02 (rules 2, 5 and 11): iniciar replaces even a cut file; pular without --agente and an unexpected error are ignored, in one line', async (t) => {
  const raiz = await projeto(t, { estado: CORTADO });
  assert.deepEqual([await rodar(raiz, ['iniciar', '--passos', '2']), (await ler(raiz)).step.total], [{ code: 0, linhas: [OK] }, 2]);
  const antes = await snapshot(raiz);
  assert.deepEqual(await rodar(raiz, ['pular']), { code: 0, linhas: ['ESTADO:IGNORADO — o evento pular precisa de --agente. Ids válidos: a, b, c'] });
  const quebrado = { agora: () => { throw new Error('relógio\r\n  quebrado'); } };
  assert.deepEqual(await rodar(raiz, ['concluir'], quebrado), { code: 0, linhas: ['ESTADO:IGNORADO — erro inesperado: relógio quebrado'] });
  assert.deepEqual(await snapshot(raiz), antes);
});
