# Perfil de documento oficial

Este arquivo guarda o papel timbrado do projeto: o logotipo, o cabeçalho, o rodapé, as margens e
a letra dos documentos Word. Preencha depois dos dois-pontos; o que ficar vazio não aparece no
documento. Só as linhas `chave: valor` são lidas: o resto é comentário.

Para gerar um documento: node _opencrew/core/scripts/documento.mjs "caminho/do/texto.md"

## Cabeçalho

# Logotipo: arquivo PNG de até 2 MB, com o caminho a partir da pasta do projeto (exemplo: Ativos/Marca/logo.png).
logotipo:
# Largura do logotipo no papel, em centímetros (de 1 a 6); a altura acompanha a proporção da imagem.
logotipo_largura_cm: 2,5
# Primeira linha do cabeçalho, em negrito: o nome da organização (exemplo: ASSOCIAÇÃO EXEMPLO DE MORADORES).
cabecalho_1:
# Segunda linha do cabeçalho (exemplo: CNPJ 00.000.000/0001-00 · Fundada em 1990).
cabecalho_2:
# Terceira linha do cabeçalho, em cinza (exemplo: www.exemplo.org · contato@exemplo.org).
cabecalho_3:

## Rodapé

# Texto do rodapé, à esquerda, em todas as páginas (exemplo: Associação Exemplo de Moradores — documento oficial).
rodape:
# "Página X de Y" à direita do rodapé: sim ou nao.
numero_pagina: sim

## Página e letra

# Margem esquerda, em centímetros (de 1 a 6).
margem_esquerda_cm: 3,0
# Margem direita, em centímetros (de 1 a 6).
margem_direita_cm: 2,0
# Margem superior, em centímetros (de 1 a 6).
margem_superior_cm: 2,5
# Margem inferior, em centímetros (de 1 a 6).
margem_inferior_cm: 2,5
# Fonte do texto: o nome como aparece no Word (até 40 letras, dígitos e espaços).
fonte: Arial
# Tamanho da letra do texto, em pontos (de 8 a 14; aceita meio ponto, como 10,5).
tamanho_corpo_pt: 11
