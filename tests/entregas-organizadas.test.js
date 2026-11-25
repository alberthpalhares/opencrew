// Cenários da spec de entregas organizadas. Cada ID corresponde ao cenário aprovado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { main } from '../templates/_opencrew/core/scripts/caminho.mjs';
import { main as entregar } from '../templates/_opencrew/core/scripts/entregar.mjs';
import { mkTmp } from './_helpers.js';

test('EO-01: 40 revisões guardam a atual e 39 anteriores por arquivo', async (t) => {
  const raiz = await mkTmp('entregas-organizadas');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew'));
  await fs.mkdir(path.join(raiz, 'crews', 'x'), { recursive: true });
  const rodar = async (args) => {
    const linhas = [];
    const codigo = await main(['x', ...args], { cwd: raiz, escrever: (linha) => linhas.push(linha) });
    assert.equal(codigo, 0, linhas.join('\n'));
    return linhas.at(-1);
  };
  const criada = await rodar(['pasta', '--nova']);
  const pasta = criada.slice('CAMINHO:OK '.length);
  const run = path.basename(pasta);
  for (let n = 1; n <= 40; n++) {
    const saida = await rodar(['saida', '--run', run, '--arquivo', 'crews/x/output/texto.md']);
    const arquivo = saida.slice('CAMINHO:OK '.length);
    await fs.writeFile(path.join(raiz, arquivo), `Revisão ${n}\n`);
    await rodar(['conferir', '--arquivo', arquivo, '--passo', '1']);
  }
  assert.equal(await fs.readFile(path.join(raiz, pasta, 'atuais', 'texto.md'), 'utf8'), 'Revisão 40\n');
  const historico = await fs.readdir(path.join(raiz, pasta, 'historico', 'texto.md'));
  assert.equal(historico.length, 39);
});

