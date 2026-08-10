# ClimaGestor

> **SaaS de gestão para empresas de climatização e refrigeração.**

O **ClimaGestor** é uma aplicação web desenvolvida para empresas que trabalham com instalação, manutenção, limpeza e assistência técnica de equipamentos de climatização e ar-condicionado.

O sistema foi concebido inicialmente para atender empresas do segmento em **Aracaju/SE**, com arquitetura preparada para operação **multiempresa (multi-tenant)**.

A plataforma centraliza a gestão de clientes, técnicos, ordens de serviço, orçamentos e indicadores operacionais em um único ambiente.

O sistema ainda é um MVP, mas já esta pronto pra ser utilizado os módulos básicos.

---

## 🌐 Aplicação

**Aplicação em produção:**

https://climagestor.lovable.app/

**Repositório:**

https://github.com/alexpinto2-dev/climagestor

---

# 🎯 Objetivo

O ClimaGestor tem como objetivo substituir controles descentralizados, planilhas e processos manuais por uma plataforma especializada na operação de empresas de climatização.

A solução busca facilitar:

* Gestão de clientes;
* Gestão de técnicos;
* Controle de ordens de serviço;
* Agendamento de atendimentos;
* Gestão de orçamentos;
* Acompanhamento da operação;
* Visualização de indicadores;
* Organização das informações da empresa.

O produto foi desenvolvido com foco em **pequenas e médias empresas de climatização e refrigeração**.

---

# 🏗️ Arquitetura da Aplicação

O ClimaGestor utiliza uma arquitetura web moderna baseada em **React + TanStack Start + TypeScript**, com integração ao **Supabase** para autenticação e acesso aos dados.

A arquitetura atual pode ser representada conceitualmente da seguinte forma:

```text
┌──────────────────────────────────────────────┐
│                  USUÁRIO                     │
│             Navegador Web                    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│              CLIMAGESTOR                     │
│                                              │
│  React 19                                   │
│  TanStack Start                             │
│  TanStack Router                            │
│  TanStack Query                             │
│  TypeScript                                 │
│  Tailwind CSS                               │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                 SUPABASE                     │
│                                              │
│  Authentication                              │
│  PostgreSQL                                  │
│  API / Client SDK                            │
│  Row Level Security*                         │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                DADOS                         │
│                                              │
│  Empresas                                    │
│  Usuários                                    │
│  Clientes                                    │
│  Técnicos                                    │
│  Ordens de Serviço                           │
│  Orçamentos                                  │
└──────────────────────────────────────────────┘
```

> * O uso e a configuração efetiva de RLS devem ser confirmados nas migrations/configuração do projeto Supabase.

---

# 🧰 Stack Tecnológica

## Frontend

### React

Versão utilizada:

```text
React 19.2
```

Responsável pela construção da interface da aplicação.

---

### TypeScript

Versão configurada:

```text
TypeScript 5.8
```

Utilizado para tipagem estática e maior segurança durante o desenvolvimento.

---

### TanStack Start

O projeto utiliza:

```text
@tanstack/react-start
```

O TanStack Start fornece a base arquitetural da aplicação, permitindo construir aplicações React modernas com recursos de roteamento, execução e integração com o ecossistema TanStack.

---

### TanStack Router

Utilizado para gerenciamento das rotas da aplicação.

```text
@tanstack/react-router
@tanstack/router-plugin
```

---

### TanStack Query

Utilizado para gerenciamento do estado assíncrono e comunicação com fontes de dados.

```text
@tanstack/react-query
```

---

### Vite

O processo de desenvolvimento e build utiliza:

```text
Vite 8.1
```

---

### Tailwind CSS

O projeto utiliza Tailwind CSS para construção da interface:

```text
Tailwind CSS 4.2
```

Com integração através do plugin:

```text
@tailwindcss/vite
```

---

## Backend e Dados

### Supabase

O projeto utiliza:

```text
@supabase/supabase-js
```

O Supabase é utilizado como camada de backend/data platform da aplicação.

