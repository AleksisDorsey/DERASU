# Roteiro: levar o Derasu para cereme.derasu.com.br

Preparado em 21/10/2026, depois da entrega 5 do [plano](plano-liquid-glass.md). **Nada aqui foi
executado na VPS.** Cada fase que muda a VPS precisa do "sim" do dono naquela hora.

## O que foi medido (só leitura, 21/10/2026)

| O quê                     | Estado                                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Versão no ar              | oficial **1.85.0** (`ghcr.io/melgarafael/*:1.85.0`), clone em `~/DeskcommCRM` no commit da release                                           |
| Arquitetura               | ARM64 (Oracle)                                                                                                                               |
| Proxy                     | Caddy (`REVERSE_PROXY=caddy`); o app sobe só com `docker-compose.prod.yml` (lido no rótulo do contêiner)                                     |
| Banco                     | Supabase externo (nenhum contêiner do Supabase na VPS)                                                                                       |
| Imagens da fork           | `ghcr.io/aleksisdorsey/{deskcommcrm,deskcomm-worker,deskcomm-scheduler}:main` baixam **sem login** (repositório público) e têm build `arm64` |
| Agendamentos              | `agent.sh` a cada 5 min (só age se alguém clicar em "Atualizar agora" na tela) e o dreno de eventos a cada minuto                            |
| Clone da VPS              | 5 arquivos fora do git (`aplicar_baseline_manual.sh`, `scripts/api.ts` e outros); nenhum colide com a v1.86.0                                |
| Última release do oficial | **v1.86.0** (19/10). A fork contém o oficial até `7df1b64` (21/10), que está **à frente** da v1.86.0, com 4 migrations a mais                |

## A decisão que molda o roteiro

O `update.sh` do oficial é o único caminho testado que mexe no banco de produção, com backup
antes, pausa do app durante o schema, reconciliação das políticas de RLS, conferência de saúde e
retorno. Ele sempre grava as imagens **oficiais** no `.env`.

Por isso o roteiro separa as duas coisas:

1. **O banco anda pelo caminho oficial:** `update.sh --to vX.Y.Z`.
2. **A troca para o Derasu só troca imagens** e não toca no banco. Um retorno, se for preciso,
   é voltar o `.env` e subir de novo.

Isso só é seguro quando o código da fork não pede schema além do que a release instalou. Ou seja,
o oficial contido na fork tem de estar **dentro** da release. Hoje ainda não está: a fork tem
`7df1b64`, e a v1.86.0 não. A Fase 0 espera a próxima release que o contenha. O oficial tem
publicado uma a cada 1 a 3 dias.

**Alternativa recusada:** aplicar à mão o `baseline.sql` da fork em produção. Seria repetir fora
do kit o passo mais delicado do `update.sh` (pausa, reconciliação de políticas, passadas de
retentativa), sem o teste que o kit tem.

## Fase 0: pré-condições (sem tocar na VPS)

1. **A fork está dentro de uma release.** Na máquina de desenvolvimento:

   ```bash
   git fetch origin && git fetch upstream --tags
   P=$(git merge-base origin/main upstream/main)        # o oficial que a fork contém
   T=$(gh release view --repo melgarafael/DeskcommCRM --json tagName --jq .tagName)
   git merge-base --is-ancestor "$P" "$T" && echo "ok: $T contém a fork" || echo "esperar"
   ```

   Se der `esperar`, não há o que fazer além de aguardar a release.

2. **Sincronizar a fork com a tag `T`** (PR para a `main` da fork, como de costume). Se o passo 1
   deu ok, o merge só traz o que a release tem a mais, e o schema da fork fica igual ao da release.
3. **Imagens publicadas:** o `publish-image.yml` da `main` da fork terminou verde depois desse
   merge. Anotar os digests, que são o pino da Fase 2 (a tag `main` muda a cada push):

   ```bash
   for i in deskcommcrm deskcomm-worker deskcomm-scheduler; do
     docker buildx imagetools inspect ghcr.io/aleksisdorsey/$i:main --format "$i {{.Manifest.Digest}}"
   done
   ```

4. **Janela de pouco movimento**, e o "sim" do dono.

## Fase 1: oficial 1.85.0 → `T` (muda o banco; caminho do kit)

