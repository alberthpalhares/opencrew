// specs/fase-u4a-conserto-de-crews.md — U4a-01: the diagnosis of `conserto.mjs` reads a crew,
// says in PT-BR what is missing and never writes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshot } from './_helpers.js';
import { ANTIGA, ATUAL, CREW, PASSO, projeto, rodar } from './_conserto.js';

const passo = (linhas) => `---\n${linhas.join('\n')}\n---\n\n# Passo\n`;
const SKILL = '---\nname: envia\ndescription: "Envia e-mail"\nside_effects: irreversible\n---\n\n# Envia\n';

test('U4a-01a: a crew in the current format has nothing to repair and nothing is written', async (t) => {
  const raiz = await projeto(t);
  const antes = await snapshot(raiz);
  const r = await rodar(raiz);
  assert.equal(r.code, 0);
  assert.deepEqual(r.codigos, []);
  assert.match(r.texto, /A crew "atas" está em dia: não há o que consertar\./);
  assert.equal(r.fim, 'CONSERTO:OK');
  assert.deepEqual(await snapshot(raiz), antes);
});

test('U4a-01b: an old crew shows formato, fontes and proibicao, in this order, and nothing is written', async (t) => {
  const raiz = await projeto(t, ANTIGA);
  const antes = await snapshot(raiz);
  const r = await rodar(raiz);
  assert.equal(r.code, 0);
  assert.deepEqual(r.codigos, ['formato', 'fontes', 'proibicao']);
  assert.equal(r.linhas[0], 'Conserto da crew "atas" — 3 achados');
  assert.match(r.texto, /Passos: 1 \(minuta\.md\), 2 \(comunicado\.md\)/);
  assert.match(r.texto, /--aplicar "formato:<passo>=<formato>"/);
  assert.match(r.texto, /2\. Nunca citar o nome fantasia Grêmio Azul nos comunicados\./);
  assert.match(r.texto, /3\. Nunca prever votação por aclamação sem lista nominal\./);
  assert.doesNotMatch(r.texto, /1\. Nunca usar a denominação/, 'the quoted item is not pending');
  assert.equal(r.fim, 'CONSERTO:PENDENTE');
  assert.deepEqual(await snapshot(raiz), antes);
});

test('U4a-01b: one finding is announced in the singular', async (t) => {
  const raiz = await projeto(t, ATUAL, { [`${CREW}/crew.yaml`]: 'crew:\n  code: "atas"\n' });
  const r = await rodar(raiz);
  assert.equal(r.linhas[0], 'Conserto da crew "atas" — 1 achado');
  assert.deepEqual(r.codigos, ['fontes']);
});

test('U4a-01c: loose tier, a path-shaped agent id and a quoted on_reject are not findings (rule 5)', async (t) => {
  const raiz = await projeto(t, ATUAL, {
    [`${CREW}/crew.yaml`]: 'name: "Atas"\ntier: "full"\nfontes:\n  - caminho: Regras/estatuto.md\n    para_que: regras\n',
    [PASSO('step-01-redigir.md')]: passo(['execution: inline', 'agent: crews/atas/agents/rita-redacao', 'format: documento-oficial', 'outputFile: crews/atas/output/ata.md']),
    [PASSO('step-02-revisar.md')]: passo(['execution: inline', 'agent: vito-veredito', 'on_reject: "1"']),
  });
  const r = await rodar(raiz);
  assert.deepEqual(r.codigos, []);
  assert.equal(r.fim, 'CONSERTO:OK');
});

test('U4a-01c: without pipeline.yaml the steps are the files of pipeline/steps, in order', async (t) => {
  const raiz = await projeto(t, ATUAL, { [`${CREW}/pipeline/pipeline.yaml`]: null });
  assert.equal((await rodar(raiz)).fim, 'CONSERTO:OK');
});

test('U4a-01d: a step without format after the review is not a finding; an export format inside it is (rule 6)', async (t) => {
  const depois = await projeto(t, ATUAL, {
    [`${CREW}/pipeline/pipeline.yaml`]: 'steps:\n  - step: 1\n    file: "step-01-redigir.md"\n  - step: 2\n    file: "step-02-revisar.md"\n  - step: 3\n    file: "step-03-checkpoint-final.md"\n  - step: 4\n    file: "step-04-pecas.md"\n',
    [PASSO('step-04-pecas.md')]: passo(['execution: inline', 'agent: rita-redacao', 'outputFile: crews/atas/output/pecas.md']),
  });
  assert.deepEqual((await rodar(depois)).codigos, []);

  const dentro = await projeto(t, ATUAL, {
    [PASSO('step-01-redigir.md')]: passo(['execution: inline', 'agent: rita-redacao', 'format: pdf', 'outputFile: crews/atas/output/ata.md']),
  });
  const r = await rodar(dentro);
  assert.deepEqual(r.codigos, ['formato']);
  assert.match(r.texto, /Passos: 1 \(ata\.md\)/);
});

