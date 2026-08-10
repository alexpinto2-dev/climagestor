# Airflow Admin

Crie um sistema web completo de gestão para empresas de climatização (ar-condicionado) em Aracaju.

O sistema deve ser multi-empresa (multi-tenant). Cada usuário pertence a uma empresa e só pode ver e editar os dados da própria empresa.

### Regras de Segurança (obrigatórias):

- Ative Row Level Security (RLS) em TODAS as tabelas.

- Crie políticas de segurança do tipo: “usuário só acessa dados da própria empresa”.

- Nunca deixe a service_role key aparecer no código do frontend.

- Use apenas a anon key no frontend.

- Toda consulta e alteração de dados deve respeitar o company_id do usuário logado.

### Perfis de usuário:

- Admin da empresa (acesso total aos dados da própria empresa)

- Técnico (acesso limitado: ver e atualizar suas próprias ordens de serviço)

### Funcionalidades principais:

1. Login e autenticação (Supabase Auth)

2. Dashboard com resumo:

   - Total de ordens de serviço no mês

   - Ordens agendadas para hoje

   - Ordens concluídas

   - Ticket médio (quando houver valor)

3. Cadastro de Clientes

4. Cadastro de Técnicos

5. Ordens de Serviço (Agendamentos)

6. Orçamentos

7. Relatórios básicos

### Tabelas principais que devem existir:

- companies (empresas)

- profiles (usuários vinculados à empresa)

- clients (clientes)

- technicians (técnicos)

- service_orders (ordens de serviço)

- quotes (orçamentos)

Comece criando a estrutura completa do banco de dados com RLS ativado e as políticas de segurança corretas. Depois crie as telas principais.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://climagestor.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/51084779-9708-404d-a146-989d74ad1aea).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
