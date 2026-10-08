// specs/fase-u5a-polimento-do-uso.md — the scripts side of U5, slice 1: the `texto-livre` format,
// the "Não medido" line, the messages of the source check, the document alerts of the checker,
// the profile keys, the table warning, the run folder named by the script and the delivery note.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { main as conferirFontes } from '../templates/_opencrew/core/scripts/conferir-fontes.mjs';
import { main as caminho } from '../templates/_opencrew/core/scripts/caminho.mjs';
import { lerPerfil } from '../templates/_opencrew/core/scripts/documento/perfil.mjs';
import { mkTmp, snapshot, um, itens, bloqueios, naoMedidos, projetoFalso, rodarMain, CREW, SAIDA } from './_helpers.js';
import { projeto as projetoDeEntrega, entregar, arvore, leiame, secao } from './_entrega.js';
import { projeto as projetoDeDocumento, rodar as rodarDocumento } from './_documento.js';

const BP = new URL('../templates/_opencrew/core/best-practices/', import.meta.url);
const COM_TITULO = `---\ntitle: "${'Proposta comercial para a cobertura do evento anual de tecnologia '.repeat(2).trim()}"\n---\n\n# Proposta\n\nTexto da proposta.\n`;

// ── U5a-01 The texto-livre format ────────────────────────────────────────────────────────────

test('U5a-01a: a frontmatter title is not measured as a blog title with texto-livre; with no format it is', async () => {
  const livre = await um(COM_TITULO, 'texto-livre');
  assert.deepEqual(itens(livre).filter((i) => /Título/.test(i.item)), []);
  assert.equal(livre.status, 'OK');
  const semFormato = await um(COM_TITULO);
  assert.ok(itens(semFormato).some((i) => /Título/.test(i.item)), 'without a format the title is still measured');
});

test('U5a-01b: with texto-livre a `=== LEGENDA ===` label is plain text, not a piece', async () => {
  const r = await um(`=== CAPTION ===\n${'legenda '.repeat(400)}\n\n=== HASHTAGS ===\n#a #b\n`, 'texto-livre');
  assert.deepEqual(itens(r).filter((i) => /Legenda|hashtags/i.test(i.item)), []);
  assert.equal(r.status, 'OK');
});

test('U5a-01c: in the delivery a texto-livre file goes whole to outros/, and there is no .docx', async (t) => {
  const raiz = await projetoDeEntrega(t, { 'v1/minuta.md': '# Proposta Comercial\n\nTexto da proposta.\n' });
  const r = await entregar(raiz, ['v1/minuta.md=texto-livre']);
  assert.equal(r.fim, 'ENTREGA:OK', r.saida);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'outros/minuta.md']);
  assert.ok(!/não tem canal conhecido/.test(r.saida), 'being in outros/ is the expected place for texto-livre, not a warning');
  const semFormato = await entregar(raiz, ['v1/minuta.md']);
  assert.match(semFormato.saida, /não tem canal conhecido\. Está em `outros\/`\./, 'a file with no format still gets the warning');
});

test('U5a-01d: the catalog lists texto-livre, and the guide declares no platform and no constraints', () => {
  const catalogo = readFileSync(new URL('_catalog.yaml', BP), 'utf8');
  assert.match(catalogo, /^ {2}- id: texto-livre\r?\n {4}name: "Texto livre"/m);
  assert.match(catalogo, /^ {4}file: texto-livre\.md\r?$/m);
  const guia = readFileSync(new URL('texto-livre.md', BP), 'utf8');
  assert.doesNotMatch(guia, /^platform:/m);
  assert.doesNotMatch(guia, /^constraints:/m);
});

test('U5a-01e: a ban of the crew memory and [PREENCHER] still count in texto-livre', async () => {
  const memorias = '# Crew Memory\n\n## Proibições Explícitas\n\n- Nunca usar "sinergia"\n';
  const proibido = await um('# Proposta\n\nNossa sinergia é total.\n', 'texto-livre', { memorias });
  assert.equal(proibido.status, 'BLOQUEADA');
  assert.ok(bloqueios(proibido).some((i) => i.detalhe === 'sinergia'));
  const pedido = await um('# Proposta\n\nValor: [PREENCHER: valor total]\n', 'texto-livre');
  assert.equal(pedido.status, 'AGUARDANDO_USUARIO');
});

