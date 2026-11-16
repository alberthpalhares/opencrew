# Spec — Fase E6: Link do Escritório para Celular e Tablet (Rede Local e VPN)

- **Fase:** E6 · **Status:** implementada na 1.21.1 (2026-11-16) · **Módulos:** runtime do Escritório (`templates/_opencrew/core/scripts/escritorio/rede.mjs`, `porta.mjs`, `automatico.mjs`, `servidor.mjs`, `escritorio.mjs`), runner/prompts (`templates/_opencrew/core/runner/escritorio.md`, `templates/_opencrew/core/prompts/pedido.prompt.md`, `templates/AGENTS.md`), pontes (`src/lib/ides.js`), documentação e testes
- **Depende de:** E1 (1.7.0), E4 (1.19.1), U7-F1 (1.19.4) e U7-F3c (1.21.0)
- **Origem:** pedido do dono para que a abertura automática do Escritório na execução de uma crew também forneça um link funcional para abrir no celular ou tablet e acompanhar a equipe trabalhando.

## 1. Objetivo

Permitir que qualquer celular ou tablet na mesma rede local (Wi-Fi/LAN) ou VPN privada (como Tailscale) abra a página ao vivo do Escritório da execução em andamento, recebendo os links clicáveis diretamente no chat, sem dependências externas e mantendo a proteção contra acesso por domínios estranhos (DNS rebinding) e o modo estritamente somente leitura.

## 2. Decisões aprovadas

1. **Conectividade sem dependências externas:** usar o IP IPv4 real do computador na rede local (Wi-Fi/Ethernet) e, quando existir, o IP de VPN privada (Tailscale/WireGuard/ZeroTier), sem túneis públicos externos.
2. **Proteção estrita de `Host` sem token:** o servidor escuta em `0.0.0.0` (mantendo alcance local em `127.0.0.1`), continua somente leitura (`GET`, rotas fechadas, sem `Access-Control-*`, `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`) e aceita apenas `Host` igual a `127.0.0.1:<porta>`, `localhost:<porta>` ou um dos IPs IPv4 locais reais da própria máquina na porta ativa.
3. **Exibição de rede local e VPN:** quando ambos existirem, `escritorio.mjs --automatico` imprime `ESCRITORIO:URL`, `ESCRITORIO:URL_REDE` e `ESCRITORIO:URL_VPN`.
4. **Compatibilidade do modo manual:** chamadas diretas sem `--automatico` preservam exatamente a linha de saída original (`Escritório aberto em http://127.0.0.1:<porta> — Ctrl+C para fechar`), porque `/opencrew dashboard`, `run`, `retomar` e `pedir` usam `--automatico`.

## 3. Contratos

1. **Descoberta de rede (`escritorio/rede.mjs`):**
   - `enderecosDeRede(interfaces)` lê `os.networkInterfaces()` (ou o objeto injetado), aceita apenas IPv4 não internos (`!internal`) e descarta link-local (`169.254.0.0/16`).
   - Ignora adaptadores virtuais/contêiner conhecidos (`vEthernet`, `Default Switch`, `WSL`, `Hyper-V`, `Docker`, `br-`, `veth`, `VirtualBox`/`vbox`, `VMware`/`vmnet`, `Loopback`, `Teredo`, `ISATAP`, `6to4`) na escolha do link divulgado.
   - Classifica CGNAT `100.64.0.0/10` ou interfaces VPN (`tailscale`, `wireguard`, `wg*`, `zerotier`, `vpn`, `tun*`, `tap*`, `utun*`, por fronteira de palavra) como `vpn`.
   - Classifica endereços privados RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) em adaptadores físicos como `lan`, priorizando Wi-Fi/Ethernet.
   - `ipsLocaisPermitidos(interfaces)` devolve um `Set<string>` com todos os IPv4 não internos ativos da máquina (excluindo `169.254.0.0/16`).
2. **Servidor e sonda (`porta.mjs`, `automatico.mjs`, `servidor.mjs`, `escritorio.mjs`):**
   - `abrir(servidor, porta)` e `servidorExato(...)` escutam em `0.0.0.0`, mantendo `alguemEscuta(porta)` em `127.0.0.1`.
   - `hostAceito(req)` exige `Host` terminado em `:<porta>` cujo hostname seja `127.0.0.1`, `localhost` ou esteja em `ipsLocaisPermitidos()`. Domínio estranho, IP não pertencente à máquina, ausência de porta ou porta diferente recebem `421` (`Abra por http://127.0.0.1:<porta>`).
   - `sondarEstado(porta, esperaMs, hostHeader)` permite validar que um servidor já aberto aceita o cabeçalho `Host: <ip-rede>:<porta>`. Um servidor antigo preso em `127.0.0.1` responde `421` e não é reutilizado pelo modo automático quando há IP de rede ativo, permanecendo intacto para suas abas abertas.
   - O JSON de `GET /estado` mantém exatamente `{ projeto, versao, crews }`.
