# Movimento com física feito só em CSS, sem biblioteca

As molas do Derasu são escritas em CSS — curvas `linear()` geradas como tokens, `@starting-style`
para entradas e View Transitions para morfose —, sem adicionar `motion` (antigo framer-motion).
A biblioteca daria mola interrompível e gestos, mas exige reescrever o JSX de cada peça animada,
e cada arquivo do oficial tocado é conflito a cada atualização da fork.

Se um gesto real exigir (arrastar no funil, puxar uma gaveta para fechar), a biblioteca entra por
um ADR novo que substitua este, restrita às peças que precisam dela.
