// Contracts the runtime keeps after U6, slice 2 (specs/fase-u6b-dados-e-custo.md: U6b-07 to U6b-09 and
// U6b-upg-a). Like the other runtime-contracts files, these guard the TEXT of the rules; whether a model
// obeys them is checked with a real run (spec §9). generate.py is also run, with no key and no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';
import { ANTIGA, CREW } from './_conserto.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const tem = (onde, frase) => assert.ok(flat(onde).includes(flat(frase)), `missing: ${frase}`);
const linhas = (s) => s.split('\n').length;
const CORE = 'templates/_opencrew/core';
const limpeza = ler(`${CORE}/prompts/limpeza.prompt.md`);
const relato = ler(`${CORE}/prompts/relato.prompt.md`);
const system = ler('templates/AGENTS.md');
const imagem = ler('templates/skills/image-ai-generator/SKILL.md');
const gerador = ler('templates/skills/image-ai-generator/scripts/generate.py');

/** The Python of this machine, or null: the execution tests of generate.py are skipped without it. */
const python = ['python3', 'python'].find((nome) => spawnSync(nome, ['--version'], { encoding: 'utf8' }).status === 0) ?? null;

async function lote(t, itens) {
  const dir = await mkTmp('u6b-lote');
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const arquivo = path.join(dir, 'lote.json');
  await fs.writeFile(arquivo, JSON.stringify(Array.from({ length: itens }, (_, i) => ({ prompt: `imagem ${i}`, output: path.join(dir, `i${i}.jpg`) }))));
  return { dir, arquivo };
}

function gerar(args, dir) {
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8', OPENROUTER_API_KEY: '' };
  return spawnSync(python, [path.join(root, 'templates/skills/image-ai-generator/scripts/generate.py'), ...args], { encoding: 'utf8', env, cwd: dir });
}

test('U6b-07a: generate.py refuses a batch above the ceiling before the key and before any image; --max-itens raises it', { skip: python === null && 'no Python on this machine' }, async (t) => {
  const { dir, arquivo } = await lote(t, 13);
  const recusa = gerar(['--batch', arquivo, '--mode', 'test'], dir);
  assert.equal(recusa.status, 1);
  assert.match(recusa.stderr, /O lote tem 13 imagens e o teto é 12\. Nada foi gerado\./);
  assert.doesNotMatch(recusa.stderr, /OPENROUTER_API_KEY/, 'the ceiling is checked before the key');
  const dozeSemChave = gerar(['--batch', (await lote(t, 12)).arquivo, '--mode', 'test'], dir);
  assert.match(dozeSemChave.stderr, /OPENROUTER_API_KEY not found/, '12 is within the ceiling: it goes on to the key');
  const maisAlto = gerar(['--batch', arquivo, '--mode', 'test', '--max-itens', '20'], dir);
  assert.match(maisAlto.stderr, /OPENROUTER_API_KEY not found/, '--max-itens 20 accepts 13');
  assert.equal(existsSync(path.join(dir, 'i0.jpg')), false, 'no image was made');
});

test('U6b-07a: a failed image is tried at most twice — the retry is a function with the number of attempts in one constant', () => {
  tem(gerador, 'MAX_BATCH = 12');
  tem(gerador, 'ATTEMPTS = 2');
  tem(gerador, 'for attempt in range(1, ATTEMPTS + 1):');
  assert.equal(gerador.split('generate_with_retry(').length - 1, 3, 'defined once and used in the batch and in the single image');
  assert.equal(gerador.split('generate_image(').length - 1, 2, 'generate_image is defined and called only inside the retry');
});