Entre os recursos utilizados ou previstos na arquitetura estão:

* Autenticação;
* Banco de dados PostgreSQL;
* Acesso aos dados através do SDK;
* Controle de acesso através de RLS.

---

## Autenticação Lovable

O projeto também possui a dependência:

```text
@lovable.dev/cloud-auth-js
```

Essa biblioteca fornece integração com os recursos de autenticação/cloud utilizados pelo ecossistema Lovable.

---

# 🎨 Interface e Componentes

A interface utiliza o ecossistema **Radix UI**, incluindo componentes para:

* Dialogs;
* Menus;
* Selects;
* Tabs;
* Tooltips;
* Accordions;
* Checkboxes;
* Radio groups;
* Dropdowns;
* Popovers;
* Progress;
* Navigation;
* Componentes de interação.

Entre as bibliotecas utilizadas estão:

```text
@radix-ui/*
lucide-react
class-variance-authority
tailwind-merge
```

Isso permite construir uma interface consistente e reutilizável.

---

# 📊 Visualização de Dados

O projeto possui integração com:

```text
Recharts
```

utilizada para construção de gráficos e visualizações de dados.

Essa camada permite apresentar indicadores operacionais e dashboards de forma visual.

---

# 📝 Formulários e Validação

O gerenciamento de formulários utiliza:

```text
React Hook Form
```

com integração de validação através de:

```text
@hookform/resolvers
Zod
```

Essa combinação permite estruturar formulários tipados e validar os dados antes do envio.

---

# 📅 Manipulação de Datas

A aplicação utiliza:

```text
date-fns
```

para operações envolvendo:

* Datas;
* Horários;
* Formatação;
* Comparações;
* Cálculos de períodos.

---

# 🏢 Arquitetura Multi-Tenant

O ClimaGestor foi concebido para funcionar como um sistema **multi-tenant**.

Isso significa que uma única aplicação pode atender diversas empresas, mantendo seus dados logicamente separados.

O modelo conceitual é:

```text
                    CLIMAGESTOR
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    Empresa A        Empresa B        Empresa C
        │                │                │
        ▼                ▼                ▼
    Clientes         Clientes         Clientes
    Técnicos         Técnicos         Técnicos
    OS               OS               OS
    Orçamentos       Orçamentos       Orçamentos
```

O isolamento dos dados deve ocorrer através da associação dos registros à empresa correspondente.

---

# 🔐 Segurança

Segurança é um requisito fundamental da arquitetura.

## Autenticação

A aplicação utiliza o ecossistema Supabase para autenticação.

O usuário autenticado deve estar associado a um perfil e, consequentemente, a uma empresa.

Fluxo conceitual:

```text
Usuário
   │
   ▼
Autenticação
   │
   ▼
Usuário autenticado
   │
   ▼
Perfil
   │
   ▼
Empresa
   │
   ▼
Dados permitidos
```

---

# 🛡️ Row Level Security

O projeto foi concebido para utilizar **Row Level Security (RLS)** no controle de acesso aos dados.

O princípio esperado é:

```text
Usuário da Empresa A
        │
        ▼
Pode acessar apenas
dados da Empresa A
```

e:

```text
Usuário da Empresa A
        X
        │
        ▼
Não pode acessar
dados da Empresa B
```

A validação definitiva das políticas RLS deve ser feita diretamente nas migrations e configurações do banco.

---

# 🔑 Proteção de Credenciais

Credenciais sensíveis nunca devem ser armazenadas diretamente no código-fonte.

Em aplicações frontend, devem ser utilizadas somente as credenciais públicas necessárias para inicialização do cliente.

A `service_role key` do Supabase **não deve ser exposta ao navegador**.

Nunca colocar secrets diretamente em:

```text
src/
public/
.env versionado
GitHub
```

---

# 👥 Perfis de Usuário

O modelo funcional do produto contempla diferentes níveis de acesso.

## Administrador

Responsável pela administração da empresa.

Pode possuir acesso a:

