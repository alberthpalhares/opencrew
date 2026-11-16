// Catalogo de dialogos em PT-BR e turnos de fala da Ala de Copa e Lazer (Fase E5).
// Puro: sem DOM, sem relogio, sem rede.
// Spec: fase-e5-lazer-e-convivencia.md (repositorio do OpenCrew).
import { sementeDe } from './modelo-personagem.js';
import { cortarFala } from './modelo-textos.js';
import { CAMINHADA_LAZER_MS, TURNO_LAZER_MS } from './modelo-lazer.js';

export const DIALOGOS_DE_LAZER = Object.freeze({
  cafe: [
    ['Esse café passado na hora salva o dia.', 'Demais! Pega uma xícara antes que acabe.'],
    ['Já revisou aquele rascunho de hoje?', 'Tô tomando um gole pra olhar com calma.'],
    ['Água gelada ou espresso duplo agora?', 'Vou de café curto pra manter o ritmo!'],
    ['Gostei da ideia da última entrega.', 'Valeu! No próximo ciclo a gente refina.'],
    ['A copa ficou bem mais animada hoje.', 'Verdade, sempre rola uma boa troca aqui.'],
    ['Quanto falta pra nossa próxima etapa?', 'Logo o painel chama, dá pra terminar o café.'],
  ],
  sofas: [
    ['Esse capítulo de arquitetura tá ótimo.', 'Depois me empresta pra ler no intervalo!'],
    ['Esticar as pernas no sofá faz milagre.', 'E da poltrona dá pra bater um papo ótimo.'],
    ['Tava lendo uma ideia limpa pro fluxo.', 'Boa! Me conta depois na frente da tela.'],
    ['Curti a iluminação aqui do lounge.', 'Ficou aconchegante pra ler e conversar.'],
    ['Aquele ajuste final deu menos trabalho né?', 'Bem menos! A estrutura já tava redonda.'],
    ['Cinco minutos lendo aqui e já volto inteiro.', 'Faz parte do ritmo entregar com qualidade.'],
  ],
  sinuca: [
    ['Vai tentar a bola sete no canto?', 'Olha a tabela dupla que eu vou mandar!'],
    ['Bela tacada! Essa caiu limpinha.', 'Obrigado! Anos de treino entre entregas.'],
    ['Agora quero ver tirar a branca daí.', 'Deixa comigo, é só calcular o ângulo.'],
    ['Quem perder paga o próximo café na copa.', 'Fechado! Mas acho que hoje não pago não.'],
    ['A mesa de feltro verde ficou show!', 'Melhor cantinho do escritório, sem dúvida.'],
    ['Você joga tão bem quanto revisa código.', 'Hahaha, precisão nos dois lados!'],
  ],
  videogame: [
    ['Segura o turbo nessa curva final!', 'Tô tentando, esse chefe não dá trégua!'],
    ['Bora bater o recorde da equipe hoje?', 'Passa o controle dois que vamos juntos!'],
    ['Essa fase bônus é pura nostalgia.', 'Demais, pixel-art clássico nunca falha!'],
    ['Cuidado com o buraco ali na direita!', 'Pulei em cima da hora, que sufoco!'],
    ['Mais uma partida rápida antes da tarefa?', 'Fechado, só até zerar esse estágio!'],
    ['Pontuação máxima! Manda print pro time.', 'Essa merece ficar no mural da sala!'],
  ],
});

export const FALAS_SOLO = Object.freeze({
  cafe: ['Passando um café fresquinho…', 'Pausa rápida pra um café.', 'Hidratando antes da próxima entrega.'],
  sofas: ['Lendo um capítulo aqui no sofá.', 'Bom livro pra clarear as ideias…', 'Relaxando no lounge antes da próxima entrega.'],
  sinuca: ['Treinando uma tabela na sinuca.', 'Alinhando a tacada perfeita…', 'Aquecendo os reflexos na mesa verde.'],
  videogame: ['Quase batendo o recorde aqui!', 'Só mais uma fase no fliperama.', 'Aquecendo os dedos no controle.'],
});