3. **Saída do `--automatico` e instruções no runtime:**
   - `escritorio.mjs --automatico` imprime `ESCRITORIO:URL <url-local>` e, quando presentes, `ESCRITORIO:URL_REDE <url-lan>` e `ESCRITORIO:URL_VPN <url-vpn>`.
   - `runner/escritorio.md`, `prompts/pedido.prompt.md`, `templates/AGENTS.md` e `src/lib/ides.js` instruem o agente a abrir `ESCRITORIO:URL` localmente (Browser integrado ou `--externo`) e mostrar no chat como links clicáveis tanto a URL local quanto as URLs de celular/tablet (`ESCRITORIO:URL_REDE` e `ESCRITORIO:URL_VPN`).
   - `runner.pipeline.md` permanece em até 560 linhas (sem alteração), e todos os módulos de `scripts/` permanecem em até 200 linhas.

## 4. Cenários BDD

- **E6-01a** DADAS interfaces de rede com Wi-Fi privado, Tailscale (`100.x`), `vEthernet (Default Switch)`, `WSL`, `Teredo Tunneling` e `169.254.x.x` QUANDO `enderecosDeRede` é chamado ENTÃO seleciona apenas o IP de Wi-Fi como `lan` e o de Tailscale como `vpn`, ignorando virtuais e link-local.
- **E6-01b** DADO `escritorio.mjs --automatico --crew <c> --run <r>` com rede local e VPN disponíveis QUANDO o servidor é confirmado ENTÃO imprime `ESCRITORIO:URL`, `ESCRITORIO:URL_REDE` e `ESCRITORIO:URL_VPN` com `?crew=<c>&run_id=<r>`; sem interfaces ativas, imprime apenas `ESCRITORIO:URL`.
- **E6-02a** DADO um servidor aberto em `0.0.0.0` QUANDO recebe `GET /` ou `GET /estado` com `Host: <ip-local>:<porta>` ENTÃO responde `200` com os cabeçalhos de segurança; QUANDO recebe `Host: exemplo.com:<porta>`, IP de outra máquina ou porta trocada ENTÃO responde `421` sem ecoar o `Host`.
- **E6-02b** DADO um servidor antigo em `127.0.0.1` na porta inicial que recusa `Host: <ip-rede>:<porta>` com `421` QUANDO `--automatico` roda com rede ativa ENTÃO o servidor antigo permanece intacto e `--automatico` inicia o servidor novo na próxima porta livre.
- **E6-03a** (contrato) DADOS `runner/escritorio.md`, `pedido.prompt.md`, `templates/AGENTS.md` e `src/lib/ides.js` ENTÃO todos mantêm os contratos existentes e instruem exibir `ESCRITORIO:URL_REDE` e `ESCRITORIO:URL_VPN` no chat para celular/tablet.
- **E6-upg** DADO um workspace `1.21.0` QUANDO roda `update` ENTÃO recebe `rede.mjs`, os scripts atualizados do Escritório e os prompts novos preservando `crews/` e `_opencrew/_memory/`, e o workspace atualizado emite os links de rede no `--automatico`.

## 5. Travas

- `tests/escritorio-rede.test.js` (`E6-01a`, `E6-01b`, `E6-02a`, `E6-02b`)
- `tests/escritorio.test.js` (`E1-04e` atualizado para `0.0.0.0` + validação de IPs locais)
- `tests/escritorio-porta.test.js` (`E1-04f`)
- `tests/escritorio-auto.test.js` (`U7F3C-02a` + saída com `ESCRITORIO:URL_REDE` e `ESCRITORIO:URL_VPN`)
- `tests/runtime-contracts-u7f3c.test.js` (`E6-03a`)
- `tests/upgrade-e6.test.js` (`E6-upg`)

## 6. Conferência fora do `npm run verify`

- Subir o Escritório em `sandbox/` via `--automatico --crew <c> --run <r>`, abrir o link `ESCRITORIO:URL_REDE` em um celular/tablet no mesmo Wi-Fi (e `ESCRITORIO:URL_VPN` via Tailscale, se disponível) e confirmar que a sala em pixel-art e a lista `Equipe` atualizam em tempo real a cada comando `estado.mjs`.
