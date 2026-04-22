# Como Executar as Migrations no Supabase

## Acesso
1. Vai a https://supabase.com/dashboard
2. Selecciona o projecto **revtech** 
3. No menu lateral, clica em **SQL Editor**

## Ordem de execução

### Migration 1 — Tickets
Copia e cola o conteúdo de `migrations/001_tickets.sql`:
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ticket_number text UNIQUE;
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;
```

### Migration 2 — Checklists
Copia e cola o conteúdo de `migrations/002_checklists.sql`

### Migration 3 — Base de Defeitos
Copia e cola o conteúdo de `migrations/003_defects.sql`

### Migration 4 — Encomendas de Peças
Copia e cola o conteúdo de `migrations/004_orders.sql`

### Migration 5 — Configurações da App
Copia e cola o conteúdo de `migrations/005_settings.sql`

## Storage Bucket para Logos
Em **Storage > New Bucket**:
- Name: `logos`
- Public bucket: ✅ (ligado)
- Cria o bucket

Ou executa no SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT DO NOTHING;
```

## Dados Iniciais da Base de Defeitos
Depois de criar a tabela `defect_database`, os dados são inseridos
automaticamente pela app na primeira utilização (seeded via código).

## Verificação
Depois de cada migration, verifica em **Table Editor** que as tabelas foram criadas correctamente.
