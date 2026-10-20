#!/usr/bin/env bash
# Ambiente local do Derasu no Windows (Git Bash + Docker Desktop).
#
# Os scripts de `scripts/` são do oficial e foram escritos para Ubuntu
# (`hostname -I`, `--network host`, `.env.local` com 127.0.0.1 para os
# contêineres). Em vez de editá-los — conflito a cada atualização da fork —,
# este script repete o que o job `e2e` do CI faz, que é o ambiente de quem
# acabou de instalar: Supabase local (pg15) sem a cadeia de migrations, as
# extensões, o `baseline.sql`, a chave de cifra dos segredos e o dono criado
# pelo `bootstrap-owner.ts`. O app roda DIRETO no Windows (`pnpm dev`), por
# isso 127.0.0.1 funciona. WAHA e Redis ficam de fora: o trabalho é visual.
#
# Uso: bash derasu/scripts/local-windows.sh {up|banco|status|down|reset}
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# Mesma versão do CI (.github/workflows/e2e.yml, `supabase/setup-cli`).
SUPABASE_VERSION="${SUPABASE_VERSION:-2.117.0}"
ENV_FILE=".env.local"
OWNER_EMAIL_PADRAO="admin@derasu.localhost"

cli() { npx --yes "supabase@${SUPABASE_VERSION}" "$@"; }

db_container() {
  docker ps --format '{{.Names}}' | grep -E '^supabase_db_' | head -1
}

# psql dentro do próprio contêiner do banco: sem `--network host`, sem montar
# volume (o Git Bash converteria o caminho), o SQL entra por stdin.
psql_db() {
  docker exec -i "$(db_container)" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"
}

env_value() {
  [[ -f "$ENV_FILE" ]] || return 0
  awk -F= -v k="$1" '$1 == k { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE"
}

status_env() { cli status -o env 2>/dev/null; }
status_value() { status_env | awk -F= -v k="$1" '$1 == k { sub(/^[^=]*=/, ""); gsub(/"/, ""); print; exit }'; }

supabase_up() {
  if [[ -n "$(db_container)" ]]; then
    printf 'Supabase local já está de pé.\n'
    return 0
  fi
  # A cadeia de migrations não sobe em banco novo; o que o self-hoster aplica
  # é o baseline. A pasta sai do caminho só durante o `start`.
  local backup
  backup="$(mktemp -d)"
  mv supabase/migrations "$backup/migrations"
  mkdir supabase/migrations
  trap 'rm -rf supabase/migrations; mv "'"$backup"'/migrations" supabase/migrations; rmdir "'"$backup"'"' EXIT
  cli start -x studio,postgres-meta
  rm -rf supabase/migrations
  mv "$backup/migrations" supabase/migrations
  rmdir "$backup"
  trap - EXIT
}

baseline_aplicado() {
  [[ "$(psql_db -Atc "select to_regclass('public.organizations') is not null")" == "t" ]]
}

aplicar_baseline() {
  if baseline_aplicado; then
    printf 'Baseline já aplicado.\n'
    return 0
  fi
  psql_db <<'SQL'
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema public;
create extension if not exists citext with schema public;
create extension if not exists pg_trgm with schema public;
SQL
  printf 'Aplicando supabase/baseline.sql…\n'
  psql_db < supabase/baseline.sql
  psql_db -c "insert into private.app_secrets (name, value) values ('nuvemshop_oauth_key', '$(openssl rand -hex 32)') on conflict (name) do nothing;"
  # O Realtime subiu antes de a publication ganhar as tabelas do baseline.
  docker restart $(docker ps -q --filter name=supabase_realtime) >/dev/null
}

gerar_env() {
  local api anon service
  api="$(status_value API_URL)"
  anon="$(status_value ANON_KEY)"
  service="$(status_value SERVICE_ROLE_KEY)"
  [[ -n "$api" && -n "$anon" && -n "$service" ]] || {
    printf 'Erro: o Supabase local não devolveu as credenciais.\n' >&2
    exit 1
  }
  local email senha
  email="$(env_value LOCAL_OWNER_EMAIL)"
  senha="$(env_value LOCAL_OWNER_PASSWORD)"
  [[ -n "$email" ]] || email="$OWNER_EMAIL_PADRAO"
  [[ -n "$senha" ]] || senha="$(openssl rand -base64 18 | tr -d '/+=')"

  if [[ -f "$ENV_FILE" ]]; then
    cp "$ENV_FILE" "$ENV_FILE.bak"
  fi
  # Sem UPSTASH_*: sem elas o rate limit usa o contador em memória (com elas e
  # sem Redis de pé, rotas e testes esperam timeout). Sem NODE_ENV: o
  # `pnpm dev` é development, e só aí as chaves de produção são opcionais.
  cat > "$ENV_FILE" <<EOF
# Gerado por derasu/scripts/local-windows.sh — Supabase LOCAL, nunca produção.
DESKCOMM_ENV_MODE=local
NEXT_PUBLIC_SUPABASE_URL=$api
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon
SUPABASE_SERVICE_ROLE_KEY=$service
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3000
INTERNAL_SECRET=$(openssl rand -hex 32)
INTERNAL_CRON_SECRET=$(openssl rand -hex 32)
CPF_ENCRYPTION_KEY=$(openssl rand -base64 32)
WAHA_BYO_ENCRYPTION_KEY=$(openssl rand -base64 32)
AI_CRED_AES_KEY=$(openssl rand -base64 32)
LGPD_SIGNING_KEY=$(openssl rand -hex 32)

# Dono da instalação local (login da tela). Credencial de TESTE, só deste banco.
LOCAL_OWNER_EMAIL=$email
LOCAL_OWNER_PASSWORD=$senha
EOF
  printf 'Ambiente gerado em %s\n' "$ENV_FILE"
}

criar_dono() {
  OWNER_EMAIL="$(env_value LOCAL_OWNER_EMAIL)" \
    OWNER_PASSWORD="$(env_value LOCAL_OWNER_PASSWORD)" \
    OWNER_ORG_NAME="${OWNER_ORG_NAME:-Derasu Local}" \
    pnpm exec tsx scripts/bootstrap-owner.ts
}

case "${1:-}" in
  up)
    supabase_up
    aplicar_baseline
    [[ -n "$(env_value LOCAL_OWNER_EMAIL)" ]] || gerar_env
    criar_dono
    printf '\nPronto. Rode `pnpm dev` e entre em http://localhost:3000/login com o\n'
    printf 'LOCAL_OWNER_EMAIL / LOCAL_OWNER_PASSWORD do %s.\n' "$ENV_FILE"
    ;;
  banco)
    # Só o banco (não precisa de node_modules).
    supabase_up
    aplicar_baseline
    ;;
  status)
    cli status
    ;;
  down)
    cli stop
    ;;
  reset)
    # Banco fresco: derruba sem backup e sobe de novo do baseline.
    cli stop --no-backup
    "$0" up
    ;;
  *)
    printf 'Uso: %s {up|banco|status|down|reset}\n' "$0"
    exit 2
    ;;
esac
