// specs/fase-e2-personagens-do-escritorio.md — E2-04a and E2-05a: the optional `personagem` column of
// `crew-party.csv` goes to each agent of `state.json`; without it the file is what it was; the build
// prompt writes the 7-column header and the `manifesto` repair keeps the column (AGENTS.md rule 3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../templates/_opencrew/core/scripts/estado.mjs';
import { elencoDoCsv } from '../templates/_opencrew/core/scripts/estado/elenco.mjs';
import { proximoEstado } from '../templates/_opencrew/core/scripts/estado/nucleo.mjs';
import { mkTmp } from './_helpers.js';
import { ATUAL, CREW, aplicar, ler, projeto, rodar } from './_conserto.js';

const CORE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core');
const SEIS = 'id,displayName,title,icon,path,execution';
const linha = (id, nome, personagem) => `${id},"${nome}",Função,🙂,./agents/${id}.agent.md,inline${personagem === undefined ? '' : `,${personagem}`}`;
const COM = [`${SEIS},personagem`, linha('rita', 'Rita Redação', 'feminino'), linha('pedro', 'Pedro Pesquisa', 'Masculino'), linha('sara', 'Sara Social', 'F'), linha('davi', 'Davi Design', ' m '), linha('nina', 'Nina Nota', 'Féminino')].join('\n');
const SEM = [SEIS, linha('rita', 'Rita Redação'), linha('pedro', 'Pedro Pesquisa')].join('\n');
const HORA = '2026-10-12T10:00:00.000Z';

async function iniciar(t, csv) {
  const raiz = await mkTmp('estado-personagem');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew', '_memory'), { recursive: true });
  await fs.mkdir(path.join(raiz, 'crews', 'x'), { recursive: true });
  await fs.writeFile(path.join(raiz, '_opencrew', '_memory', 'preferences.md'), '- **Dashboard:** enabled\n');
  await fs.writeFile(path.join(raiz, 'crews', 'x', 'crew-party.csv'), csv);
  const rodarEstado = async (...argv) => {
    const linhas = [];
    const code = await main(['x', ...argv], { cwd: raiz, agora: () => HORA, escrever: (s) => linhas.push(...String(s).split('\n')) });
    assert.deepEqual([code, linhas], [0, ['ESTADO:OK']], argv.join(' '));
    return fs.readFile(path.join(raiz, 'crews', 'x', 'state.json'), 'utf8');
  };
  return { raiz, rodarEstado };
}

test('E2-04a: the cast reads the personagem column — feminino, masculino, f and m, whatever the case and the accents', () => {
  assert.deepEqual(elencoDoCsv(COM).map((a) => [a.id, a.personagem]), [['rita', 'feminino'], ['pedro', 'masculino'], ['sara', 'feminino'], ['davi', 'masculino'], ['nina', 'feminino']]);
  assert.deepEqual(elencoDoCsv(COM)[0], { id: 'rita', name: 'Rita Redação', icon: '🙂', personagem: 'feminino' });
  assert.deepEqual(elencoDoCsv(COM.replace('personagem', 'PERSONAGEM'))[0].personagem, 'feminino', 'the column is found by name, whatever the case');
  // Without the column, with it empty or with another value: the agent is what it was, with no field.
  const estranho = [`${SEIS},personagem`, linha('a', 'Ana Apura', ''), linha('b', 'Beto Borda', 'outro'), linha('c', 'Caio Conta', '"fem, masc"'), linha('d', 'Dora Data')].join('\n');
  for (const csv of [SEM, estranho, 'id\nrita\npedro\n']) for (const a of elencoDoCsv(csv)) assert.deepEqual(Object.keys(a), ['id', 'name', 'icon'], JSON.stringify(a));
  assert.equal(elencoDoCsv(estranho).length, 4);
});

test('E2-04a: estado.mjs iniciar writes personagem on each agent of state.json, and the next events keep it', async (t) => {
  const { rodarEstado } = await iniciar(t, COM);
  const estado = JSON.parse(await rodarEstado('iniciar', '--passos', '3'));
  assert.deepEqual(estado.agents.map((a) => a.personagem), ['feminino', 'masculino', 'feminino', 'masculino', 'feminino']);
  assert.deepEqual(Object.keys(estado.agents[0]), ['id', 'name', 'icon', 'status', 'label', 'personagem']);
  const depois = JSON.parse(await rodarEstado('passo', '--n', '1', '--agente', 'pedro', '--rotulo', 'Pesquisar'));
  assert.deepEqual(depois.agents.map((a) => [a.status, a.personagem]).slice(0, 2), [['idle', 'feminino'], ['working', 'masculino']]);
});

test('E2-04a: without the column — or with only the id — state.json comes out as before, without the field', async (t) => {
  const { rodarEstado: semColuna } = await iniciar(t, SEM);
  const texto = await semColuna('iniciar', '--passos', '3');
  assert.doesNotMatch(texto, /personagem/);
  assert.deepEqual(JSON.parse(texto).agents, [
    { id: 'rita', name: 'Rita Redação', icon: '🙂', status: 'idle', label: '' },
    { id: 'pedro', name: 'Pedro Pesquisa', icon: '🙂', status: 'idle', label: '' },
  ]);
  // The same crew with the column present and nothing valid in it: the same file, byte for byte.
  const vazia = [`${SEIS},personagem`, linha('rita', 'Rita Redação', ''), linha('pedro', 'Pedro Pesquisa', 'outro')].join('\n');
  const { rodarEstado: comVazia } = await iniciar(t, vazia);
  assert.equal(await comVazia('iniciar', '--passos', '3'), texto);
  const { rodarEstado: soId } = await iniciar(t, 'id\nrita\npedro\n');
  assert.deepEqual(JSON.parse(await soId('iniciar')).agents.map((a) => Object.keys(a)), Array(2).fill(['id', 'name', 'icon', 'status', 'label']));
});

