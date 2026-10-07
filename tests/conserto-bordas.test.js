// specs/fase-u4a-conserto-de-crews.md — the edges found by the code review of `conserto.mjs`
// (spec §10): the script never reads or writes outside the crew, never rewrites what it cannot
// rewrite line by line, and says so instead of guessing (rules 1 to 4; AGENTS.md rules 3 and 15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { snapshot } from './_helpers.js';
import { ANTIGA, ATUAL, CREW, PASSO, aplicar, ler, projeto, rodar } from './_conserto.js';

const PIPELINE = `${CREW}/pipeline/pipeline.yaml`;
const YAML = `${CREW}/crew.yaml`;
const MEMORIA = `${CREW}/_memory/memories.md`;

/** Applies items that must be refused: CONSERTO:ERRO, the reason, and the tree as it was. */
async function recusa(raiz, motivo, ...itens) {
  const antes = await snapshot(raiz);
  const r = await aplicar(raiz, ...itens);
  assert.equal(r.fim, 'CONSERTO:ERRO', r.texto);
  assert.equal(r.code, 1);
  assert.match(r.texto, motivo);
  assert.deepEqual(await snapshot(raiz), antes, 'something was written');
}

test('U4a-02j: a step file cited outside the crew is not read and never written (`..` or absolute)', async (t) => {
  const fora = '---\nexecution: subagent\nagent: rita-redacao\n---\n\n# Fora da crew\n';
  for (const citado of ['../../../../fora.md', '../../fora.md']) {
    const raiz = await projeto(t, ANTIGA, { 'fora.md': fora, [`${CREW}/fora.md`]: fora, [PIPELINE]: `steps:\n  - step: 1\n    file: ${citado}\n` });
    const r = await rodar(raiz);
    assert.ok(r.codigos.includes('passo-faltando'), r.texto);
    await recusa(raiz, /Passo não encontrado/, 'formato:1=documento-oficial');
    await recusa(raiz, /Passo não encontrado/, 'irreversivel:1');
    assert.equal(await ler(raiz, 'fora.md'), fora);
  }
});

test('U4a-01c: a comment at column 0 and a nested key inside `steps:` do not change the reading', async (t) => {
  const yaml = 'steps:\n  - step: 1\n    file: "step-01-redigir.md"\n    inputs:\n      file: zzz.md\n      step: 9\n# a revisão\n\n  - step: 2\n    file: "step-02-revisar.md"\n  - step: 3\n    file: "step-03-checkpoint-final.md"\n\ncheckpoints: [3]\n';
  const raiz = await projeto(t, ATUAL, { [PIPELINE]: yaml });
  const r = await rodar(raiz);
  assert.deepEqual(r.codigos, []);
  assert.equal(r.fim, 'CONSERTO:OK');
});

test('U4a-01j: when a name and the manifest are both missing, the name comes first', async (t) => {
  const raiz = await projeto(t, ATUAL, {
    [`${CREW}/agents/rita-redacao.agent.md`]: '---\nname: "Rita"\ntitle: "Redatora"\nicon: "📝"\n---\n\n# Rita\n',
    [`${CREW}/crew-party.csv`]: 'id,title\nrita-redacao,Redatora\n',
  });
  assert.deepEqual((await rodar(raiz)).codigos, ['nome-de-agente', 'manifesto']);
});

test('U4a-02b: a protected file is seen before anything is written (rule 1)', async (t) => {
  const raiz = await projeto(t, ANTIGA);
  const passo = path.join(raiz, PASSO('step-01-minuta.md'));
  await fs.chmod(passo, 0o444);
  t.after(() => fs.chmod(passo, 0o666).catch(() => {}));
  await recusa(raiz, /Não consigo gravar em crews\/atas\/pipeline\/steps\/step-01-minuta\.md .*Nada foi gravado\./, 'fonte:Regras/estatuto.md=regras', 'formato:1=documento-oficial');
});

test('U4a-02a: a file that is not UTF-8 is refused, not rewritten with lost letters', async (t) => {
  const raiz = await projeto(t, ANTIGA);
  const latin1 = Buffer.from('---\nexecution: inline\nagent: rita-redacao\n---\n\n# Cabe\xe7alho caf\xe9\n', 'latin1');
  await fs.writeFile(path.join(raiz, PASSO('step-01-minuta.md')), latin1);
  await recusa(raiz, /step-01-minuta\.md: o arquivo não está em UTF-8/, 'formato:1=documento-oficial');
  assert.ok((await fs.readFile(path.join(raiz, PASSO('step-01-minuta.md')))).equals(latin1));
});