// ── U5a-02 "Não medido" only for a format that declares a limit ──────────────────────────────

test('U5a-02a: documento-oficial and texto-livre get no "Não medido" line; a format with limits and no measured piece still does', async () => {
  for (const formato of ['documento-oficial', 'texto-livre']) {
    assert.deepEqual(naoMedidos(await um('# Título\n\nTexto simples.\n', formato)), [], formato);
  }
  const video = await um('# Roteiro\n\nTexto do vídeo.\n', 'youtube-script');
  assert.deepEqual(naoMedidos(video).map((i) => i.detalhe), ['o verificador ainda não mede os limites do formato youtube-script']);
});

// ── U5a-04 and 05 Source check ───────────────────────────────────────────────────────────────

async function projetoDeFontes(t, arquivos) {
  const raiz = await mkTmp('u5a-fontes');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  for (const [rel, conteudo] of Object.entries({ '_opencrew/x': '', 'crews/c/crew.yaml': 'name: "c"\n', ...arquivos })) {
    await fs.mkdir(path.dirname(path.join(raiz, rel)), { recursive: true });
    await fs.writeFile(path.join(raiz, rel), conteudo);
  }
  return raiz;
}
async function fontes(raiz, ...extras) {
  const linhas = [];
  const code = await conferirFontes(['--crew', 'crews/c', ...extras], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas: linhas.filter((l) => l.trim()), fim: linhas.filter((l) => l.trim()).at(-1) };
}
const PASSO = 'crews/c/pipeline/steps/step-01.md';
const COMO_CORRIGIR = 'Para trocar os caminhos que têm sugestão, rode de novo com --corrigir (cada arquivo alterado ganha uma cópia).';

test('U5a-04a: the summary agrees in number — 1 fonte, 1 pendente, 1 alerta', async (t) => {
  const umaOk = await projetoDeFontes(t, { [PASSO]: '- `Docs/a.md`\n', 'Docs/a.md': 'x' });
  assert.ok((await fontes(umaOk)).linhas.includes('**Resumo: 1 fonte — 1 ok, 0 pendentes, 0 alertas**'));
  const duasFaltando = await projetoDeFontes(t, { [PASSO]: '- `Docs/a.md`\n- `Docs/b.md`\n' });
  assert.ok((await fontes(duasFaltando)).linhas.includes('**Resumo: 2 fontes — 0 ok, 2 pendentes, 0 alertas**'));
});

test('U5a-04b: an absolute path with a suggestion gets the "Para trocar…" line and FONTES:OK; with no suggestion the line is not there', async (t) => {
  const raiz = await projetoDeFontes(t, { 'Docs/a.md': 'x' });
  await fs.mkdir(path.dirname(path.join(raiz, PASSO)), { recursive: true });
  await fs.writeFile(path.join(raiz, PASSO), `- \`${path.join(raiz, 'Docs', 'a.md')}\`\n`);
  const r = await fontes(raiz);
  assert.ok(r.linhas.includes('**Resumo: 1 fonte — 0 ok, 0 pendentes, 1 alerta**'), r.linhas.join('\n'));
  assert.ok(r.linhas.includes(COMO_CORRIGIR));
  assert.equal(r.fim, 'FONTES:OK');
  const semSugestao = await projetoDeFontes(t, { [PASSO]: '- `Docs/sumiu.md`\n' });
  assert.ok(!(await fontes(semSugestao)).linhas.includes(COMO_CORRIGIR));
});

