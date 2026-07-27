# Load tests com k6

## O que é o k6?

O **k6** é uma ferramenta open-source de **teste de carga** (Grafana Labs).  
Você escreve um script em JavaScript descrevendo o que os usuários fazem (abrir listagem, ver detalhe, criar reserva). O k6 sobe dezenas/centenas de **VUs** (*virtual users*) em paralelo e mede:

| Métrica | Significado |
|--------|-------------|
| **http_req_duration** | Latência (p50, p95, p99) |
| **http_req_failed** | % de requests com erro |
| **checks** | Asserções do script (status 200, JSON ok…) |
| **vus** | Quantos usuários virtuais estavam ativos |

Não é unit test nem e2e de UI: **bate na API HTTP** como se fossem vários clients ao mesmo tempo. Serve para validar se, com ~50 quadras e pico de uso, a API aguenta — com números reais, não só estimativa.

```
você ──► k6 (N VUs) ──► mpn-api ──► Postgres
              │
              └── relatório: latência, erros, thresholds
```

## Scripts neste diretório

| Arquivo | O que simula | Escreve no banco? |
|---------|--------------|-------------------|
| `peak-50-courts.js` | Pico: ~80 browsers públicos + ~25 managers na agenda | Não (só GET + 1 login) |
| `reservation-race.js` | 10 VUs reservando o **mesmo** horário | **Sim** — só em DEV/staging |

## Instalar o k6

```bash
# Ubuntu / Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# ou com snap
sudo snap install k6
```

Confira: `k6 version`

## Como rodar

1. API no ar (`mpn-api` em `http://localhost:3001` ou a URL do staging).
2. Dados reais no banco (arenas ativas, horários populados). Migração de índices aplicada ajuda o cenário público.

### Pico (leituras) — seguro

```bash
cd /home/brunanunes/Projetos/mpn/v2

k6 run load-tests/peak-50-courts.js \
  -e BASE_URL=http://localhost:3001 \
  -e UF=RS \
  -e CITY="Porto Alegre" \
  -e MANAGER_USER=seu_user \
  -e MANAGER_PASS=sua_senha
```

Sem `MANAGER_*`, roda só o tráfego público.

### Race de reserva — altera dados

```bash
k6 run load-tests/reservation-race.js \
  -e BASE_URL=http://localhost:3001 \
  -e MANAGER_USER=seu_user \
  -e MANAGER_PASS=sua_senha \
  -e SPORT_ID=1 \
  -e VUS=10
```

**Esperado com o lock (`FOR UPDATE`):** `reservations_created == 1` e `reservations_conflict == 9`.  
Se `created > 1`, a race ainda existe.

## Como ler o resultado

No final o k6 imprime algo como:

```text
✓ where-to-play 200
http_req_duration........: avg=120ms p(95)=340ms
http_req_failed..........: 0.00%
✓ thresholds
```

- **Thresholds verdes** → metas do script (ex.: p95 where-to-play &lt; 800ms) passaram.
- **Checks vermelhos** → responses inesperadas (500, JSON quebrado, login falhou).
- Compare `details_ms` antes/depois do filtro por `date` — deve cair bastante.

## Ajustar carga

No topo de `peak-50-courts.js`, o bloco `stages` controla o ramp-up.  
Para um smoke test rápido (poucos VUs):

```bash
k6 run --vus 5 --duration 30s load-tests/peak-50-courts.js \
  -e BASE_URL=http://localhost:3001 -e UF=RS
```

(Note: `--vus`/`--duration` sobrescrevem os `scenarios` só em scripts sem scenarios complexos; no `peak-50-courts.js` prefira editar os `stages` ou usar.)

Smoke mínimo alterando env mental: rode com menos stages editando o arquivo, ou use o race script que é curto.

## Variáveis

Veja `env.example`. Tudo passa com `-e NOME=valor`.
