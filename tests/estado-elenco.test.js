// specs/fase-e1-escritorio-ao-vivo.md — rule 2, for crews built before the header of
// `crew-party.csv` was fixed: only the `path` column was sure to be there, and the id of the agent
// was the name of its file. Such a crew still has to show up in the office after an update.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { main } from '../templates/_opencrew/core/scripts/estado.mjs';
import { elencoDoCsv } from '../templates/_opencrew/core/scripts/estado/elenco.mjs';
import { mkTmp } from './_helpers.js';

const ANTIGO = `name,displayName,title,icon,path,execution
ana,"Ana Apura",Pesquisadora,🔎,./agents/ana.agent.md,subagent
beto,,Redator,,agents\\beto-borda.agent.md,inline
`;

test('E1 (review): a crew-party.csv without the id column takes the id from the agent file in path', () => {
  assert.deepEqual(elencoDoCsv(ANTIGO), [{ id: 'ana', name: 'Ana Apura', icon: '🔎' }, { id: 'beto-borda', name: 'beto-borda', icon: '' }]);
});

test('E1 (review): the id column wins over path; a line with neither an id nor an agent file stays out', () => {
  const csv = 'id,displayName,icon,path\nx,Xis,🧪,./agents/outro.agent.md\n,Ípsilon,,./agents/y.agent.md\n,Zê,,./agents/leia-me.md\n,Sem Arquivo,,\n';
  assert.deepEqual(elencoDoCsv(csv), [{ id: 'x', name: 'Xis', icon: '🧪' }, { id: 'y', name: 'Ípsilon', icon: '' }]);
  assert.deepEqual(elencoDoCsv('displayName,path\nAna,./agents/a.agent.md\nOutra Ana,agents/a.agent.md\n'), [{ id: 'a', name: 'Ana', icon: '' }], 'a repeated id still stays out');
});

test('E1 (review): iniciar on a crew whose crew-party.csv has no id column writes the state, with the ids of the files', async (t) => {
  const raiz = await mkTmp('estado-elenco');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew', '_memory'), { recursive: true });
  await fs.mkdir(path.join(raiz, 'crews', 'velha'), { recursive: true });
  await fs.writeFile(path.join(raiz, '_opencrew', '_memory', 'preferences.md'), '- **Dashboard:** enabled\n');
  await fs.writeFile(path.join(raiz, 'crews', 'velha', 'crew-party.csv'), ANTIGO);
  const linhas = [];
  const code = await main(['velha', 'iniciar', '--passos', '2'], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  assert.deepEqual([code, linhas], [0, ['ESTADO:OK']]);
  const estado = JSON.parse(await fs.readFile(path.join(raiz, 'crews', 'velha', 'state.json'), 'utf8'));
  assert.deepEqual(estado.agents.map((a) => [a.id, a.status]), [['ana', 'idle'], ['beto-borda', 'idle']]);
});
