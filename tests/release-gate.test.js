// Fase R2 (specs/fase-r2-update-e-envio-seguros.md, regras 29 e 30) — a publicação só sai depois
// da matriz do CI. Os dois workflows são lidos como texto: nenhum parser de YAML, nenhuma rede.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel) => fs.readFile(path.join(raiz, rel), 'utf8');

/** O workflow sem comentários (linha inteira ou no fim da linha) e sem CRLF. */
async function workflow(nome) {
  const texto = await ler(`.github/workflows/${nome}`);
  return texto.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).map((l) => l.replace(/\s+#.*$/, '')).join('\n');
}

/** A seção `on:` (os gatilhos), até `jobs:`. */
const gatilhos = (yaml) => yaml.slice(yaml.search(/^on:/m), yaml.search(/^jobs:/m));

/** { nome do job: texto do job } — jobs com dois espaços de recuo, como nos dois arquivos. */
function jobs(yaml) {
  const blocos = {};
  let atual = null;
  for (const linha of yaml.slice(yaml.search(/^jobs:/m)).split('\n').slice(1)) {
    const nome = linha.match(/^ {2}([\w-]+):\s*$/)?.[1];
    if (nome) blocos[atual = nome] = '';
    else if (atual) blocos[atual] += `${linha}\n`;
  }
  return blocos;
}

const passos = (job) => job.split(/^ {6}- /m).slice(1);
const condicao = (passo) => passo.match(/^ {8}if: (.+)$/m)?.[1].trim() ?? null;

/** `chave: [a, 'b']` → ['a', 'b'] */
function lista(yaml, chave) {
  const itens = yaml.match(new RegExp(`^\\s*${chave}: \\[([^\\]\\n]*)\\]\\s*$`, 'm'))?.[1];
  assert.ok(itens !== undefined, `lista "${chave}" não encontrada`);
  return itens.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
}

test('R2-06d: a matriz do CI roda em Ubuntu e Windows, no piso do engines.node e no Node 22', async () => {
  const piso = JSON.parse(await ler('package.json')).engines.node.replace(/^>=/, '');
  const ci = await workflow('ci.yml');
  assert.deepEqual(lista(ci, 'os').sort(), ['ubuntu-latest', 'windows-latest']);
  assert.deepEqual(lista(ci, 'node-version').sort(), [piso, '22'].sort());
  assert.match(ci, /^ {4}runs-on: \$\{\{ matrix\.os \}\}$/m, 'o job usa o sistema da matriz');
  assert.match(ci, /^ {10}node-version: \$\{\{ matrix\.node-version \}\}$/m, 'o job usa o Node da matriz');
});

test('R2-06e: o ci.yml aceita ser chamado por outro workflow e roda a porta e a auditoria', async () => {
  const ci = await workflow('ci.yml');
  for (const gatilho of ['workflow_call', 'push', 'pull_request']) {
    assert.match(gatilhos(ci), new RegExp(`^ {2}${gatilho}:`, 'm'), `gatilho ${gatilho}`);
  }
  assert.match(ci, /^ {8}run: npm run verify$/m);
  assert.match(ci, /^ {8}run: npm audit --audit-level=high$/m);
});

test('R2-06e: no publish.yml, um job usa o ci.yml e o job que publica depende dele', async () => {
  const blocos = jobs(await workflow('publish.yml'));
  const doCi = Object.keys(blocos).filter((nome) => /^ {4}uses: \.\/\.github\/workflows\/ci\.yml$/m.test(blocos[nome]));
  const publicam = Object.keys(blocos).filter((nome) => /npm publish/.test(blocos[nome]));
  assert.equal(doCi.length, 1, 'um job chama o ci.yml');
  assert.equal(publicam.length, 1, 'um job só publica');
  const needs = blocos[publicam[0]].match(/^ {4}needs: (.+)$/m)?.[1] ?? '';
  assert.ok(needs.replace(/[[\]\s]/g, '').split(',').includes(doCi[0]), `o job "${publicam[0]}" declara needs: ${doCi[0]}`);
});

test('R2-06e: o passo tag × versão vem antes de publicar', async () => {
  const blocos = jobs(await workflow('publish.yml'));
  const sequencia = passos(Object.values(blocos).find((job) => /npm publish/.test(job)) ?? '');
  const tag = sequencia.findIndex((p) => /GITHUB_REF_NAME/.test(p) && /package\.json/.test(p) && /exit 1/.test(p));
  const publica = sequencia.findIndex((p) => /npm publish/.test(p));
  assert.ok(tag >= 0, 'existe o passo que compara a tag com a versão do package.json');
  assert.equal(condicao(sequencia[tag]), "startsWith(github.ref, 'refs/tags/v')", 'ele roda em toda tag v*');
  assert.ok(tag < publica, 'e vem antes do primeiro npm publish');
});

test('R2-06e: o disparo manual tem dry_run ligado por padrão, que leva a npm publish --dry-run', async () => {
  const publish = await workflow('publish.yml');
  assert.match(gatilhos(publish), /^ {2}push:\n {4}tags:\n {6}- 'v\*'$/m, 'a tag v* continua publicando');
  const entrada = gatilhos(publish).match(/^ {2}workflow_dispatch:\n {4}inputs:\n {6}dry_run:\n((?: {8}.*\n?)+)/m)?.[1] ?? '';
  assert.match(entrada, /^ {8}type: boolean$/m);
  assert.match(entrada, /^ {8}default: true$/m);

  const comPublish = passos(Object.values(jobs(publish)).find((job) => /npm publish/.test(job)) ?? '').filter((p) => /npm publish/.test(p));
  const ensaio = comPublish.filter((p) => /^ {8}run: npm publish --dry-run\b/m.test(p));
  const real = comPublish.filter((p) => !/--dry-run/.test(p));
  assert.equal(comPublish.length, 2, 'dois passos com npm publish: o ensaio e o de verdade');
  assert.equal(ensaio.length, 1);
  assert.equal(real.length, 1);
  // As duas condições são o contrário uma da outra: em cada execução roda um passo só.
  assert.equal(condicao(ensaio[0]), "github.event_name == 'workflow_dispatch' && inputs.dry_run");
  assert.equal(condicao(real[0]), "github.event_name != 'workflow_dispatch' || !inputs.dry_run");
  assert.doesNotMatch(ensaio[0], /NPM_TOKEN|--provenance/, 'o ensaio não recebe o segredo nem gera proveniência');
  assert.match(real[0], /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/);
  assert.equal(comPublish.at(-1), real[0], 'o passo de verdade é o último');
});
