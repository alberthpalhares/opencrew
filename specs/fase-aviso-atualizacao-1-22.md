# Spec — aviso de atualização do OpenCrew 1.22.0

**Situação:** spec e cenários BDD aprovados pelo dono; implementação em andamento.

## Objetivo

Avisar no menu quando uma versão estável mais recente do framework estiver disponível e permitir prévia e atualização autorizada. A versão 1.22.0 também reúne as correções da candidata local 1.21.3.

## Consulta e escolha

- Ao abrir o menu, consultar no npm apenas o `latest` de `@aksp/opencrew`, com prazo de 1,5 segundo. Comparar versões estáveis numéricas válidas com o carimbo do projeto; quando ausente, usar a versão válida do manifesto. Avisar somente quando a versão publicada for maior.
- Usar cache por projeto, ignorado pelo Git, com duração de 24 horas. Offline, resposta inválida, cache inutilizável ou preferência `Aviso de atualização: off`: mostrar o menu normalmente. Adiar silencia o aviso por 24 horas.
- Mostrar versão instalada e disponível e oferecer **Ver prévia**, **Atualizar** e **Lembrar amanhã**. Atualizar apresenta primeiro a prévia e espera confirmação. Prévia e aplicação usam exatamente a versão anunciada.
- A prévia usa `update --check`, não grava no projeto e apresenta seu relatório. Como o código 1 também representa erro, reconhecer a resposta esperada com as versões corretas antes de oferecer confirmação; em erro, informar a falha e não aplicar.

## Proteção

- Aplicar pelo `update` existente com opção explícita para o fluxo do menu. Antes da primeira escrita, revalidar as execuções sob trava compartilhada com a criação de execuções e pedidos. Registro existente ilegível ou execução aberta impede aplicar e mostra como retomar ou encerrar por escolha do usuário.
- Preservar crews, entregas, histórico, preferências e chaves, manter as proteções e backups do update e mostrar o resumo efetivo. Após sucesso, orientar a reabrir o menu.
- Projetos antigos recebem o aviso após uma atualização com `npx @aksp/opencrew@latest update`.

## Aceite e publicação

- Validar consulta, cache, adiamento, preferência, offline, prévia sem escrita, cancelamento, registros abertos ou ilegíveis e disputa entre início e atualização. Conferir upgrade da 1.21.2 com comparação dos dados e backups.
- Executar `npm run verify` na candidata final e testar no sandbox aviso, prévia, confirmação e atualização. Exercitar entrega fictícia em pasta sincronizada real e HD ou SSD externo real antes da tag. Registrar separadamente a falha intermitente do Escritório.
- Atualizar README, changelog e STATUS; limpar somente resíduos identificados e caches recriáveis, preservando evidências. Carimbar 1.22.0 com `npm version`. Criar commit e push autorizados, aguardar CI verde no commit final em Windows e Ubuntu com Node 20.17, 22 e 24.
- Confirmar que a versão e a tag estão livres e que o `latest` não retrocederá. Enviar somente a tag `v1.22.0`, acompanhar publicação OIDC, confirmar versão e `latest` no npm e criar a release no GitHub com as notas do changelog.

## Cenários BDD aprovados

- **AU-01** DADA uma versão instalada válida e uma versão estável `latest` maior, QUANDO o menu abre, ENTÃO mostra ambas e oferece prévia, atualizar e lembrar amanhã, sem aplicar alterações.
- **AU-02** DADA uma versão instalada igual ou superior à publicada, QUANDO o menu abre, ENTÃO não mostra aviso de atualização.
- **AU-03** DADO um carimbo ausente e manifesto válido, QUANDO consulta a versão, ENTÃO compara com o manifesto; com ambos ausentes ou inválidos, não anuncia versão.
- **AU-04** DADOS npm indisponível, resposta inválida ou prazo de 1,5 s esgotado, QUANDO o menu abre, ENTÃO segue normalmente sem anunciar atualização não verificada.
- **AU-05** DADO um resultado em cache válido há menos de 24 horas, QUANDO o menu abre, ENTÃO usa o cache; vencido, consulta novamente. Cache inválido não bloqueia o menu.
- **AU-06** DADA a preferência `Aviso de atualização: off`, QUANDO o menu abre, ENTÃO não consulta o npm nem mostra o aviso.
- **AU-07** DADA uma atualização disponível, QUANDO o usuário escolhe lembrar amanhã, ENTÃO o aviso fica silenciado por 24 horas e volta depois.
- **AU-08** DADA uma atualização anunciada, QUANDO pede a prévia, ENTÃO usa a versão exata anunciada, mostra o relatório e a árvore do projeto permanece igual.
- **AU-09** DADO `update --check` com código 1 por erro ou saída sem as versões esperadas, QUANDO retorna da prévia, ENTÃO informa a falha e não oferece confirmação de aplicação.
- **AU-10** DADA a prévia válida, QUANDO o usuário escolhe atualizar, ENTÃO espera confirmação e usa a versão exata da prévia; ao cancelar, nada é atualizado.
- **AU-11** DADA uma execução aberta ou registro existente ilegível, QUANDO a atualização pelo menu é confirmada, ENTÃO recusa antes de escrever e informa como retomar ou encerrar a execução.
- **AU-12** DADOS uma atualização confirmada e um pedido ou run iniciado simultaneamente, QUANDO disputam a trava do projeto, ENTÃO a atualização e a criação não se sobrepõem e a revalidação acontece sob a mesma trava.
- **AU-13** DADO um projeto com crews, entregas, histórico, preferências, chaves e framework editado, QUANDO atualiza, ENTÃO os dados do usuário permanecem e o arquivo do framework editado é salvo em backup informado.
- **AU-14** DADA uma falha de atualização, QUANDO o comando retorna, ENTÃO o menu mostra o erro e não anuncia sucesso; com sucesso, mostra o resumo e orienta a reabrir o menu.
- **AU-15** DADO um projeto da 1.21.2, QUANDO recebe um único update, ENTÃO o novo aviso é instalado e crews, registros e arquivos do usuário são preservados.
- **AU-16** DADOS cache, trava ou diretório com link para fora do projeto, QUANDO o aviso ou a atualização opera, ENTÃO não grava fora dos locais autorizados nem sobrescreve dados do usuário.
- **AU-17** DADA uma entrega fictícia aprovada, QUANDO copiada para pasta sincronizada real e HD ou SSD externo real, ENTÃO arquivos e recibos correspondem ao pacote aprovado.
