// As cabeças do boneco: o rosto com cada corte de cabelo, 5 por molde. Cada uma é uma camada de
// 16 colunas que começa na linha 0 e vai até a 10 — as linhas 0 a 8 são a cabeça inteira; as
// linhas 9 e 10 só existem para o cabelo que cai sobre os ombros (o ponto deixa ver o corpo).
// Regra de desenho, conferida por teste: o corte fica nas colunas 2 a 13, e nas colunas 2 e 13
// só há contorno. As colunas 0, 1, 14 e 15 são dos braços levantados e do papel; por isso corte
// e pose se combinam sem que um apague o outro.
// Os olhos ficam sempre na linha 6, um pixel cada (letra `e`).
// Spec: fase-e2-personagens-do-escritorio.md, regras 1 a 3 (repositório do OpenCrew).
import { TINTAS, matriz } from './sprites.js';

const cabeca = (linhas) => Object.freeze({ de: 0, ...matriz(TINTAS, linhas) });

const VAZIA = '................';
const TESTA = '...osssssssSo...';
const OLHOS = '...osesssseSo...';
const QUEIXO = '....oSSSSSSo....';

/** O nome de cada corte, na ordem de `CORTES`: é o que a folha de conferência escreve. */
export const NOMES_DOS_CORTES = Object.freeze({
  feminino: Object.freeze(['Longo', 'Chanel', 'Cacheado', 'Coque', 'Curto']),
  masculino: Object.freeze(['Curto', 'Topete', 'Crespo', 'Raspado', 'Calvo']),
});

const FEMININO = [
  // Longo e liso, repartido ao meio, caindo sobre os ombros.
  cabeca([
    VAZIA,
    '....oooooooo....',
    '...ohhhhhhhho...',
    '..ohhhhhhhhhho..',
    '..ohhhsssshhho..',
    '..ohsssssssSho..',
    '..ohsesssseSho..',
    '..ohsssssssSho..',
    '..ohoSSSSSSoho..',
    '...h........h...',
    '...h........h...',
  ]),
  // Chanel: franja reta e o cabelo cortado na altura do rosto.
  cabeca([
    VAZIA,
    '....oooooooo....',
    '...ohhhhhhhho...',
    '..ohhhhhhhhhho..',
    '..ohhhhhhhhhho..',
    '..ohhsssssshho..',
    '..ohsesssseSho..',
    '..oosssssssSoo..',
    QUEIXO,
    VAZIA,
    VAZIA,
  ]),
  // Cacheado, com volume: mais alto e mais largo, até os ombros.
  cabeca([
    '....oooooooo....',
    '...ohHhHhHhho...',
    '..ohHhHhHhHhho..',
    '..oHhHhHhHhHho..',
    '..ohHhsssshHho..',
    '..oHhsssssshHo..',
    '..ohsesssseSho..',
    '..oHhsssssShHo..',
    '..ohHoSSSSoHho..',
    '...H........h...',
    VAZIA,
  ]),
  // Coque no alto da cabeça.
  cabeca([
    '......oooo......',
    '.....ohhhho.....',
    '....oohhhhoo....',
    '...ohhhhhhhho...',
    '...ohhsssshho...',
    TESTA,
    OLHOS,
    TESTA,
    QUEIXO,
    VAZIA,
    VAZIA,
  ]),
  // Curto, com a franja de lado.
  cabeca([
    VAZIA,
    '....oooooooo....',
    '...ohhhhhhhho...',
    '...ohhhhhhhho...',
    '...ohhhhhssho...',
    '...ohhsssssSo...',
    '...ohesssseSo...',
    TESTA,
    QUEIXO,
    VAZIA,
    VAZIA,
  ]),
];

const MASCULINO = [
  // Curto.
  cabeca([
    VAZIA,
    '....oooooooo....',
    '...ohhhhhhhho...',
    '...ohhhhhhhho...',
    '...ohhsssssho...',
    TESTA,
    OLHOS,
    TESTA,
    QUEIXO,
    VAZIA,
    VAZIA,
  ]),
  // Topete: o cabelo sobe na frente.
  cabeca([
    '......oooooo....',
    '....oohhhhhho...',
    '...ohhhhhhhho...',
    '...ohhhhhhhho...',
    '...ohssssssSo...',
    TESTA,
    OLHOS,
    TESTA,
    QUEIXO,
    VAZIA,
    VAZIA,
  ]),
  // Crespo, com volume: redondo, mais alto e mais largo que a cabeça.
  cabeca([
    '....oooooooo....',
    '...ohHhHhHhho...',
    '..ohHhHhHhHhho..',
    '..oHhHhHhHhHho..',
    '..ohHhsssshHho..',
    '..oHsssssssSho..',
    '..ohsesssseSHo..',
    TESTA,
    QUEIXO,
    VAZIA,
    VAZIA,
  ]),
  // Raspado: só uma faixa de cabelo rente; a cabeça fica mais baixa.
  cabeca([
    VAZIA,
    VAZIA,
    '....oooooooo....',
    '...oHhHhHhHho...',
    '...oHssssssHo...',
    TESTA,
    OLHOS,
    TESTA,
    QUEIXO,
    VAZIA,
    VAZIA,
  ]),
  // Calvo, com cabelo só dos lados.
  cabeca([
    VAZIA,
    VAZIA,
    '....oooooooo....',
    TESTA,
    '..ohsssssssSho..',
    '..ohsssssssSho..',
    OLHOS,
    TESTA,
    QUEIXO,
    VAZIA,
    VAZIA,
  ]),
];

/** As cabeças de cada molde, na ordem de `NOMES_DOS_CORTES`. */
export const CORTES = Object.freeze({ feminino: Object.freeze(FEMININO), masculino: Object.freeze(MASCULINO) });