test('U4a-01e: a crew with no on_reject step shows sem-revisao, and formato does not appear', async (t) => {
  const raiz = await projeto(t, ANTIGA, {
    [PASSO('step-03-revisar.md')]: passo(['execution: inline', 'agent: vito-veredito']),
  });
  const r = await rodar(raiz);
  assert.deepEqual(r.codigos, ['fontes', 'proibicao', 'sem-revisao']);
  assert.match(r.texto, /\/opencrew edit atas/);
});

test('U4a-01f: a review with no checkpoint after it shows sem-aprovacao-final', async (t) => {
  const raiz = await projeto(t, ATUAL, {
    [`${CREW}/pipeline/pipeline.yaml`]: 'steps:\n  - step: 1\n    file: "step-01-redigir.md"\n  - step: 2\n    file: "step-02-revisar.md"\n',
  });
  assert.deepEqual((await rodar(raiz)).codigos, ['sem-aprovacao-final']);
});

test('U4a-01g: an irreversible step before the review shows publica-antes with its number', async (t) => {
  const raiz = await projeto(t, ATUAL, {
    [PASSO('step-01-redigir.md')]: passo(['execution: inline', 'agent: rita-redacao', 'format: documento-oficial', 'side_effects: irreversible']),
  });
  const r = await rodar(raiz);
  assert.deepEqual(r.codigos, ['publica-antes']);
  assert.match(r.texto, /O passo 1 publica ou envia antes/);
});

test('U4a-01g: an irreversible step between the review and the final approval is publica-antes; after it, it is not', async (t) => {
  const yaml = (ordem) => `steps:\n${ordem.map((f, i) => `  - step: ${i + 1}\n    file: "${f}"\n`).join('')}`;
  const envio = { [PASSO('step-04-enviar.md')]: passo(['execution: inline', 'agent: rita-redacao', 'side_effects: irreversible']) };
  const antes = await projeto(t, ATUAL, { ...envio, [`${CREW}/pipeline/pipeline.yaml`]: yaml(['step-01-redigir.md', 'step-02-revisar.md', 'step-04-enviar.md', 'step-03-checkpoint-final.md']) });
  assert.deepEqual((await rodar(antes)).codigos, ['publica-antes']);
  const depois = await projeto(t, ATUAL, { ...envio, [`${CREW}/pipeline/pipeline.yaml`]: yaml(['step-01-redigir.md', 'step-02-revisar.md', 'step-03-checkpoint-final.md', 'step-04-enviar.md']) });
  assert.deepEqual((await rodar(depois)).codigos, []);
});

test('U4a-01h: an agent with an installed irreversible skill and an unmarked step shows irreversivel; skill not installed, nothing (rule 9)', async (t) => {
  const agente = '---\nname: "Rita Redação"\ntitle: "Redatora"\nicon: "📝"\nexecution: inline\nskills:\n  - envia\n---\n\n# Rita Redação\n';
  const semSkill = await projeto(t, ATUAL, { [`${CREW}/agents/rita-redacao.agent.md`]: agente });
  assert.deepEqual((await rodar(semSkill)).codigos, []);

  const comSkill = await projeto(t, ATUAL, { [`${CREW}/agents/rita-redacao.agent.md`]: agente, 'skills/envia/SKILL.md': SKILL });
  const r = await rodar(comSkill);
  assert.deepEqual(r.codigos, ['irreversivel']);
  assert.match(r.texto, /Passo 1 — agente rita-redacao, skill envia/);
  assert.match(r.texto, /--aplicar "irreversivel:<passo>"/);
});

test('U4a-01h: skills written inline (`skills: [a, b]`) are read too', async (t) => {
  const agente = '---\nname: "Rita Redação"\ntitle: "Redatora"\nicon: "📝"\nskills: [web_search, envia]\n---\n';
  const raiz = await projeto(t, ATUAL, { [`${CREW}/agents/rita-redacao.agent.md`]: agente, 'skills/envia/SKILL.md': SKILL });
  assert.deepEqual((await rodar(raiz)).codigos, ['irreversivel']);
});

