// specs/fase-u4a-conserto-de-crews.md — U4a-02: `conserto.mjs --aplicar` writes one line at a
// time, keeps a `.bak` of what was there and touches nothing else (AGENTS.md rules 3 and 15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { snapshot, rodarMain } from './_helpers.js';
import { main as conferirFontes } from '../templates/_opencrew/core/scripts/conferir-fontes.mjs';
import { ANTIGA, ATUAL, CREW, PASSO, aplicar, existe, ler, projeto, rodar } from './_conserto.js';

const MINUTA = PASSO('step-01-minuta.md');
const MEMORIA = `${CREW}/_memory/memories.md`;
const YAML = `${CREW}/crew.yaml`;
const CSV = `${CREW}/crew-party.csv`;
// U4a-02j: everything the script may write (§4 of the spec); the rest of the tree must not change.
const COMBINADOS = /^crews[\\/]atas[\\/](?:crew\.yaml|crew-party\.csv|agents[\\/][^\\/]+\.agent\.md|pipeline[\\/]steps[\\/][^\\/]+\.md|_memory[\\/]memories\.md)(?:\.bak)?:/;
const foraDoCombinado = async (raiz) => (await snapshot(raiz)).filter((l) => !COMBINADOS.test(l));

/** Applies and proves U4a-02j for this call: outside the agreed files the tree is the same. */
async function aplicarConferindo(raiz, ...itens) {
  const antes = await foraDoCombinado(raiz);
  const r = await aplicar(raiz, ...itens);
  assert.deepEqual(await foraDoCombinado(raiz), antes, 'U4a-02j: the script wrote outside the agreed files');
  return r;
}

test('U4a-02a: formato writes the format line, keeps a .bak and leaves the rest byte for byte (LF)', async (t) => {
  const raiz = await projeto(t, ANTIGA);
  const antes = await ler(raiz, MINUTA);
  const r = await aplicarConferindo(raiz, 'formato:1=documento-oficial');
  assert.equal(r.code, 0);
  assert.equal(r.fim, 'CONSERTO:APLICADO');
  assert.equal(await ler(raiz, MINUTA), antes.replace('agent: rita-redacao\n', 'agent: rita-redacao\nformat: documento-oficial\n'));
  assert.equal(await ler(raiz, `${MINUTA}.bak`), antes);
  assert.match(r.texto, /Gravei: crews\/atas\/pipeline\/steps\/step-01-minuta\.md/);
  assert.match(r.texto, /Cópia: crews\/atas\/pipeline\/steps\/step-01-minuta\.md\.bak/);
});

test('U4a-02a: with CRLF and a BOM the new line gets CRLF and the BOM stays', async (t) => {
  const crlf = `\uFEFF${ANTIGA[MINUTA].replace(/\n/g, '\r\n')}`;
  const raiz = await projeto(t, ANTIGA, { [MINUTA]: crlf });
  await aplicarConferindo(raiz, 'formato:1=documento-oficial');
  assert.equal(await ler(raiz, MINUTA), crlf.replace('agent: rita-redacao\r\n', 'agent: rita-redacao\r\nformat: documento-oficial\r\n'));
});

test('U4a-02a: a format already declared is replaced on its own line', async (t) => {
  const raiz = await projeto(t, ATUAL);
  await aplicarConferindo(raiz, 'formato:1=blog-post');
  assert.match(await ler(raiz, PASSO('step-01-redigir.md')), /^agent: rita-redacao\nformat: blog-post\noutputFile:/m);
});

test('U4a-02b: an unknown format is refused; with a valid and a refused item nothing is written (rule 1)', async (t) => {
  const raiz = await projeto(t, ANTIGA);
  const antes = await snapshot(raiz);
  const r = await aplicar(raiz, 'formato:1=documento-oficial', 'formato:2=formato-inventado');
  assert.equal(r.code, 1);
  assert.match(r.texto, /Formato "formato-inventado" não encontrado/);
  assert.equal(r.fim, 'CONSERTO:ERRO');
  assert.deepEqual(await snapshot(raiz), antes);
  for (const item of ['formato:9=blog-post', 'formato:4=blog-post', 'formato:x=blog-post', 'formato:1=', 'formato:1=../x']) {
    const recusado = await aplicar(raiz, item);
    assert.equal(recusado.fim, 'CONSERTO:ERRO', item);
  }
  assert.deepEqual(await snapshot(raiz), antes);
});

