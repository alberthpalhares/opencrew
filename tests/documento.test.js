// specs/fase-u3b-documento-word.md — U3b-03 and U3b-04 (rules 10 and 12, §3, §4 and §6): the
// command. Where the Word is written, an existing Word is only replaced with --substituir, nothing
// is left half written; the report, the usage errors and the exit codes. Every run goes through
// `rodar`, which proves U3b-04j: outside the output file, the project is the same before and after.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gerarDocx } from '../templates/_opencrew/core/scripts/documento.mjs';
import { lerZip, projeto, rodar, existe, USO, DICAS } from './_documento.js';
import { conferirPacote } from './_documento-conferir.js';

const CORE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core');
const ATA = '::: titulo ATA\n\n# I. Abertura\nTexto da ata.\n';
const SEM_PERFIL = 'Perfil: nenhum (sem papel timbrado). Para criar o seu: node _opencrew/core/scripts/documento.mjs --criar-perfil';
const ler = (raiz, rel) => fs.readFile(path.join(raiz, rel));
const esperado = (texto = ATA) => gerarDocx({ texto }).bytes;

test('U3b-03a: Atas/ata.md gives Atas/ata.docx, next to the text', async (t) => {
  const raiz = await projeto(t, { 'Atas/ata.md': ATA });
  const r = await rodar(raiz, ['Atas/ata.md'], ['Atas/ata.docx']);
  assert.deepEqual([r.code, r.linhas[0]], [0, 'Documento gerado: Atas/ata.docx']);
  assert.ok((await ler(raiz, 'Atas/ata.docx')).equals(esperado()));
});

test('U3b-03a: --saida with a folder creates it, with the name of the text; with a .docx, that is the file', async (t) => {
  const raiz = await projeto(t, { 'Atas/ata.md': ATA });
  const naPasta = await rodar(raiz, ['Atas/ata.md', '--saida', 'Docs/Prontos'], ['Docs/Prontos/ata.docx']);
  assert.deepEqual([naPasta.code, naPasta.linhas[0]], [0, 'Documento gerado: Docs/Prontos/ata.docx']);
  const noArquivo = await rodar(raiz, ['--saida=Docs/Ata-final.DOCX', 'Atas/ata.md'], ['Docs/Ata-final.DOCX']);
  assert.deepEqual([noArquivo.code, noArquivo.linhas[0]], [0, 'Documento gerado: Docs/Ata-final.DOCX']);
  assert.ok((await ler(raiz, 'Docs/Ata-final.DOCX')).equals(esperado()));
  assert.equal(await existe(raiz, 'Atas/ata.docx'), false);
});

test('U3b-03f: the same .docx already there — nothing is written and the last line is DOCUMENTO:OK', async (t) => {
  const raiz = await projeto(t, { 'Atas/ata.md': ATA, 'Atas/ata.docx': esperado() });
  const antes = (await fs.stat(path.join(raiz, 'Atas/ata.docx'))).mtimeMs;
  const r = await rodar(raiz, ['Atas/ata.md']); // not even the output file may change
  assert.deepEqual([r.code, r.linhas[0], r.fim], [0, 'Atas/ata.docx já existe e está igual. Nada a fazer.', 'DOCUMENTO:OK']);
  assert.equal((await fs.stat(path.join(raiz, 'Atas/ata.docx'))).mtimeMs, antes);
});

test('U3b-03f: a different .docx — exit 1, the message, the old file intact; with --substituir it is replaced', async (t) => {
  const raiz = await projeto(t, { 'Atas/ata.md': ATA, 'Atas/ata.docx': 'o Word que o usuário editou' });
  const r = await rodar(raiz, ['Atas/ata.md']);
  assert.deepEqual([r.code, r.linhas], [1, ['Já existe Atas/ata.docx, diferente do que eu ia gravar. Para trocar, rode de novo com --substituir.']]);
  assert.equal(await fs.readFile(path.join(raiz, 'Atas/ata.docx'), 'utf8'), 'o Word que o usuário editou');
  const trocado = await rodar(raiz, ['Atas/ata.md', '--substituir'], ['Atas/ata.docx']);
  assert.deepEqual([trocado.code, trocado.linhas[0], trocado.fim], [0, 'Documento gerado: Atas/ata.docx', 'DOCUMENTO:OK']);
  assert.ok((await ler(raiz, 'Atas/ata.docx')).equals(esperado()));
});

