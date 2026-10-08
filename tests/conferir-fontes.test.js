// specs/fase-u2-crew-que-conhece-o-projeto.md — U2-02: the crew does not break when the user
// reorganizes the project. Fixtures reproduce the real cases (Projeto B: absolute paths that
// broke after moving files; Projeto A: logo with a different file name).
// specs/fase-r1-reparos-1-6-1.md — R1-06: the check reads what the crew really cites (fontes:
// with a comment, agents and tasks), tells the truth and refuses a crew outside the project.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { conferir, corrigir, formatar, main } from '../templates/_opencrew/core/scripts/conferir-fontes.mjs';
import { mkTmp, snapshot } from './_helpers.js';

async function escrever(raiz, rel, conteudo = 'x') {
  const abs = path.join(raiz, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, conteudo);
}

/** A project (it has `_opencrew/`) with one crew whose step cites `refs` between backticks. */
async function projeto(refs, { crewYaml = 'name: "c"\n' } = {}) {
  const raiz = await mkTmp('fontes');
  await fs.mkdir(path.join(raiz, '_opencrew'));
  await escrever(raiz, 'crews/c/crew.yaml', crewYaml);
  await escrever(raiz, 'crews/c/pipeline/steps/step-01.md', `# Passo\n\nCarregar:\n${refs.map((r) => `- \`${r}\``).join('\n')}\n`);
  return raiz;
}

const abs = (raiz, rel) => path.join(raiz, rel).split(path.sep).join('/');
const ref = (r, texto) => r.refs.find((x) => x.ref === texto);
const pendentes = (r) => r.refs.filter((x) => x.estado === 'faltando').map((x) => x.ref).sort();
const semStatus = (linhas) => !linhas.some((l) => l.startsWith('FONTES:'));
const ultima = (linhas) => linhas.filter((l) => l.trim()).at(-1);
const SEM_CORRECAO = 'Não há correção automática para 1 pendência(s): escolha um candidato ou corrija o caminho na crew.';

/** Runs the CLI inside `raiz`: exit code and printed lines. */
async function rodar(raiz, args) {
  const linhas = [];
  const code = await main(args, { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas };
}

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

test('R1-06a: caminho: with a trailing comment and caminho: between double quotes are both checked', async () => {
  const crewYaml = 'name: "c"\nfontes:\n  - caminho: Docs/guia.md   # comentário\n    para_que: guia\n  - caminho: "Docs/outro.md"\n    para_que: outro\n';
  const raiz = await projeto([], { crewYaml });
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(r.status, 'PENDENTE');
  assert.deepEqual(pendentes(r), ['Docs/guia.md', 'Docs/outro.md']);
});

test('R1-06a: single quotes with a comment, an apostrophe and a # inside the path are read as written', async () => {
  const crewYaml = 'name: "c"\nfontes:\n  - caminho: \'Docs/um.md\'  # comentário\n  - caminho: Docs/Caixa d\'Agua/dois.md\n  - caminho: Docs/C#/tres.md # comentário\n';
  const raiz = await projeto([], { crewYaml });
  const caminhos = ['Docs/C#/tres.md', "Docs/Caixa d'Agua/dois.md", 'Docs/um.md'];
  assert.deepEqual(pendentes(await conferir({ raiz, crew: 'crews/c' })), caminhos);

  for (const c of caminhos) await escrever(raiz, c);
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(r.status, 'OK');
  assert.deepEqual(r.refs.map((x) => x.estado), ['ok', 'ok', 'ok']);
});

test('R1-06b: a missing path between backticks in a task and another in an agent file are two pending items', async () => {
  const raiz = await projeto([]);
  await escrever(raiz, 'crews/c/agents/redator.agent.md', '# Redator\n\nSiga `Docs/tom-de-voz.md`.\n');
  await escrever(raiz, 'crews/c/agents/redator/tasks/escrever.md', '# Escrever\n\n1. Leia `Docs/briefing.md`.\n');
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(r.status, 'PENDENTE');
  assert.deepEqual(pendentes(r), ['Docs/briefing.md', 'Docs/tom-de-voz.md']);
  assert.match(ref(r, 'Docs/briefing.md').citadoEm[0], /agents[\\/]redator[\\/]tasks[\\/]escrever\.md$/);
  assert.match(ref(r, 'Docs/tom-de-voz.md').citadoEm[0], /agents[\\/]redator\.agent\.md$/);
});

test('R1-06c: --crew outside the project with --corrigir → exit 1, "Caminho fora do projeto", nothing written', async () => {
  const base = await mkTmp('fontes-fora');
  const raiz = path.join(base, 'projeto');
  await escrever(raiz, '_opencrew/_memory/company.md');
  await escrever(raiz, 'Docs/Novo/regimento.md'); // a unique suggestion: --corrigir would rewrite the step
  await escrever(base, 'vizinho/crews/c/crew.yaml', 'name: "c"\n');
  await escrever(base, 'vizinho/crews/c/pipeline/steps/step-01.md', '- `Docs/Velho/regimento.md`\n');
  const antes = await snapshot(base);

  const { code, linhas } = await rodar(raiz, ['--crew', '../vizinho/crews/c', '--corrigir']);
  assert.equal(code, 1);
  assert.deepEqual(linhas, ['Caminho fora do projeto: ../vizinho/crews/c']);
  assert.ok(semStatus(linhas));
  assert.deepEqual(await snapshot(base), antes, 'no file written, inside or outside the project');
});

test('R1-06c: an outside --crew is refused before testing whether it exists', async () => {
  const raiz = await projeto([]);
  const { code, linhas } = await rodar(raiz, ['--crew', '../nao-existe/crews/c']);
  assert.equal(code, 1);
  assert.deepEqual(linhas, ['Caminho fora do projeto: ../nao-existe/crews/c']);
});

test('R1-06d: --corrigir with a two-candidate pending item says there is no automatic fix', async () => {
  const raiz = await projeto(['Docs/Antigo/ata.md']);
  await escrever(raiz, 'Docs/2025/ata.md');
  await escrever(raiz, 'Docs/2026/ata.md');
  const { code, linhas } = await rodar(raiz, ['--crew', 'crews/c', '--corrigir']);
  assert.equal(code, 0);
  assert.ok(linhas.includes(SEM_CORRECAO));
  assert.ok(!linhas.some((l) => /Nada a corrigir/.test(l)));
  assert.equal(ultima(linhas), 'FONTES:PENDENTE');
});

test('R1-06d: --corrigir still rewrites the unique suggestion and counts only what is left', async () => {
  const raiz = await projeto(['Docs/Velho/regimento.md', 'Docs/Antigo/ata.md']);
  await escrever(raiz, 'Docs/Novo/regimento.md');
  await escrever(raiz, 'Docs/2025/ata.md');
  await escrever(raiz, 'Docs/2026/ata.md');
  const { linhas } = await rodar(raiz, ['--crew', 'crews/c', '--corrigir']);
  const passo = await fs.readFile(path.join(raiz, 'crews/c/pipeline/steps/step-01.md'), 'utf8');
  assert.match(passo, /`Docs\/Novo\/regimento\.md`/);
  assert.match(passo, /`Docs\/Antigo\/ata\.md`/, 'the item without a unique suggestion does not change');
  assert.ok(linhas.includes('Corrigi: crews/c/pipeline/steps/step-01.md (cópia: step-01.md.bak)'), linhas.join('\n'));
  assert.ok(linhas.includes(SEM_CORRECAO));
  assert.ok(!linhas.some((l) => /Nada a corrigir/.test(l)));
  assert.equal(ultima(linhas), 'FONTES:PENDENTE');
});

test('R1-06e: a moved folder cited in fontes: without the trailing slash gets the new path suggested', async () => {
  const raiz = await projeto([], { crewYaml: 'name: "c"\nfontes:\n  - caminho: Docs/Marca\n    para_que: logos\n' });
  await escrever(raiz, 'Ativos/Marca/logo.png'); // the folder used to be Docs/Marca
  const r = await conferir({ raiz, crew: 'crews/c' });
  const item = ref(r, 'Docs/Marca');
  assert.equal(item.estado, 'faltando');
  assert.equal(item.sugestao, 'Ativos/Marca/');
  assert.match(formatar(r), /Não encontrei `Docs\/Marca` .*Novo caminho sugerido: `Ativos\/Marca\/`/);
});

test('R1-06f: a name search that stops at the item limit is reported as partial', async () => {
  const PARCIAL = 'Procurei só nos primeiros 2 itens do projeto; pode existir um arquivo com esse nome que eu não vi.';
  const raiz = await projeto(['Docs/Velho/guia.md']);
  await escrever(raiz, 'Docs/Novo/guia.md'); // 3 levels deep: never among the first 2 items
  const inteira = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(inteira.buscaParcial, false);
  assert.equal(ref(inteira, 'Docs/Velho/guia.md').sugestao, 'Docs/Novo/guia.md');
  assert.match(formatar(inteira), /Novo caminho sugerido/);

  const r = await conferir({ raiz, crew: 'crews/c', limite: 2 });
  assert.equal(r.buscaParcial, true);
  assert.equal(r.status, 'PENDENTE');
  assert.deepEqual(ref(r, 'Docs/Velho/guia.md').candidatos, []);
  const relatorio = formatar(r);
  assert.ok(relatorio.includes(PARCIAL), relatorio);
  assert.ok(!relatorio.includes('nem nada com esse nome no projeto'));
});

test('R1-06g: run from a folder without _opencrew/ → exit 1, the verifier message, no FONTES: line', async () => {
  const raiz = await mkTmp('fontes-sem-raiz');
  await escrever(raiz, 'crews/c/crew.yaml', 'name: "c"\n');
  const { code, linhas } = await rodar(raiz, ['--crew', 'crews/c']);
  assert.equal(code, 1);
  assert.deepEqual(linhas, ['Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto.']);
  assert.ok(semStatus(linhas));
});

test('R1-06h: --crew crews/nao-existe → exit 1, "Crew não encontrada: crews/nao-existe", no FONTES: line', async () => {
  const raiz = await projeto([]);
  const { code, linhas } = await rodar(raiz, ['--crew', 'crews/nao-existe', '--corrigir']);
  assert.equal(code, 1);
  assert.deepEqual(linhas, ['Crew não encontrada: crews/nao-existe']);
  assert.ok(semStatus(linhas));
});

test('R1-06h: a file where the crew folder should be is not a crew', async () => {
  const raiz = await projeto([]);
  await escrever(raiz, 'crews/arquivo', 'name: "c"\n');
  const { code, linhas } = await rodar(raiz, ['--crew', 'crews/arquivo']);
  assert.equal(code, 1);
  assert.deepEqual(linhas, ['Crew não encontrada: crews/arquivo']);
});

test('R1-06i: without --crew → exit 1, "Falta a opção obrigatória --crew." and the usage line, no FONTES: line', async () => {
  const raiz = await projeto([]);
  const { code, linhas } = await rodar(raiz, ['--corrigir']);
  assert.equal(code, 1);
  assert.deepEqual(linhas, [
    'Falta a opção obrigatória --crew.',
    'Uso: node _opencrew/core/scripts/conferir-fontes.mjs --crew crews/<nome> [--corrigir]',
  ]);
});

test('R1-06j: a path with a template marker between backticks in an agent file is not checked', async () => {
  const modelos = [
    'Relatorios/AAAA-MM-DD_resumo.pdf', 'Relatorios/YYYY-MM-DD-nota.md', 'Relatorios/DD-MM-AAAA_ata.md',
    'Relatorios/AAAAMMDD.csv', 'Relatorios/aaaa-mm-dd_resumo.md', 'Relatorios/MM-AA_fechamento.xlsx',
    'Atas/ata_HHMM.md', 'Entregas/slide-NN.png', 'Entregas/.../proposta.pdf',
  ];
  const raiz = await projeto([]);
  const citados = modelos.map((m) => `\`${m}\``).join(', ');
  await escrever(raiz, 'crews/c/agents/redator.agent.md', `# Redator\n\n- **Writes to**: ${citados}\n\nGrave também em ${citados}.\n`);
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.deepEqual(r.refs.map((x) => x.ref), [], 'a name to fill in is not a file');
  const { linhas } = await rodar(raiz, ['--crew', 'crews/c']);
  assert.equal(ultima(linhas), 'FONTES:OK');
});

test('R1-06j: a real date in the name, and names that only look like a marker, are still checked', async () => {
  const reais = [
    'Relatorios/2026-03-03_resumo.pdf', 'Docs/MM Advogados/contrato.pdf', 'Docs/DD/planilha.csv',
    'Docs/XX Congresso/anais.pdf', 'Docs/[FINAL] logo.png', 'Docs/Ammyy/guia.md', 'Docs/ANN/lista.md',
  ];
  const raiz = await projeto([]);
  await escrever(raiz, 'crews/c/agents/redator.agent.md', `# Redator\n\nLeia ${reais.map((m) => `\`${m}\``).join(', ')}.\n`);
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(r.status, 'PENDENTE');
  assert.deepEqual(pendentes(r), [...reais].sort());
});
