# Documentação da Arquitetura de Ingestão de Dados IoT

### 1. Visão Geral da Arquitetura

Este sistema foi projetado para ser uma plataforma robusta e escalável para a ingestão, processamento e armazenamento de dados de dispositivos IoT em tempo real. A arquitetura desacopla os componentes de ingestão, processamento e armazenamento, utilizando um pipeline de dados assíncrono.

O fluxo principal é o seguinte:
1.  **Dispositivos IoT** enviam dados para um **Broker MQTT**.
2.  Um serviço de **Bridge (Ponte)** em Python consome os dados do MQTT, os enriquece e os publica em um tópico no **Redpanda (Kafka)**.
3.  Um serviço **Consumidor** em Python lê as mensagens do tópico Kafka em lotes.
4.  O Consumidor processa cada mensagem e armazena o estado atual e o histórico recente do dispositivo no **Redis**.
5.  Uma **API REST** exposta pela Bridge permite monitorar os dispositivos online e enviar comandos de volta para eles.

---

### 2. Fluxo de Dados Detalhado

O trânsito dos dados ocorre em quatro etapas principais, desde o dispositivo até o armazenamento final.

#### Etapa 1: Ingestão de Dados via MQTT
* **Origem:** Dispositivos IoT em campo.
* **Protocolo:** MQTT.
* **Destino:** Um broker MQTT público (`broker.hivemq.com`).

Os dispositivos publicam mensagens em dois tipos de tópicos:
1.  `devices/{device_id}/hello`: Uma mensagem de "keep-alive" ou "olá" enviada periodicamente para indicar que o dispositivo está online.
2.  `devices/{device_id}/data`: Uma mensagem contendo os dados do sensor, geralmente em formato JSON.

#### Etapa 2: A Ponte (Bridge) MQTT para Kafka
* **Serviço:** `mqtt-kafka-bridge` (definido no `docker-compose.yml`).
* **Lógica Principal:** `main.py`, `mqtt_service.py`, `kafka_service.py`.

Este serviço é o ponto de entrada dos dados na arquitetura.
1.  O `MqttService` (`mqtt_service.py`) se conecta ao broker MQTT e se inscreve nos tópicos `devices/+/data` e `devices/+/hello`.
2.  **Mensagens `hello`**: Quando uma mensagem chega em `devices/{device_id}/hello`, o serviço atualiza um dicionário interno, registrando o timestamp em que o dispositivo foi visto pela última vez. Essa informação é usada para determinar quais dispositivos estão online.
3.  **Mensagens `data`**: Ao receber uma mensagem em `devices/{device_id}/data`, o `MqttService` aciona o callback `data_handler_callback` (definido em `main.py`).
4.  O `data_handler_callback` transforma o payload recebido:
    * Extrai o `device_id` do tópico.
    * Adiciona um `timestamp` Unix ao dado.
    * Monta uma nova mensagem JSON no formato:
        ```json
        {
          "device_id": "some-device-123",
          "payload": { "... dados originais do sensor ... " },
          "timestamp": 1678886400
        }
        ```
5.  Por fim, o `KafkaService` (`kafka_service.py`) é chamado para publicar essa nova mensagem JSON no tópico `iot-data` do Redpanda/Kafka. **Crucialmente, ele usa o `device_id` como chave da mensagem**. Isso garante que todas as mensagens de um mesmo dispositivo sejam enviadas para a mesma partição do tópico, mantendo a ordem de processamento por dispositivo.

#### Etapa 3: Consumo e Armazenamento (Kafka para Redis)
* **Serviço:** `kafka-redis-consumer` (definido no `docker-compose.yml`).
* **Lógica Principal:** `consumer.py`.