for (const [caso, falha] of [['the rename', { rename: async () => { throw Object.assign(new Error('EBUSY'), { code: 'EBUSY' }); } }], ['the write', { writeFile: async (alvo) => { await fs.writeFile(alvo, 'meio'); throw new Error('ENOSPC'); } }]]) {
  test(`U3b-03f: a failure in ${caso} — exit 1, the message names the file, no temporary and no half file`, async (t) => {
    const raiz = await projeto(t, { 'Atas/ata.md': ATA, 'Atas/velha.docx': 'antigo' });
    const disco = { ...fs, ...falha };
    for (const [argv, alvo] of [[['Atas/ata.md'], 'Atas/ata.docx'], [['Atas/ata.md', '--saida', 'Atas/velha.docx', '--substituir'], 'Atas/velha.docx']]) {
      const r = await rodar(raiz, argv, [], { disco }); // `rodar` proves that the tree is the same
      assert.deepEqual([r.code, r.linhas], [1, [`Não consegui gravar ${alvo}. Feche o arquivo no Word, ou espere a sincronização da pasta, e rode de novo.`]]);
    }
    assert.equal(await fs.readFile(path.join(raiz, 'Atas/velha.docx'), 'utf8'), 'antigo');
  });
}

test('U3b-04a: a .md and no profile — the .docx, "Perfil: nenhum" with the command, the two tips, DOCUMENTO:OK and exit 0', async (t) => {
  const raiz = await projeto(t, { 'ata.md': ATA });
  const r = await rodar(raiz, ['ata.md'], ['ata.docx']);
  assert.equal(r.code, 0);
  assert.deepEqual(r.linhas, ['Documento gerado: ata.docx', SEM_PERFIL, ...DICAS, 'DOCUMENTO:OK']);
  assert.deepEqual(conferirPacote(lerZip(await ler(raiz, 'ata.docx'))), []);
});

test('U3b-04a: a .txt too, with the warnings listed in the report', async (t) => {
  const raiz = await projeto(t, { 'Docs/Minuta Final.txt': `${ATA}![foto](foto.png)\n::: nota x\n` });
  const r = await rodar(raiz, [path.join(raiz, 'Docs', 'Minuta Final.txt')], ['Docs/Minuta Final.docx']);
  assert.deepEqual(r.linhas, [
    'Documento gerado: Docs/Minuta Final.docx', SEM_PERFIL, 'Avisos:',
    '- 1 imagem não incluída: o Word não leva imagem no texto.', '- 1 linha com marcação desconhecida (`:::`) ficou como texto.',
    ...DICAS, 'DOCUMENTO:OK',
  ]);
  assert.equal(r.code, 0);
});

test('U3b-04a: --ajuda prints the usage, exit 0 and nothing written', async (t) => {
  const raiz = await projeto(t, { 'ata.md': ATA });
  const r = await rodar(raiz, ['ata.md', '--ajuda']);
  assert.deepEqual([r.code, r.saida], [0, USO]);
  assert.match(USO, /^Uso: .*\[--ajuda\]\n {5}node _opencrew\/core\/scripts\/documento\.mjs --criar-perfil$/);
});

