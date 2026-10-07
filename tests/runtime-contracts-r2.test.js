// Contracts the runtime prompts keep after R2 (specs/fase-r2-update-e-envio-seguros.md: R2-04c to
// R2-04f, rules 19 to 22, and the runner sentence of R2-05f, rule 25).
// Like the other runtime-contracts files, these guard the TEXT of the rules; whether a model obeys
// them is checked with a real run (spec §9 and → U0). No test runs Python.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../templates/${rel}`, import.meta.url), 'utf8');
const runner = read('_opencrew/core/runner.pipeline.md');
const engine = read('_opencrew/core/skills.engine.md');
const exportPrompt = read('_opencrew/core/prompts/export.prompt.md');
const sherlock = read('_opencrew/core/prompts/sherlock-shared.md');
const igSkill = read('skills/instagram-publisher/SKILL.md');
const genSkill = read('skills/image-ai-generator/SKILL.md');
const genScript = read('skills/image-ai-generator/scripts/generate.py');

// One line, single spaces: a rule re-wrapped by a later edit (or a CRLF checkout) still matches.
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const sectionOf = (md, start) => md.split(/\n(?=#{2,4} )/).find((s) => s.startsWith(start)) ?? '';
const items = (md, start) => sectionOf(md, start).split(/\n(?=\d+[a-z]?\. )/).map(flat);

// ── R2-04c The mark has a reader (rule 19) ──────────────────────────────────────────

const loading = flat(sectionOf(runner, '### Agent Loading'));
const INDICES = [
  ['skills.engine.md', flat(sectionOf(engine, '### 6. Inject Skill Context into Agent'))],
  ['runner.pipeline.md', loading.slice(loading.indexOf('**Inject skill context (Two-Tier)**'), loading.indexOf('The final agent context composition order'))],
];
const LINHA_IRREVERSIVEL =
  '- {skill-id}: {description} (type: {type}) — irreversível: carregue as instruções desta skill e peça a confirmação antes de usar';

for (const [arquivo, texto] of INDICES) {
  test(`R2-04c: in ${arquivo} the skill index reads side_effects`, () => {
    assert.match(texto, /frontmatter[^.]*`name`, `description`(, `type`)? and `side_effects`/);
  });

  test(`R2-04c: in ${arquivo} the line of an irreversible skill says "irreversível"`, () => {
    assert.ok(texto.replaceAll(' from frontmatter}', '}').includes(LINHA_IRREVERSIVEL), 'no "irreversível" line in the index');
    assert.match(texto, /every skill with `side_effects: irreversible`/);
  });

  test(`R2-04c: in ${arquivo} the instructions of an irreversible skill are loaded before its first use`, () => {
    assert.match(texto, /skill with `side_effects: irreversible`[^.]*Tier 2[^.]*before its first use/);
  });
}

// ── R2-04d Quotes (rule 20) ─────────────────────────────────────────────────────────

// The command lines of every ```bash block of a prompt.
const bashLines = (md) =>
  [...md.matchAll(/```bash\r?\n([\s\S]*?)```/g)].flatMap((m) => m[1].split(/\r?\n/)).map((l) => l.trim()).filter(Boolean);
// Commands written in a line of text: `node … "{name}" pasta`.
const inlineCommands = (md) =>
  [...md.matchAll(/`((?:mkdir|cp|mv|rm|ls|test|grep|cat|node|npx|python3?|py) [^`\n]+)`/g)].map((m) => m[1]);
// What is left of a command once the double-quoted pieces are taken out.
const outsideQuotes = (line) => line.replace(/"[^"]*"/g, '""');
const CREW_PATH = /crews\/|\{[^}]*(path|file|name|run_id|group)[^}]*\}/i;
const unquoted = (lines) => lines.filter((l) => CREW_PATH.test(outsideQuotes(l)));

// Since R3 (specs/fase-r3-runner-em-uso-real.md, rules 7 and 11) the runner has no bash command for
// paths: the path script is called by one-line commands written in the text. What R2 protects is
// the same — no crew path outside double quotes, in a block or in a line.
const CAMINHO = 'node _opencrew/core/scripts/caminho.mjs "{name}"';

test('R2-04d: in the runner no crew path is left outside double quotes in a command, block or line', () => {
  const blocks = bashLines(runner).filter((l) => CREW_PATH.test(l));
  const inline = inlineCommands(runner).filter((l) => CREW_PATH.test(l));
  // 2 blocks (source check, checker) + 6 of the Escritório + 4 of the path script.
  assert.equal(blocks.length, 2, `expected the 2 command blocks that take a crew path, got ${blocks.length}`);
  assert.ok(inline.length >= 10, `expected the 10 one-line commands that take a crew path, got ${inline.length}`);
  assert.deepEqual(unquoted([...blocks, ...inline]), []);
});

test('R2-04d: the commands that replaced the unquoted templates are quoted', () => {
  const lines = inlineCommands(runner);
  for (const cmd of [
    `${CAMINHO} entrada --run "{run_id}" --arquivo "{inputFile}"`,
    `${CAMINHO} saida --run "{run_id}" --arquivo "{outputFile}"`,
    `${CAMINHO} conferir --arquivo "{path}"`,
  ]) {
    assert.ok(lines.includes(cmd), `not found: ${cmd}`);
  }
});

test('R2-04d: the run folder command, written in a line of the runner text, also quotes the crew path', () => {
  const withPath = inlineCommands(runner).filter((l) => CREW_PATH.test(l));
  assert.ok(withPath.includes(`${CAMINHO} pasta --run "{run_id}"`), `the run folder command changed: ${withPath}`);
  assert.deepEqual(unquoted(withPath), []);
});
test('R2-04d: in export.prompt.md the crew path goes between double quotes', () => {
  const withPath = bashLines(exportPrompt).filter((l) => CREW_PATH.test(l));
  // The only command with a crew path was the PDF one, gone in 1.9.0 (U3a-10a): none is left.
  assert.deepEqual(withPath, []);
  assert.deepEqual(unquoted([...withPath, ...inlineCommands(exportPrompt)]), []);
});

test('R2-04d: in sherlock-shared.md the URL of every command goes between double quotes', () => {
  const URL_RX = /\{[^}]*url\}/;
  const withUrl = bashLines(sherlock).filter((l) => URL_RX.test(l));
  assert.equal(withUrl.length, 5, `expected the five playwright commands that take a URL, got ${withUrl.length}`);
  for (const l of withUrl) {
    assert.match(l, /^npx playwright open .*"\{(platform-)?url\}"$/);
    assert.doesNotMatch(outsideQuotes(l), URL_RX, `URL outside quotes: ${l}`);
  }
});

// ── R2-04e Safe names (rule 21; messages of spec §6) ────────────────────────────────

const SAFE = '## Safe names in commands (nome seguro)';
const safe = flat(sectionOf(runner, SAFE));
const MSG_PASTA =
  '"⚠️ A pasta da crew (`crews/{name}`) tem um caractere que não posso usar em comandos ({caractere}). Renomeie a pasta e rode de novo."';
const MSG_ARQUIVO = [
  '⚠️ O nome `{caminho}` tem um caractere que não posso usar em comandos ({caractere}). Use só letras, números, espaço, ponto, hífen, sublinhado e parênteses.',
  '1. Parar para você renomear (ajuste também o `outputFile` do passo)',
  '2. Seguir sem conferir este arquivo',
].join(' ');
const MSG_APROVACAO = '`{arquivo} — não verificado: nome com caractere que não vai em comando`';

test('R2-04e: the safe-name section comes before the first command of the runner', () => {
  const at = runner.indexOf(`\n${SAFE}`);
  assert.ok(at > -1, `the runner has no "${SAFE}" section`);
  assert.ok(at < runner.indexOf('```bash'), 'a command block comes before the safe-name section');
  assert.ok(at < runner.indexOf(inlineCommands(runner)[0]), 'a command in the text comes before the safe-name section');
  assert.match(safe, /Applies to EVERY command below and in any prompt or skill/);
});

