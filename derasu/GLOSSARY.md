# Derasu — interface

A camada visual da fork: os materiais, a profundidade e o movimento com que o Derasu veste o
núcleo do Deskcomm, na direção do Liquid Glass da Apple. Decisões em `derasu/docs/adr/`.

## Camadas

**Camada de conteúdo**:
Tudo o que o usuário lê e trabalha: cartões, tabelas, cartões do funil, balões da conversa,
formulários. Feita de **superfície**, nunca de vidro.
_Avoid_: fundo, corpo, área principal

**Camada de controle**:
O que flutua sobre o conteúdo para navegar e agir sobre ele: barra lateral, topo, barra de abas,
menus, popovers, modais, gavetas, dicas e botões flutuantes. É a única camada feita de **vidro**.
_Avoid_: cromo, chrome, navegação (quando se quer dizer a camada inteira)

**Ambiente**:
O fundo da página com luzes difusas na cor da marca e grão fino. Existe para que o vidro tenha o
que desfocar; não carrega informação.
_Avoid_: background, papel de parede, gradiente

## Materiais

**Material**:
O tratamento visual completo de uma peça — fundo, borda, luz, sombra. Toda peça é feita de
exatamente um material: **vidro** ou **superfície**.
_Avoid_: estilo, skin, tema (tema é claro/escuro, não material)

**Vidro**:
Material translúcido da camada de controle: deixa ver o ambiente e o conteúdo atrás, desfocados,
sob uma **matiz** e uma **aresta especular**. Com "reduzir transparência" ligado, vira superfície.
_Avoid_: glass, glassmorphism, acrílico, fosco

**Superfície**:
Material opaco da camada de conteúdo, com profundidade dada por **elevação** e aresta especular.
_Avoid_: card (o `<Card>` é um componente feito de superfície), papel, painel

**Matiz**:
A camada de cor que o vidro aplica sobre o que desfoca, clara no tema claro e escura no escuro,
para garantir leitura independentemente do que passa atrás.
_Avoid_: tint, overlay, véu

**Aresta especular**:
A linha de luz na borda superior de um material, onde ele "pega luz". Dá a espessura física.
_Avoid_: brilho, highlight, borda interna

**Refração**:
O desvio da imagem de trás nas bordas do vidro, como numa lente. Melhoria progressiva, só em
poucas peças pequenas e de destaque; onde o navegador não sustenta, o vidro segue sem ela.
_Avoid_: distorção, lente líquida

**Elevação**:
Quanto uma peça parece estar acima do que está atrás, expressa por sombra em camadas (contato +
ambiente). Sobe com a interação, nunca com a importância do conteúdo.
_Avoid_: z-index, altura, profundidade (profundidade é o efeito do conjunto)

**Efeito de borda**:
O desfoque e esmaecimento graduais na borda de uma área rolável, onde o conteúdo passa por baixo
da camada de controle. Substitui a linha divisória.
_Avoid_: fade, sombra de rolagem, divisor

**Gota**:
A peça que marca o item ativo dentro de um grupo de controle (a aba selecionada). É vidro na
camada de controle e superfície no conteúdo, e chega ao item escolhido em morfose: desliza quando
os itens têm a mesma largura, assenta no lugar quando não têm.
_Avoid_: indicador, pílula, highlight

**Trilho**:
O fundo rebaixado de um controle, onde a gota ou o puxador corre: a lista de abas segmentadas, o
interruptor desligado.
_Avoid_: track, fundo do controle, calha

**Puxador**:
A peça que alterna dentro de um trilho — a do interruptor. Estica ao ser pressionada.
_Avoid_: knob, thumb, bolinha

**Concentricidade**:
A regra de que uma peça aninhada tem o raio do contêiner menos o espaço entre eles, para que as
curvas de dentro acompanhem as de fora.
_Avoid_: cantos iguais, raio padrão

**Cápsula**:
A forma de raio total: botões e grupos de controle flutuantes.
_Avoid_: pílula, pill, botão redondo

**Halo**:
A sombra difusa na cor da própria peça sob um controle sólido de destaque, como o botão primário.
_Avoid_: glow, brilho externo

## Navegação

**Barra lateral**:
A lâmina de vidro com a navegação principal do app, à esquerda. No desktop ela fica **fixada**
ou **solta**; no celular é a gaveta que o ícone do topo abre por cima do conteúdo.
_Avoid_: sidebar, menu lateral, menu

**Ícone da barra lateral**:
O controle no canto de cima à esquerda, sempre no mesmo ponto da tela, que mostra a barra
lateral. Clicado, fixa ou solta a barra; com o mouse em cima, abre a **espiada**.
_Avoid_: hambúrguer (no desktop), botão de recolher

**Fixada**:
O estado em que a barra lateral fica na tela, ao lado do conteúdo, ocupando o próprio lugar. É
uma escolha de quem usa, e vale até ser desfeita.
_Avoid_: aberta, expandida, pin

**Solta**:
O estado em que a barra lateral sai da tela, e só o ícone fica. Ela volta por **espiada**.
_Avoid_: recolhida, fechada, escondida, unpin

**Espiada**:
A aparição passageira da barra lateral solta, por cima do conteúdo, enquanto o mouse está sobre o
ícone ou sobre a própria barra. Some quando o mouse sai, ao escolher um destino, com Esc ou com
um clique fora, e nunca escurece o conteúdo. Em tela de toque, é o toque no ícone que a abre.
_Avoid_: peek, flyout, hover, prévia

## Movimento

**Mola**:
Movimento cuja curva imita uma mola física: acelera, pode passar levemente do destino e
assenta. É o movimento padrão de tudo que responde a uma ação do usuário.
_Avoid_: bounce, spring (em prosa), easing elástico

**Pressionar**:
A resposta imediata de um controle ao toque ou clique: encolhe de leve e volta em mola ao soltar.
_Avoid_: active state, clique visual

**Morfose**:
A transição em que uma peça se transforma em outra mantendo a continuidade — um botão que vira o
menu que ele abre, uma aba que desliza para a seguinte.
_Avoid_: morph, transformação, animação de layout

**Entrada de rota**:
A troca de uma área do app para outra (inbox → funil): a página que sai esmaece rápido e a que
chega sobe 8px em 320ms, enquanto a barra lateral e o topo ficam parados. Dentro da mesma
área — trocar de conversa, de subpágina, recarregar dados — não há entrada de rota.
_Avoid_: transição de página, page transition, animação de navegação
