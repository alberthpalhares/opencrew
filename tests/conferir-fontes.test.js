// specs/fase-u2-crew-que-conhece-o-projeto.md — U2-02: the crew does not break when the user
// reorganizes the project. Fixtures reproduce the real cases (Projeto B: absolute paths that
// broke after moving files; Projeto A: logo with a different file name).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { conferir, corrigir, main } from '../templates/_opencrew/core/scripts/conferir-fontes.mjs';
import { mkTmp } from './_helpers.js';

async function escrever(raiz, rel, conteudo = 'x') {
  const abs = path.join(raiz, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, conteudo);
}

/** A project with one crew whose step cites `refs` between backticks. */
async function projeto(refs, { crewYaml = 'name: "c"\n' } = {}) {
  const raiz = await mkTmp('fontes');
  await escrever(raiz, 'crews/c/crew.yaml', crewYaml);
  await escrever(raiz, 'crews/c/pipeline/steps/step-01.md', `# Passo\n\nCarregar:\n${refs.map((r) => `- \`${r}\``).join('\n')}\n`);
  return raiz;
}

const abs = (raiz, rel) => path.join(raiz, rel).split(path.sep).join('/');
const ref = (r, texto) => r.refs.find((x) => x.ref === texto);

test('U2-02a: a moved file (absolute path) is PENDENTE with the new RELATIVE path suggested', async () => {
  const raiz = await projeto([]);
  const antigo = abs(raiz, 'Ativos/Reforma/Estatuto_2021.md'); // where the file USED to be
  await escrever(raiz, 'crews/c/pipeline/steps/step-01.md', `- \`${antigo}\`\n`);
  await escrever(raiz, 'Ativos/_Arquivo_Historico/Estatuto_2021.md'); // where it is now

  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(r.status, 'PENDENTE');
  const item = ref(r, antigo);
  assert.equal(item.estado, 'faltando');
  assert.equal(item.sugestao, 'Ativos/_Arquivo_Historico/Estatuto_2021.md');
});

test('U2-02b: an absolute path that exists inside the project is flagged as not portable', async () => {
  const raiz = await projeto([]);
  await escrever(raiz, 'Docs/Decisoes.md');
  const absoluto = abs(raiz, 'Docs/Decisoes.md');
  await escrever(raiz, 'crews/c/pipeline/steps/step-01.md', `- \`${absoluto}\`\n`);
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(r.status, 'OK', 'portability is an alert, not a pending item');
  const item = ref(r, absoluto);
  assert.equal(item.estado, 'nao-portatil');
  assert.equal(item.sugestao, 'Docs/Decisoes.md');
});

test('U2-02c: a file with another name in the expected folder lists the folder contents', async () => {
  const raiz = await projeto(['Ativos/PNG/vertical_fundo_escuro.png']);
  await escrever(raiz, 'Ativos/PNG/Vertical_Preta.png');
  await escrever(raiz, 'Ativos/PNG/Horizontal_Preta.png');
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(r.status, 'PENDENTE');
  const item = ref(r, 'Ativos/PNG/vertical_fundo_escuro.png');
  assert.equal(item.sugestao, null);
  assert.deepEqual(item.pasta.sort(), ['Horizontal_Preta.png', 'Vertical_Preta.png']);
});

test('U2-02d: two files with the same name are listed, none is chosen', async () => {
  const raiz = await projeto(['Docs/Antigo/ata.md']);
  await escrever(raiz, 'Docs/2025/ata.md');
  await escrever(raiz, 'Docs/2026/ata.md');
  const r = await conferir({ raiz, crew: 'crews/c' });
  const item = ref(r, 'Docs/Antigo/ata.md');
  assert.equal(item.sugestao, null);
  assert.deepEqual(item.candidatos.sort(), ['Docs/2025/ata.md', 'Docs/2026/ata.md']);
});

test('U2-02e: --corrigir rewrites unique suggestions with a .bak and the next check is OK', async () => {
  const raiz = await projeto(['Docs/Velho/regimento.md']);
  await escrever(raiz, 'Docs/Novo/regimento.md');
  const passo = path.join(raiz, 'crews/c/pipeline/steps/step-01.md');
  const original = await fs.readFile(passo, 'utf8');

  const r = await conferir({ raiz, crew: 'crews/c' });
  const n = await corrigir({ raiz, resultado: r });
  assert.equal(n, 1);
  assert.match(await fs.readFile(passo, 'utf8'), /`Docs\/Novo\/regimento\.md`/);
  assert.equal(await fs.readFile(`${passo}.bak`, 'utf8'), original);
  assert.equal((await conferir({ raiz, crew: 'crews/c' })).status, 'OK');
});

test('U2-02f: crew-relative and project-relative paths that exist, and fontes:, are OK', async () => {
  const crewYaml = 'name: "c"\nfontes:\n  - caminho: Memoria/01_Decisoes.md\n    para_que: decisões\n  - caminho: Ativos/Marca/\n    para_que: logos\n';
  const raiz = await projeto(['pipeline/data/brief.md', '_opencrew/_memory/company.md', 'output/rascunho.md', 'crews/c/output/{run_id}/x.md'], { crewYaml });
  await escrever(raiz, 'crews/c/pipeline/data/brief.md');
  await escrever(raiz, '_opencrew/_memory/company.md');
  await escrever(raiz, 'Memoria/01_Decisoes.md');
  await escrever(raiz, 'Ativos/Marca/logo.png');
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(r.status, 'OK');
  assert.ok(ref(r, 'Memoria/01_Decisoes.md'), 'fontes: entries are checked');
  assert.equal(ref(r, 'output/rascunho.md'), undefined, 'run outputs are not sources');
});

test('U2-02 CLI: report in PT-BR, last line FONTES:*, "Nada a corrigir." when clean', async () => {
  const raiz = await projeto(['pipeline/data/brief.md']);
  await escrever(raiz, 'crews/c/pipeline/data/brief.md');
  const linhas = [];
  const code = await main(['--crew', 'crews/c', '--corrigir'], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  assert.equal(code, 0);
  assert.ok(linhas.some((l) => /Conferência de fontes/.test(l)));
  assert.ok(linhas.some((l) => /Nada a corrigir\./.test(l)));
  assert.equal(linhas.filter((l) => l.trim()).at(-1), 'FONTES:OK');
});