test('U4a-01i: a step file that does not exist and an on_reject to a step that does not exist show passo-faltando', async (t) => {
  const semArquivo = await projeto(t, ATUAL, { [PASSO('step-01-redigir.md')]: null });
  const a = await rodar(semArquivo);
  assert.deepEqual(a.codigos, ['passo-faltando']);
  assert.match(a.texto, /step-01-redigir\.md/);

  const semAlvo = await projeto(t, ATUAL, { [PASSO('step-02-revisar.md')]: passo(['execution: inline', 'agent: vito-veredito', 'on_reject: 9']) });
  const b = await rodar(semAlvo);
  assert.deepEqual(b.codigos, ['passo-faltando']);
  assert.match(b.texto, /passo 2 manda voltar ao passo 9, que não existe/);
});

test('U4a-01j: a manifest without displayName shows manifesto; a one-word name shows nome-de-agente', async (t) => {
  const semColuna = await projeto(t, ATUAL, { [`${CREW}/crew-party.csv`]: 'id,title,icon,path,execution\nrita-redacao,Redatora,📝,./agents/rita-redacao.agent.md,inline\n' });
  assert.deepEqual((await rodar(semColuna)).codigos, ['manifesto']);

  const igualAoTitulo = await projeto(t, ATUAL, { [`${CREW}/crew-party.csv`]: 'id,displayName,title,icon,path,execution\nrita-redacao,Redatora,Redatora,📝,./agents/rita-redacao.agent.md,inline\n' });
  assert.deepEqual((await rodar(igualAoTitulo)).codigos, ['manifesto']);

  const semArquivo = await projeto(t, ATUAL, { [`${CREW}/crew-party.csv`]: null });
  assert.deepEqual((await rodar(semArquivo)).codigos, ['manifesto']);

  const umaPalavra = await projeto(t, ATUAL, { [`${CREW}/agents/rita-redacao.agent.md`]: '---\nname: "Rita"\ntitle: "Redatora"\nicon: "📝"\n---\n' });
  const r = await rodar(umaPalavra);
  assert.deepEqual(r.codigos, ['nome-de-agente']);
  assert.match(r.texto, /rita-redacao/);
});

test('U4a-01k: usage errors end with CONSERTO:ERRO, say why, and write nothing', async (t) => {
  const raiz = await projeto(t, ATUAL, { 'crews/modelo/discovery.template.yaml': 'tier: express\n' });
  const antes = await snapshot(raiz);
  const casos = [
    [[], /Falta a opção obrigatória --crew\./],
    [['--crew', 'crews/modelo'], /A pasta crews\/modelo não tem `crew\.yaml`: não é uma crew\./],
    [['--crew', 'crews/nao-existe'], /Crew não encontrada: crews\/nao-existe/],
    [['--crew', '../fora'], /Caminho fora do projeto: \.\.\/fora/],
    [['--crew', CREW, '--aplicar', 'apagar-tudo'], /Item desconhecido em --aplicar: apagar-tudo/],
  ];
  for (const [argv, motivo] of casos) {
    const r = await rodar(raiz, argv);
    assert.equal(r.code, 1, argv.join(' '));
    assert.match(r.texto, motivo);
    assert.equal(r.fim, 'CONSERTO:ERRO');
  }
  assert.deepEqual(await snapshot(raiz), antes);
});

test('U4a-01k: outside an installed project the answer is the usual one', async (t) => {
  const raiz = await projeto(t);
  const r = await rodar(`${raiz}/crews`, ['--crew', 'atas']);
  assert.equal(r.code, 1);
  assert.match(r.texto, /Não encontrei `_opencrew\/` nesta pasta/);
});

test('U4a-01k: --ajuda prints the usage and the items, and exits 0', async (t) => {
  const raiz = await projeto(t);
  const r = await rodar(raiz, ['--ajuda']);
  assert.equal(r.code, 0);
  assert.match(r.linhas[0], /^Uso: node _opencrew\/core\/scripts\/conserto\.mjs --crew "crews\/<crew>"/);
  for (const item of ['manifesto', 'formato:<passo>=<formato>', 'fonte:<caminho>=<para que>', 'proibicao:<n>=<trecho>', 'proibicao:<n>=revisao-humana', 'irreversivel:<passo>']) {
    assert.ok(r.texto.includes(item), `usage must list ${item}`);
  }
});