test('U4a-02e: `fontes:` written on one line is refused, never replaced; a comment on the key line stays', async (t) => {
  const raiz = await projeto(t, ATUAL, { 'Regras/b.md': 'b\n', [YAML]: 'name: "Atas"\nfontes: [{caminho: Regras/estatuto.md, para_que: regras}]\n' });
  await recusa(raiz, /a lista `fontes:` está escrita numa linha só/, 'fonte:Regras/b.md=outra');

  const comentada = await projeto(t, ATUAL, { 'Regras/b.md': 'b\n', [YAML]: 'fontes:  # o que a crew lê\n  - caminho: Regras/estatuto.md\n    para_que: regras\n' });
  assert.equal((await aplicar(comentada, 'fonte:./Regras/estatuto.md=regras', 'fonte:Regras/b.md=outra')).fim, 'CONSERTO:APLICADO');
  assert.equal(await ler(comentada, YAML), 'fontes:  # o que a crew lê\n  - caminho: Regras/estatuto.md\n    para_que: regras\n  - caminho: Regras/b.md\n    para_que: outra\n');
});

test('U4a-02a: a field whose value takes more than one line, or a file with no real frontmatter, is refused', async (t) => {
  const bloco = await projeto(t, ATUAL, { [PASSO('step-01-redigir.md')]: '---\nexecution: >-\n  inline\nagent: rita-redacao\nformat:\n  - blog-post\n---\n\n# Passo\n' });
  await recusa(bloco, /Não altero o passo 1/, 'irreversivel:1');
  await recusa(bloco, /Não altero o passo 1/, 'formato:1=documento-oficial');

  const prosa = await projeto(t, ATUAL, { [PASSO('step-01-redigir.md')]: '---\nEste texto começa com uma linha de separação.\n\n---\n\nE continua aqui.\n' });
  await recusa(prosa, /Não altero o passo 1/, 'formato:1=documento-oficial');
});

test('U4a-02d: a value that is already the one asked — quoted or with a comment — is left byte for byte', async (t) => {
  const texto = '---\nexecution: inline  # sempre\nagent: rita-redacao\nformat: "documento-oficial"  # ata\nside_effects: irreversible # envia\n---\n\n# Passo\n';
  const raiz = await projeto(t, ATUAL, { [PASSO('step-01-redigir.md')]: texto });
  const antes = await snapshot(raiz);
  const r = await aplicar(raiz, 'formato:1=documento-oficial', 'irreversivel:1');
  assert.equal(r.fim, 'CONSERTO:APLICADO');
  assert.doesNotMatch(r.texto, /^Gravei:/m);
  assert.deepEqual(await snapshot(raiz), antes);
});

test('U4a-02f: an excerpt the checker cannot read back as a lock is refused', async (t) => {
  const longo = 'palavra '.repeat(30).trim();
  const raiz = await projeto(t, ATUAL, { [MEMORIA]: `# Crew Memory\n\n## Proibições Explícitas\n\n- Nunca rodar \`rm -rf na pasta do projeto\n- Nunca escrever ${longo} no texto\n` });
  await recusa(raiz, /O verificador não consegue ler esse trecho como trava/, 'proibicao:1=`rm');
  await recusa(raiz, /O verificador não consegue ler esse trecho como trava/, `proibicao:2=${longo}`);
  assert.equal((await aplicar(raiz, 'proibicao:2=palavra palavra')).fim, 'CONSERTO:APLICADO');
});

test('U4a-02f: words like "use", "prefira" or "→" before the lock do not turn it into a preferred term', async (t) => {
  const raiz = await projeto(t, ATUAL, {
    [MEMORIA]: '# Crew Memory\n\n## Proibições Explícitas\n\n- Nunca use o termo ensaio fotográfico; prefira sessão corporativa → sempre\n',
    [`${CREW}/output/c.md`]: '# Comunicado\n\nAgende o seu ensaio fotográfico.\n',
  });
  assert.equal((await aplicar(raiz, 'proibicao:1=ensaio fotográfico')).fim, 'CONSERTO:APLICADO');
  const { rodarMain } = await import('./_helpers.js');
  const v = await rodarMain(raiz, ['--crew', CREW, '--arquivo', `${CREW}/output/c.md=whatsapp-broadcast`]);
  assert.equal(v.linhas.at(-1), 'VERIFICACAO:BLOQUEADA');
});