test('EO-11 EO-12 EO-17: o runner oferece um destino depois do aceite e reaproveita a escolha da execução', async () => {
  const prompt = await fs.readFile(new URL('../templates/_opencrew/core/prompts/entrega.prompt.md', import.meta.url), 'utf8');
  const fluxo = prompt.split('One script turns')[0];
  assert.match(fluxo, /Sem aprovação comprovada[\s\S]*peça aprovação/);
  assert.match(fluxo, /Se a entrega continuar incompleta, mantenha o pacote local/);
  assert.match(fluxo, /Depois da última etapa[\s\S]*Onde você quer guardar esta entrega\?/);
  assert.match(fluxo, /manter na crew, usar uma sugestão ou indicar outra pasta/);
  assert.match(fluxo, /Use o destino informado para esta execução sem repetir a pergunta/);
  assert.match(fluxo, /--lembrar-final` só se solicitado/);
});

test('EO-02 EO-03 EO-05 EO-07 EO-13 EO-14 EO-15 EO-21: recupera o lote, preserva edições e copia o pacote aprovado', async (t) => {
  const raiz = await mkTmp('entregas-lote');
  const destino = await mkTmp('entregas-destino');
  for (const pasta of [raiz, destino]) t.after(() => fs.rm(pasta, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew'));
  await fs.mkdir(path.join(raiz, 'crews', 'x'), { recursive: true });
  await fs.writeFile(path.join(raiz, 'crews', 'x', 'crew.yaml'), 'name: x\n');
  const rodar = async (fn, args) => {
    const linhas = [];
    const codigo = await fn(args, { cwd: raiz, escrever: (linha) => linhas.push(linha) });
    return { codigo, linhas };
  };
  const caminho = (args) => rodar(main, ['x', ...args]);
  const run = 'teste-entrega';
  await caminho(['pasta', '--run', run]);
  const { linhas } = await caminho(['saida', '--run', run, '--arquivo', 'crews/x/output/slide.html', '--arquivo', 'crews/x/output/slide.png']);
  const rascunhos = linhas.map((linha) => linha.slice('CAMINHO:OK '.length));
  assert.equal(path.dirname(rascunhos[0]), path.dirname(rascunhos[1]));
  await fs.writeFile(path.join(raiz, rascunhos[0]), '<p>Slide</p>');
  const conferir = ['conferir', '--passo', '1', ...rascunhos.flatMap((nome) => ['--arquivo', nome])];
  assert.match((await caminho(conferir)).linhas[0], /^CAMINHO:REPROVADO/);
  const base = path.join(raiz, 'crews', 'x', 'output', run);
  assert.equal(await fs.stat(path.join(base, 'atuais')).catch(() => null), null);
  await fs.writeFile(path.join(raiz, rascunhos[1]), Buffer.from([1, 2, 3]));
  const confirmados = (await caminho(conferir)).linhas.map((linha) => linha.slice('CAMINHO:OK '.length));
  assert.equal(confirmados.length, 2);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(base, 'execucao.json'), 'utf8')).passos[0].arquivos, confirmados);
  // EO-03: o processo caiu após trocar o HTML, mas antes de confirmar o lote.
  const anterior = '<p>Slide</p>';
  const interrompido = '<p>Rascunho incompleto</p>';
  const hash = (texto) => createHash('sha256').update(texto).digest('hex');
  await fs.mkdir(path.join(base, 'historico', 'slide.html'), { recursive: true });
  await fs.writeFile(path.join(base, 'historico', 'slide.html', '1.html'), anterior);
  await fs.writeFile(path.join(base, 'atuais', 'slide.html'), interrompido);
  await fs.writeFile(path.join(base, '.consolidacao.json'), JSON.stringify({
    tentativa: 'passo-interrompido',
    itens: [{ destino: 'atuais/slide.html', novo: hash(interrompido), anterior: 'historico/slide.html/1.html', hashAnterior: hash(anterior) }],
  }));
  await caminho(['entrada', '--run', run, '--arquivo', 'crews/x/output/slide.html']);
  assert.equal(await fs.readFile(path.join(base, 'atuais', 'slide.html'), 'utf8'), anterior);
  const entrega = (args) => rodar(entregar, ['--crew', 'crews/x', '--run', run, ...args]);
  const montar = ['--somente-local', ...confirmados.flatMap((nome) => ['--arquivo', nome])];
  const copiar = ['--copiar-final', '--destino', destino];
  assert.equal((await entrega(montar)).linhas.at(-1), 'ENTREGA:OK');
  assert.equal((await entrega(copiar)).codigo, 1);
  assert.equal((await entrega([...montar, '--aprovada'])).linhas.at(-1), 'ENTREGA:OK');
  assert.equal((await entrega(['--copiar-final', '--destino', path.join(destino, 'ausente')])).codigo, 1);
  const feita = await entrega(copiar);
  assert.equal(feita.codigo, 0, feita.linhas.join('\n'));
  assert.deepEqual(await entrega(copiar), feita);
  assert.equal((await fs.readdir(destino)).length, 1);

  // EO-05 EO-07 EO-15: a edição manual fica intacta. A nova revisão exige reaprovação.
  const modificado = path.join(base, 'atuais', 'slide.html');
  await fs.writeFile(modificado, '<p>Editado à mão</p>');
  const nova = await caminho(['saida', '--run', run, '--arquivo', 'crews/x/output/slide.html']);
  const draft = nova.linhas[0].slice('CAMINHO:OK '.length);
  await fs.writeFile(path.join(raiz, draft), '<p>Nova revisão</p>');
  const revisada = await caminho(['conferir', '--passo', '1', '--arquivo', draft]);
  assert.equal(revisada.codigo, 0, revisada.linhas.join('\n'));
  assert.equal(await fs.readFile(modificado, 'utf8'), '<p>Editado à mão</p>');
  assert.equal((await entrega(copiar)).codigo, 1);
  const arquivo = revisada.linhas[0].slice('CAMINHO:OK '.length);
  assert.match(arquivo, /historico\/slide\.html\/2\.html$/);
  const leiame = path.join(destino, `x-${run}`, 'LEIA-ME.md');
  const antes = await fs.readFile(leiame, 'utf8');
  assert.equal((await entrega(['--somente-local', '--aprovada', '--arquivo', arquivo, '--arquivo', confirmados[1]])).linhas.at(-1), 'ENTREGA:OK');
  assert.equal((await entrega([...copiar, '--lembrar-final'])).codigo, 0);
  assert.equal((await fs.readdir(destino)).length, 2);
  assert.equal(await fs.readFile(leiame, 'utf8'), antes);
  assert.deepEqual((await entrega(['--sugerir-destino'])).linhas, [await fs.realpath(destino)]);
});

test('EO-04 EO-06 EO-08 EO-16 EO-18 EO-20: tentativas e cópias concorrentes preservam histórico e dados', async (t) => {
  const raiz = await mkTmp('entregas-concorrentes');
  const destino = await mkTmp('entregas-concorrentes-destino');
  for (const pasta of [raiz, destino]) t.after(() => fs.rm(pasta, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew'));
  await fs.mkdir(path.join(raiz, 'crews', 'x'), { recursive: true });
  await fs.writeFile(path.join(raiz, 'crews', 'x', 'crew.yaml'), 'name: x\n');
  const { main: executar } = await import('../templates/_opencrew/core/scripts/execucao.mjs');
  const { lerExecucoes } = await import('../templates/_opencrew/core/scripts/limpeza/disco.mjs');
  const rodar = async (fn, args) => {
    const linhas = [];
    const codigo = await fn(args, { cwd: raiz, escrever: (linha) => linhas.push(linha) });
    assert.equal(codigo, 0, linhas.join('\n'));
    return linhas;
  };
  const caminho = (args) => rodar(main, ['x', ...args]);
  const run = 'pedido-concorrente';
  await caminho(['pasta', '--run', run, '--pedido']);
  const reservas = await Promise.all(['redação.md', 'anexo.md'].map(async (nome, i) => {
    const [saida] = await caminho(['saida', '--run', run, '--arquivo', `crews/x/output/${nome}`]);
    const arquivo = saida.slice('CAMINHO:OK '.length);
    await fs.writeFile(path.join(raiz, arquivo), `Conteúdo ${i}\n`);
    return arquivo;
  }));
  assert.notEqual(path.dirname(reservas[0]), path.dirname(reservas[1]));
  await Promise.all(reservas.map((arquivo, i) => caminho(['conferir', '--passo', String(i + 1), '--arquivo', arquivo])));
  const retomada = await rodar(executar, ['x', 'retomar', '--run', run]);
  assert.ok(retomada.includes('Tipo: pedido'));
  assert.match(retomada.join('\n'), /redação\.md[\s\S]*anexo\.md/);
  const base = path.join(raiz, 'crews', 'x', 'output', run);
  assert.equal((await fs.readdir(path.join(base, 'rascunhos'))).length, 0);
  const entrega = (args) => rodar(entregar, ['--crew', 'crews/x', '--run', run, ...args]);
  await entrega(['--somente-local', '--aprovada', '--arquivo', `crews/x/output/${run}/atuais/redação.md`]);
  const ocupada = path.join(destino, `x-${run}`);
  await fs.mkdir(ocupada);
  await fs.writeFile(path.join(ocupada, 'LEIA-ME.md'), 'Meu arquivo');
  const copias = await Promise.all(Array.from({ length: 2 }, () => entrega(['--copiar-final', '--destino', destino])));
  assert.deepEqual(copias[0], copias[1]);
  assert.match(copias[0][0], /-reentrega-2$/);
  assert.equal(await fs.readFile(path.join(ocupada, 'LEIA-ME.md'), 'utf8'), 'Meu arquivo');
  await fs.rename(path.join(destino, `x-${run}-reentrega-2`), path.join(destino, 'volume-indisponivel'));
  await rodar(executar, ['x', 'fechar', '--run', run, '--resultado', 'aprovado']);
  assert.equal(lerExecucoes(path.join(raiz, 'crews', 'x'))[0].copiada, false);
});
