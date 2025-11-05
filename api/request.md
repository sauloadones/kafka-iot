# 📘 Documentação dos Endpoints do Backend

Este documento consolida as rotas HTTP e SSE expostas pelo backend NestJS responsável pelo monitoramento de silos. Para cada "porta" (rota) listamos o método, o corpo esperado na requisição e as possíveis respostas conhecidas a partir da implementação atual.

> **Observação:** salvo indicação contrária, as rotas retornam erros padrão do NestJS (`400`, `404`, `500`, etc.) quando validações falham ou recursos não são encontrados. Os exemplos abaixo focam nos fluxos felizes e nos comportamentos especiais descritos no código-fonte.

## Índice de Endpoints

| Recurso | Método & Rota | Descrição resumida |
| ------- | -------------- | ------------------- |
| Saúde da aplicação | `GET /` | Retorna string de verificação padrão. |
| Autenticação | `POST /auth/login` | Efetua login com senha/MFA. |
| | `POST /auth/mfa/enable` | Habilita MFA após validação do código TOTP. |
| Empresas | `POST /companies` | Cria uma empresa. |
| | `GET /companies` | Lista empresas. |
| | `GET /companies/:id` | Obtém detalhes da empresa. |
| | `PATCH /companies/:id` | Atualiza dados da empresa. |
| | `DELETE /companies/:id` | Remove a empresa. |
| Usuários | `POST /users` | Cria usuário associado a empresa. |
| | `GET /users` | Lista usuários. |
| | `GET /users/:id` | Obtém usuário específico. |
| | `PATCH /users/:id` | Atualiza usuário. |
| | `DELETE /users/:id` | Remove usuário. |
| Silos | `POST /silos` | Cria silo vinculado a empresa. |
| | `GET /silos` | Lista silos. |
| | `GET /silos/:id` | Detalha silo. |
| | `PATCH /silos/:id` | Atualiza silo. |
| | `DELETE /silos/:id` | Remove silo. |
| Processamento de dados | `POST /data-process` | Persiste métricas agregadas de um silo. |
| | `GET /data-process` | Lista agregados registrados. |
| | `GET /data-process/:id` | Consulta agregado específico. |
| | `PATCH /data-process/:id` | Atualiza métricas agregadas. |
| | `DELETE /data-process/:id` | Remove agregado. |
| Dispositivos | `SSE /devices/:id/updates` | Stream de leituras em tempo real. |
| | `GET /devices/:id/history` | Histórico armazenado no Redis. |
| | `POST /devices/:id/commands` | Envia comando MQTT. |
| | `POST /devices` | Registra dispositivo. |
| | `GET /devices` | Lista dispositivos. |
| | `GET /devices/:id` | Detalha dispositivo. |
| | `GET /devices/silo/:siloId/online` | Lista dispositivos online por silo. |
| Alertas | `POST /alerts` | Cria alerta manualmente. |
| | `GET /alerts` | Lista alertas. |
| | `GET /alerts/:id` | Detalha alerta. |
| | `PATCH /alerts/:id` | Atualiza alerta. |
| | `DELETE /alerts/:id` | Remove alerta. |

---

## Saúde da aplicação

### `GET /`
- **Corpo:** nenhum.
- **Resposta 200:** `"Hello World!"` (string).【F:app/src/app.controller.ts†L1-L13】【F:app/src/app.service.ts†L1-L8】

---

## Autenticação

### `POST /auth/login`
- **Corpo JSON:**
  ```json
  {
    "email": "usuario@empresa.com",
    "password": "senhaSecreta",
    "mfaCode": "123456"
  }
  ```
  - `email` *(string, obrigatório)*.
  - `password` *(string, obrigatório)*.
  - `mfaCode` *(string, opcional)* — necessário quando o usuário já ativou MFA.【F:app/src/domain/auth/dto/auth.dto.ts†L1-L21】