test('U6b-07b: the image skill asks for the estimate before and the record after, confirms above 6, and apify and resend confirm above 20', () => {
  tem(imagem, 'node _opencrew/core/scripts/custo.mjs "{crew}" estimar --run "{run_id}" --modo {test|production} --itens {N}');
  tem(imagem, '`CUSTO:ACIMA {sobra}` → do **not** generate yet');
  tem(imagem, 'Esta chamada custa cerca de R$ {x}; já foram R$ {y} nesta execução e o orçamento é R$ {z}. Quer seguir mesmo assim, gerar só {sobra} imagem(ns) ou parar?');
  tem(imagem, 'A batch of **more than 6 images** is confirmed with the user even with no `Budget:` set');
  tem(imagem, 'node _opencrew/core/scripts/custo.mjs "{crew}" registrar --run "{run_id}" --modo {modo} --itens {N}');
  tem(imagem, 'record what **really** came out');
  tem(imagem, 'refuses a batch of more than 12 images');
  tem(imagem, 'One question is enough: when the `CUSTO:ACIMA` question was already asked and answered, do not ask this one too');
  tem(imagem, 'comes from the `saida` command of `_opencrew/core/scripts/caminho.mjs`');
  tem(ler('templates/skills/apify/SKILL.md'), 'Before any run that asks for **more than 20 items**');
  tem(ler('templates/skills/resend/SKILL.md'), 'A batch to **more than 20 recipients** is confirmed with the user before sending');
  assert.match(imagem, /R\$0\.07-0\.10/);
  assert.match(imagem, /R\$0\.01-0\.02/);
});

test('U6b-07b: the prices in custo.mjs are the top of the ranges the skill publishes', async () => {
  const { PRECO_POR_ITEM } = await import('../templates/_opencrew/core/scripts/custo/dinheiro.mjs');
  assert.deepEqual({ ...PRECO_POR_ITEM }, { test: 2, production: 10 });
});

test('U6b-09a: the cleanup prompt takes only the ids of the list, asks the questions of the spec, and never deletes by itself', () => {
  tem(limpeza, 'node _opencrew/core/scripts/limpeza.mjs "{name}" --listar');
  tem(limpeza, 'node _opencrew/core/scripts/limpeza.mjs "{name}" --apagar "{run1},{run2}" [--sem-entrega "{run}"] [--audio]');
  tem(limpeza, 'Vou apagar {n} execuções da crew {nome} e liberar {tamanho}. O histórico (runs.md) fica. Posso apagar?');
  tem(limpeza, 'A entrega da execução {run} só existe nesta pasta (não foi copiada para o projeto). Posso apagar mesmo assim?');
  tem(limpeza, 'Não há execução para limpar na crew {nome}: as {N} mais recentes ficam e o resto está aberto ou sem cópia.');
  tem(limpeza, 'taken **from the list of Step 2** — never typed from memory, never "all"');
  tem(limpeza, '**DO NOT** delete, move or edit any file or folder with your own tools');
  tem(limpeza, 'A yes puts that run in **both** `--apagar` and `--sem-entrega`.');
  tem(limpeza, 'Há áudio com mais de 30 dias em _investigations/ ({n} arquivos, {tamanho}). A transcrição fica. Posso apagar o áudio?');
  tem(limpeza, 'that is the **candidates** of Step 2 only');
  tem(limpeza, '`LIMPEZA:PARCIAL {n} {tamanho}` → something did not go');
  tem(limpeza, 'the run is **half deleted**');
  tem(limpeza, 'the crew, `output/` or `_investigations/` is a shortcut');
  assert.equal(limpeza.split('```').length % 2, 1, 'the code fences of the prompt are balanced');
  tem(limpeza, '**DO NOT** touch the copies of the deliveries in the user\'s project');
  assert.ok(linhas(limpeza) <= 100, `limpeza.prompt.md has ${linhas(limpeza)} lines`);
});

