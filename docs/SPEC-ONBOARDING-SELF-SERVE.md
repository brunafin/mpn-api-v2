# Spec — Onboarding self-serve da arena

> **Status:** rascunho aprovado em conversa · **Data:** 19/07/2026  
> **Apps:** `mpn-api` · `mpn-manager`  
> **Problema:** hoje o cadastro de um novo cliente (ex.: LR Sports) é insert manual em cadeia (person → company → court → customers → operating_schedule → populate).  
> **Implementação:** UI-first no `mpn-manager` com estado mock (localStorage); API depois.

---

## 1. Objetivo

Permitir que o **dono da arena** crie a conta sozinho, configure o negócio progressivamente e opere no manager — **sem SQL manual**.

**Não é objetivo deste MVP:** aprovação interna MPN para publicar; cadastro obrigatório de clientes; migração automática do histórico da LR Sports.

---

## 2. Glossário (produto)

| Termo na UI (sugerido) | Entidade | Significado |
|---|---|---|
| **Arena / negócio** | `Company` | LR Sports — o estabelecimento |
| **Quadra** | `Court` | Espaço físico (Futsal 1, Vôlei…) |
| **Template de horário** | *novo* (nível empresa) | Grade semanal padrão da arena (hora × dia × preço), **sem fixos** |
| **Grade da quadra** | `OperatingSchedule` | Cópia do template na Court (+ fixos depois) |
| **Agenda do dia** | `CourtSchedule` | Slots concretos por data |
| **Cliente / contato** | `reservations.contact_*` / `fixed_contact_*` | Contato da agenda (avulsa ou fixo); **não** é login |
| **Horário fixo** | `is_fixed` + `fixed_contact_*` + esporte | Recorrência semanal naquela Court |

---

## 3. Decisões fechadas

| # | Decisão |
|---|---|
| **O1** | Cadastro **self-serve** pelo dono da arena |
| **O2** | Fluxo **progressivo**: mínimo no signup → enriquecimento depois de logado |
| **O3** | No signup informa **quantas quadras** (`courtCount`, 1–20). Checklist exige cadastrar **N/N** com form completo em cada uma |
| **O4** | Horário fica na **empresa como template** e é **copiado** para cada Court nova |
| **O5** | **Preço por hora** (e por dia) permitido; UI pode ter preço padrão + override por célula |
| **O6** | **Fixos fora do signup**; entram ao operar / ao configurar a Court no manager |
| **O7** | Cliente: **nome obrigatório**, **telefone opcional**; identidade estável = **`id`** |
| **O8** | Publicação no portal: o **manager ativa** quando o checklist mínimo estiver ok (não é aprovação MPN) |
| **O9** | UX da grade: **planilha semanal hora a hora** (células abertas/fechadas + preço) |
| **O10** | Mudança posterior no template da empresa **não sobrescreve** automaticamente Courts já existentes (MVP). Reaplicar template = feature futura, só em slots livres |
| **O11** | Signup público vive no **`mpn-manager`** (`/cadastro`) |
| **O12** | Entrega em fases: **UI + mock** primeiro; plugar API (signup, template, copy on court, phone nullable) depois |
| **O13** | MVP: cada Court usa **formulário completo** (não modelo “só o que é diferente”). Quantidade no signup só abre N vagas |

---

## 4. Jornadas

### 4.1 Cadastro (público, deslogado) — `mpn-manager` `/cadastro`

Campos:

- Nome da arena (`Company.name`)
- Email (conta / empresa — detalhes de onde persiste: ver §6)
- Dono: nome + telefone → `Person`
- **Quantas quadras?** (`courtCount`, inteiro 1–20) — não cria Courts ainda; só define quantas vagas o checklist exige

Efeito:

1. Cria `Person` + `Company` (`administrator_id`, `is_active = false` ou equivalente “não publicada”)
2. Persiste intenção `courtCount` (campo na company, preferências ou só no fluxo de onboarding até criar as Courts)
3. Autentica no manager e redireciona para o checklist (`/comecar`)

