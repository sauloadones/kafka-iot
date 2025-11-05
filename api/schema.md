# Relatório do schema de dados

Este documento resume as entidades persistidas pela aplicação NestJS/TypeORM e destaca os campos, restrições e relacionamentos principais observados no código-fonte atual.

## Visão geral

O schema utiliza o TypeORM para mapear entidades para tabelas relacionais. Os domínios centrais são **empresas**, **usuários**, **silos de armazenagem**, **dispositivos IoT**, **alertas** e **processamentos de dados**. As relações reforçam a hierarquia organizacional (empresas → usuários/silos) e o monitoramento operacional (silos → dispositivos/alertas/agregados).

## Entidades

### `companies`
- **id** (`int`, chave primária auto gerada).
- **name** (`varchar`, único).
- **CNPJ** (`varchar`, único).
- **description** (`varchar`, opcional).
- **address** (`varchar`, opcional).
- **Relacionamentos:** `OneToMany` com `users` e `silos`, ambos com chave estrangeira de deleção em cascata.
- **Auditoria:** `createdAt`, `updatedAt` (`timestamp`).

### `users`
- **id** (`int`, chave primária auto gerada).
- **name** (`varchar`).
- **email** (`varchar`, único).
- **password** (`varchar`).
- **role** (`enum`: `admin` | `user`, padrão `user`).
- **mfa** (`boolean`, padrão `true`).
- **mfaSecret** (`varchar`, opcional).
- **mfaEnabledAt** (`timestamp`, opcional).
- **Relacionamentos:** `ManyToOne` obrigatório com `companies` (`onDelete: CASCADE`).
- **Auditoria:** `createdAt`, `updatedAt` (`timestamp`).

### `silos`
- **id** (`int`, chave primária auto gerada).
- **name** (`varchar`).
- **description** (`varchar`, opcional).
- **grain** (`varchar`).
- **inUse** (`boolean`, padrão `false`).
- **Limites de monitoramento:** `maxTemperature`, `minTemperature`, `maxHumidity`, `minHumidity`, `maxAirQuality`, `minAirQuality` (todos `float`, opcionais).
- **Relacionamentos:** `ManyToOne` obrigatório com `companies` (`onDelete: CASCADE`).
- **Auditoria:** `createdAt`, `updatedAt` (`timestamp`).

### `devices`
- **id** (`varchar`, chave primária definida manualmente).
- **name** (`varchar`).
- **Relacionamentos:** `ManyToOne` opcional com `silos` (`onDelete: SET NULL`).
- **isOnline** (`boolean`, padrão `false`).
- **lastSeenAt** (`timestamp`, opcional).
- **Auditoria:** `createdAt`, `updatedAt` (`timestamp`).

### `alerts`
- **id** (`int`, chave primária auto gerada).
- **Relacionamentos:** `ManyToOne` obrigatório com `silos` (`onDelete: CASCADE`).
- **type** (`enum`: `temperature` | `humidity` | `airQuality`).
- **level** (`enum`: `info` | `warning` | `critical`, padrão `info`).
- **currentValue** (`float`, opcional) — valor que originou o alerta.
- **emailSent** (`boolean`, padrão `false`).
- **message** (`varchar`, opcional).
- **Auditoria:** `createdAt`, `updatedAt` (`timestamp`).

### `data_process`
- **id** (`int`, chave primária auto gerada).
- **Relacionamentos:** `ManyToOne` obrigatório com `silos` (`onDelete: CASCADE`).
- **periodStart** (`timestamp`).
- **periodEnd** (`timestamp`).
- **Métricas médias:** `averageTemperature`, `averageHumidity`, `averageAirQuality` (`float`, opcionais).
- **Extremos:** `maxTemperature`, `minTemperature`, `maxHumidity`, `minHumidity` (`float`, opcionais).
- **Desvios padrão:** `stdTemperature`, `stdHumidity`, `stdAirQuality` (`float`, opcionais).
- **Indicadores de alertas:** `alertsCount`, `criticalAlertsCount` (`int`, padrão `0`).
- **Indicadores adicionais:** `percentOverTempLimit`, `percentOverHumLimit`, `environmentScore` (`float`, opcionais).
- **Auditoria:** `createdAt` (`timestamp`).

## Relacionamentos chave

- **Company ⇄ Users/Silos:** uma empresa agrega múltiplos usuários e silos. A exclusão da empresa propaga a remoção dos registros dependentes.
- **Silo ⇄ Devices/Alerts/DataProcess:** o silo centraliza o monitoramento operacional. A remoção do silo apaga alertas/agregações e remove (ou anula) a associação de dispositivos.
- **MFA em Users:** suporte nativo a autenticação multifator via segredo armazenado e data de ativação.

Este relatório reflete fielmente o schema atual observado nos arquivos de entidades do projeto.