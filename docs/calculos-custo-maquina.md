# Calculos de Custo de Maquina

## 1. Custo Base e Custo Maquina/Hora

O operador cadastra apenas o **Custo Base/Hora** de cada operacao (Torno, Fresa, Solda, etc).
O sistema calcula automaticamente o **Custo Maquina/Hora** aplicando o fator fixo **1.667**.

```
Custo Maquina/Hora = Custo Base/Hora x 1.667
```

### Exemplo

| Campo              | Valor     |
|--------------------|-----------|
| Custo Base/Hora    | R$ 60,00  |
| Fator              | x 1.667   |
| Custo Maquina/Hora | R$ 100,02 |

O Custo Maquina/Hora e armazenado na coluna `machine_cost_per_hour` da tabela `operations`.
O Custo Base/Hora e armazenado na coluna `base_cost_per_hour`.

---

## 2. Tempo Liquido de Producao

O tempo liquido desconta todas as pausas do tempo total.

```
Tempo Bruto (ms) = end_time - start_time       (convertido para milissegundos)
Tempo Liquido (ms) = Tempo Bruto - total_pause_ms
Tempo Liquido (min) = Tempo Liquido (ms) / 60.000
Tempo Liquido (horas) = Tempo Liquido (ms) / 3.600.000
```

### Exemplo

| Campo            | Valor         |
|------------------|---------------|
| Inicio           | 08:00         |
| Fim              | 10:30         |
| Tempo Bruto      | 150 min       |
| Pausas           | 30 min        |
| Tempo Liquido    | 120 min (2h)  |

---

## 3. Custo de Maquina por Producao

O custo de maquina de cada registro de producao e calculado pelo tempo liquido vezes o custo maquina/hora.

```
Custo Maquina = Custo Maquina/Hora x (Tempo Liquido em ms / 3.600.000)
```

Ou de forma simplificada:

```
Custo Maquina = Custo Maquina/Hora x Tempo Liquido em Horas
```

### Exemplo

| Campo                | Valor      |
|----------------------|------------|
| Custo Maquina/Hora   | R$ 100,02  |
| Tempo Liquido        | 2 horas    |
| **Custo Maquina**    | **R$ 200,04** |

---

## 4. Tempo por Peca

```
Tempo por Peca (min) = Tempo Liquido (ms) / Quantidade / 60.000
```

### Exemplo

| Campo            | Valor      |
|------------------|------------|
| Tempo Liquido    | 120 min    |
| Quantidade       | 10 pecas   |
| **Tempo/Peca**   | **12 min** |

---

## 5. Custo de Material

O custo de material e definido por peca no cadastro de pecas e multiplicado pela quantidade produzida.

```
Custo Material Total = Custo Material por Peca x Quantidade
```

### Exemplo

| Campo                    | Valor      |
|--------------------------|------------|
| Custo Material/Peca      | R$ 5,00    |
| Quantidade               | 10 pecas   |
| **Custo Material Total** | **R$ 50,00** |

---

## 6. Valor Cobrado (por Peca e Total)

O valor cobrado por peca e definido no cadastro do projeto. Nao e calculado pelo sistema.

```
Valor Total Cobrado = Valor por Peca x Quantidade
```

### Regra de Agrupamento

Quando uma peca passa por varias maquinas (ex: Torno -> Fresa -> Solda), todas as operacoes pertencem ao mesmo grupo. O valor cobrado:

- Aparece **somente na primeira operacao** (card principal)
- **NAO** e repetido nas operacoes seguintes
- **NAO** e somado multiplas vezes no total

### Exemplo

| Campo              | Valor       |
|--------------------|-------------|
| Valor/Peca         | R$ 100,00   |
| Quantidade         | 10 pecas    |
| **Valor Total**    | **R$ 1.000,00** |

---

## 7. Resumo Completo - Exemplo Pratico

Uma peca **C121314** passa por 3 operacoes com 10 unidades, valor cobrado R$ 100,00/peca.

### Operacao 1: Torno (Card Principal)

| Calculo              | Formula                              | Resultado   |
|----------------------|--------------------------------------|-------------|
| Custo Base/Hora      | (cadastro)                           | R$ 60,00    |
| Custo Maquina/Hora   | 60,00 x 1,667                        | R$ 100,02   |
| Tempo Liquido        | 150min bruto - 30min pausa           | 120 min (2h)|
| Custo Maquina        | 100,02 x 2                           | R$ 200,04   |
| Custo Material       | 5,00 x 10                            | R$ 50,00    |
| Valor/Peca           | (definido no projeto)                | R$ 100,00   |
| Valor Total          | 100,00 x 10                          | R$ 1.000,00 |

### Operacao 2: Fresa (Sub-operacao)

| Calculo              | Formula                              | Resultado   |
|----------------------|--------------------------------------|-------------|
| Custo Maquina/Hora   | 48,00 x 1,667                        | R$ 80,02    |
| Tempo Liquido        | 90min bruto - 10min pausa            | 80 min      |
| Custo Maquina        | 80,02 x (80/60)                      | R$ 106,69   |
| Valor Cobrado        | (nao exibido - pertence ao grupo)    | -           |

### Operacao 3: Solda (Sub-operacao)

| Calculo              | Formula                              | Resultado   |
|----------------------|--------------------------------------|-------------|
| Custo Maquina/Hora   | 36,00 x 1,667                        | R$ 60,01    |
| Tempo Liquido        | 60min bruto - 5min pausa             | 55 min      |
| Custo Maquina        | 60,01 x (55/60)                      | R$ 55,01    |
| Valor Cobrado        | (nao exibido - pertence ao grupo)    | -           |

### Totais do Grupo

| Metrica                       | Valor       |
|-------------------------------|-------------|
| Custo Maquina (todas ops)     | R$ 361,74   |
| Custo Material                | R$ 50,00    |
| **Valor Cobrado (unico)**     | **R$ 1.000,00** |

---

## Formulas SQL Utilizadas

```sql
-- Tempo liquido em minutos
ROUND(((EXTRACT(EPOCH FROM (end_time - start_time)) * 1000
  - COALESCE(total_pause_ms, 0)) / 60000)::numeric, 2)

-- Tempo por peca em minutos
ROUND(((EXTRACT(EPOCH FROM (end_time - start_time)) * 1000
  - COALESCE(total_pause_ms, 0)) / quantity / 60000)::numeric, 2)

-- Custo de maquina
ROUND((machine_cost_per_hour * (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000
  - COALESCE(total_pause_ms, 0)) / 3600000)::numeric, 2)

-- Custo de material total
ROUND((material_cost * quantity)::numeric, 2)
```

## Fator 1.667

O fator **1.667** e aplicado sobre o custo base para cobrir custos indiretos da operacao da maquina (energia, depreciacao, manutencao, etc). Este fator e fixo e nao pode ser editado pelo usuario.

```
1.667 ≈ 5/3
```
