// specs/fase-r2-update-e-envio-seguros.md R2-04a and R2-04b (rules 17 and 18): the catalog skills
// that publish or send carry `side_effects: irreversible` and ask for a word before acting.
// These guard the TEXT of the skills; whether a model obeys it is checked with a test account
// (spec §9, → U0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tpl = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const read = (rel) => readFileSync(path.join(tpl, rel), 'utf8');
// One line, single spaces: a rule re-wrapped by a later edit (or a CRLF checkout) still matches.
const flat = (s) => s.replace(/\s+/g, ' ').trim();

function skill(name) {
  const [, front = '', ...rest] = read(`skills/${name}/SKILL.md`).split(/^---\r?$/m);
  return { name, front, body: flat(rest.join('---')) };
}

const MARK = /^side_effects: irreversible\s*$/m;
const catalog = readdirSync(path.join(tpl, 'skills'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(path.join(tpl, 'skills', e.name, 'SKILL.md')))
  .map((e) => skill(e.name));
const marked = catalog.filter((s) => MARK.test(s.front)).map((s) => s.name).sort();

// Positions of each marker inside `text`, in the order given; -1 when one is missing.
const positions = (text, markers) => markers.map((m) => text.indexOf(m));
const ascending = (list) => list.every((p, i) => p > -1 && (i === 0 || p > list[i - 1]));

// ── R2-04a The mark (rule 17) ───────────────────────────────────────────────────────

test('R2-04a: instagram-publisher, blotato and resend declare side_effects: irreversible', () => {
  for (const name of ['blotato', 'instagram-publisher', 'resend']) {
    assert.ok(marked.includes(name), `${name}/SKILL.md has no "side_effects: irreversible" in the frontmatter`);
  }
});

test('R2-04a: a skill that only spends money does not carry the mark', () => {
  for (const name of ['apify', 'canva', 'image-ai-generator']) {
    assert.ok(!marked.includes(name), `${name} got the mark: it would be pushed to the end of the pipeline`);
  }
});

const PREVIA = /\bpreview\b|prévia/i;
const PALAVRA = /\bword \*\*(publish|publicar|enviar)\*\*|responda com a palavra (publicar|enviar)\b/;
const NAO_REPETIR = /do NOT (run|repeat) [^.]*\bagain\b/;

test('R2-04a: every SKILL.md with the mark has the preview, the word and "never repeat"', () => {
  assert.ok(marked.length >= 3, `expected at least three marked skills, got ${marked.join(', ')}`);
  for (const { name, body } of catalog.filter((s) => marked.includes(s.name))) {
    assert.match(body, PREVIA, `${name}: no preview before acting`);
    assert.match(body, PALAVRA, `${name}: no confirmation word`);
    assert.match(body, NAO_REPETIR, `${name}: nothing forbids repeating the call after a failure`);
  }
});

test('R2-04a: skill-format.md and skills.engine.md document the field', () => {
  const format = read('skills/opencrew-skill-creator/references/skill-format.md');
  const common = format.slice(format.indexOf('### Common Frontmatter Fields'), format.indexOf('### Type: mcp'));
  assert.match(common, /^\| `side_effects` \| No \| `irreversible`[^\n]*(publishes|sends)/m);
  const engine = read('_opencrew/core/skills.engine.md');
  const fields = engine.slice(engine.indexOf('Frontmatter fields:'), engine.indexOf('Body: Markdown instructions'));
  assert.match(fields, /^- `side_effects` \(string, optional\): `irreversible`[^\n]*(publishes|sends)/m);
});

// ── R2-04b The confirmation block (rule 18; texts of spec §6) ───────────────────────

const APAGAR = 'Vou apagar isto: {o que será apagado}. Para apagar, responda com a palavra apagar. Qualquer outra resposta cancela.';
const falha = (servico, oQue) =>
  `⚠️ Não recebi a confirmação do ${servico}. ${oQue}. Confira no painel antes de tentar de novo. Não vou repetir sozinho.`;
const deNovo = (verbo) => `Este passo já tentou ${verbo} nesta execução. Confira se saiu antes de confirmar de novo.`;

const blotato = skill('blotato').body;
const PREVIA_BLOTATO = [
  'Vou publicar isto:',
  'Contas: {conta} ({rede}), …',
  'Quando: agora, ou agendado para {data e hora}',
  'Texto ({N} caracteres): {texto}',
  'Mídia: {arquivos}, ou nenhuma',
  'Para publicar, responda com a palavra publicar. Qualquer outra resposta cancela.',
];

test('R2-04b: blotato shows the preview of spec §6, line by line', () => {
  assert.ok(blotato.includes(PREVIA_BLOTATO.join(' ')), 'the preview is not the text of spec §6');
});

test('R2-04b: blotato goes preview → the word publicar → media upload → one single call', () => {
  const order = positions(blotato, ['Vou publicar isto:', 'Nada foi publicado.', 'blotato_upload_media', 'blotato_create_post']);
  assert.ok(ascending(order), `order must be preview → word → upload → publishing call, got ${order}`);
  assert.match(blotato, /Wait for the word \*\*publicar\*\*\. Any other answer[^.]*cancels: say "Nada foi publicado\." and stop\./);
  assert.match(blotato, /Only after the word[^.]*upload the media[^.]*\*\*one single call\*\*/);
});

test('R2-04b: before the word blotato sends nothing, not even media', () => {
  const antes = blotato.slice(blotato.indexOf('### Workflow'), blotato.indexOf('Nada foi publicado.'));
  assert.doesNotMatch(antes, /blotato_(upload_media|create_post)/);
  assert.match(antes, /Send nothing to Blotato yet, not even media/);
});

test('R2-04b: blotato never repeats after a failure and warns the post may already be out', () => {
  assert.match(blotato, /do NOT repeat the call again/);
  assert.ok(blotato.includes(falha('Blotato', 'A publicação pode já ter saído')));
});

test('R2-04b: a blotato step that runs again shows the preview again and warns about the earlier attempt', () => {
  assert.match(blotato, /One confirmation is worth one publication/);
  assert.match(blotato, /If this step runs again[^.]*, show the preview again/);
  assert.ok(blotato.includes(deNovo('publicar')));
});

test('R2-04b: blotato asks for the word apagar before any call that deletes', () => {
  assert.ok(blotato.includes(APAGAR));
  assert.ok(blotato.includes('Nada foi apagado.'));
});

const resend = skill('resend').body;
const PREVIA_RESEND = [
  'Vou enviar este e-mail:',
  'De: {remetente}',
  'Para: {N} destinatário(s): {até 10 endereços}… e mais {N-10}',
  'Assunto: {assunto}',
  'Início do texto: {3 primeiras linhas}',
  'Anexos: {nomes}, ou nenhum',
  'Quando: agora, ou agendado para {data e hora}',
  'Para enviar, responda com a palavra enviar. Qualquer outra resposta cancela.',
];

test('R2-04b: resend shows the preview of spec §6, with sender, recipients and how many', () => {
  assert.ok(resend.includes(PREVIA_RESEND.join(' ')), 'the preview is not the text of spec §6');
  assert.match(resend, /`\{N\}` is the total of recipients/);
});

test('R2-04b: resend goes preview → the word enviar → one single call', () => {
  const order = positions(resend, ['Vou enviar este e-mail:', 'Nenhum e-mail foi enviado.', '`send_email`']);
  assert.ok(ascending(order), `order must be preview → word → sending call, got ${order}`);
  assert.ok(resend.indexOf('batch_send_emails') > order[1], 'the batch tool is named before the word');
  assert.match(resend, /Wait for the word \*\*enviar\*\*\. Any other answer[^.]*cancels: say "Nenhum e-mail foi enviado\." and stop\./);
  assert.match(resend, /Only after the word[^.]*\*\*one single call\*\*/);
});

test('R2-04b: a scheduled e-mail asks for the same word', () => {
  const scheduling = resend.slice(resend.indexOf('### Scheduling'), resend.indexOf('## Best practices'));
  assert.match(scheduling, /`scheduled_at`/);
  assert.match(scheduling, /same preview and the same word/);
});

test('R2-04b: resend never repeats after a failure and warns the e-mail may already be out', () => {
  assert.match(resend, /do NOT repeat the call again/);
  assert.ok(resend.includes(falha('Resend', 'O e-mail pode já ter sido enviado')));
});

test('R2-04b: a resend step that runs again shows the preview again and warns about the earlier attempt', () => {
  assert.match(resend, /One confirmation is worth one send/);
  assert.match(resend, /If this step runs again[^.]*, show the preview again/);
  assert.ok(resend.includes(deNovo('enviar')));
});

test('R2-04b: resend asks for the word apagar before removing a contact or a domain', () => {
  assert.ok(resend.includes(APAGAR));
  assert.ok(resend.includes('Nada foi apagado.'));
  assert.match(resend, /removing a contact or a domain/);
});

// ── R2-04b The publishing best-practice ─────────────────────────────────────────────

const bp = read('_opencrew/core/best-practices/social-networks-publishing.md');

test('R2-04b: the publishing best-practice does not tell the agent to upload media to Blotato without posting', () => {
  assert.doesNotMatch(bp, /media upload without posting/i);
  for (const line of bp.split(/\r?\n/).filter((l) => /dry-run/i.test(l) && /upload(ed)? media|media upload/i.test(l))) {
    assert.match(line, /instagram-publisher/, `a dry-run that uploads media, not tied to instagram-publisher: ${line}`);
  }
  assert.match(flat(bp), /`blotato` has no dry-run: send nothing to it, not even media, before the user answers with the word `publicar`/);
});

test('R2-04b: in the best-practice the dry-run belongs to instagram-publisher only', () => {
  const compact = bp.slice(bp.indexOf('## Compact Rules'), bp.indexOf('<!-- End Compact Rules'));
  const dryRun = compact.split(/\r?\n/).filter((l) => /dry-run/i.test(l));
  assert.ok(dryRun.length > 0, 'the compact rules lost the dry-run');
  for (const line of dryRun) assert.match(line, /instagram-publisher/, `dry-run for every skill: ${line}`);
  const blotatoExample = bp.slice(bp.indexOf('### Example 2'), bp.indexOf('## Anti-Patterns'));
  assert.match(blotatoExample, /Skill:\s+blotato/);
  assert.doesNotMatch(blotatoExample, /dry-run/i, 'the Blotato example still shows a dry-run');
});