export const FALAS_RETORNO = Object.freeze([
  'Opa, minha vez! Voltando pro PC.',
  'Tarefa chegou! Já tô indo pra mesa.',
  'Pausa boa, agora é foco na entrega!',
  'Hora de trabalhar, partiu computador!',
]);

export const FALAS_TRABALHO = Object.freeze([
  'Avançando bem neste passo…',
  'Ajustando os detalhes finais.',
  'Conferindo tudo antes de passar o bastão.',
  'Quase lá, mantendo o ritmo firme!',
]);

function paresPorEstacao(modelo, posicoes) {
  const grupos = new Map();
  for (const ag of modelo.agentes) {
    const pos = posicoes.get(ag.id);
    if (!pos || pos.caminhando || pos.voltando || !pos.lazer) continue;
    const lista = grupos.get(pos.lazer) ?? [];
    lista.push(ag.id);
    grupos.set(pos.lazer, lista);
  }
  const pares = [];
  const solos = [];
  for (const [estacao, ids] of grupos) {
    if (ids.length >= 2) pares.push({ estacao, a: ids[0], b: ids[1] });
    else solos.push({ estacao, id: ids[0] });
  }
  return { pares, solos };
}

function falaDoPar({ estacao, a, b }, dt, turno, semente) {
  const opcoes = DIALOGOS_DE_LAZER[estacao];
  const [falaA, falaB] = opcoes[(semente + turno) % opcoes.length];
  if (dt >= 200 && dt < 3400) return { id: a, texto: cortarFala(falaA) };
  if (dt >= 4000 && dt < 7200) return { id: b, texto: cortarFala(falaB) };
  if (dt >= 7800 && dt < 10800) {
    const solo = FALAS_SOLO[estacao][(semente + turno + 1) % FALAS_SOLO[estacao].length];
    return { id: a, texto: cortarFala(solo) };
  }
  return null;
}

/**
 * Escolhe no maximo uma fala de convivencia/progresso neste instante. Entrega e falas fixas
 * tem prioridade acima desta funcao em `quadro.js`.
 */
export function falaDeConvivencia(modelo, posicoes, agoraMs) {
  if (!modelo || modelo.reduzirMovimento) return null;
  const semente = sementeDe(modelo.crew ?? '');

  for (const ag of modelo.agentes) {
    const pos = posicoes.get(ag.id);
    if (pos?.voltando) return { id: ag.id, texto: cortarFala(FALAS_RETORNO[(semente + ag.mesa.indice) % FALAS_RETORNO.length]) };
  }

  const desde = modelo?.lazer?.desdeMs;
  if (!Number.isFinite(desde)) return null;
  const decorrido = Math.max(0, agoraMs - desde);
  const turno = Math.floor(decorrido / TURNO_LAZER_MS);
  const msNoTurno = decorrido % TURNO_LAZER_MS;
  const dt = msNoTurno - CAMINHADA_LAZER_MS;

  if (dt >= 0) {
    const { pares, solos } = paresPorEstacao(modelo, posicoes);
    if (pares.length > 0) {
      const f = falaDoPar(pares[turno % pares.length], dt, turno, semente);
      if (f) return f;
    } else if (solos.length > 0 && dt >= 800 && dt < 4200) {
      const s = solos[turno % solos.length];
      const lista = FALAS_SOLO[s.estacao];
      return { id: s.id, texto: cortarFala(lista[(semente + turno) % lista.length]) };
    }
  }

  const trabalhando = modelo.agentes.filter((a) => a.mesa && a.status === 'working');
  if (trabalhando.length > 0 && decorrido % 8000 >= 2500 && decorrido % 8000 < 5300) {
    const ciclo = Math.floor(decorrido / 8000);
    const ag = trabalhando[ciclo % trabalhando.length];
    return { id: ag.id, texto: cortarFala(FALAS_TRABALHO[(semente + ciclo) % FALAS_TRABALHO.length]) };
  }
  return null;
}