test('U5a-05a: --corrigir prints the report once, names each changed file and the copy that stayed', async (t) => {
  const raiz = await projetoDeFontes(t, { [PASSO]: '- `Docs/Velho/a.md`\n', 'Docs/Novo/a.md': 'x' });
  const r = await fontes(raiz, '--corrigir');
  assert.ok(r.linhas.includes(`Corrigi: ${PASSO} (cópia: step-01.md.bak)`), r.linhas.join('\n'));
  assert.equal(r.linhas.filter((l) => l.startsWith('## Conferência de fontes')).length, 1, 'the report must come once');
  assert.ok(r.linhas.includes('**Resumo: 1 fonte — 1 ok, 0 pendentes, 0 alertas**'));
  assert.equal(r.fim, 'FONTES:OK');

  await fs.writeFile(path.join(raiz, PASSO), '- `Docs/Velho/a.md`\n');
  const segunda = await fontes(raiz, '--corrigir');
  assert.ok(segunda.linhas.some((l) => /^Corrigi: crews\/c\/pipeline\/steps\/step-01\.md \(cópia: step-01\.md\.bak-\d{4}-/.test(l)), segunda.linhas.join('\n'));
});

// ── U5a-06 Document alerts in the checker ────────────────────────────────────────────────────

const DOCUMENTO = '::: titulo ATA\n\n# I. Abertura\n\n![foto](foto.png)\n\n::: caixa\nTexto.\n\n::: assinaturas\nAna Lima | Presidente\n';

test('U5a-06a: an image, an unknown `:::` and signatures with no end are three alerts with documento-oficial — never a block', async () => {
  const r = await um(DOCUMENTO, 'documento-oficial');
  const doWord = itens(r).filter((i) => i.item === 'Documento Word');
  assert.deepEqual(doWord.map((i) => [i.nivel, i.detalhe]), [
    ['alerta', '1 imagem não entra no documento'],
    ['alerta', '1 marcação `:::` desconhecida vai como texto'],
    ['alerta', '1 bloco de assinaturas sem a linha `:::` do fim vai como texto'],
  ]);
  assert.equal(r.status, 'OK');
});

test('U5a-06b: the same text as texto-livre, or with no format, gets none of them', async () => {
  for (const formato of ['texto-livre', undefined]) {
    assert.deepEqual(itens(await um(DOCUMENTO, formato)).filter((i) => i.item === 'Documento Word'), []);
  }
});

// ── U5a-07 and 08 Profile keys and the table warning ─────────────────────────────────────────

test('U5a-07a: a key written almost right is an error that says how to write it; a line that is not a key stays a comment', () => {
  const erro = (texto) => lerPerfil(texto).erro;
  assert.equal(erro('Logotipo: x.png\n'), 'Perfil, linha 1: a chave se escreve logotipo: em minúsculas, sem acento, no começo da linha e sem espaço antes dos dois-pontos.');
  assert.equal(erro('cabecalho_1: A\n rodape: x\n'), 'Perfil, linha 2: a chave se escreve rodape: em minúsculas, sem acento, no começo da linha e sem espaço antes dos dois-pontos.');
  for (const linha of ['rodapé: x\n', 'rodape : x\n', '\trodape: x\n']) {
    assert.equal(erro(linha), 'Perfil, linha 1: a chave se escreve rodape: em minúsculas, sem acento, no começo da linha e sem espaço antes dos dois-pontos.', JSON.stringify(linha));
  }
  assert.equal(erro('Observação: este é o papel timbrado\n# Fonte: comentário\nfonte: Arial\n'), null);
  assert.equal(erro('Site: https://exemplo.org\n'), null);
});

test('U5a-07a: the profile model shipped with the product still reads with no error', () => {
  const modelo = readFileSync(new URL('../templates/_opencrew/core/modelos/documento-oficial.md', import.meta.url), 'utf8');
  assert.equal(lerPerfil(modelo).erro, null);
});

test('U5a-08a: a table row with more cells than the header still converts, with a warning', async (t) => {
  const raiz = await projetoDeDocumento(t, { 'Atas/ata.md': '# Ata\n\n| Nome | Cargo | Voto |\n|---|---|---|\n| Ana | Presidente | Sim | a mais |\n| Bia | Tesoureira | Não |\n' });
  const r = await rodarDocumento(raiz, ['Atas/ata.md', '--sem-perfil'], ['Atas/ata.docx']);
  assert.equal(r.code, 0, r.linhas.join('\n'));
  assert.ok(r.linhas.includes('- 1 linha de tabela com mais células que o cabeçalho: a coluna a mais ficou sem título.'), r.linhas.join('\n'));
});

// ── U5a-10 The run folder named by the script ────────────────────────────────────────────────

async function projetoDeCaminho(t) {
  const raiz = await mkTmp('u5a-caminho');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew'));
  await fs.mkdir(path.join(raiz, 'crews', 'x'), { recursive: true });
  return raiz;
}
async function rodarCaminho(raiz, argv, agora = new Date(2026, 2, 3, 14, 30, 22)) {
  const linhas = [];
  const code = await caminho(['x', ...argv], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')), agora: () => agora });
  return { code, linhas };
}

test('U5a-10a: pasta with no --run names the run by the clock of the computer; the same second gets -2', async (t) => {
  const raiz = await projetoDeCaminho(t);
  assert.deepEqual(await rodarCaminho(raiz, ['pasta']), { code: 0, linhas: ['CAMINHO:OK crews/x/output/2026-03-03-143022'] });
  assert.deepEqual(await rodarCaminho(raiz, ['pasta']), { code: 0, linhas: ['CAMINHO:OK crews/x/output/2026-03-03-143022-2'] });
  assert.deepEqual(await rodarCaminho(raiz, ['pasta', '--arquivo', 'crews/x/output/a.md'], new Date(2026, 11, 9, 5, 7, 8)), { code: 0, linhas: ['CAMINHO:OK crews/x/output/2026-12-09-050708'] });
  // Since U5-3 each new run folder is born with its record, the only file the script writes (specs/fase-u5c-execucao-registrada.md).
  assert.deepEqual((await snapshot(raiz)).map((l) => path.basename(l.slice(0, l.lastIndexOf(':')))), ['execucao.json', 'execucao.json', 'execucao.json']);
  assert.deepEqual((await fs.readdir(path.join(raiz, 'crews', 'x', 'output'))).sort(), ['2026-03-03-143022', '2026-03-03-143022-2', '2026-12-09-050708']);
});

test('U5a-10b: pasta --run stays as it was; saida and entrada with no --run are still a usage error', async (t) => {
  const raiz = await projetoDeCaminho(t);
  assert.deepEqual(await rodarCaminho(raiz, ['pasta', '--run', 'r1']), { code: 0, linhas: ['CAMINHO:OK crews/x/output/r1'] });
  for (const acao of ['saida', 'entrada']) {
    const r = await rodarCaminho(raiz, [acao, '--arquivo', 'crews/x/output/post.md']);
    assert.equal(r.code, 1);
    assert.ok(r.linhas.includes('Falta a opção obrigatória --run.'));
  }
  // A stray --arquivo with `pasta`, and --run with no value: no crash, and --run "" is not "no --run".
  assert.deepEqual(await rodarCaminho(raiz, ['pasta', '--run', 'r1', '--arquivo', 'crews/x/output/a.md']), { code: 0, linhas: ['CAMINHO:OK crews/x/output/r1'] });
  const semValor = await rodarCaminho(raiz, ['pasta', '--run', '']);
  assert.equal(semValor.code, 1);
  assert.ok(semValor.linhas.includes('Falta a opção obrigatória --run.'));
  assert.deepEqual(await fs.readdir(path.join(raiz, 'crews', 'x', 'output')), ['r1']);
});

// ── U5a-17 The delivery note ─────────────────────────────────────────────────────────────────

test('U5a-17a: a delivery with no network channel does not list images and networks as unchecked; one with a channel does', async (t) => {
  const soTexto = await projetoDeEntrega(t, { 'v1/minuta.md': '# Proposta\n\nTexto.\n' });
  await entregar(soTexto, ['v1/minuta.md=texto-livre']);
  const semRede = secao(await leiame(soTexto), 'O que não foi conferido');
  assert.match(semRede, /Links e fatos citados no texto\./);
  assert.doesNotMatch(semRede, /imagens|cada rede/);

  const comRede = await projetoDeEntrega(t, { 'v1/zap.md': 'Olá! A reunião é na sexta.\n' });
  await entregar(comRede, ['v1/zap.md=whatsapp-broadcast']);
  assert.deepEqual(secao(await leiame(comRede), 'O que não foi conferido').split('\n').slice(-3), ['- Links e fatos citados no texto.', '- Texto dentro das imagens.', '- Aparência final em cada rede.']);
});

test('U5a-01c: the checker command line accepts =texto-livre', async () => {
  const raiz = await projetoFalso({ saidas: { 'minuta.md': '# Proposta\n\nTexto.\n' } });
  const r = await rodarMain(raiz, ['--crew', CREW, '--arquivo', `${SAIDA}/minuta.md=texto-livre`]);
  assert.equal(r.linhas.at(-1), 'VERIFICACAO:OK');
  assert.ok(!r.linhas.some((l) => /Não medido|não encontrado/.test(l)), r.linhas.join('\n'));
  await fs.rm(raiz, { recursive: true, force: true });
});