* Dashboard;
* Clientes;
* Técnicos;
* Ordens de serviço;
* Orçamentos;
* Relatórios;
* Configurações.

---

## Técnico

Usuário responsável pela execução dos serviços.

O acesso deve ser limitado às funcionalidades necessárias para execução dos atendimentos atribuídos a ele.

Exemplo:

```text
Técnico
   │
   ├── Visualizar OS atribuídas
   ├── Atualizar status
   ├── Registrar atendimento
   └── Concluir serviço
```

As permissões efetivas devem ser definidas pelas regras de autorização implementadas no sistema e banco de dados.

---

# 📦 Módulos Funcionais

## Dashboard

O dashboard apresenta uma visão geral da operação.

Indicadores podem incluir:

* Ordens de serviço;
* Ordens agendadas;
* Ordens concluídas;
* Valores;
* Ticket médio;
* Indicadores gráficos.

---

## Clientes

Módulo responsável pelo gerenciamento dos clientes.

Informações podem incluir:

* Nome;
* CPF/CNPJ;
* Telefone;
* E-mail;
* Endereço;
* Observações;
* Histórico de serviços.

---

## Técnicos

Módulo responsável pelo gerenciamento dos profissionais.

Permite manter informações relacionadas aos técnicos responsáveis pela execução dos serviços.

---

## Ordens de Serviço

As ordens de serviço representam os atendimentos realizados pela empresa.

Uma OS pode estar associada a:

```text
Empresa
   │
   └── Cliente
          │
          └── Ordem de Serviço
                   │
                   └── Técnico
```

Informações típicas:

* Cliente;
* Técnico;
* Data;
* Horário;
* Serviço;
* Status;
* Valor;
* Descrição;
* Observações.

---

## Orçamentos

Módulo destinado ao gerenciamento das propostas comerciais.

Um orçamento pode estar relacionado a um cliente e conter informações de:

* Serviço;
* Itens;
* Quantidade;
* Valor;
* Desconto;
* Total;
* Status;
* Observações.

---

## Relatórios

O sistema possui estrutura para apresentação de indicadores e informações operacionais.

Os gráficos podem ser utilizados para:

* Acompanhamento de OS;
* Desempenho;
* Volume de atendimentos;
* Valores;
* Evolução por período.

---

# 🗄️ Modelo Conceitual de Dados

O domínio principal do sistema pode ser representado conceitualmente como:

```text
                         companies
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
            profiles      clients     technicians
                              │
                              ▼
                       service_orders
                              │
                              ▼
                           quotes
```

As tabelas e relacionamentos efetivamente existentes devem ser considerados conforme o schema/migrations do Supabase.

---

# 🔄 Fluxo Operacional

Um fluxo operacional típico pode ser representado como:

```text
Cliente
   │
   ▼
Cadastro
   │
   ▼
Solicitação de serviço
   │
   ▼
Ordem de Serviço
   │
   ▼
Agendamento
   │
   ▼
Técnico
   │
   ▼
Execução
   │
   ▼
Conclusão
```

Quando necessário, o processo pode envolver orçamento:

```text
Cliente
   │
   ▼
Solicitação
   │
   ▼
Orçamento
   │
   ├──── Recusado
   │
   └──── Aprovado
             │
             ▼
       Ordem de Serviço
             │
             ▼
          Execução
```

---

# 📁 Organização do Projeto

A organização exata dos diretórios deve ser considerada conforme o código-fonte atual.

Uma aplicação baseada na arquitetura atual pode conter estruturas semelhantes a:

```text
climagestor/
│
├── public/
│
├── src/
│   ├── components/
│   ├── routes/
│   ├── hooks/
│   ├── lib/
│   ├── integrations/
│   └── ...
│
├── package.json
├── tsconfig.json
├── vite.config.*
├── eslint.config.*
└── README.md
```

> Esta representação é conceitual. Os diretórios reais do projeto devem ser considerados a fonte definitiva.

---

# ⚙️ Scripts Disponíveis

O projeto possui os seguintes scripts:

