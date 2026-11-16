import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as moduloModelo from '../templates/_opencrew/core/escritorio/modelo.js';

const {
  SALAS, BONECO, LARGURA_COLUNA, moveisDe, montarModelo, quadro, transicao, caixaDaFala,
  ESTACOES_DE_LAZER, TURNO_LAZER_MS, CAMINHADA_LAZER_MS, RETORNO_MS, postosDeLazer, rotaDeLazer,
} = moduloModelo;

const SOLIDO = (m) => m.camada === 'chao';

const cruza = (a, b) => a.x < b.x + b.largura && a.x + a.largura > b.x && a.y < b.y + b.altura && a.y + a.altura > b.y;

const leitura = (crew, agentes, overrides = {}) => montarModelo(
  {
    crew,
    status: overrides.status ?? 'running',
    step: { current: 1, total: agentes.length, label: 'Execução' },
    handoff: overrides.handoff ?? null,
    agents: agentes.map((a, i) => ({
      id: `ag-${i + 1}`,
      name: `Agente ${i + 1}`,
      status: a.status ?? 'idle',
      label: `Passo ${i + 1}`,
    })),
  },
  { agoraMs: overrides.tempoMs ?? 1000, crew, reduzirMovimento: Boolean(overrides.reduzirMovimento) },
);

test('E5-01a: as 4 salas em 4:3/3:2 têm Trabalho à esquerda e Copa, Vídeo Game, Sinuca e Sofás concentrados à direita', () => {
  assert.equal(typeof postosDeLazer, 'function');
  assert.deepEqual(ESTACOES_DE_LAZER, ['cafe', 'sofas', 'sinuca', 'videogame']);
  assert.deepEqual([SALAS.pequena.largura, SALAS.pequena.altura], [320, 240]);
  assert.deepEqual([SALAS.media.largura, SALAS.media.altura], [320, 240]);
  assert.deepEqual([SALAS.grande.largura, SALAS.grande.altura], [360, 240]);
  assert.deepEqual([SALAS.completa.largura, SALAS.completa.altura], [360, 240]);

  const obrigatorios = ['cafe', 'bancada-copa', 'bebedouro', 'sofa', 'sinuca', 'videogame', 'pufe'];
  for (const sala of Object.values(SALAS)) {
    const xLazer = sala.colunasDeMesa * LARGURA_COLUNA;
    const moveis = moveisDe(sala, 'equipe-alfa');
    for (const tipo of obrigatorios) {
      assert.ok(moveis.some((m) => m.tipo === tipo), `${sala.nome} precisa de ${tipo}`);
    }
    for (const m of moveis) {
      assert.ok(m.x >= 0 && m.y >= 0, `${sala.nome}/${m.tipo} fora à esquerda/topo`);
      assert.ok(m.x + m.largura <= sala.largura, `${sala.nome}/${m.tipo} vaza à direita`);
      assert.ok(m.y + m.altura <= sala.altura, `${sala.nome}/${m.tipo} vaza embaixo`);
      if (m.camada === 'parede') assert.ok(m.y + m.altura <= 24, `${sala.nome}/${m.tipo} invade chão`);
      else assert.ok(m.x >= xLazer, `${sala.nome}/${m.tipo} precisa ficar concentrado na ala direita`);
    }
    const sinuca = moveis.find((m) => m.tipo === 'sinuca');
    const mesa0 = sala.mesas[0].retangulo;
    assert.ok(sinuca.largura > mesa0.largura && sinuca.altura > mesa0.altura, `${sala.nome}: sinuca deve ser maior que a mesa de computador`);
    const solidos = moveis.filter(SOLIDO);
    for (let i = 0; i < solidos.length; i += 1) {
      for (const mesa of sala.mesas) {
        assert.equal(cruza(solidos[i], mesa.retangulo), false, `${sala.nome}/${solidos[i].tipo} cruza mesa`);
      }
      for (let j = i + 1; j < solidos.length; j += 1) {
        assert.equal(cruza(solidos[i], solidos[j]), false, `${sala.nome}: ${solidos[i].tipo} colide com ${solidos[j].tipo}`);
      }
    }
  }
});

const varrido = ([a, b]) => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  largura: Math.abs(a.x - b.x) + BONECO,
  altura: Math.abs(a.y - b.y) + BONECO,
});

