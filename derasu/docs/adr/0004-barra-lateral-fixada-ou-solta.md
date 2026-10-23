# Barra lateral do desktop: fixada ou solta com espiada, sem trilho de ícones

No desktop, a barra lateral passa a ter dois estados. **Fixada** é a barra inteira ao lado do
conteúdo, como era a aberta. **Solta** é a barra fora da tela: o ícone no canto de cima à esquerda
a mostra por **espiada**, por cima do conteúdo, enquanto o mouse está sobre ele ou sobre ela. Só o
clique no ícone fixa e solta a barra. O modelo segue o da barra do Claude Desktop, e o trilho de
ícones de 64px deixa de existir.

Decidido com o dono em 23/10/2026. Os detalhes:

- **Padrão:** fixada. Quem tinha escolhido o trilho recolhido passa a ver a barra solta, que é o
  mais próximo do que escolheu: o mesmo cookie `sidebar_collapsed` agora quer dizer "solta".
- **O ícone fica no mesmo ponto da tela nos dois estados**, e o botão "Recolher" do alto da barra
  sai: a mão nunca precisa procurar o ícone.
- **A espiada:**
  - abre quando o mouse entra no ícone;
  - fecha cerca de 300ms depois que ele sai do ícone e da barra, o que perdoa o movimento em
    diagonal até o item;
  - também fecha ao escolher um destino, com Esc ou com um clique fora;
  - não escurece o conteúdo.
- **Tela de toque não tem hover:** ali o toque no ícone abre e fecha a barra por cima, e fixar
  só existe para quem usa mouse. O critério é o aparelho ter hover, e não a largura da tela.
- **Teclado:** o ícone é um botão comum, e Enter fixa ou solta a barra. Focar o ícone não abre a
  espiada, e por enquanto não há atalho global (Ctrl+B é negrito no campo de mensagem da inbox).

## Opções consideradas

- **Manter o trilho de ícones como terceiro estado:** recusado. Seriam três estados para
  aprender, e o trilho disputava o lugar do conteúdo sem mostrar os nomes.
- **Abrir a espiada por foco de teclado:** recusado. Barras surgiriam no caminho de quem só
  atravessa a tela com Tab.