test('R2-04e: the section lists the characters a path may have and forbids the command otherwise', () => {
  assert.match(safe, /only between double quotes and only if it is made of letters \(accents included\), digits, space and `\. _ - \/ \\ : \( \)`\./);
  assert.match(safe, /With any other character \([^)]*`\$`[^)]*backtick[^)]*`,`[^)]*`&`[^)]*\) do NOT build the command/);
});

test('R2-04e: an unsafe crew folder stops the run, with the message of spec §6', () => {
  assert.ok(safe.includes(`**Crew folder** → stop: ${MSG_PASTA}`), 'crew folder message missing or changed');
});

test('R2-04e: an unsafe output file offers to stop or to go on without checking it', () => {
  assert.match(safe, /\*\*Output file\*\* \([^)]*`outputFile`[^)]*\) → ask and wait: ```/);
  assert.ok(safe.includes(MSG_ARQUIVO), 'output file question missing or changed');
  assert.match(safe, /On 2, run no command with that file/);
});

test('R2-04e: a file left unchecked shows up as "não verificado" at the final approval', () => {
  assert.ok(safe.includes(`list it at the final approval: ${MSG_APROVACAO}`), 'final approval line missing or changed');
  const approval = items(runner, '### Review Loops').find((s) => /^\d+\. \*\*Final approval checkpoint\*\*/.test(s)) ?? '';
  assert.match(approval, /and the line of every file left unchecked by the safe-name rule\./);
});

test('R2-04e: instagram-publisher and image-ai-generator cite the rule', () => {
  for (const [name, md] of [['instagram-publisher', igSkill], ['image-ai-generator', genSkill]]) {
    assert.match(flat(md), /safe-name rule \(nome seguro\) of `_opencrew\/core\/runner\.pipeline\.md`/, `${name} does not cite the safe-name rule`);
    assert.match(flat(md), /With any other character[^.]*do not run the command: ask the user to rename the file/, `${name} does not say what to do with an unsafe name`);
  }
});

// ── R2-04f Image prompt by file (rule 22) ───────────────────────────────────────────

test('R2-04f: the invoke of image-ai-generator uses --prompt-file', () => {
  const invoke = genSkill.match(/^\s*invoke: (.*)$/m)[1];
  assert.match(invoke, /generate\.py --prompt-file \\"\{prompt_file\}\\" --output/);
});

test('R2-04f: the SKILL.md never interpolates the prompt and forbids putting it in the command', () => {
  assert.doesNotMatch(genSkill, /--prompt \\?"/, 'a prompt is still interpolated into a shell command');
  assert.match(flat(genSkill), /Never put the prompt inside a shell command: write it to a file and pass `--prompt-file`\./);
  const exemplos = bashLines(genSkill).filter((l) => l.startsWith('--prompt'));
  assert.ok(exemplos.length >= 2 && exemplos.every((l) => /^--prompt-file "crews\/\{crew\}\/output\/\{run_id\}\//.test(l)), `examples: ${exemplos}`);
});

test('R2-04f: generate.py declares --prompt-file and keeps --prompt', () => {
  assert.match(genScript, /add_argument\("--prompt-file"/);
  assert.match(genScript, /add_argument\("--prompt",[^\n]*legacy/i);
});

test('R2-04f: generate.py opens the prompt and the batch with utf-8-sig', () => {
  const abre = (fn) => genScript.slice(genScript.indexOf(`def ${fn}(path):`)).split(/\n(?=def )/)[0];
  for (const fn of ['read_prompt_file', 'read_batch']) {
    assert.match(abre(fn), /open\(path, "r", encoding="utf-8-sig"\)/, `${fn} does not read as utf-8-sig`);
  }
  assert.match(genScript, /read_prompt_file\(args\.prompt_file\)/);
  assert.match(genScript, /read_batch\(args\.batch\)/);
  assert.doesNotMatch(genScript, /open\(args\./, 'a file given by the user is opened outside the two readers');
});

test('R2-04f: the reading errors of generate.py are the PT-BR messages of spec §6, with code 1', () => {
  for (const msg of [
    'f"Arquivo de prompt não encontrado: {path}"',
    'f"O arquivo de prompt está vazio: {path}"',
    '"Use só um: --prompt-file ou --batch."',
    'f"Não consegui ler o lote {path}: {e}. Grave o arquivo em UTF-8."',
  ]) {
    assert.ok(genScript.includes(`fail(${msg})`), `missing: ${msg}`);
  }
  const fail = genScript.slice(genScript.indexOf('def fail(message):')).split(/\n(?=def )/)[0];
  assert.match(fail, /print\(message, file=sys\.stderr\)\s+sys\.exit\(1\)/);
});

// ── R2-05f The runner and the "não conferido" alert (rule 25) ───────────────────────

test('R2-05f: the runner mentions the "não conferido" alert and goes on', () => {
  const sourceCheck = items(runner, '## Initialization').find((s) => /^\d+[a-z]?\. \*\*Source check\*\*/.test(s)) ?? '';
  assert.match(sourceCheck, /Alerts — not portable \(absolute paths\) or "não conferido" \(a network path or a site address: the script never accesses the network\) — are mentioned once, without stopping\./);
});

test('R2-04f: generate.py checks the shape of the batch before the key and before any image', () => {
  assert.match(genScript, /def read_batch\(path\):[\s\S]*?isinstance\(batch, list\)[\s\S]*?def load_api_key/);
  assert.match(genScript, /O lote \{path\} tem de ser uma lista de itens com "prompt" e "output"/);
});