test('U6b-09a: the report prompt runs the script, does not send or open anything, and asks the question of the spec', () => {
  tem(relato, 'node _opencrew/core/scripts/relato.mjs --ide {ide}');
  tem(relato, 'Aqui está o relato. Confira que não tem nada do seu cliente e cole numa issue em https://github.com/alberthpalhares/opencrew/issues/new?template=relato-de-uso.md.');
  tem(relato, 'O que aconteceu? (uma ou duas frases, sem dados de cliente)');
  tem(relato, '**DO NOT** send, post or open anything');
  tem(relato, 'never open a browser');
  assert.ok(linhas(relato) <= 100, `relato.prompt.md has ${linhas(relato)} lines`);
  const modelo = ler('.github/ISSUE_TEMPLATE/relato-de-uso.md');
  for (const campo of ['Versão do OpenCrew', 'Node', 'Sistema', 'IDE', 'Execução', 'Tipo', 'Situação', 'Passos previstos', 'Último passo conferido', 'Respostas registradas', 'O que aconteceu']) assert.ok(modelo.includes(campo), campo);
  assert.match(modelo, /NÃO cole texto de cliente/);
});

test('U6b-09b: system.md routes /opencrew cleanup and /opencrew feedback, and the same asked in plain words', () => {
  tem(system, '| `/opencrew cleanup <name>`, or a request in plain words to free space of old runs ("libera espaço da crew X", "apaga as execuções antigas") | Load `_opencrew/core/prompts/limpeza.prompt.md`');
  tem(system, '| `/opencrew feedback`, or a request in plain words to report a problem or tell how it went ("quero reportar um problema") | Load `_opencrew/core/prompts/relato.prompt.md`');
});

test('U6b-04a: the preferences template has Budget (empty) and Retencao (10)', () => {
  const prefs = ler('templates/_opencrew/_memory/preferences.md');
  assert.match(prefs, /^- \*\*Budget:\*\*$/m);
  assert.match(prefs, /^- \*\*Retencao:\*\* 10$/m);
});

test('U6b-upg-a: update from 1.16.0 delivers the three scripts and the two prompts; preferences.md and crews/ are untouched; the delivered limpeza.mjs lists without deleting', async (t) => {
  const dir = await mkTmp('upgrade-u6b');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const core = path.join(dir, '_opencrew', 'core');
  const NOVOS = [['scripts', 'limpeza.mjs'], ['scripts', 'limpeza'], ['scripts', 'custo.mjs'], ['scripts', 'custo'], ['scripts', 'relato.mjs'], ['scripts', 'preferencias.mjs'], ['prompts', 'limpeza.prompt.md'], ['prompts', 'relato.prompt.md']];
  for (const novo of NOVOS) await fs.rm(path.join(core, ...novo), { recursive: true, force: true });
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.16.0\n');
  const preferencias = '# Preferences\n\n- **User Name:** Alberto\n- **Dashboard:** disabled\n';
  await fs.writeFile(path.join(dir, '_opencrew', '_memory', 'preferences.md'), preferencias);
  for (const [arquivo, conteudo] of Object.entries({ ...ANTIGA, [`crews/atas/output/2026-09-01-100000/v1/a.md`]: 'Ata.\n', [`crews/atas/output/2026-09-01-100000/copia.json`]: '{}\n' })) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  const antes = await snapshot(path.join(dir, 'crews'));

  await captureOutput(() => withCwd(dir, () => update()));

  for (const novo of NOVOS) assert.equal(await exists(path.join(core, ...novo)), true, `missing after update: ${novo.join('/')}`);
  assert.equal(await fs.readFile(path.join(dir, '_opencrew', '_memory', 'preferences.md'), 'utf8'), preferencias, 'preferences.md is the user\'s');
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'update changed a file under crews/');
  assert.match(await fs.readFile(path.join(core, 'system.md'), 'utf8'), /\/opencrew cleanup <name>/);
  const { main } = await import(`${pathToFileURL(path.join(core, 'scripts', 'limpeza.mjs')).href}?u6b-upg`);
  const saida = [];
  await main([CREW.replace('crews/', ''), '--manter', '1'], { cwd: dir, escrever: (s) => saida.push(s) });
  assert.equal(saida.at(-1), 'LIMPEZA:NADA', saida.join('\n'));
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'listing deleted nothing');
});
