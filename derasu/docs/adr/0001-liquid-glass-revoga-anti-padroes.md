# O Derasu segue o Liquid Glass e revoga parte da doutrina visual do oficial

O design system do oficial proíbe vidro (`docs/design-system/09-anti-patterns.md` §5) e gradiente
(§3) e pede uma interface "calma, sem decoração" (`00-overview.md`). A fork existe para ir na
direção oposta — a do Liquid Glass da Apple — e por isso, **na fork**, essas regras caem. Quem
ler o oficial e "consertar" o vidro do Derasu estará desfazendo uma decisão, não um erro.

**O que cai:** a proibição de vidro e de gradientes de luz; a paleta neutra quente (greige), que
dá lugar a neutros frios ao estilo Apple nos dois temas; a Atkinson Hyperlegible, que dá lugar a
uma fonte variável com eixo de peso (Inter Variable), porque a hierarquia do Liquid Glass depende
de pesos intermediários que a Atkinson não tem.

**O que sobrevive, e manda sobre o vidro:** contraste medido (`lib/branding/regua-do-produto.ts`
e seus testes), movimento com propósito (os quatro testes de `07-motion-language.md`), claro e
escuro em todo material, e as preferências do sistema — `prefers-reduced-motion`,
`prefers-reduced-transparency` e `prefers-contrast: more` —, que trocam o vidro por superfície e
engrossam bordas. Translucidez nunca compra leitura.

## Consequences

- O material do vidro é feito de desfoque, saturação, matiz e aresta especular, que funcionam em
  todo navegador. A refração (SVG `feDisplacementMap`, só Chromium) entra apenas como melhoria
  progressiva em poucas peças pequenas; WebGL foi recusado.
- A troca de paleta e de fonte mexe na régua de contraste; os testes de contraste são ajustados
  junto, nunca afrouxados.
