// Shared fixtures for tests/conserto*.test.js (not a test file itself — no .test.js suffix).
// specs/fase-u4a-conserto-de-crews.md: two crews written literally, with invented names — one in
// the current format (ATUAL) and one as crews created before 1.5.0 look (ANTIGA).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../templates/_opencrew/core/scripts/conserto.mjs';
import { mkTmp } from './_helpers.js';

const BP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/best-practices');
export const CREW = 'crews/atas';

const passo = (linhas, corpo = 'Escreva o texto.') => `---\n${linhas.join('\n')}\n---\n\n# Passo\n\n${corpo}\n`;
const agente = (nome, extra = []) => `---\nid: "crews/atas/agents/x"\nname: "${nome}"\ntitle: "Função de ${nome}"\nicon: "📝"\nexecution: inline\n${extra.join('\n')}${extra.length ? '\n' : ''}---\n\n# ${nome}\n`;

const CSV = 'id,displayName,title,icon,path,execution\n'
  + 'rita-redacao,"Rita Redação","Função de Rita Redação",📝,./agents/rita-redacao.agent.md,inline\n'
  + 'vito-veredito,"Vito Veredito","Função de Vito Veredito",📝,./agents/vito-veredito.agent.md,inline\n';

const AGENTES = {
  [`${CREW}/agents/rita-redacao.agent.md`]: agente('Rita Redação'),
  [`${CREW}/agents/vito-veredito.agent.md`]: agente('Vito Veredito'),
  [`${CREW}/crew-party.csv`]: CSV,
};

/** A crew in the current format: nothing to repair. */
export const ATUAL = {
  ...AGENTES,
  [`${CREW}/crew.yaml`]: 'crew:\n  code: "atas"\n  name: "Atas"\n  tier: "standard"\n\npipeline:\n  entry: "pipeline/pipeline.yaml"\n  steps_dir: "pipeline/steps"\n\nfontes:\n  - caminho: Regras/estatuto.md\n    para_que: regras que mandam no texto\n\nmax_review_cycles: 2\n',
  [`${CREW}/pipeline/pipeline.yaml`]: 'steps:\n  - step: 1\n    file: "step-01-redigir.md"\n  - step: 2\n    file: "step-02-revisar.md"\n  - step: 3\n    file: "step-03-checkpoint-final.md"\n\ncheckpoints: [3]\n',
  [`${CREW}/pipeline/steps/step-01-redigir.md`]: passo(['execution: inline', 'agent: rita-redacao', 'format: documento-oficial', 'outputFile: crews/atas/output/ata.md']),
  [`${CREW}/pipeline/steps/step-02-revisar.md`]: passo(['execution: inline', 'agent: vito-veredito', 'inputFile: crews/atas/output/ata.md', 'outputFile: crews/atas/output/revisao.md', 'on_reject: 1']),
  [`${CREW}/pipeline/steps/step-03-checkpoint-final.md`]: passo(['type: checkpoint'], 'Aprova?'),
  [`${CREW}/_memory/memories.md`]: '# Crew Memory: Atas\n\n## Proibições Explícitas\n\n- Jargão vazio: "sinergia"\n- Sem trava automática (revisão humana): evitar tom poético\n\n## Técnico (específico do crew)\n\n- Nada.\n',
  'Regras/estatuto.md': '# Estatuto\n',
};

/** A crew as old versions built it: flat crew.yaml, `file: steps/…`, no formats, no sources, unquoted bans. */
export const ANTIGA = {
  ...AGENTES,
  [`${CREW}/crew.yaml`]: 'name: "Atas"\ncode: "atas"\ndescription: "Atas da associação"\ntier: "full"\n\nskills:\n  - web_search\n',
  [`${CREW}/pipeline/pipeline.yaml`]: 'steps:\n  - step: 1\n    file: steps/step-01-minuta.md\n  - step: 2\n    file: steps/step-02-comunicado.md\n  - step: 3\n    file: steps/step-03-revisar.md\n  - step: 4\n    file: steps/step-04-checkpoint-final.md\n',
  [`${CREW}/pipeline/steps/step-01-minuta.md`]: passo(['execution: inline', 'agent: rita-redacao', 'outputFile: crews/atas/output/minuta.md']),
  [`${CREW}/pipeline/steps/step-02-comunicado.md`]: passo(['execution: inline', 'agent: rita-redacao', 'inputFile: crews/atas/output/minuta.md', 'outputFile: crews/atas/output/comunicado.md']),
  [`${CREW}/pipeline/steps/step-03-revisar.md`]: passo(['execution: inline', 'agent: vito-veredito', 'inputFile: crews/atas/output/comunicado.md', 'outputFile: crews/atas/output/revisao.md', 'on_reject: 1']),
  [`${CREW}/pipeline/steps/step-04-checkpoint-final.md`]: passo(['type: checkpoint'], 'Aprova?'),
  [`${CREW}/_memory/memories.md`]: '# Crew Memory: Atas\n\n## Estilo de Escrita\n- Linguagem clara.\n\n## Proibições Explícitas\n- Nunca usar a denominação "Clube Antigo"; a entidade nunca se chamou assim.\n- Nunca citar o nome fantasia Grêmio Azul nos comunicados.\n- Nunca prever votação por aclamação sem lista nominal.\n\n## Técnico (específico do crew)\n- Mandato de 5 anos.\n',
  'Regras/estatuto.md': '# Estatuto\n',
};

/**
 * A fake installed project with the payload best-practices and the given files (`path: content`;
 * null removes a file of the base fixture). Goes away when the test `t` ends.
 */
export async function projeto(t, arquivos = ATUAL, extras = {}) {
  const raiz = await mkTmp('conserto');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  const bp = path.join(raiz, '_opencrew', 'core', 'best-practices');
  await fs.mkdir(bp, { recursive: true });
  for (const f of await fs.readdir(BP)) await fs.copyFile(path.join(BP, f), path.join(bp, f));
  for (const [rel, conteudo] of Object.entries({ ...arquivos, ...extras })) {
    if (conteudo == null) continue;
    await fs.mkdir(path.dirname(path.join(raiz, rel)), { recursive: true });
    await fs.writeFile(path.join(raiz, rel), conteudo);
  }
  return raiz;
}

/** Runs the command line in `raiz`: exit code, every non-blank line, the last line and the finding codes. */
export async function rodar(raiz, argv = ['--crew', CREW]) {
  const linhas = [];
  const code = await main(argv, { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  const cheias = linhas.filter((l) => l.trim() !== '');
  const codigos = cheias.map((l) => l.match(/^\[([a-z-]+)\]/)?.[1]).filter(Boolean);
  return { code, linhas: cheias, fim: cheias.at(-1), codigos, texto: cheias.join('\n') };
}

/** Applies the items (`--aplicar` each) to the crew. */
export const aplicar = (raiz, ...itens) => rodar(raiz, ['--crew', CREW, ...itens.flatMap((i) => ['--aplicar', i])]);

export const ler = (raiz, rel) => fs.readFile(path.join(raiz, rel), 'utf8');
export const existe = (raiz, rel) => fs.access(path.join(raiz, rel)).then(() => true, () => false);
export const PASSO = (nome) => `${CREW}/pipeline/steps/${nome}`;
