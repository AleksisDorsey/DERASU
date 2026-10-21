-- Dados de DEMONSTRAÇÃO para a prova de tela das superfícies de conteúdo
-- (funil, inbox, tabela) num banco LOCAL recém-instalado, que nasce vazio.
-- Nunca rode em produção.
--
-- Idempotente: IDs fixos + `on conflict do nothing`. Usa a primeira
-- organização e o primeiro funil do banco, sem ID de tenant cravado.
--
-- Uso (Git Bash, com o Supabase local de pé):
--   docker exec -i "$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)" \
--     psql -U postgres -d postgres -v ON_ERROR_STOP=1 < derasu/scripts/seed-conteudo-local.sql

with org as (select id from organizations order by created_at limit 1)
insert into channel_sessions (id, organization_id, waha_session_name, webhook_secret_encrypted, status, display_name, phone_number)
select 'd0000000-0000-4000-8000-000000000001', org.id, 'derasu-demo', '\x00'::bytea, 'WORKING', 'Demonstração', '5511900000000'
from org
on conflict (id) do nothing;

with org as (select id from organizations order by created_at limit 1)
insert into contacts (id, organization_id, name, phone_number, source)
select v.id::uuid, org.id, v.nome, v.fone, 'manual'
from org, (values
  ('d0000000-0000-4000-8000-000000000101', 'Marina Alves', '+5511911110001'),
  ('d0000000-0000-4000-8000-000000000102', 'Rafael Couto', '+5511911110002'),
  ('d0000000-0000-4000-8000-000000000103', 'Clínica Sorriso Pleno', '+5511911110003'),
  ('d0000000-0000-4000-8000-000000000104', 'Joana Prado', '+5511911110004')
) as v(id, nome, fone)
on conflict (id) do nothing;

with org as (select id from organizations order by created_at limit 1),
     funil as (select p.id from crm_pipelines p, org where p.organization_id = org.id order by p.created_at limit 1),
     etapas as (select s.id, row_number() over (order by s.position) as n from crm_stages s, funil where s.pipeline_id = funil.id)
insert into crm_leads (id, organization_id, pipeline_id, stage_id, contact_id, title, value_cents, currency, position_in_stage, status)
select v.id::uuid, org.id, funil.id, etapas.id, v.contato::uuid, v.titulo, v.valor, 'BRL', v.pos, 'open'
from org, funil, etapas, (values
  ('d0000000-0000-4000-8000-000000000201', 1, 'd0000000-0000-4000-8000-000000000101', 'Kit clareamento — Marina', 48900, 1),
  ('d0000000-0000-4000-8000-000000000202', 1, 'd0000000-0000-4000-8000-000000000102', 'Pedido #1042 — Rafael', 12990, 2),
  ('d0000000-0000-4000-8000-000000000203', 2, 'd0000000-0000-4000-8000-000000000103', 'Contrato anual — Sorriso Pleno', 360000, 1),
  ('d0000000-0000-4000-8000-000000000204', 3, 'd0000000-0000-4000-8000-000000000104', 'Pedido #1039 — Joana', 8990, 1),
  ('d0000000-0000-4000-8000-000000000205', 4, 'd0000000-0000-4000-8000-000000000102', 'Reposição — Rafael', 5490, 1)
) as v(id, etapa, contato, titulo, valor, pos)
where etapas.n = v.etapa
on conflict (id) do nothing;

with org as (select id from organizations order by created_at limit 1)
insert into conversations (id, organization_id, contact_id, channel_session_id, channel, status, last_message_at, last_message_preview, last_inbound_at)
select 'd0000000-0000-4000-8000-000000000301', org.id, 'd0000000-0000-4000-8000-000000000101',
       'd0000000-0000-4000-8000-000000000001', 'whatsapp', 'open', now(), 'Perfeito, pode mandar o link 🙌', now()
from org
on conflict (id) do nothing;

with org as (select id from organizations order by created_at limit 1)
insert into messages (id, organization_id, conversation_id, channel_session_id, contact_id, external_id, type, direction, status, body, sent_via, sent_at, created_at)
select v.id::uuid, org.id, 'd0000000-0000-4000-8000-000000000301', 'd0000000-0000-4000-8000-000000000001',
       'd0000000-0000-4000-8000-000000000101', 'derasu-demo-' || v.n, 'text', v.dir, v.st, v.corpo, coalesce(v.via, 'crm'),
       now() - (v.min || ' minutes')::interval, now() - (v.min || ' minutes')::interval
from org, (values
  ('d0000000-0000-4000-8000-000000000401', 1, 'inbound',  'received', 'Oi! Vi o kit de clareamento no Instagram. Ainda tem?', null, 14),
  ('d0000000-0000-4000-8000-000000000402', 2, 'outbound', 'read',     'Oi, Marina! Tem sim 😊 Sai por R$ 489,00 com frete grátis para SP.', 'crm', 12),
  ('d0000000-0000-4000-8000-000000000403', 3, 'inbound',  'received', 'Ótimo. Dá para parcelar?', null, 9),
  ('d0000000-0000-4000-8000-000000000404', 4, 'outbound', 'delivered','Em até 6x sem juros no cartão. Quer que eu gere o link de pagamento?', 'crm', 7),
  ('d0000000-0000-4000-8000-000000000405', 5, 'inbound',  'received', 'Perfeito, pode mandar o link 🙌', null, 2)
) as v(id, n, dir, st, corpo, via, min)
on conflict (id) do nothing;