Este serviço é responsável por persistir os dados para acesso rápido.
1.  O `KafkaRedisConsumer` (`consumer.py`) se conecta ao Redpanda/Kafka e se inscreve como consumidor do tópico `iot-data`.
2.  Ele lê mensagens de forma contínua, agrupando-as em lotes (`batch`) para otimizar a escrita no banco de dados. Um lote é processado quando atinge um tamanho pré-definido ou um intervalo de tempo se esgota.
3.  Quando um lote é processado, o serviço itera sobre cada mensagem e executa três operações no Redis para cada dispositivo usando um `pipeline` para máxima eficiência:
    * **Atualização do Último Estado (`HSET`)**: Armazena a informação mais recente do dispositivo em uma estrutura de **Hash**. Isso permite acesso O(1) ao último estado conhecido.
        * **Chave:** `device:last_state:{device_id}`
        * **Valor:** Um hash contendo o `payload` e o `timestamp`.
    * **Manutenção do Histórico (`ZADD` e `ZREMRANGEBYSCORE`)**: Adiciona a mensagem completa a um **Sorted Set**, usando o `timestamp` como *score*. Isso mantém um histórico ordenado por tempo.
        * **Chave:** `device:history:{device_id}`
        * **Score:** O `timestamp` da mensagem.
        * **Valor:** A mensagem JSON completa.
        * Após a inserção, o serviço remove do Sorted Set quaisquer registros mais antigos que 5 horas, garantindo que o histórico não cresça indefinidamente.
    * **Notificação em Tempo Real (`PUBLISH`)**: Publica a mensagem completa em um canal de **Pub/Sub** do Redis.
        * **Canal:** `device-updates:{device_id}`
        * Isso permite que qualquer outro serviço (como um dashboard em tempo real) ouça as atualizações de um dispositivo específico sem precisar consultar o banco de dados.
4.  Apenas após o lote ser escrito com sucesso no Redis, o consumidor realiza o `commit` dos *offsets* no Kafka, garantindo que as mensagens não sejam perdidas em caso de falha.

#### Etapa 4: API de Gerenciamento e Controle
* **Serviço:** Também hospedado pelo `mqtt-kafka-bridge`.
* **Lógica Principal:** `api.py`.

Paralelamente à ingestão de dados, a bridge expõe uma API RESTful:
* `GET /devices`: Retorna uma lista dos `device_id` que enviaram uma mensagem `hello` recentemente, indicando que estão online. A lógica de timeout para considerar um dispositivo offline está em `settings.py` (`DEVICE_OFFLINE_TIMEOUT`).
* `POST /devices/{device_id}/command`: Permite enviar um comando (ex: `{ "command": "start" }`) para um dispositivo específico.
    * A API verifica primeiro se o dispositivo está na lista de dispositivos online.
    * Se estiver online, ela usa o método `send_command` do `MqttService` para publicar o comando no tópico MQTT `devices/{device_id}/commands`, que o dispositivo deve estar escutando.

---

### 3. Detalhes dos Componentes

| Componente | Imagem Docker | Propósito | Tecnologias Chave |
| :--- | :--- | :--- | :--- |
| **Redpanda** | `redpandadata/redpanda` | Broker de mensageria de alta performance, compatível com a API Kafka. Atua como um buffer durável entre os serviços. | Kafka Protocol |
| **Redis** | `redis:alpine` | Banco de dados em memória usado para armazenamento de estado rápido e cache de histórico recente. | Redis (Hashes, Sorted Sets, Pub/Sub) |
| **mqtt-kafka-bridge** | Construído a partir de `./python-bridge` | Serviço customizado que consome de MQTT, enriquece os dados, publica no Kafka e expõe uma API de controle. | Python, Paho-MQTT, FastAPI, Confluent-Kafka |
| **kafka-redis-consumer**| Construído a partir de `./kafka-redis-consumer` | Serviço customizado que consome do Kafka e persiste os dados de forma estruturada no Redis. | Python, kafka-python, Redis-py |
| **Redpanda Console** | `redpandadata/console` | Interface gráfica para visualizar tópicos, mensagens e o estado do cluster Kafka/Redpanda. | - |
| **Redis Commander** | `rediscommander/redis-commander` | Interface gráfica para explorar os dados armazenados no Redis. | - |