test('U4a-02c: a .bak that already exists is not overwritten (rule 2)', async (t) => {
  const raiz = await projeto(t, ANTIGA, { [`${MINUTA}.bak`]: 'cópia mais antiga\n' });
  const r = await aplicarConferindo(raiz, 'formato:1=documento-oficial');
  assert.equal(r.fim, 'CONSERTO:APLICADO');
  assert.equal(await ler(raiz, `${MINUTA}.bak`), 'cópia mais antiga\n');
  assert.match(await ler(raiz, MINUTA), /^format: documento-oficial$/m);
});

test('U4a-02d: applying the same item twice changes no file the second time (rule 4)', async (t) => {
  const raiz = await projeto(t, ANTIGA);
  const itens = ['formato:1=documento-oficial', 'fonte:Regras/estatuto.md=regras do texto', 'proibicao:2=Grêmio Azul', 'proibicao:3=revisao-humana', 'manifesto'];
  await aplicar(raiz, ...itens);
  const antes = await snapshot(raiz);
  const r = await aplicar(raiz, ...itens);
  assert.equal(r.fim, 'CONSERTO:APLICADO');
  assert.match(r.texto, /Já estava assim/);
  assert.doesNotMatch(r.texto, /^Gravei:/m);
  assert.deepEqual(await snapshot(raiz), antes);
});

test('U4a-02e: fonte creates the key, appends to an existing list, and conferir-fontes reads it', async (t) => {
  const raiz = await projeto(t, ANTIGA, { 'Regras/regimento interno.md': '# Regimento\n' });
  const antes = await ler(raiz, YAML);
  await aplicarConferindo(raiz, 'fonte:Regras/estatuto.md=regras que mandam no texto');
  assert.equal(await ler(raiz, YAML), `${antes}\nfontes:\n  - caminho: Regras/estatuto.md\n    para_que: regras que mandam no texto\n`);
  assert.equal(await ler(raiz, `${YAML}.bak`), antes);

  await aplicarConferindo(raiz, 'fonte:Regras/regimento interno.md=prazos: os do regimento');
  assert.ok((await ler(raiz, YAML)).endsWith('    para_que: regras que mandam no texto\n  - caminho: Regras/regimento interno.md\n    para_que: "prazos: os do regimento"\n'));

  const linhas = [];
  await conferirFontes(['--crew', CREW], { cwd: raiz, escrever: (s) => linhas.push(String(s)) });
  assert.match(linhas.join('\n'), /Resumo: 2 fontes — 2 ok, 0 pendentes/);
});

test('U4a-02e: fonte keeps the indentation of the list that exists and replaces `fontes: []`', async (t) => {
  const raiz = await projeto(t, ATUAL, { 'Regras/b.md': 'b\n', [YAML]: 'crew:\n  code: "atas"\nfontes:\n    - caminho: Regras/estatuto.md\n      para_que: regras\nmax_review_cycles: 2\n' });
  await aplicarConferindo(raiz, 'fonte:Regras/b.md=outra');
  assert.equal(await ler(raiz, YAML), 'crew:\n  code: "atas"\nfontes:\n    - caminho: Regras/estatuto.md\n      para_que: regras\n    - caminho: Regras/b.md\n      para_que: outra\nmax_review_cycles: 2\n');

  const vazia = await projeto(t, ATUAL, { [YAML]: 'name: "Atas"\nfontes: []\ntier: full\n' });
  await aplicarConferindo(vazia, 'fonte:Regras/estatuto.md=regras');
  assert.equal(await ler(vazia, YAML), 'name: "Atas"\nfontes:\n  - caminho: Regras/estatuto.md\n    para_que: regras\ntier: full\n');
});

test('U4a-02e: fonte refuses an absolute path, a path out of the project and a file that does not exist', async (t) => {
  const raiz = await projeto(t, ANTIGA);
  const antes = await snapshot(raiz);
  for (const item of [`fonte:${path.join(raiz, 'Regras', 'estatuto.md')}=x`, 'fonte:../fora.md=x', 'fonte:Regras/nao-existe.md=x', 'fonte:=x', 'fonte:Regras/estatuto.md=']) {
    const r = await aplicar(raiz, item);
    assert.equal(r.fim, 'CONSERTO:ERRO', item);
  }
  assert.deepEqual(await snapshot(raiz), antes);
});

