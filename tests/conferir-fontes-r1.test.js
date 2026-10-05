// specs/fase-r1-reparos-1-6-1.md — R1-06, what the review before the 1.6.1 tag found in the source
// check: --corrigir rewrites only the citation it read, a destination never gets an automatic fix,
// a command is not a path, and the report and the reading stay small and fast in a big project.
// (The scenarios R1-06a to R1-06j themselves are in conferir-fontes.test.js.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { conferir, corrigir, formatar, main } from '../templates/_opencrew/core/scripts/conferir-fontes.mjs';
import { mkTmp } from './_helpers.js';

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/scripts');
const PASSO = 'crews/c/pipeline/steps/step-01.md';
const AGENTE = 'crews/c/agents/redator.agent.md';
const TASK = 'crews/c/agents/redator/tasks/escrever.md';
const SEM_CORRECAO = 'Não há correção automática para 1 pendência(s): escolha um candidato ou corrija o caminho na crew.';

async function escrever(raiz, rel, conteudo = 'x') {
  const abs = path.join(raiz, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, conteudo);
}

/** A project (it has `_opencrew/`) with one crew; `arquivos` maps a relative path to its content. */
async function projeto(arquivos = {}) {
  const raiz = await mkTmp('fontes-r1');
  await fs.mkdir(path.join(raiz, '_opencrew'));
  await escrever(raiz, 'crews/c/crew.yaml', 'name: "c"\n');
  for (const [rel, conteudo] of Object.entries(arquivos)) await escrever(raiz, rel, conteudo);
  return raiz;
}

const ler = (raiz, rel) => fs.readFile(path.join(raiz, rel), 'utf8');
const ref = (r, texto) => r.refs.find((x) => x.ref === texto);
const pendentes = (r) => r.refs.filter((x) => x.estado === 'faltando').map((x) => x.ref).sort();

