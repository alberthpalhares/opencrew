// AGENTS.md rule 14 for phase E3 (specs/fase-e3-conversa-e-entrega.md, E3-upg): a 1.18.0 workspace
// gets the new office page — the rooms, the furniture, the day and night, the conversation of the
// delivery — with one `update`. The new page is served by the server of the WORKSPACE, and a
// `state.json` written by 1.18.0 is drawn by it without error; no file of the crew is touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';
import { ANTIGA, CREW } from './_conserto.js';

// What E3 brings to the page: none of it is in a 1.18.0 workspace.
const NOVOS = ['cena-sala.js', 'folha-salas.js', 'sprites-parede.js', 'sprites-moveis.js', 'modelo-periodo.js', 'modelo-moveis.js', 'modelo-ambiente.js', 'modelo-falas.js'];
const HORA = '2026-10-12T10:00:00.000Z';
// A state as `estado.mjs` of 1.18.0 writes it, in the middle of a run: the second step, with the
// handoff of the first and the `personagem` of phase E2.
const ESTADO_1180 = {
  crew: 'atas', status: 'running', step: { current: 2, total: 3, label: 'Revisar a ata' },
  agents: [
    { id: 'rita-redacao', name: 'Rita Redação', icon: '📝', status: 'done', label: 'Escrever a ata', personagem: 'feminino' },
    { id: 'vito-veredito', name: 'Vito Veredito', icon: '📝', status: 'working', label: '', personagem: 'masculino' },
  ],
  handoff: { from: 'rita-redacao', to: 'vito-veredito', message: 'Ata pronta, com as três deliberações.', completedAt: HORA },
  startedAt: HORA, updatedAt: HORA,
};

async function workspace1180(t) {
  const dir = await mkTmp('upgrade-e3');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const core = path.join(dir, '_opencrew', 'core');
  for (const novo of NOVOS) await fs.rm(path.join(core, 'escritorio', novo), { force: true });
  // The 1.18.0 page had one room of 320×180, and its server knew nothing of the new modules.
  await fs.writeFile(path.join(core, 'escritorio', 'modelo-mesas.js'), '// 1.18.0\nexport const LARGURA = 320;\nexport const ALTURA = 180;\n');
  await fs.writeFile(path.join(core, 'escritorio', 'animacao.js'), '// 1.18.0\nexport const IDA_MS = 2000;\nexport const VOLTA_MS = 2000;\n');
  await fs.writeFile(path.join(core, 'scripts', 'escritorio.mjs'), '// 1.18.0\nexport const ARQUIVOS = [];\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.18.0\n');
  await fs.writeFile(path.join(dir, '_opencrew', '_memory', 'preferences.md'), '- **Dashboard:** enabled\n');
  for (const [arquivo, conteudo] of Object.entries({ ...ANTIGA, [`${CREW}/state.json`]: `${JSON.stringify(ESTADO_1180, null, 2)}\n` })) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  return { dir, core };
}

// The page is served to a browser as ES modules; to import it here, Node 20 needs to be told so
// (a package.json beside it, written in the temporary workspace of the test only).
async function doWorkspace(core, ...partes) {
  await fs.writeFile(path.join(core, partes[0], 'package.json'), '{ "type": "module" }\n');
  return import(`${pathToFileURL(path.join(core, ...partes)).href}?e3-upg`);
}

test('E3-upg: update from 1.18.0 delivers the new office; the new page is served and a state.json written by 1.18.0 is drawn without error, with nothing of the crew touched', async (t) => {
  const { dir, core } = await workspace1180(t);
  const antes = await snapshot(path.join(dir, 'crews'));

  await captureOutput(() => withCwd(dir, () => update()));

  for (const novo of NOVOS) assert.equal(await exists(path.join(core, 'escritorio', novo)), true, `missing after update: ${novo}`);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'update changed a file under crews/');

  // Served by the server of the WORKSPACE, from its own closed list: every file of the page.
  const { ARQUIVOS } = await doWorkspace(core, 'scripts', 'escritorio.mjs');
  const pagina = (await fs.readdir(path.join(core, 'escritorio'))).filter((nome) => nome !== 'package.json').sort();
  assert.deepEqual([...ARQUIVOS].sort(), pagina, 'the server answers for every file of the page, and only for them');
  const { criarServidor } = await doWorkspace(core, 'scripts', 'escritorio', 'servidor.mjs');
  const servidor = criarServidor({ raiz: dir, pasta: path.join(core, 'escritorio'), arquivos: ARQUIVOS });
  t.after(() => new Promise((ok) => { servidor.closeAllConnections?.(); servidor.close(() => ok()); }));
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  const pedir = (caminho) => fetch(`http://127.0.0.1:${servidor.address().port}${caminho}`);
  const html = await (await pedir('/')).text();
  assert.match(html, /id="rever"[^>]*>Rever entrega</, 'the page served is the new one');
  for (const nome of ARQUIVOS) assert.equal((await pedir(`/${nome}`)).status, 200, nome);
  const { crews } = await (await pedir('/estado')).json();
  assert.deepEqual(crews.map((c) => [c.crew, c.estado]), [['atas', ESTADO_1180]], 'the state of 1.18.0, as it is on disk');

  // Drawn by the page of the WORKSPACE: the room of that cast, a delivery with its lines, by day and by night.
  const { MEMORIA_INICIAL, consultar, montarPagina, transicao, rever, quadro, SEM_ANIMACAO } = await doWorkspace(core, 'escritorio', 'modelo.js');
  const { pintarCena } = await doWorkspace(core, 'escritorio', 'cena.js');
  const agora = Date.parse(HORA);
  const memoria = consultar(MEMORIA_INICIAL, { crews });
  for (const hora of [{ horas: 10, minutos: 0 }, { horas: 22, minutos: 30 }]) {
    const leitura = transicao(null, montarPagina(memoria, { agoraMs: agora, hora }), agora);
    assert.deepEqual([leitura.crew, leitura.ambiente.sala.nome, leitura.animacao, leitura.falas], ['atas', 'pequena', SEM_ANIMACAO, []]);
    assert.equal(leitura.passagem.mensagem, ESTADO_1180.handoff.message);
    const denovo = rever(leitura, agora);
    const ditas = new Set();
    for (let ms = 0; ms <= 10500; ms += 250) {
      const bonecos = quadro(denovo, agora + ms);
      const cores = [];
      pintarCena({ globalAlpha: 1, set fillStyle(cor) { this.cor = cor; }, fillRect() { cores.push(this.cor); } }, bonecos, denovo.ambiente);
      assert.ok(bonecos.length === 2 && cores.length > 0 && cores.every((cor) => /^#[0-9a-f]{6}$/.test(cor)), `${ms} ms`);
      for (const b of bonecos) if (b.fala) ditas.add(`${b.id}: ${b.fala}`);
    }
    assert.deepEqual([...ditas], ['rita-redacao: Ata pronta, com as três deliberações.', 'vito-veredito: Deixa comigo.']);
  }
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'drawing the office writes nothing under crews/');
});