- **Possíveis respostas:**
  - `200 OK` com `{ "mfaRequired": true }` quando o usuário possui MFA habilitada (`mfa` e `mfaEnabledAt` definidos) e não enviou o código TOTP.【F:app/src/domain/auth/auth.controller.ts†L18-L27】【F:app/src/domain/auth/auth.service.ts†L27-L39】
  - `200 OK` com `{ "mfaSetupRequired": true }` quando o usuário ainda não concluiu a ativação de MFA (campo `mfaEnabledAt` ausente).【F:app/src/domain/auth/auth.service.ts†L33-L39】
  - `200 OK` com `{ "access_token": "<JWT>" }` quando o usuário possui MFA habilitada, envia um `mfaCode` válido e a autenticação ocorre com sucesso.【F:app/src/domain/auth/auth.service.ts†L29-L32】【F:app/src/domain/auth/auth.service.ts†L41-L46】
  - `401 Unauthorized` para credenciais inválidas ou código MFA incorreto (lançado pelo serviço).

### `POST /auth/mfa/enable`
- **Corpo JSON:**
  ```json
  {
    "email": "usuario@empresa.com",
    "mfaCode": "123456"
  }
  ```
  - `email` *(string, obrigatório)* — utilizado para localizar o usuário.
  - `mfaCode` *(string, obrigatório)* — código TOTP atual para confirmar a ativação.【F:app/src/domain/auth/auth.controller.ts†L29-L34】
- **Resposta 200:**
  ```json
  {
    "message": "MFA enabled successfully",
    "access_token": "<JWT>"
  }
  ```
  Após validar o código, o backend grava `mfaEnabledAt` e devolve uma nova credencial JWT.【F:app/src/domain/auth/auth.service.ts†L58-L78】
- **Erros:** `401 Unauthorized` se o usuário não existir ou se o código for inválido.

---

## Empresas (`/companies`)

### DTO base
Os campos aceitos nos corpos de criação e atualização são definidos pelo `CreateCompanyDto`:
- `name` *(string, obrigatório)*.
- `CNPJ` *(string, obrigatório)*.
- `description` *(string, opcional)*.
- `address` *(string, opcional)*.【F:app/src/domain/companies/dto/company.dto.ts†L1-L20】

### Respostas de leitura
A representação padrão (`ReadCompanyDto`) inclui:
- Identificadores (`id`), campos básicos e timestamps (`createdAt`, `updatedAt`).
- Listas resumidas de usuários (`users`) e silos (`silos`).【F:app/src/domain/companies/dto/company.dto.ts†L24-L59】

### Endpoints
- `POST /companies` — cria e retorna a empresa recém-cadastrada (`201` com `ReadCompanyDto`).【F:app/src/domain/companies/companys.controller.ts†L22-L31】
- `GET /companies` — retorna array de `ReadCompanyDto` (`200`).【F:app/src/domain/companies/companys.controller.ts†L33-L39】
- `GET /companies/:id` — retorna único `ReadCompanyDto` (`200`).【F:app/src/domain/companies/companys.controller.ts†L41-L47】
- `PATCH /companies/:id` — atualiza campos informados e devolve a versão atualizada (`200`).【F:app/src/domain/companies/companys.controller.ts†L49-L57】
- `DELETE /companies/:id` — remove a empresa. O serviço não retorna corpo; o NestJS responde `200` com `null`.【F:app/src/domain/companies/companys.controller.ts†L59-L62】

---

## Usuários (`/users`)

### DTO base
- `name` *(string, obrigatório)*.
- `email` *(string, obrigatório, formato e-mail)*.
- `password` *(string, obrigatório)*.
- `role` *("admin" | "user", opcional na criação)*.
- `mfa`, `mfaSecret`, `mfaEnabledAt` *(opcionais, utilizados para MFA).* 
- `companyId` *(number, obrigatório)*.【F:app/src/domain/users/dto/user.dto.ts†L1-L36】

### Respostas de leitura
`ReadUserDto` devolve dados básicos, papel, estado de MFA, timestamps e um resumo da empresa associada (`company`).【F:app/src/domain/users/dto/user.dto.ts†L38-L64】