**Não cria** Court, template nem fixos neste passo.

**Fase mock:** persiste em `localStorage` (`mpn_onboarding_mock`); sem JWT real.

### 4.2 Após login — perfil da arena

| Bloco | Obrigatório para ativar no portal? | Conteúdo |
|---|---|---|
| Template de horário + preços | **Sim** | Grid dia × hora; célula aberta = entra no template com `price` |
| Fotos / logo / destaque | Não | URLs ou upload (escopo de upload: futuro se necessário) |
| Redes (Instagram etc.) | Não | Opcional |
| Comodidades (`characteristics`) | Não | Opcional |

### 4.3 Após login — Quadras (Courts)

- Checklist mostra progresso **N/N** conforme `courtCount` do signup
- Cada vaga: **formulário completo** (nome, tipo, coberta, rede, esportes…) — O13
- Ao salvar cada Court: **copiar template da empresa** → `operating_schedule`
- Popular `court_schedule` (implícito no create ou ação/cron existente)
- Pode criar mais Courts depois do onboarding (além do `courtCount`); ativar exige pelo menos as N informadas
- Fixos: na grade da Court / manager (reusa fluxo de fix)

### 4.4 Ativar no portal

Manager dispara ativação **somente se** checklist mínimo ok:

1. Dados básicos da arena (nome, telefone do negócio ou dono, endereço — detalhar campos exatos na implementação)
2. Template de horário com pelo menos um slot aberto e preço
3. **N Courts** cadastradas (`N = courtCount`), cada uma com esportes e grade copiada

Efeito: `Company.is_active = true` e/ou `Court.show = true` (alinhar com regra atual do portal na implementação).

Se faltar item: botão desabilitado + lista do que falta.

### 4.5 Cliente da arena (sem tela obrigatória no onboarding)

- Não há passo “cadastrar clientes” no signup
- Cliente nasce no **fixar / reservar**: nome (+ telefone se souber)
- Reserva avulsa grava `reservations.contact_*`; fixo grava `fixed_contact_*` em `operating_schedule` / `court_schedule`
- Telefone do fixo é **opcional** (não usa telefone da arena como identidade)
- **Proibido** identificar cliente só por telefone ou só por nome quando ambíguo (sem CRM nesta fase)

---

## 5. Template de horário (empresa)

### 5.1 Forma

- Dimensões: `day_of_week` × `hour` × `price`
- Ausência de célula = fechado (não gera linha, ou gera inativa — preferir **não criar** slot fechado, alinhado ao uso atual)
- Preço pode diferir entre horas/dias
- **Sem** `fixed_contact_*` / `is_fixed` / `sport_id` no template da empresa

### 5.2 Cópia para Court

```
POST Court
  → insert court
  → para cada slot do template da company:
       insert operating_schedule (court_id, hour, day, price, is_fixed=false, …)
  → populate court_schedule (janela inicial ou depender do cron — definir na impl.)
```

Courts adicionais: mesma cópia a partir do template **atual** da empresa.

### 5.3 Edição

| Escopo | MVP |
|---|---|
| Editar template da empresa | Sim — afeta só Courts **criadas depois** |
| Editar grade de uma Court | Sim — via operating_schedule / fluxos já existentes no manager |
| “Reaplicar template em todas as Courts” | Fora do MVP (O10) |

---

## 6. Impacto no modelo atual

### 6.1 Novo: template no nível empresa

Hoje `operating_schedule` exige `court_id`. Opções de implementação (escolher na task técnica):

| Opção | Descrição |
|---|---|
| **A** | Nova tabela `company_operating_schedule` (espelha campos do template) |
| **B** | `operating_schedule.court_id` nullable + flag `is_company_template` |

