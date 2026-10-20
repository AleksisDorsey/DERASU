# Plano: o Derasu no nível do Liquid Glass

Saído da sessão de `grill-with-docs` de 19/10/2026. Vocabulário em [`../GLOSSARY.md`](../GLOSSARY.md);
decisões estruturais nos ADRs [0001](adr/0001-liquid-glass-revoga-anti-padroes.md),
[0002](adr/0002-vidro-so-na-camada-de-controle.md) e [0003](adr/0003-movimento-so-em-css.md).
Este arquivo é o roteiro; marque a entrega quando o PR dela entrar na `main` da fork.

## Entregas (um PR cada, com prova de tela)

1. [ ] **Fundação** — tokens de material (vidro e superfície), de mola (`linear()`), neutros frios
   nos dois temas, Inter Variable, `prefers-reduced-transparency` e `prefers-contrast: more`.
   O `<Card>` volta a ser superfície (ADR 0002).
2. [ ] **Camada de controle** — barra lateral flutuante (lâmina solta, com margem, no desktop;
   gaveta no celular); topo sem faixa, com controles em cápsulas de vidro e efeito de borda; barra
   de abas do celular em cápsula com gota deslizante; menus, popovers, modais, gavetas e dicas.
3. [ ] **Controles** — botões em cápsula; interruptor, abas segmentadas com gota, campos e seleção
   com raio concêntrico ao contêiner.
4. [ ] **Superfícies de conteúdo** — cartão, tabela, cartão do funil, balões da inbox. Em
   componente de área, só se acrescenta uma classe `ds-*`; nada de reescrever estrutura ou lógica,
   e o motivo vai escrito no PR.
5. [ ] **Movimento** — pressionar, molas, morfose (View Transitions), e a transição de rota, que
   exige antes tirar o `h-full` da raiz das páginas (ver `docs/design-system/07-motion-language.md`).
   Pode correr em paralelo depois da 1.

Depois: refração (`feDisplacementMap`) como melhoria progressiva na barra de abas e no botão
flutuante; barra de abas que encolhe ao rolar.

## Produção

Nada vai para `cereme.derasu.com.br` antes das entregas 1–4 provadas na tela local (claro/escuro,
desktop/celular). A troca de `APP_IMAGE` só com o "sim" do dono naquela hora, com o retorno pronto
(`update.sh`) e a conferência `/` → 200, `/app` → 307.
