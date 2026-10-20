# Vidro só na camada de controle; o conteúdo é superfície

Seguindo a regra central do Liquid Glass, o vidro é exclusivo da camada de controle (barra
lateral, topo, barra de abas, menus, popovers, modais, gavetas, dicas, botões flutuantes). A
camada de conteúdo — cartões, tabelas, cartões do funil, balões da conversa — é superfície
opaca com elevação e aresta especular. Isto desfaz a decisão do PR #2, que pôs vidro em todo
`<Card>`.

## Considered Options

- **Vidro em tudo** (o estado após o PR #2): vidro sobre vidro embaralha a leitura, e uma coluna
  do funil com dezenas de cartões, cada um com `backdrop-filter`, custa GPU justamente no
  notebook do atendente.
- **Vidro só na camada de controle** (escolhida): o ambiente aparece através da navegação, o
  conteúdo fica legível e o custo de desfoque fica limitado a poucas peças fixas na tela.
