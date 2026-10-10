// specs/fase-u6b-dados-e-custo.md — U6b-06: the budget of a run. `estimar` reads, `registrar` writes only
// the custo.json of the run; money is in whole cents; a budget that is not a value means no limit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { main as custo } from '../templates/_opencrew/core/scripts/custo.mjs';
import { lerReais, reais } from '../templates/_opencrew/core/scripts/custo/dinheiro.mjs';
import { CREW, SAIDA, arvore, gravar, projeto } from './_limpeza.js';

const RUN = '2026-10-09-100000';
const USO = 'Uso: node _opencrew/core/scripts/custo.mjs <crew> estimar|registrar --run <id> --modo test|production --itens N';

async function comExecucao(t, budget) {
  const preferencias = budget === undefined ? {} : { '_opencrew/_memory/preferences.md': `# Preferences\n\n- **Dashboard:** disabled\n- **Budget:** ${budget}\n` };
  const raiz = await projeto(t, { ...preferencias, [`${SAIDA}/${RUN}/v1/a.md`]: 'x\n' });
  return raiz;
}

async function rodar(raiz, ...argv) {
  const linhas = [];
  const code = await custo([CREW, ...argv], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')), agora: () => new Date(2026, 9, 9, 12) });
  return { code, linhas, fim: linhas.at(-1) };
}
const estimar = (raiz, modo, itens) => rodar(raiz, 'estimar', '--run', RUN, '--modo', modo, '--itens', String(itens));
const registrar = (raiz, modo, itens) => rodar(raiz, 'registrar', '--run', RUN, '--modo', modo, '--itens', String(itens));
const lerCusto = async (raiz) => JSON.parse(await fs.readFile(path.join(raiz, SAIDA, RUN, 'custo.json'), 'utf8'));

test('U6b-06a: with no Budget the estimate is made, the limit says "sem limite" and the last line is CUSTO:OK; nothing is written', async (t) => {
  const raiz = await comExecucao(t);
  const antes = await arvore(raiz);
  const r = await estimar(raiz, 'production', 5);
  assert.deepEqual(r.linhas, ['Estimativa desta chamada: R$ 0,50', 'Já gasto nesta execução: R$ 0,00', 'Orçamento: sem limite', 'CUSTO:OK']);
  assert.deepEqual(await arvore(raiz), antes, 'estimar only reads');
});

test('U6b-06a: Budget R$ 1,00, 5 production images (R$ 0,50) and R$ 0,60 already spent — CUSTO:ACIMA 4; below the limit it is CUSTO:OK', async (t) => {
  const raiz = await comExecucao(t, 'R$ 1,00');
  await registrar(raiz, 'production', 6);
  const acima = await estimar(raiz, 'production', 5);
  assert.deepEqual(acima.linhas, ['Estimativa desta chamada: R$ 0,50', 'Já gasto nesta execução: R$ 0,60', 'Orçamento: R$ 1,00', 'CUSTO:ACIMA 4']);
  assert.equal(acima.code, 0);
  assert.equal((await estimar(raiz, 'production', 4)).fim, 'CUSTO:OK', 'exactly at the limit is still within it');
  assert.equal((await estimar(raiz, 'test', 20)).fim, 'CUSTO:OK', 'R$ 0,40 fits');
});

test('U6b-06b: registrar adds to custo.json and answers CUSTO:REGISTRADO with the total; two equal calls add twice', async (t) => {
  const raiz = await comExecucao(t);
  assert.equal((await registrar(raiz, 'test', 1)).fim, 'CUSTO:REGISTRADO R$ 0,02');
  assert.equal((await registrar(raiz, 'test', 1)).fim, 'CUSTO:REGISTRADO R$ 0,04');
  assert.equal((await registrar(raiz, 'production', 3)).fim, 'CUSTO:REGISTRADO R$ 0,34');
  const c = await lerCusto(raiz);
  assert.deepEqual([c.versao, c.total, c.chamadas.length], [1, 34, 3]);
  assert.deepEqual(c.chamadas.map((x) => [x.modo, x.itens, x.centavos]), [['test', 1, 2], ['test', 1, 2], ['production', 3, 30]]);
  assert.match(c.chamadas[0].em, /^2026-10-09T/);
});

test('U6b-06b: Budget is read as R$ 5,00, 5, 5.50, R$5 and R$ 1.250,00; a value that is not a number means no limit, said in a line', async (t) => {
  assert.deepEqual(['R$ 5,00', '5', '5.50', 'R$5', 'R$ 1.250,00', '0,5', ' 12 ', '1,5'].map(lerReais), [500, 500, 550, 500, 125000, 50, 1200, 150]);
  assert.deepEqual(['', 'muito', 'R$', '5,00,00', '1.2.3', '5,555', '-3'].map(lerReais), [null, null, null, null, null, null, null]);
  assert.deepEqual([0, 5, 150, 125000].map(reais), ['R$ 0,00', 'R$ 0,05', 'R$ 1,50', 'R$ 1.250,00']);
  const raiz = await comExecucao(t, 'muito');
  const r = await estimar(raiz, 'production', 1);
  assert.equal(r.linhas[0], 'O Budget das preferências não é um valor (muito): tratei como sem limite.');
  assert.deepEqual(r.linhas.slice(-2), ['Orçamento: sem limite', 'CUSTO:OK']);
});

test('U6b-06c: custo.mjs writes only custo.json in the folder of the run; a run that does not exist and the usage errors write nothing', async (t) => {
  const raiz = await comExecucao(t, '2');
  const antes = await arvore(raiz);
  await registrar(raiz, 'test', 2);
  const depois = await arvore(raiz);
  assert.deepEqual(depois.filter((l) => !antes.includes(l)).map((l) => l.slice(0, l.lastIndexOf(':'))), [`${SAIDA}/${RUN}/custo.json`]);
  assert.deepEqual(antes.filter((l) => !depois.includes(l)), []);
  assert.ok(!depois.some((l) => /\.tmp/.test(l)));
  const base = await arvore(raiz);
  const casos = [
    [['estimar', '--run', 'fantasma', '--modo', 'test', '--itens', '1'], 'Execução não encontrada: fantasma'],
    [['estimar', '--run', RUN, '--modo', 'barato', '--itens', '1'], 'O --modo é test ou production.'],
    [['estimar', '--run', RUN, '--modo', 'test', '--itens', '0'], 'O --itens é um número inteiro de 1 a 999.'],
    [['estimar', '--run', RUN, '--modo', 'test', '--itens', '1000'], 'O --itens é um número inteiro de 1 a 999.'],
    [['estimar', '--run', RUN, '--itens', '1'], 'Falta a opção obrigatória --modo.'],
    [['estimar', '--modo', 'test', '--itens', '1'], 'Falta a opção obrigatória --run.'],
    [['estimar', '--run', '../x', '--modo', 'test', '--itens', '1'], 'O --run só aceita letras, dígitos, ponto, sublinhado e hífen.'],
    [['gastar', '--run', RUN, '--modo', 'test', '--itens', '1'], 'Falta a ação: estimar ou registrar. Recebi: gastar.'],
  ];
  for (const [argv, motivo] of casos) {
    const r = await rodar(raiz, ...argv);
    assert.deepEqual([r.code, r.linhas], [1, [USO, motivo]], argv.join(' '));
  }
  assert.deepEqual(await arvore(raiz), base);
});

test('U6b-06c: an unreadable custo.json counts as empty, and the next registrar writes a good one', async (t) => {
  const raiz = await comExecucao(t, 'R$ 1,00');
  await gravar(raiz, { [`${SAIDA}/${RUN}/custo.json`]: '{ "versao": 1, "chamadas": [ {"mo' });
  assert.equal((await estimar(raiz, 'production', 1)).linhas[1], 'Já gasto nesta execução: R$ 0,00');
  await registrar(raiz, 'production', 2);
  assert.equal((await lerCusto(raiz)).total, 20);
});

test('U6b-06c: a custo.json that exists but cannot be read is never replaced by an empty one', async (t) => {
  const raiz = await comExecucao(t, 'R$ 1,00');
  await fs.mkdir(path.join(raiz, SAIDA, RUN, 'custo.json'));
  const r = await registrar(raiz, 'production', 2);
  assert.equal(r.code, 1);
  assert.match(r.fim, /^Não consegui registrar o custo: /);
  assert.ok((await fs.stat(path.join(raiz, SAIDA, RUN, 'custo.json'))).isDirectory(), 'nothing was written over it');
});

test('U6b-06c: a lock left by a dead process (older than 4 s) is cleared on the next registrar', async (t) => {
  const raiz = await comExecucao(t, 'R$ 1,00');
  const trava = path.join(raiz, SAIDA, RUN, '.custo.lock');
  await fs.writeFile(trava, '');
  const velho = new Date(Date.now() - 6000);
  await fs.utimes(trava, velho, velho);
  assert.equal((await registrar(raiz, 'test', 1)).fim, 'CUSTO:REGISTRADO R$ 0,02');
});