### Endpoints
- `POST /users` — cria usuário e retorna `ReadUserDto` (`201`).【F:app/src/domain/users/users.controller.ts†L18-L26】
- `GET /users` — lista usuários (`200`).【F:app/src/domain/users/users.controller.ts†L27-L33】
- `GET /users/:id` — retorna usuário específico (`200`).【F:app/src/domain/users/users.controller.ts†L35-L41】
- `PATCH /users/:id` — atualiza usuário (`200`).【F:app/src/domain/users/users.controller.ts†L43-L51】
- `DELETE /users/:id` — remove usuário (`200` sem corpo).【F:app/src/domain/users/users.controller.ts†L53-L56】

---

## Silos (`/silos`)

### DTO base
Campos aceitos na criação/atualização:
- `name` *(string, obrigatório)*.
- `description` *(string, opcional)*.
- `grain` *(string, obrigatório).* 
- `inUse` *(boolean, opcional).* 
- Limites máximos/mínimos de temperatura, umidade e qualidade do ar *(numbers, opcionais).* 
- `companyId` *(number, obrigatório).*【F:app/src/domain/silos/dto/silo.dto.ts†L1-L33】

### Respostas de leitura
Incluem metadados completos (`ReadSiloDto`), limites, status `inUse`, nome da empresa (`companyName`) e timestamps.【F:app/src/domain/silos/dto/silo.dto.ts†L35-L64】

### Endpoints
- `POST /silos` — cria e retorna um silo (`201`).【F:app/src/domain/silos/silos.controller.ts†L17-L25】
- `GET /silos` — lista silos (`200`).【F:app/src/domain/silos/silos.controller.ts†L27-L33】
- `GET /silos/:id` — retorna silo específico (`200`).【F:app/src/domain/silos/silos.controller.ts†L35-L41】
- `PATCH /silos/:id` — atualiza campos do silo (`200`).【F:app/src/domain/silos/silos.controller.ts†L43-L51】
- `DELETE /silos/:id` — remove silo (`200` sem corpo).【F:app/src/domain/silos/silos.controller.ts†L53-L56】

---

## Processamento de Dados (`/data-process`)

### DTO base
Campos aceitos para criação/atualização:
- Identificação do silo (`siloId`, obrigatório).
- Intervalo temporal (`periodStart`, `periodEnd`, obrigatórios).
- Métricas agregadas opcionais: médias, máximos/mínimos, desvios padrão, contagem de alertas e percentuais de violação de limites.【F:app/src/domain/data.process/dto/data.process.dto.ts†L1-L58】

### Respostas de leitura
`ReadDataProcessDto` devolve o identificador, nome do silo relacionado, período, métricas agregadas e `createdAt`.【F:app/src/domain/data.process/dto/data.process.dto.ts†L60-L98】

### Endpoints
- `POST /data-process` — grava métricas e retorna `ReadDataProcessDto` (`201`).【F:app/src/domain/data.process/data.process.controller.ts†L21-L29】
- `GET /data-process` — lista registros (`200`).【F:app/src/domain/data.process/data.process.controller.ts†L31-L37】
- `GET /data-process/:id` — retorna registro específico (`200`).【F:app/src/domain/data.process/data.process.controller.ts†L39-L45】
- `PATCH /data-process/:id` — atualiza métricas (`200`).【F:app/src/domain/data.process/data.process.controller.ts†L47-L55】
- `DELETE /data-process/:id` — remove registro (`200` sem corpo).【F:app/src/domain/data.process/data.process.controller.ts†L57-L60】

---

## Dispositivos (`/devices`)

### DTO base
- `id` *(string, obrigatório)* — identificador técnico do dispositivo.
- `name` *(string, obrigatório).* 
- `siloId` *(number, opcional)* — vínculo com silo.【F:app/src/domain/devices/dto/device.dto.ts†L1-L19】

`ReadDeviceDto` inclui `isOnline`, `lastSeenAt`, identificação/nome do silo e `createdAt`. Para envio de comando é utilizado `DeviceCommandDto` com campo `command` (string).【F:app/src/domain/devices/dto/device.dto.ts†L21-L36】