### Desenvolvimento

```bash
npm run dev
```

Inicia o ambiente de desenvolvimento através do Vite.

---

### Build

```bash
npm run build
```

Gera o build de produção.

---

### Build de desenvolvimento

```bash
npm run build:dev
```

Gera o build utilizando o modo de desenvolvimento.

---

### Preview

```bash
npm run preview
```

Executa localmente o build gerado.

---

### Lint

```bash
npm run lint
```

Executa a análise estática do código através do ESLint.

---

### Formatação

```bash
npm run format
```

Executa o Prettier para formatação do projeto.

---

# 🚀 Instalação Local

## Pré-requisitos

Recomenda-se possuir:

* Node.js;
* npm;
* Git;
* Projeto Supabase configurado;
* Credenciais do ambiente de desenvolvimento.

---

## Clonar o repositório

```bash
git clone https://github.com/alexpinto2-dev/climagestor.git

cd climagestor
```

---

## Instalar dependências

```bash
npm install
```

---

## Configurar ambiente

Criar o arquivo de variáveis de ambiente apropriado para o projeto.

Exemplo conceitual:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Os nomes exatos das variáveis devem ser confirmados na implementação atual.

---

## Executar

```bash
npm run dev
```

---

# 🧪 Validação do Projeto

Antes de uma versão ser disponibilizada em produção, recomenda-se executar:

```bash
npm run lint
```

e:

```bash
npm run build
```

Além disso, devem ser realizados testes funcionais dos principais fluxos.

---

# 🔒 Checklist de Segurança

Antes de publicar uma nova versão:

* [ ] RLS validado;
* [ ] Políticas de acesso revisadas;
* [ ] Isolamento entre empresas testado;
* [ ] Service Role Key não está no frontend;
* [ ] Secrets não estão no Git;
* [ ] Usuários não conseguem alterar `company_id` indevidamente;
* [ ] Usuários não conseguem consultar registros de outro tenant;
* [ ] Permissões de administrador revisadas;
* [ ] Permissões de técnico revisadas;
* [ ] Build de produção validado.

---

# 📈 Roadmap

O produto está sendo desenvolvido de forma incremental.

## V1 — Gestão Operacional

* [x] Autenticação
* [x] Estrutura multiempresa
* [x] Clientes
* [x] Técnicos
* [x] Ordens de serviço
* [x] Orçamentos
* [x] Dashboard
* [x] Relatórios

> Os itens acima representam o escopo funcional planejado/observado do produto e devem ser conferidos contra a implementação antes de serem considerados oficialmente concluídos.

---

## V2 — Operação Avançada

Possíveis evoluções:

* [ ] Agenda avançada;
* [ ] Histórico completo do cliente;
* [ ] Histórico de equipamentos;
* [ ] Controle de manutenção preventiva;
* [ ] Fotos e anexos da OS;
* [ ] Assinatura digital;
* [ ] Checklist técnico;
* [ ] Controle de peças e materiais.

---

## V3 — Comunicação

Possíveis integrações:

* [ ] WhatsApp;
* [ ] Confirmação automática de agendamento;
* [ ] Lembretes de atendimento;
* [ ] Envio de orçamento;
* [ ] Aviso de conclusão;
* [ ] Comunicação pós-atendimento.

---

## V4 — Inteligência Artificial

Possíveis funcionalidades:

* [ ] Assistente de IA;
* [ ] Atendimento automatizado;
* [ ] Geração de orçamentos;
* [ ] Análise de desempenho;
* [ ] Previsão de demanda;
* [ ] Recomendações de manutenção;
* [ ] Integração com WhatsApp através de agente inteligente.

---

# 💼 Modelo SaaS

O ClimaGestor foi projetado com objetivo de funcionar como um produto **Software as a Service (SaaS)**.

O modelo multi-tenant permite que diversas empresas utilizem a mesma plataforma.

```text
                  CLIMAGESTOR SaaS
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
   Empresa A         Empresa B         Empresa C
       │                 │                 │
       ▼                 ▼                 ▼
     Dados             Dados             Dados
       │                 │                 │
       └────────── Isolamento ─────────────┘
```

