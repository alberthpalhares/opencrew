// Núcleo puro da página do escritório: tudo o que ela desenha e escreve sai daqui, calculado a
// partir do estado que o servidor devolve. Nenhum módulo deste núcleo toca no DOM, lê relógio ou
// usa a rede: a hora atual, o "reduzir movimento" e o `?demo` entram por parâmetro, e por isso
// os mesmos módulos são testados direto no Node.
// Este arquivo é só a fachada: cada módulo irmão cuida de uma parte.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 16 a 24, 28 e 29 (repositório do OpenCrew).

// Geometria: a tela de 320×180, o boneco de 16 e as 12 mesas.
export * from './modelo-mesas.js';
// Textos da página em PT-BR e o título da aba.
export * from './modelo-textos.js';
// Leitura do `state.json`, inclusive o da 1.6.x.
export * from './modelo-estado.js';
// Ação, monitor, balão e aparência de cada agente.
export * from './modelo-agentes.js';
// O modelo de uma leitura: `montarModelo`.
export * from './modelo-visao.js';
// Qual crew está na tela e a página inteira: `consultar`, `escolher`, `montarPagina`.
export * from './modelo-pagina.js';
// O roteiro da demonstração.
export * from './demo.js';
// A escala inteira do canvas, em pixels do dispositivo: `escala`.
export * from './escala.js';
// O caminho de uma entrega, pelos vãos entre as mesas: `rota`.
export * from './rota.js';
// O que anima, pela diferença entre duas leituras da mesma crew: `transicao`.
export * from './animacao.js';
// Pose, posição e monitor de cada boneco num instante: `quadro`.
export * from './quadro.js';