### Endpoints de streaming e integrações
- `SSE GET /devices/:id/updates` — stream de eventos em tempo real. Cada mensagem enviada ao canal `device-updates:<id>` é convertida em evento SSE (`data: <JSON>`). O corpo da requisição é vazio; a resposta mantém a conexão aberta até interrupção. Utiliza filtros RxJS para garantir que apenas eventos do dispositivo solicitado sejam entregues.【F:app/src/domain/devices/devices.controller.ts†L27-L44】
- `GET /devices/:id/history` — retorna histórico armazenado (formato definido pelo serviço, geralmente array de leituras).【F:app/src/domain/devices/devices.controller.ts†L46-L50】
- `POST /devices/:id/commands` — envia comando MQTT. Corpo esperado: `{ "command": "<texto>" }`. Resposta `200 OK` com `{ "message": "Comando enviado." }`.【F:app/src/domain/devices/devices.controller.ts†L52-L61】

### Endpoints de gerenciamento
- `POST /devices` — cria dispositivo e retorna `ReadDeviceDto` (`201`).【F:app/src/domain/devices/devices.controller.ts†L63-L71】
- `GET /devices` — lista dispositivos (`200`).【F:app/src/domain/devices/devices.controller.ts†L73-L79】
- `GET /devices/:id` — retorna dispositivo específico (`200`).【F:app/src/domain/devices/devices.controller.ts†L81-L87】
- `GET /devices/silo/:siloId/online` — retorna JSON com `online_count` e lista de dispositivos online associados ao silo (`200`).【F:app/src/domain/devices/devices.controller.ts†L89-L99】
- (Faltam endpoints `PATCH`/`DELETE` no controlador atual; operações de atualização/remoção não estão implementadas.)

---

## Alertas (`/alerts`)

### DTO base
- `type` *(enum: temperature | humidity | airQuality, obrigatório).* 
- `level` *(enum: info | warning | critical, opcional).* 
- `currentValue` *(number, opcional).* 
- `emailSent` *(boolean, opcional).* 
- `message` *(string, opcional).* 
- `siloId` *(number, obrigatório).*【F:app/src/domain/alerts/dto/alert.dto.ts†L1-L35】

`ReadAlertDto` traz identificador, tipo, nível, valor atual, status de e-mail, mensagem, resumo do silo e timestamps.【F:app/src/domain/alerts/dto/alert.dto.ts†L37-L62】

### Endpoints
- `POST /alerts` — cria alerta (`201`).【F:app/src/domain/alerts/alerts.controller.ts†L17-L24】
- `GET /alerts` — lista alertas (`200`).【F:app/src/domain/alerts/alerts.controller.ts†L26-L32】
- `GET /alerts/:id` — retorna alerta específico (`200`).【F:app/src/domain/alerts/alerts.controller.ts†L34-L40】
- `PATCH /alerts/:id` — atualiza alerta (`200`).【F:app/src/domain/alerts/alerts.controller.ts†L42-L50】
- `DELETE /alerts/:id` — remove alerta (`200` sem corpo).【F:app/src/domain/alerts/alerts.controller.ts†L52-L55】

---

## Considerações finais
- **Autenticação JWT:** diversos controladores utilizam o decorator `@Public()` em alguns métodos (ex.: criação de usuários e empresas). A proteção com JWT não está habilitada nestas rotas no estado atual, mas a infraestrutura já existe para futura ativação.
- **Códigos de erro padrão:** validações de DTO utilizam `class-validator`. Erros de validação produzem `400 Bad Request` automáticos; operações em recursos inexistentes tendem a gerar `404 Not Found` via exceções lançadas nos serviços correspondentes.
- **Streams e integrações externas:** o módulo de dispositivos integra Redis (histórico), Redis Pub/Sub (SSE) e MQTT (comandos). Ao consumir essas rotas, garanta reconexão automática em SSE e idempotência na publicação de comandos.