Essa arquitetura permite:

* Atualizações centralizadas;
* Escalabilidade;
* Manutenção simplificada;
* Onboarding de novas empresas;
* Operação recorrente;
* Evolução contínua do produto.

---

# 📍 Mercado Inicial

O produto está sendo desenvolvido inicialmente com foco em empresas de:

**Aracaju — Sergipe**

Segmentos prioritários:

* Climatização;
* Ar-condicionado;
* Refrigeração;
* Instalação;
* Manutenção;
* Limpeza;
* Assistência técnica.

Após validação do produto no mercado inicial, a solução poderá ser expandida para outras cidades e regiões.

---

# 🧭 Princípios de Engenharia

O desenvolvimento do ClimaGestor segue os seguintes princípios:

### Segurança primeiro

A autorização não deve depender exclusivamente da interface.

### Isolamento de tenants

Dados de empresas diferentes nunca devem ser misturados.

### Simplicidade

A interface deve priorizar produtividade e facilidade de utilização.

### Modularidade

Os módulos devem possuir responsabilidades bem definidas.

### Tipagem

O TypeScript deve ser utilizado para reduzir erros durante o desenvolvimento.

### Validação

Dados recebidos pela aplicação devem ser validados antes de serem processados.

### Evolução incremental

Novas funcionalidades devem ser adicionadas conforme necessidades reais do produto.

---

# 🧑‍💻 Desenvolvimento com Lovable

O ClimaGestor foi inicialmente desenvolvido utilizando o ecossistema **Lovable**.

O projeto possui dependências específicas da plataforma, incluindo:

```text
@lovable.dev/cloud-auth-js
@lovable.dev/vite-tanstack-config
```

O código-fonte permanece versionado no GitHub.

O Lovable pode ser utilizado como ferramenta de desenvolvimento e evolução da aplicação, enquanto o GitHub funciona como repositório do código-fonte.

---

# 📦 Dependências Principais

Entre as principais dependências do projeto estão:

```text
React 19
TypeScript 5.8
TanStack Start
TanStack Router
TanStack Query
Supabase JS
Vite 8
Tailwind CSS 4
Radix UI
React Hook Form
Zod
Recharts
date-fns
Lucide React
```

A relação completa de dependências e versões está disponível no arquivo:

```text
package.json
```

---

# 📄 Licença

A licença do projeto deve ser definida de acordo com a estratégia comercial do ClimaGestor.

Como o sistema possui finalidade comercial e potencial de operação como SaaS, recomenda-se definir formalmente os direitos de:

* Uso;
* Distribuição;
* Modificação;
* Reprodução;
* Exploração comercial.

---

# 👨‍💻 Autor

**Alexandre Pinto**

**APTEC Consultoria e Automação com IA**

O ClimaGestor faz parte da iniciativa de desenvolvimento de soluções digitais e automação para empresas de serviços.

---

# 📚 Tecnologias e Referências

* React — https://react.dev/
* TypeScript — https://www.typescriptlang.org/
* TanStack — https://tanstack.com/
* Supabase — https://supabase.com/
* Vite — https://vite.dev/
* Tailwind CSS — https://tailwindcss.com/
* Radix UI — https://www.radix-ui.com/
* Lovable — https://lovable.dev/

---

# 📌 Nota Técnica

Este documento descreve a arquitetura, finalidade e características conhecidas do ClimaGestor.

A fonte definitiva para determinar:

* Estrutura de tabelas;
* Relacionamentos;
* Políticas RLS;
* Rotas;
* Componentes;
* Variáveis de ambiente;
* Regras de negócio;
* Integrações;

é o código-fonte e a configuração efetivamente implantada.

Sempre que houver divergência entre este documento e a implementação, o README deverá ser atualizado para refletir o comportamento real do sistema.

---

**ClimaGestor**

> Gestão simplificada para empresas de climatização e refrigeração.
