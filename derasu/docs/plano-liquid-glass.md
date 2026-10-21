# Plano: o Derasu no nível do Liquid Glass

Saído da sessão de `grill-with-docs` de 19/10/2026. Vocabulário em [`../GLOSSARY.md`](../GLOSSARY.md);
decisões estruturais nos ADRs [0001](adr/0001-liquid-glass-revoga-anti-padroes.md),
[0002](adr/0002-vidro-so-na-camada-de-controle.md) e [0003](adr/0003-movimento-so-em-css.md).
Este arquivo é o roteiro; marque a entrega quando o PR dela entrar na `main` da fork.

## Entregas (um PR cada, com prova de tela)

1. [x] **Fundação** (PR #9) — tokens de material (vidro e superfície), de mola (`linear()`), neutros frios
   nos dois temas, Inter Variable, `prefers-reduced-transparency` e `prefers-contrast: more`.
   O `<Card>` volta a ser superfície (ADR 0002).
2. [x] **Camada de controle** (PR #10) — barra lateral flutuante (lâmina solta, com margem, no desktop;
   gaveta no celular); topo sem faixa, com controles em cápsulas de vidro e efeito de borda; barra
   de abas do celular em cápsula com gota deslizante; menus, popovers, modais, gavetas e dicas.
3. [x] **Controles** (PR #13) — botões em cápsula; interruptor, abas segmentadas com gota, campos e seleção
   com raio concêntrico ao contêiner.
4. [x] **Superfícies de conteúdo** (PR #14) — cartão, tabela, cartão do funil, balões da inbox. Em
   componente de área, só se acrescenta uma classe `ds-*`; nada de reescrever estrutura ou lógica,
   e o motivo vai escrito no PR.
5. [x] **Movimento** (PR #15) — pressionar; menus, seletores e dicas que nascem do gatilho;
   modal e gaveta em mola; e a entrada de rota. Esta dispensou a refatoração do `h-full` que o
   oficial previa (`docs/design-system/07-motion-language.md`): o `<ViewTransition>` do React,
   que o Next 16.4 já traz, dá nome à página sem acrescentar elemento entre ela e o `<main>`.

Depois: refração (`feDisplacementMap`) como melhoria progressiva na barra de abas e no botão
flutuante; barra de abas que encolhe ao rolar.

## Produção

Nada vai para `cereme.derasu.com.br` antes das entregas 1–4 provadas na tela local (claro/escuro,
desktop/celular). A troca de `APP_IMAGE` só com o "sim" do dono naquela hora, com o retorno pronto
(`update.sh`) e a conferência `/` → 200, `/app` → 307.
