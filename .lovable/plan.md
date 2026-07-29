## Sistema de Gestão para Empresas de Climatização (multi-tenant)

App em português, multi-empresa, com Lovable Cloud (banco + autenticação) e isolamento total por empresa.

### 1. Backend (primeiro passo)

Ativar Lovable Cloud e criar o schema completo em uma migração:

- `companies` — nome, CNPJ, telefone, cidade (padrão Aracaju), criada_em
- `profiles` — id (= usuário autenticado), company_id, nome, telefone, email
- `user_roles` — tabela separada com enum `app_role` ('admin', 'tecnico'); papéis nunca ficam em profiles (evita escalonamento de privilégio)
- `clients` — company_id, nome, telefone, email, endereço, bairro, tipo (residencial/comercial), observações
- `technicians` — company_id, profile_id (opcional, quando o técnico tem login), nome, telefone, especialidade, ativo
- `service_orders` — company_id, client_id, technician_id, tipo de serviço (instalação, manutenção preventiva, corretiva, limpeza, recarga de gás), descrição, status (agendada, em andamento, concluída, cancelada), data agendada, data conclusão, valor, equipamento/BTUs
- `quotes` — company_id, client_id, número, status (rascunho, enviado, aprovado, recusado), itens (JSON: descrição, qtd, valor unitário), valor total, validade, observações

Funções de segurança (SECURITY DEFINER, evitam recursão em RLS):
- `get_user_company_id()` — retorna o company_id do usuário logado
- `has_role(user_id, role)` — verifica papel

Regras aplicadas em todas as tabelas:
- `ENABLE ROW LEVEL SECURITY` em todas
- GRANTs explícitos para `authenticated` e `service_role` (sem `anon`)
- Políticas base: só acessa linhas onde `company_id = get_user_company_id()`
- Técnico: SELECT/UPDATE apenas nas ordens onde é o técnico responsável; leitura de clientes da empresa; sem acesso a orçamentos
- Admin: acesso total dentro da própria empresa
- Trigger em novo cadastro cria o profile automaticamente

Nenhuma chave de serviço no frontend — apenas a chave pública.

### 2. Autenticação

- Tela `/auth`: login e cadastro por e-mail/senha
- No cadastro, o usuário informa o nome da empresa → cria a empresa e o vincula como admin
- Rotas protegidas sob layout autenticado, redirecionando para `/auth`
- Botão de sair com limpeza de sessão

### 3. Telas

- **Dashboard** (`/`, protegido): cards com ordens no mês, agendadas para hoje, concluídas e ticket médio; lista das próximas ordens
- **Clientes** — lista com busca, criar/editar/excluir
- **Técnicos** — lista, criar/editar, ativar/desativar
- **Ordens de Serviço** — lista com filtros por status/data/técnico, criação com cliente + técnico + agendamento, mudança de status; técnico vê só as dele
- **Orçamentos** — lista, criação com itens dinâmicos e total calculado, mudança de status, conversão em ordem de serviço
- **Relatórios** — faturamento por período, ordens por status, desempenho por técnico, serviços mais realizados

Navegação lateral fixa com layout responsivo.

### 4. Design

Identidade própria de clima/refrigeração: tons de azul-gelo e petróleo, tipografia limpa e moderna, cards com bastante respiro — tudo em tokens semânticos no design system, sem cores fixas nos componentes.

### Detalhes técnicos

- Toda leitura/escrita passa por RLS; o `company_id` é derivado do usuário logado no servidor, nunca enviado pelo cliente
- Funções de servidor autenticadas (TanStack Start) para as operações; consultas do cliente usam apenas a chave pública
- Validação de formulários com Zod, feedback via toasts
- Metadados de SEO por página, em português