/** Runs the CLI with --corrigir inside `raiz`: the printed lines and the last one. */
async function corrigirPeloCli(raiz) {
  const linhas = [];
  await main(['--crew', 'crews/c', '--corrigir'], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { linhas, ultima: linhas.filter((l) => l.trim()).at(-1) };
}

test('R1-06e: --corrigir rewrites only the caminho: value — name, description and a sibling path stay', async () => {
  const crewYaml = [
    'name: "Conteúdo da Marca"',
    'description: "Posts com a voz da Marca"',
    'fontes:',
    '  - caminho: Marca   # a pasta mudou de lugar',
    '    para_que: logos da Marca',
    '  - caminho: "Marca-2024/guia.pdf"',
    '    para_que: guia',
    '',
  ].join('\n');
  const raiz = await projeto({ 'crews/c/crew.yaml': crewYaml, 'Ativos/Marca/logo.png': 'x', 'Marca-2024/guia.pdf': 'x' });
  const { ultima } = await corrigirPeloCli(raiz);
  assert.equal(await ler(raiz, 'crews/c/crew.yaml'), crewYaml.replace('caminho: Marca  ', 'caminho: Ativos/Marca/  '));
  assert.equal(await ler(raiz, 'crews/c/crew.yaml.bak'), crewYaml);
  assert.equal(ultima, 'FONTES:OK');
});

test('R1-06a: --corrigir keeps the quotes, the comment and the line ending, and writes a $ of the new path as it is', async () => {
  const crewYaml = 'name: "c"\r\nfontes:\r\n  - caminho: "Docs/Velho/tabela.csv"  # preços de Docs/Velho/tabela.csv\r\n';
  const raiz = await projeto({ 'crews/c/crew.yaml': crewYaml, 'Custos R$$ 2026/tabela.csv': 'x' });
  const { ultima } = await corrigirPeloCli(raiz);
  assert.equal(await ler(raiz, 'crews/c/crew.yaml'), crewYaml.replace('Docs/Velho', () => 'Custos R$$ 2026'));
  assert.equal(ultima, 'FONTES:OK');
});

test('R1-06b: --corrigir in an agent rewrites the citation, not a longer path, the frontmatter or the prose', async () => {
  const agente = [
    '---',
    'id: "crews/c/agents/redator"',
    'logo: assets/logo.png',
    '---',
    '# Redator',
    '',
    'Use ` assets/logo.png ` no topo e `brand/assets/logo.png` no rodapé.',
    'O arquivo assets/logo.png, fora de crases, fica como está.',
    '',
  ].join('\n');
  const raiz = await projeto({ [AGENTE]: agente, 'brand/assets/logo.png': 'x' });
  const { ultima } = await corrigirPeloCli(raiz);
  assert.equal(await ler(raiz, AGENTE), agente.replace('` assets/logo.png `', '` brand/assets/logo.png `'));
  assert.equal(ultima, 'FONTES:OK');
});

test('U2-02b: the project root cited as an absolute path gets no suggestion; other absolute paths are fixed right', async () => {
  const raiz = await projeto({ 'Memoria/01_Decisoes.md': 'x' });
  const absoluta = raiz.split(path.sep).join('/');
  await escrever(raiz, PASSO, `- \`${absoluta}/\`\n- \`${absoluta}/Memoria/01_Decisoes.md\`\n`);
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(ref(r, `${absoluta}/`).estado, 'nao-portatil');
  assert.equal(ref(r, `${absoluta}/`).sugestao, null, 'the root itself has no relative path to suggest');
  const { ultima } = await corrigirPeloCli(raiz);
  assert.equal(await ler(raiz, PASSO), `- \`${absoluta}/\`\n- \`Memoria/01_Decisoes.md\`\n`);
  assert.equal(ultima, 'FONTES:OK');
});

test('R1 revisão: a path cited only in the Writes to line of an agent is listed, never rewritten by --corrigir', async () => {
  const agente = '# Redator\n\n## Integration\n\n- **Reads from**: `Docs/briefing.md`\n- **Writes to**: `Entregas/post-final.md`\n';
  const designer = '# Designer\n\n* **Writes to:** `Entregas/capa.png`\n'; // the colon inside the bold
  const raiz = await projeto({ [AGENTE]: agente, 'crews/c/agents/designer.agent.md': designer });
  for (const antigo of ['post-final.md', 'briefing.md', 'capa.png']) await escrever(raiz, `Arquivo/2025/${antigo}`, 'antigo');
  const r = await conferir({ raiz, crew: 'crews/c' });
  const destino = ref(r, 'Entregas/post-final.md');
  assert.equal(destino.estado, 'faltando', 'a destination without a template marker is still a pending item');
  assert.equal(destino.sugestao, null, 'the crew would write over the file found');
  assert.deepEqual(destino.candidatos, ['Arquivo/2025/post-final.md']);
  assert.equal(ref(r, 'Entregas/capa.png').sugestao, null);
  assert.equal(ref(r, 'Docs/briefing.md').sugestao, 'Arquivo/2025/briefing.md', 'Reads from is a source');
  assert.match(formatar(r), /Não encontrei `Entregas\/post-final\.md` .*Encontrei 1 candidato: `Arquivo\/2025\/post-final\.md`/);

  const { linhas, ultima } = await corrigirPeloCli(raiz);
  assert.equal(await ler(raiz, AGENTE), agente.replace('Docs/briefing.md', 'Arquivo/2025/briefing.md'));
  assert.equal(await ler(raiz, 'crews/c/agents/designer.agent.md'), designer);
  assert.ok(linhas.includes(SEM_CORRECAO.replace('1 pendência', '2 pendência')));
  assert.equal(ultima, 'FONTES:PENDENTE');
});

test('R1 revisão: a path cited in Writes to and also read somewhere else is a source like any other', async () => {
  const agente = '# Revisor\n\n- **Writes to**: `Docs/parecer.md`\n';
  const raiz = await projeto({ [AGENTE]: agente, [PASSO]: 'Leia `Docs/parecer.md`.\n', 'Arquivo/parecer.md': 'x' });
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(ref(r, 'Docs/parecer.md').sugestao, 'Arquivo/parecer.md');
});

test('R1-06b: a command between backticks is not a path; a path with a space is still checked', async () => {
  const agente = '# Designer\n\nRode `node skills/image-creator/scripts/render.js` e depois\n`npx playwright screenshot slide.html prints/slide.png`. Use `Ativos/Identidade Visual/logo.png`.\n';
  const raiz = await projeto({ [AGENTE]: agente });
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.deepEqual(r.refs.map((x) => x.ref), ['Ativos/Identidade Visual/logo.png']);
});

test('U2-02c: a big expected folder or a long candidate list shows 20 names and says how many more there are', async () => {
  const raiz = await projeto({ [PASSO]: '- `Fotos/capa-da-campanha.jpg`\n- `Docs/briefing.md`\n' });
  for (let i = 0; i < 200; i++) await escrever(raiz, `Fotos/foto-${String(i).padStart(3, '0')}.jpg`);
  for (let i = 0; i < 30; i++) await escrever(raiz, `Clientes/cliente-${i}/briefing.md`);
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(ref(r, 'Fotos/capa-da-campanha.jpg').pasta.length, 200, 'the result keeps the whole list');
  assert.equal(ref(r, 'Docs/briefing.md').candidatos.length, 30);

  const linhas = formatar(r).split('\n');
  const daPasta = linhas.find((l) => l.includes('capa-da-campanha'));
  assert.equal(daPasta.match(/foto-\d{3}\.jpg/g).length, 20);
  assert.match(daPasta, /Na pasta esperada existem: foto-.*, … e mais 180$/);
  const dosCandidatos = linhas.find((l) => l.includes('`Docs/briefing.md`'));
  assert.equal(dosCandidatos.match(/`Clientes\/cliente-\d+\/briefing\.md`/g).length, 20);
  assert.match(dosCandidatos, /Encontrei 30 candidatos: `Clientes\/.*`, … e mais 10$/);
});

test('R1-06a: a crew.yaml with 5,000 blank lines is read in under 2 s, with the dash on its own line too', async () => {
  const crewYaml = `name: "c"\n${'\n'.repeat(5000)}fontes:\n  -\n    caminho: Docs/guia.md\n  - caminho:\tDocs/outro.md\n`;
  const raiz = await projeto({ 'crews/c/crew.yaml': crewYaml });
  const inicio = Date.now();
  const r = await conferir({ raiz, crew: 'crews/c' });
  const duracao = Date.now() - inicio;
  assert.deepEqual(pendentes(r), ['Docs/guia.md', 'Docs/outro.md']);
  assert.ok(duracao < 2000, `took ${duracao} ms`);
});

test('R1-06b: a task cited as the agent frontmatter writes it (tasks/x.md) is found in agents/<agent>/', async () => {
  const raiz = await projeto({ [AGENTE]: '# Redator\n\nComece por `tasks/escrever.md`.\n', [TASK]: '# Escrever\n' });
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(ref(r, 'tasks/escrever.md').estado, 'ok');
  assert.equal(r.status, 'OK');
});

test('R1-06b: a path cited in a task is also looked for in the folder of the task itself', async () => {
  const raiz = await projeto({ [TASK]: '# Escrever\n\nSiga `./modelo.md` e `exemplos/post.md`.\n' });
  for (const vizinho of ['modelo.md', 'exemplos/post.md']) await escrever(raiz, `crews/c/agents/redator/tasks/${vizinho}`);
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.deepEqual(r.refs.map((x) => [x.ref, x.estado]), [['./modelo.md', 'ok'], ['exemplos/post.md', 'ok']]);
  assert.equal(r.status, 'OK');
});

test('R1-06b: a relative path that is in none of those places is still a pending item', async () => {
  const revisor = '# Revisor\n\nSiga `tasks/escrever.md` (a task de outro agente) e `tasks/revisar.md` (não existe).\n';
  const raiz = await projeto({ 'crews/c/agents/revisor.agent.md': revisor, [TASK]: '# Escrever\n' });
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.deepEqual(pendentes(r), ['tasks/escrever.md', 'tasks/revisar.md']);
  assert.equal(r.status, 'PENDENTE');
});

test('R1-06f: when the search stops at the limit, the only candidate seen is listed, not suggested, and --corrigir leaves it', async () => {
  // Two files with the same name, each at the end of a 10-level chain. In any reading order, the
  // first one is among items 11 to 15 and the second among items 21 to 25: the limit 18 splits them.
  const fundo = 'x/'.repeat(8);
  const crewYaml = 'name: "c"\nfontes:\n  - caminho: Docs/Antigo/ata.md\n';
  const raiz = await projeto({ 'crews/c/crew.yaml': crewYaml, [`Docs/2025/${fundo}ata.md`]: 'x', [`Docs/2026/${fundo}ata.md`]: 'x' });
  assert.equal(ref(await conferir({ raiz, crew: 'crews/c' }), 'Docs/Antigo/ata.md').candidatos.length, 2);

  const r = await conferir({ raiz, crew: 'crews/c', limite: 18 });
  const item = ref(r, 'Docs/Antigo/ata.md');
  assert.equal(r.buscaParcial, true);
  assert.equal(item.candidatos.length, 1, 'only one of the two was seen');
  assert.equal(item.sugestao, null, 'the file that was not seen may be the right one');
  const relatorio = formatar(r);
  const PARCIAL = 'Procurei só nos primeiros 18 itens do projeto; pode existir um arquivo com esse nome que eu não vi.';
  assert.ok(relatorio.includes(`Encontrei 1 candidato: \`${item.candidatos[0]}\`. ${PARCIAL}`), relatorio);
  assert.ok(!relatorio.includes('Novo caminho sugerido'), relatorio);
  assert.equal(await corrigir({ resultado: r }), 0);
  assert.equal(await ler(raiz, 'crews/c/crew.yaml'), crewYaml);
});

test('R1 revisão: the script runs as a process, also when the project is opened through a folder link', async () => {
  const raiz = await projeto({ [PASSO]: '- `Docs/briefing.md`\n', 'Docs/briefing.md': 'x' });
  const destino = path.join(raiz, '_opencrew', 'core', 'scripts');
  await fs.mkdir(path.join(destino, 'conferir-fontes'), { recursive: true });
  const modulos = (await fs.readdir(path.join(SCRIPTS, 'conferir-fontes'))).map((m) => `conferir-fontes/${m}`);
  for (const f of ['comum.mjs', 'conferir-fontes.mjs', ...modulos]) await fs.copyFile(path.join(SCRIPTS, f), path.join(destino, f));
  await fs.symlink(raiz, `${raiz}-elo`, 'junction');
  for (const cwd of [raiz, `${raiz}-elo`]) {
    const p = spawnSync(process.execPath, ['_opencrew/core/scripts/conferir-fontes.mjs', '--crew', 'crews/c'], { cwd, encoding: 'utf8' });
    assert.equal(p.status, 0, p.stderr);
    assert.equal(p.stdout.trimEnd().split('\n').at(-1), 'FONTES:OK', `cwd: ${cwd}`);
  }
  await fs.unlink(`${raiz}-elo`); // only the link goes away, not the project behind it
});

test('R1 revisão: with nothing to point out, one blank line separates the title from the summary', async () => {
  const raiz = await projeto({ [PASSO]: '- `Docs/briefing.md`\n', 'Docs/briefing.md': 'x' });
  const limpo = formatar(await conferir({ raiz, crew: 'crews/c' }));
  assert.equal(limpo, '## Conferência de fontes — crews/c\n\n**Resumo: 1 fontes — 1 ok, 0 pendentes, 0 alertas**\n');
  await fs.rm(path.join(raiz, 'Docs/briefing.md'));
  const comPendencia = formatar(await conferir({ raiz, crew: 'crews/c' }));
  assert.match(comPendencia, /^## Conferência de fontes — crews\/c\n\n- ❌ [^\n]+\n\n\*\*Resumo: 1 fontes — 0 ok, 1 pendentes, 0 alertas\*\*\n$/);
});