function checarRotaLivre(sala, solidos, origem, destino, rotulo) {
  const pontos = rotaDeLazer(sala, origem, destino, 'equipe-alfa');
  assert.ok(Array.isArray(pontos) && pontos.length >= 2, rotulo);
  const assentosPermitidos = new Set([origem?.assento, destino?.assento].filter(Boolean));
  for (let i = 1; i < pontos.length; i += 1) {
    const a = pontos[i - 1];
    const b = pontos[i];
    assert.ok(Number.isInteger(a.x) && Number.isInteger(a.y) && Number.isInteger(b.x) && Number.isInteger(b.y), `${rotulo}: inteiro`);
    assert.ok(a.x === b.x || a.y === b.y, `${rotulo}: trecho ortogonal`);
    const faixa = varrido([a, b]);
    assert.ok(faixa.x >= 0 && faixa.y >= 0 && faixa.x + faixa.largura <= sala.largura && faixa.y + faixa.altura <= sala.altura, `${rotulo}: dentro da sala`);
    for (const s of solidos) {
      if (!assentosPermitidos.has(s.tipo)) assert.equal(cruza(faixa, s), false, `${rotulo}: cruza ${s.tipo}`);
    }
    for (const m of sala.mesas) assert.equal(cruza(faixa, m.retangulo), false, `${rotulo}: cruza tampo ${m.indice}`);
  }
}

test('E5-02a: postos, rotas e balões de lazer ficam livres de colisão em todas as 4 salas', () => {
  for (const sala of Object.values(SALAS)) {
    const xLazer = sala.colunasDeMesa * LARGURA_COLUNA;
    const moveis = moveisDe(sala, 'equipe-alfa');
    const solidos = moveis.filter(SOLIDO);
    const postos = postosDeLazer(sala, 'equipe-alfa');
    assert.equal(postos.length, 8, `${sala.nome} deve ter 2 postos por estação`);
    for (const est of ESTACOES_DE_LAZER) {
      assert.equal(postos.filter((p) => p.estacao === est).length, 2, `${sala.nome}/${est}`);
    }
    assert.deepEqual(postos.filter((p) => p.estacao === 'sofas').map((p) => p.assento), ['sofa', 'poltrona']);
    for (const p of postos) {
      assert.ok(p.x >= xLazer && p.x + BONECO <= sala.largura && p.y >= 24 && p.y + BONECO <= sala.altura, `${sala.nome} posto ${p.estacao} fora da ala`);
      const caixa = { x: p.x, y: p.y, largura: BONECO, altura: BONECO };
      if (p.assento) {
        const mob = solidos.find((s) => s.tipo === p.assento);
        assert.ok(mob, `${sala.nome}: assento ${p.assento} ausente`);
        assert.ok(p.x >= mob.x && p.x + BONECO <= mob.x + mob.largura && cruza(caixa, mob), `${sala.nome}: posto ${p.estacao}#${p.posto} deve sentar dentro de ${p.assento}`);
      }
      for (const s of solidos) {
        if (s.tipo !== p.assento) assert.equal(cruza(caixa, s), false, `${sala.nome} posto ${p.estacao} colide com ${s.tipo}`);
      }
      for (const m of sala.mesas) assert.equal(cruza(caixa, m.retangulo), false, `${sala.nome} posto ${p.estacao} colide mesa`);
      const falaBox = caixaDaFala(p, sala);
      assert.ok(falaBox.baixo - falaBox.teto >= 20, `${sala.nome} posto ${p.estacao} precisa altura livre para balão`);
    }
    for (const mesa of sala.mesas) {
      for (const posto of postos) {
        checarRotaLivre(sala, solidos, mesa.boneco, posto, `${sala.nome}: mesa ${mesa.indice} -> ${posto.estacao}#${posto.posto}`);
        checarRotaLivre(sala, solidos, posto, mesa.boneco, `${sala.nome}: ${posto.estacao}#${posto.posto} -> mesa ${mesa.indice}`);
      }
    }
    for (const o of postos) {
      for (const d of postos) {
        checarRotaLivre(sala, solidos, o, d, `${sala.nome}: ${o.estacao}#${o.posto} -> ${d.estacao}#${d.posto}`);
      }
    }
  }
});

test('E5-03a: agentes livres caminham ao lazer, usam adereço da estação e alternam após TURNO_LAZER_MS', () => {
  const base = leitura('equipe-lazer', [{ status: 'working' }, { status: 'idle' }, { status: 'idle' }], { tempoMs: 0 });
  const emLazer = transicao(base, leitura('equipe-lazer', [{ status: 'done' }, { status: 'idle' }, { status: 'idle' }], { tempoMs: 5000 }), 5000);

  const qCaminhando = quadro(emLazer, 5000 + 800);
  const b2Cam = qCaminhando[1];
  assert.equal(b2Cam.sentado, false);
  assert.ok(b2Cam.pose === 'andar-a' || b2Cam.pose === 'andar-b', `esperava caminhada, veio ${b2Cam.pose}`);

  const t1 = 5000 + CAMINHADA_LAZER_MS + 400;
  const qEstacao1 = quadro(emLazer, t1);
  const estacoesT1 = qEstacao1.filter((b) => b.lazer).map((b) => b.lazer);
  assert.ok(estacoesT1.length >= 2);
  for (const b of qEstacao1) {
    assert.equal(b.sentado, false);
    if (b.lazer === 'cafe') assert.equal(b.adereco, 'xicara');
    if (b.lazer === 'sinuca') assert.equal(b.adereco, 'taco');
    if (b.lazer === 'videogame') assert.equal(b.adereco, 'controle');
    if (b.lazer === 'sofas') {
      assert.equal(b.emAssento, true);
      if (b.posto?.posto === 0) assert.equal(b.adereco, 'livro');
      else assert.ok(b.adereco === 'livro' || b.adereco === null);
    }
  }
  const paresMesmaEstacao = qEstacao1.filter((b) => b.lazer === qEstacao1[0].lazer);
  assert.ok(paresMesmaEstacao.length >= 2, 'com >= 2 livres, agentes formam dupla na mesma estação');

  const t2 = 5000 + TURNO_LAZER_MS + CAMINHADA_LAZER_MS + 400;
  const qEstacao2 = quadro(emLazer, t2);
  assert.notEqual(qEstacao2[0].lazer, qEstacao1[0].lazer, 'troca de estação na virada do turno');
  assert.notEqual(qEstacao2[1].lazer, qEstacao1[1].lazer);
});