**Recomendação:** **A** — separar template de operação da Court, evita misturar fixos com default da empresa.

### 6.2 Contato do horário fixo

- Nome/telefone denormalizados em `operating_schedule` e `court_schedule` (`fixed_contact_name`, `fixed_contact_phone`)
- `fixed_contact_phone` é **nullable** — não copiar telefone da arena quando vazio
- Fluxos `fix` / reserva: não exigir telefone no fixo
- Tabela `company_customer` removida; avulsa continua em `reservations.contact_*`

### 6.3 DTOs / APIs (lacunas conhecidas hoje)

- Create company: incluir campos necessários ao perfil (`logo_url`, `characteristics`, `plan_id`, flag de publicação, etc.)
- Preferir endpoint(s) de onboarding/orquestração **ou** sequência autenticada bem definida + transação no signup
- Signup público: **não** reutilizar `POST /people` aberto sem rate-limit / validação de produto

### 6.4 Naming na UI

Evitar chamar a Company de “quadra” na interface; usar **Arena** (ou “Meu espaço”) e reservar **Quadra** para `Court`.

---

## 7. Fora do escopo (explícito)

- SQL / admin interno como caminho principal de onboarding (pode continuar como fallback ops)
- Self-serve de planos/pagamento complexo (respeitar D8–D10 do mapa de refatoração)
- Conta de jogador no portal
- Upload de imagens (pode ser URL no MVP)
- Tela dedicada “CRM de clientes” (lista/edição pode vir depois)
- Reaplicar template em Courts existentes
- Multi-empresa por gestor (D4)

---

## 8. Critérios de aceite (MVP)

1. Dono conclui signup com nome da arena, email, nome e telefone do proprietário, **quantidade de quadras**, e entra no checklist.
2. Logado, configura template semanal com preços distintos por hora e salva.
3. Cadastra as **N** Courts informadas; cada uma nasce com grade copiada do template (sem fixos).
4. Manager consegue marcar horário fixo informando **apenas o nome** do cliente; registro recebe `id` e `phone` null.
5. Com checklist incompleto, não publica no portal; com checklist completo, manager ativa e a arena passa a aparecer conforme regras do front.
6. Fotos e Instagram são opcionais e não bloqueiam operação no manager.

---

## 9. Encadeamento com o processo manual atual (referência)

O que o SQL da LR Sports fazia → onde cai no produto:

| Bloco SQL antigo | No self-serve |
|---|---|
| Person + Company | Signup (§4.1) |
| Company logo / instagram / characteristics | Perfil opcional (§4.2) |
| Court + sports | Criar Quadra (§4.3) |
| Contatos em massa | Desnecessário no onboarding; contato nasce no fix/reserva |
| `operating_schedule` livre + fixo | Template (livres) + copy; fixos no manager |
| Populate 1 semana | Automático no create Court / cron |

---

## 10. Plano de implementação

### Fase 1 — UI + mock (em andamento)

1. `/cadastro` + link a partir do login (+ `courtCount`)  
2. `/comecar` checklist (template, N/N quadras, ativar)  
3. Stubs interativos das etapas do checklist (marcar progresso no mock)  
4. Depois: grade hora a hora real (ainda mock) e formulário completo de Court  

### Fase 2 — API

1. Modelo: tabela template + migration `phone` nullable  
2. Signup autenticado + CRUD template + copy on court create  
3. Plugar manager na API e remover mock  
4. Alinhar checklist de endereço/telefone com o portal  

---

## Histórico de decisões (conversa)

- Análise a partir do cadastro manual LR Sports  
- Self-serve + progressivo  
- Template empresa → cópia por Court  
- Cliente por `id`; telefone opcional  
- Preço diferente por hora permitido  
- Ativação pelo manager com checklist mínimo  
- Signup no `mpn-manager`; UI-first com mock  
- `courtCount` no signup; form completo por quadra (O13); sem delta “só o diferente” no MVP  