```bash
ssh -i C:\Users\Usuario\Downloads\ssh-key-2026-09-04.key ubuntu@163.176.184.217
cd ~/DeskcommCRM
bash hostgator-setup-kit/update.sh --to "$T"
```

O próprio script faz o backup, o código novo, o banco, as imagens oficiais da versão `T` e a
conferência de saúde. Se ele recusar ou falhar, o Derasu nem entrou: seguir o que ele orienta.

**Conferir antes de seguir:**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://cereme.derasu.com.br/      # 200
curl -s -o /dev/null -w '%{http_code}\n' https://cereme.derasu.com.br/app   # 307
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}'                     # app/worker/scheduler healthy, na versão T
```

## Fase 2: imagens do Derasu (não muda o banco)

```bash
cd ~/DeskcommCRM
cp .env ".env.oficial-$T"                     # o retorno
sed -i \
  -e 's#^APP_IMAGE=.*#APP_IMAGE=ghcr.io/aleksisdorsey/deskcommcrm@sha256:<digest do app>#' \
  -e 's#^WORKER_IMAGE=.*#WORKER_IMAGE=ghcr.io/aleksisdorsey/deskcomm-worker@sha256:<digest do worker>#' \
  -e 's#^SCHEDULER_IMAGE=.*#SCHEDULER_IMAGE=ghcr.io/aleksisdorsey/deskcomm-scheduler@sha256:<digest do scheduler>#' \
  .env
grep -E '^(APP|WORKER|SCHEDULER)_IMAGE=' .env
docker compose -f docker-compose.prod.yml --env-file .env pull app worker scheduler
docker compose -f docker-compose.prod.yml --env-file .env up -d app worker scheduler
```

- **Só `docker-compose.prod.yml`:** é o que o contêiner em produção declara, e o Caddy é o proxy.
  Se a VPS um dia passar a outro proxy, o arquivo do proxy entra junto (ver "Deploy em produção"
  no `CLAUDE.md` oficial).
- **Digest e não `:main`:** com a tag móvel, qualquer `up -d` futuro puxaria o que estivesse na
  `main` da fork naquele dia. O kit reconhece o digest como versão fixa e não acusa "versão
  solta".

**Conferir:**

1. `/` → 200 e `/app` → 307 (os mesmos `curl` da Fase 1).
2. `docker ps`: app, worker e scheduler `healthy` com as imagens `aleksisdorsey`.
3. `docker logs --since 5m deskcommcrm-app-1 2>&1 | grep -iE "error|fatal" | head`: nada novo
   em relação à Fase 1.
4. Pela tela, com uma conta real:
   - login;
   - Inbox, abrindo uma conversa;
   - um funil;
   - Configurações;
   - um menu, um modal e a troca de área (o movimento da entrega 5);
   - claro e escuro;
   - no celular.

## Retorno

| Situação                       | O que fazer                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Algo errado na Fase 2          | `cp ".env.oficial-$T" .env` e o mesmo `docker compose ... up -d app worker scheduler`. O banco não mudou na Fase 2, então volta exatamente à Fase 1. |
| Voltar ao oficial mais recente | `bash hostgator-setup-kit/update.sh` (regrava as imagens oficiais).                                                                                  |
| Algo errado na Fase 1          | É o `update.sh` do oficial: seguir o que ele imprime. O backup da Fase 1 fica onde o script indicar.                                                 |

Depois de qualquer retorno: `/` → 200 e `/app` → 307.

## Depois que o Derasu estiver no ar

- **Não clicar em "Atualizar agora" na tela.** O `agent.sh` roda o `update.sh`, que grava de novo
  as imagens oficiais: o Derasu sai do ar, e no lugar entra o oficial.
- **Cada atualização futura é este roteiro de novo:** a fork sincroniza com a nova tag (Fase 0),
  a VPS passa por `update.sh --to <tag>` (Fase 1) e as imagens voltam a ser as da fork (Fase 2).
- **A fork sincroniza pela tag de release, e não pela `main` do oficial** (decisão do dono,
  21/10/2026, registrada no `derasu/CLAUDE.md`). Assim a fork fica sempre "dentro" de uma
  release, pronta para a Fase 1. A sincronização de 21/10 foi pela `main`, e é por isso que a
  Fase 0 hoje precisa esperar.