test('E5-04a: colegas na mesma estação conversam em turnos e entrega tem prioridade', () => {
  const base = leitura('equipe-papo', [{ status: 'idle' }, { status: 'idle' }], { tempoMs: 0 });
  const ativo = transicao(base, leitura('equipe-papo', [{ status: 'idle' }, { status: 'idle' }], { tempoMs: 100 }), 100);
  const falantes = new Set();
  const textos = new Set();
  for (let dt = CAMINHADA_LAZER_MS + 500; dt < TURNO_LAZER_MS - 500; dt += 500) {
    const q = quadro(ativo, 100 + dt);
    const comFala = q.filter((b) => b.fala);
    assert.ok(comFala.length <= 1, 'nunca dois balões simultâneos');
    for (const b of comFala) {
      falantes.add(b.id);
      textos.add(b.fala);
    }
  }
  assert.equal(falantes.size, 2, 'os dois colegas da dupla precisam alternar falas');
  assert.ok(textos.size >= 2);

  const trabalhando = leitura('equipe-papo', [{ status: 'working' }, { status: 'idle' }], { tempoMs: 1000 });
  const entrega = transicao(
    trabalhando,
    leitura('equipe-papo', [{ status: 'done' }, { status: 'working' }], {
      tempoMs: 1200,
      handoff: { from: 'ag-1', to: 'ag-2', message: 'Pode revisar!', completedAt: '2026-01-01T00:00:01Z' },
    }),
    1200,
  );
  const qEntrega = quadro(entrega, 5000);
  assert.equal(qEntrega.filter((b) => b.fala).length, 1);
  assert.equal(qEntrega[0].fala, 'Pode revisar!');
});

test('E5-05a: quando tarefa inicia (working), agente volta caminhando ao PC e senta para digitar', () => {
  const t0 = 1000;
  const r0 = leitura('equipe-volta', [{ status: 'idle' }, { status: 'idle' }], { tempoMs: t0 });
  const r1 = transicao(r0, leitura('equipe-volta', [{ status: 'idle' }, { status: 'idle' }], { tempoMs: t0 + 100 }), t0 + 100);
  const tInicio = t0 + CAMINHADA_LAZER_MS + 1000;
  const r2 = transicao(r1, leitura('equipe-volta', [{ status: 'working' }, { status: 'idle' }], { tempoMs: tInicio }), tInicio);

  const qMeio = quadro(r2, tInicio + Math.floor(RETORNO_MS / 2));
  const voltando = qMeio[0];
  assert.equal(voltando.sentado, false);
  assert.equal(voltando.adereco ?? null, null);
  assert.ok(voltando.pose === 'andar-a' || voltando.pose === 'andar-b');

  const qSentado = quadro(r2, tInicio + RETORNO_MS + 200);
  const noPc = qSentado[0];
  assert.equal(noPc.sentado, true);
  assert.equal(noPc.acao, 'working');
  assert.ok(noPc.pose === 'digitar-a' || noPc.pose === 'digitar-b');
  assert.equal(noPc.adereco ?? null, null);
  assert.equal(noPc.lazer ?? null, null);
  assert.equal(noPc.x, noPc.mesa.boneco.x);
  assert.equal(noPc.y, noPc.mesa.boneco.y);
});

test('E5-06a: com reduzirMovimento, todos permanecem sentados nas mesas sem lazer nem adereço', () => {
  const r0 = leitura('equipe-calma', [{ status: 'idle' }, { status: 'done' }], { tempoMs: 0, reduzirMovimento: true });
  const r1 = transicao(r0, leitura('equipe-calma', [{ status: 'idle' }, { status: 'done' }], { tempoMs: 1000, reduzirMovimento: true }), 1000);
  const q = quadro(r1, 1000 + CAMINHADA_LAZER_MS + 2000);
  for (const b of q) {
    assert.equal(b.sentado, true);
    assert.equal(b.lazer ?? null, null);
    assert.equal(b.adereco ?? null, null);
  }
});