test('U4a-02f: proibicao with an excerpt adds the lock, and the checker starts blocking it', async (t) => {
  const raiz = await projeto(t, ANTIGA, { [`${CREW}/output/comunicado.md`]: '# Comunicado\n\nO Grêmio Azul convida os associados.\n' });
  const antes = await ler(raiz, MEMORIA);
  await aplicarConferindo(raiz, 'proibicao:2=Grêmio Azul');
  assert.equal(await ler(raiz, MEMORIA), antes.replace('Grêmio Azul nos comunicados.\n', 'Grêmio Azul nos comunicados. — trava: "Grêmio Azul"\n'));
  assert.equal(await ler(raiz, `${MEMORIA}.bak`), antes);
  const v = await rodarMain(raiz, ['--crew', CREW, '--arquivo', `${CREW}/output/comunicado.md=whatsapp-broadcast`]);
  assert.equal(v.linhas.at(-1), 'VERIFICACAO:BLOQUEADA');
  assert.match(v.linhas.join('\n'), /Grêmio Azul/);
});

test('U4a-02f: an excerpt that is not in the item, or with double quotes, is refused', async (t) => {
  const raiz = await projeto(t, ANTIGA);
  const antes = await snapshot(raiz);
  for (const item of ['proibicao:2=Clube Verde', 'proibicao:2=nome "fantasia"', 'proibicao:9=x', 'proibicao:0=x', 'proibicao:2=', 'proibicao:1=revisao-humana']) {
    const r = await aplicar(raiz, item);
    assert.equal(r.fim, 'CONSERTO:ERRO', item);
  }
  assert.deepEqual(await snapshot(raiz), antes);
});

test('U4a-02g: revisao-humana marks the line and the checker stops counting it as unquoted (rule 8)', async (t) => {
  const raiz = await projeto(t, ANTIGA, { [`${CREW}/output/c.md`]: '# Comunicado\n\nTexto simples.\n' });
  const nota = async () => (await rodarMain(raiz, ['--crew', CREW, '--arquivo', `${CREW}/output/c.md=whatsapp-broadcast`])).linhas.join('\n');
  assert.match(await nota(), /2 proibições sem termo entre aspas/);
  await aplicarConferindo(raiz, 'proibicao:3=revisao-humana');
  assert.match(await ler(raiz, MEMORIA), /^- Nunca prever votação por aclamação sem lista nominal\. \(revisão humana\)$/m);
  assert.match(await nota(), /1 proibição sem termo entre aspas/);
  await aplicarConferindo(raiz, 'proibicao:2=revisao-humana');
  assert.doesNotMatch(await nota(), /sem termo entre aspas/);
});

test('U4a-02g: a line that starts with "Sem trava automática" does not count either', async (t) => {
  const raiz = await projeto(t, ATUAL, { [`${CREW}/output/c.md`]: '# Comunicado\n\nTexto simples.\n' });
  const v = await rodarMain(raiz, ['--crew', CREW, '--arquivo', `${CREW}/output/c.md=whatsapp-broadcast`]);
  assert.doesNotMatch(v.linhas.join('\n'), /sem termo entre aspas/);
});

test('U4a-02h: manifesto rebuilds the CSV with the 6 columns, in the old order, quoting what needs it', async (t) => {
  const raiz = await projeto(t, ATUAL, {
    [CSV]: 'id,title,execution\nvito-veredito,Revisor,subagent\nrita-redacao,Redatora,inline\n',
    [`${CREW}/agents/ana-arquivo.agent.md`]: '---\nname: "Ana Arquivo"\ntitle: "Guarda, organiza"\nicon: "🗂️"\n---\n',
    [`${CREW}/agents/vito-veredito.agent.md`]: '---\nname: "Vito Veredito"\ntitle: "Revisor"\nicon: "🔍"\n---\n',
  });
  const antes = await ler(raiz, CSV);
  const r = await aplicarConferindo(raiz, 'manifesto');
  assert.equal(r.fim, 'CONSERTO:APLICADO');
  assert.equal(await ler(raiz, CSV), [
    'id,displayName,title,icon,path,execution',
    'vito-veredito,"Vito Veredito",Revisor,🔍,./agents/vito-veredito.agent.md,subagent',
    'rita-redacao,"Rita Redação","Função de Rita Redação",📝,./agents/rita-redacao.agent.md,inline',
    'ana-arquivo,"Ana Arquivo","Guarda, organiza",🗂️,./agents/ana-arquivo.agent.md,inline',
    '',
  ].join('\n'));
  assert.equal(await ler(raiz, `${CSV}.bak`), antes);
  assert.deepEqual((await rodar(raiz)).codigos, []);
});

