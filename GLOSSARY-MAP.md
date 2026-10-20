# Glossary Map

Mapa de contextos lido pelas skills `grill-with-docs` / `domain-modeling`. Arquivo da fork
Derasu; o oficial não tem glossário.

## Contexts

- [Derasu — interface](./derasu/GLOSSARY.md): a camada visual da fork (materiais, vidro,
  profundidade, movimento, componentes). Decisões em `derasu/docs/adr/`.
- Deskcomm — núcleo: o produto oficial. Sem glossário próprio; as decisões dele moram em
  `docs/adr/`, que é do oficial — **a fork não escreve ali**.

## Relationships

- **Derasu → núcleo**: hoje o Derasu só veste o núcleo (CSS, tokens, primitivos de
  `components/ui/`); não muda comportamento, dados nem fluxo. Mudar essa fronteira é ADR.
