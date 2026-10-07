// Contêiner zip do documento Word, escrito à mão: toda entrada sem compressão (método 0), com
// CRC-32 próprio e data fixa (1980-01-01 00:00). O mesmo conteúdo dá os mesmos bytes, em qualquer
// máquina e em qualquer versão do Node. Não importa `node:zlib`.
// Spec: fase-u3b-documento-word.md, regra 1 (repositório do OpenCrew).

const TABELA = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  return c >>> 0;
});

/** CRC-32 (o do zip e do PNG) de um bloco de bytes. */
export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELA[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const VERSAO = 20;
const DATA = 0x0021; // 1980-01-01
const HORA = 0;
/** Bit 11 (nome em UTF-8): só quando o nome sai do ASCII. */
const marcas = (nome) => (nome.length === Buffer.byteLength(nome, 'utf8') ? 0 : 0x0800);

function cabecalhoLocal(e) {
  const b = Buffer.alloc(30);
  b.writeUInt32LE(0x04034b50, 0);
  b.writeUInt16LE(VERSAO, 4);
  b.writeUInt16LE(marcas(e.nome), 6);
  b.writeUInt16LE(0, 8); // método 0: sem compressão
  b.writeUInt16LE(HORA, 10);
  b.writeUInt16LE(DATA, 12);
  b.writeUInt32LE(e.crc, 14);
  b.writeUInt32LE(e.bytes.length, 18);
  b.writeUInt32LE(e.bytes.length, 22);
  b.writeUInt16LE(e.nomeEmBytes.length, 26);
  return Buffer.concat([b, e.nomeEmBytes]);
}

function registroCentral(e) {
  const b = Buffer.alloc(46);
  b.writeUInt32LE(0x02014b50, 0);
  b.writeUInt16LE(VERSAO, 4);
  b.writeUInt16LE(VERSAO, 6);
  b.writeUInt16LE(marcas(e.nome), 8);
  b.writeUInt16LE(0, 10);
  b.writeUInt16LE(HORA, 12);
  b.writeUInt16LE(DATA, 14);
  b.writeUInt32LE(e.crc, 16);
  b.writeUInt32LE(e.bytes.length, 20);
  b.writeUInt32LE(e.bytes.length, 24);
  b.writeUInt16LE(e.nomeEmBytes.length, 28);
  b.writeUInt32LE(e.inicio, 42);
  return Buffer.concat([b, e.nomeEmBytes]);
}

function registroFinal(total, tamanho, inicio) {
  const b = Buffer.alloc(22);
  b.writeUInt32LE(0x06054b50, 0);
  b.writeUInt16LE(total, 8);
  b.writeUInt16LE(total, 10);
  b.writeUInt32LE(tamanho, 12);
  b.writeUInt32LE(inicio, 16);
  return b;
}

/**
 * Monta o zip, na ordem recebida.
 * @param {{ nome: string, bytes: Buffer|string }[]} partes nomes com `/`; texto vai em UTF-8
 * @returns {Buffer}
 */
export function zipar(partes) {
  const locais = [];
  const centrais = [];
  let inicio = 0;
  for (const parte of partes) {
    const bytes = Buffer.isBuffer(parte.bytes) ? parte.bytes : Buffer.from(parte.bytes, 'utf8');
    const e = { nome: parte.nome, nomeEmBytes: Buffer.from(parte.nome, 'utf8'), bytes, crc: crc32(bytes), inicio };
    const local = cabecalhoLocal(e);
    locais.push(local, bytes);
    centrais.push(registroCentral(e));
    inicio += local.length + bytes.length;
  }
  const diretorio = Buffer.concat(centrais);
  return Buffer.concat([...locais, diretorio, registroFinal(partes.length, diretorio.length, inicio)]);
}