test('U4a-02h: with no CSV the manifest is created, and there is no .bak of nothing', async (t) => {
  const raiz = await projeto(t, ATUAL, { [CSV]: null });
  await aplicarConferindo(raiz, 'manifesto');
  assert.match(await ler(raiz, CSV), /^id,displayName,title,icon,path,execution\nrita-redacao,"Rita Redação"/);
  assert.equal(await existe(raiz, `${CSV}.bak`), false);
});

test('U4a-02l: nome writes the two-word name in the frontmatter and in the heading; then manifesto carries it', async (t) => {
  const AGENTE = `${CREW}/agents/rita-redacao.agent.md`;
  const antes = '---\nid: rita-redacao\nname: "Rita"\ntitle: "Redatora"\nicon: "📝"\n---\n\n# Rita\n\n## Persona\n\n# não é o título\n';
  const raiz = await projeto(t, ATUAL, { [AGENTE]: antes });
  assert.match((await rodar(raiz)).texto, /--aplicar "nome:<agente>=<Nome Sobrenome>"/);
  const r = await aplicarConferindo(raiz, 'nome:rita-redacao=Rita Redação', 'manifesto');
  assert.equal(r.fim, 'CONSERTO:APLICADO');
  assert.equal(await ler(raiz, AGENTE), antes.replace('name: "Rita"', 'name: "Rita Redação"').replace('# Rita\n', '# Rita Redação\n'));
  assert.equal(await ler(raiz, `${AGENTE}.bak`), antes);
  assert.match(await ler(raiz, CSV), /^rita-redacao,"Rita Redação",Redatora,/m);
  assert.deepEqual((await rodar(raiz)).codigos, []);
  const depois = await snapshot(raiz);
  assert.match((await aplicar(raiz, 'nome:rita-redacao=Rita Redação')).texto, /Já estava assim/);
  for (const item of ['nome:rita-redacao=Rita', 'nome:ninguem=Ana Arquivo', 'nome:vito-veredito=Vitor Voto', 'nome:rita-redacao=']) {
    assert.equal((await aplicar(raiz, item)).fim, 'CONSERTO:ERRO', item);
  }
  assert.deepEqual(await snapshot(raiz), depois);
});

test('U4a-02i: irreversivel writes the two lines; a checkpoint is refused', async (t) => {
  const raiz = await projeto(t, ATUAL, {
    [`${CREW}/pipeline/pipeline.yaml`]: 'steps:\n  - step: 1\n    file: "step-01-redigir.md"\n  - step: 2\n    file: "step-02-revisar.md"\n  - step: 3\n    file: "step-03-checkpoint-final.md"\n  - step: 4\n    file: "step-04-enviar.md"\n',
    [PASSO('step-04-enviar.md')]: '---\nexecution: subagent\nagent: rita-redacao\nmodel_tier: fast\n---\n\n# Enviar\n',
  });
  await aplicarConferindo(raiz, 'irreversivel:4');
  assert.equal(await ler(raiz, PASSO('step-04-enviar.md')), '---\nexecution: inline\nagent: rita-redacao\nmodel_tier: fast\nside_effects: irreversible\n---\n\n# Enviar\n');
  const antes = await snapshot(raiz);
  assert.equal((await aplicar(raiz, 'irreversivel:3')).fim, 'CONSERTO:ERRO');
  assert.deepEqual(await snapshot(raiz), antes);
});

test('U4a-02k: after formato, fonte and proibicao the old crew answers CONSERTO:OK', async (t) => {
  const raiz = await projeto(t, ANTIGA);
  const r = await aplicarConferindo(raiz, 'formato:1=documento-oficial', 'formato:2=whatsapp-broadcast', 'fonte:Regras/estatuto.md=regras que mandam no texto', 'proibicao:2=Grêmio Azul', 'proibicao:3=revisao-humana');
  assert.equal(r.fim, 'CONSERTO:APLICADO');
  const depois = await rodar(raiz);
  assert.deepEqual(depois.codigos, []);
  assert.equal(depois.fim, 'CONSERTO:OK');
  const copias = (await fs.readdir(path.join(raiz, CREW, 'pipeline', 'steps'))).filter((f) => f.endsWith('.bak'));
  assert.deepEqual(copias.sort(), ['step-01-minuta.md.bak', 'step-02-comunicado.md.bak']);
});