const SAIDA = (valor) => `A saída precisa ser um arquivo .docx ou uma pasta, dentro do projeto. Recebi: ${valor}.`;
const ERROS = [
  ['--saidaa x', ['ata.md', '--saidaa', 'x'], ['Opção desconhecida: --saidaa.', USO]],
  ['no file', [], ['Falta o arquivo de texto.', USO]],
  ['two files', ['ata.md', 'outra.md'], ['Converto um arquivo por vez. Recebi 2.', USO]],
  ['../fora.md', ['../fora.md'], ['Caminho fora do projeto: ../fora.md']],
  ['a file that is not there', ['Atas/sumiu.md'], ['Não encontrei Atas/sumiu.md.']],
  ['a folder', ['Pasta.md'], ['Não encontrei Pasta.md.']],
  ['a file with frontmatter only', ['vazio.md'], ['vazio.md não tem texto para converter.']],
  ['a file in Latin-1', ['latin.md'], ['latin.md não está em UTF-8. Salve como UTF-8 e tente de novo.']],
  ['a .pdf', ['doc.pdf'], ['Só converto texto em markdown (.md ou .txt). Recebi: doc.pdf.']],
  ['--saida ../x', ['ata.md', '--saida', '../x'], [SAIDA('../x')]],
  ['--saida notas.txt', ['ata.md', '--saida', 'notas.txt'], [SAIDA('notas.txt')]],
  ['--saida without a value', ['ata.md', '--saida'], [SAIDA('')]],
  ['--saida over a file', ['ata.md', '--saida', 'outra.md'], [SAIDA('outra.md')]],
  ['--perfil nao-existe.md', ['ata.md', '--perfil', 'nao-existe.md'], ['Perfil não encontrado: nao-existe.md.']],
  ['--perfil ../p.md', ['ata.md', '--perfil', '../p.md'], ['Caminho fora do projeto: ../p.md']],
];
for (const [caso, argv, linhas] of ERROS) {
  test(`U3b-04g: ${caso} — exit 1, the message of §6, no DOCUMENTO: line and nothing written`, async (t) => {
    const arquivos = { 'ata.md': ATA, 'outra.md': ATA, 'vazio.md': '---\ntitulo: x\n---\n\n', 'latin.md': Buffer.from('Ata da reunião', 'latin1'), 'doc.pdf': '%PDF', 'Pasta.md/leia.txt': 'x' };
    const raiz = await projeto(t, arquivos);
    const r = await rodar(raiz, argv); // `rodar` proves that nothing was written
    assert.deepEqual([r.code, r.saida], [1, linhas.join('\n')]);
    assert.doesNotMatch(r.saida, /DOCUMENTO:/);
  });
}

test('U3b-04g: a folder without _opencrew/ — exit 1, the message of comum.mjs and nothing written', async (t) => {
  const raiz = await projeto(t, { 'ata.md': ATA }, { instalado: false });
  for (const argv of [['ata.md'], ['--criar-perfil']]) {
    const r = await rodar(raiz, argv);
    assert.deepEqual([r.code, r.linhas], [1, ['Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto.']]);
  }
});

test('U3b-04a: as a process, from the root of an installed project — the report on stdout, nothing on stderr', async (t) => {
  const raiz = await projeto(t, { 'Atas/ata.md': ATA });
  await fs.cp(path.join(CORE, 'scripts'), path.join(raiz, '_opencrew/core/scripts'), { recursive: true });
  await fs.cp(path.join(CORE, 'modelos'), path.join(raiz, '_opencrew/core/modelos'), { recursive: true });
  const rodarProcesso = (...argv) => spawnSync(process.execPath, ['_opencrew/core/scripts/documento.mjs', ...argv], { cwd: raiz, encoding: 'utf8' });
  const p = rodarProcesso('Atas/ata.md');
  assert.deepEqual([p.status, p.stderr], [0, '']);
  assert.equal(p.stdout, `${['Documento gerado: Atas/ata.docx', SEM_PERFIL, ...DICAS, 'DOCUMENTO:OK'].join('\n')}\n`);
  assert.ok((await ler(raiz, 'Atas/ata.docx')).equals(esperado()));
  const perfil = rodarProcesso('--criar-perfil');
  assert.deepEqual([perfil.status, perfil.stderr, perfil.stdout.trimEnd().split('\n').at(-1)], [0, '', 'PERFIL:CRIADO']);
  const erro = rodarProcesso('sumiu.md');
  assert.deepEqual([erro.status, erro.stderr, erro.stdout], [1, '', 'Não encontrei sumiu.md.\n']);
});