test('E2-04a: a strange personagem in the cast or in an old state.json is dropped, never an error', () => {
  const elenco = [{ id: 'a', name: 'A', icon: '', personagem: 'feminino' }, { id: 'b', name: 'B', icon: '', personagem: 'outro' }, { id: 'c', name: 'C', icon: '', personagem: 42 }, { id: 'd', name: 'D', icon: '' }];
  const estado = proximoEstado(null, { tipo: 'iniciar', crew: 'x', elenco, passos: 2, agora: HORA });
  assert.deepEqual(estado.agents.map((a) => a.personagem), ['feminino', undefined, undefined, undefined]);
  assert.deepEqual(estado.agents.slice(1).map((a) => Object.keys(a)), Array(3).fill(['id', 'name', 'icon', 'status', 'label']));
  const mexido = { ...estado, agents: estado.agents.map((a, i) => ({ ...a, personagem: ['masculino', {}, 'F', null][i] })) };
  assert.deepEqual(proximoEstado(mexido, { tipo: 'passo', n: 1, agente: 'a', agora: HORA }).agents.map((a) => a.personagem), ['masculino', undefined, undefined, undefined]);
});

test('E2-05a: build.prompt.md writes the 7-column header and tells the builder to fill personagem from the name of the agent', async () => {
  const build = (await fs.readFile(path.join(CORE, 'prompts', 'build.prompt.md'), 'utf8')).replace(/\r\n/g, '\n'); // the checkout may bring CRLF
  assert.doesNotMatch(build, /id,displayName,title,icon,path,execution(?!,personagem)/, 'no 6-column header left in the prompt');
  assert.ok(build.match(/id,displayName,title,icon,path,execution,personagem/g).length >= 3);
  assert.match(build, /`personagem`[^\n]*`feminino`[^\n]*`masculino`/);
  assert.match(build, /researcher,"Pedro Pesquisa","Pesquisador de Tendências",🔎,\.\/agents\/researcher\.agent\.md,subagent,masculino/);
  const formato = (await fs.readFile(path.join(CORE, 'formato-da-crew.md'), 'utf8')).replace(/\r\n/g, '\n');
  assert.match(formato, /id,displayName,title,icon,path,execution,personagem\n[^\n]*,inline,feminino/);
  assert.match(formato, /`personagem`[^\n]*optional/i);
});

test('E2-05a: the manifesto repair keeps the personagem column and its values, and invents none for who had none', async (t) => {
  const CSV = `${CREW}/crew-party.csv`;
  const antigo = `${SEIS},personagem\nvito-veredito,Revisor,Revisor,🔍,./agents/vito-veredito.agent.md,subagent,masculino\nrita-redacao,"Rita Redação","Função de Rita Redação",📝,./agents/rita-redacao.agent.md,inline,Feminino\n`;
  const raiz = await projeto(t, ATUAL, { [CSV]: antigo, [`${CREW}/agents/ana-arquivo.agent.md`]: '---\nname: "Ana Arquivo"\ntitle: "Arquivista"\nicon: "🗂️"\n---\n' });
  assert.equal((await aplicar(raiz, 'manifesto')).fim, 'CONSERTO:APLICADO');
  assert.equal(await ler(raiz, CSV), [
    `${SEIS},personagem`,
    'vito-veredito,"Vito Veredito","Função de Vito Veredito",📝,./agents/vito-veredito.agent.md,inline,masculino',
    'rita-redacao,"Rita Redação","Função de Rita Redação",📝,./agents/rita-redacao.agent.md,inline,Feminino',
    'ana-arquivo,"Ana Arquivo",Arquivista,🗂️,./agents/ana-arquivo.agent.md,inline,',
    '',
  ].join('\n'));
  assert.equal(await ler(raiz, `${CSV}.bak`), antigo);
  assert.deepEqual((await rodar(raiz)).codigos, [], 'a crew with the column has nothing to repair');
  assert.deepEqual(elencoDoCsv(await ler(raiz, CSV)).map((a) => a.personagem), ['masculino', 'feminino', undefined]);
});

test('E2-05a: a manifest without the column is rebuilt with the 6 columns it had', async (t) => {
  const CSV = `${CREW}/crew-party.csv`;
  const raiz = await projeto(t, ATUAL, { [CSV]: `${SEIS}\nrita-redacao,Redatora,Redatora,📝,./agents/rita-redacao.agent.md,inline\n` });
  await aplicar(raiz, 'manifesto');
  assert.match(await ler(raiz, CSV), new RegExp(`^${SEIS}\\nrita-redacao,"Rita Redação"`));
  assert.doesNotMatch(await ler(raiz, CSV), /personagem/);
});
