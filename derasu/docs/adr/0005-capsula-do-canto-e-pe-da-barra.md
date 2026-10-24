# Cápsula do canto e pé da barra: os controles do topo descem para a barra lateral

Complementa o [ADR 0004](0004-barra-lateral-fixada-ou-solta.md). No desktop, a partir de 768px, a
barra lateral passa a encostar na borda esquerda, de cima a baixo, sem folga e sem cantos. O topo
deixa de ter controles e fica uma faixa vazia de 56px, o que evita que a página pule ao fixar ou
soltar a barra. Os controles se reorganizam assim:

- **Cápsula do canto** (canto de cima à esquerda, sempre no mesmo ponto): ícone da barra lateral,
  Configurações (só o ícone), Notificações e Buscar (só a lupa, que abre a paleta de comandos).
- **Pé da barra:**
  - uma fileira com o seletor de organização, o idioma e o tema;
  - embaixo, a **conta**: avatar, nome e e-mail. O menu dela tem a versão, o Modo administrador,
    a "Nova versão" (que antes ficava sob Configurações) e Sair.
- **A marca** desce para a faixa logo abaixo da cápsula.

Decidido com o dono em 23/10/2026. O celular não muda.

## Por que organização, idioma e tema ficam à vista, e não dentro do menu da conta

O primeiro desenho os punha dentro do menu da conta. Medido: 13 provas e2e do oficial clicam
neles direto, visíveis, em tela de desktop (`tenant-switcher`, `seletor-de-idioma`, "Tema: …").
Escondê-los no menu obrigaria a fork a reescrever essas provas e a reconciliá-las a cada
sincronização, contra a regra de não dificultar receber o oficial. Deixá-los visíveis no pé da
barra mantém todas as provas como estão.

## Por que os controles do oficial mudam de lugar por portal, e não por cópia

O sino toca o som da central, a busca registra o Ctrl+K e o tema registra o Ctrl+Shift+L. Uma
segunda cópia na barra tocaria o som duas vezes e abriria e fecharia a paleta no mesmo atalho.
Por isso cada um continua nascendo onde nasce no oficial e, no desktop, é desenhado no lugar novo
por portal: existe uma vez só, com o mesmo nome e o mesmo `testid`. Antes da hidratação eles
ficam no topo, que no desktop está escondido. O preço é aparecerem um instante depois da
primeira pintura.
