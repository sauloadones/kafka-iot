import json
import os
import time
from kafka import KafkaConsumer, TopicPartition
from kafka.errors import KafkaError
import redis
import logging

# --- Configuração do Logging ---
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

class KafkaRedisConsumer:
    def __init__(self, batch_size=10, flush_interval=5):
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.batches = {}  # Dicionário para lotes por partição
        self.last_flush_time = time.time()
        
        # --- Configurações ---
        self.kafka_broker = os.getenv('KAFKA_BROKER', 'redpanda:29092')
        self.kafka_topic = os.getenv('KAFKA_TOPIC', 'iot-data')
        self.redis_host = os.getenv('REDIS_HOST', 'redis')
        
        self.consumer = None
        self.redis_client = None
        self.logger = logging.getLogger(__name__)
        self.logger.info("Consumidor Kafka-Redis inicializado.")

    def _connect_redis(self):
        """Conecta ao Redis com retentativas."""
        while True:
            try:
                client = redis.Redis(host=self.redis_host, port=6379,  password="1234", db=0, decode_responses=True)
                client.ping()
                self.logger.info("Conectado ao Redis com sucesso!")
                return client
            except redis.exceptions.ConnectionError as e:
                self.logger.error(f"Erro ao conectar ao Redis: {e}. Tentando novamente em 5s...")
                time.sleep(5)

    def _connect_kafka(self):
        """Conecta ao Kafka com retentativas."""
        while True:
            try:
                consumer = KafkaConsumer(
                    self.kafka_topic,
                    bootstrap_servers=[self.kafka_broker],
                    auto_offset_reset='latest',
                    enable_auto_commit=False, 
                    group_id='kafka-redis-consumer-group',
                    consumer_timeout_ms=1000 # Evita que o loop fique bloqueado
                )
                self.logger.info("Conectado ao Kafka com sucesso!")
                return consumer
            except Exception as e:
                self.logger.error(f"Erro ao conectar ao Kafka: {e}. Tentando novamente em 5s...")
                time.sleep(5)

    def _process_batch(self):
        """Processa os lotes usando Sorted Sets e limpa dados antigos."""
        if not self.batches:
            return

        total_messages = 0
        # Timestamp de 5 horas atrás para o comando de limpeza
        five_hours_ago_ts = int(time.time()) - (5 * 3600)

        try:
            pipe = self.redis_client.pipeline()
            
            processed_devices = set() # Para saber quais históricos limpar

            for partition, batch_list in self.batches.items():
                for item in batch_list:
                    message_value = item['value']
                    device_id = message_value.get('device_id', 'unknown')
                    payload = message_value.get('payload', {})
                    timestamp = message_value.get('timestamp', int(time.time()))
                    json_message = json.dumps(message_value)
                    
                    if device_id and device_id != 'unknown':
                        processed_devices.add(device_id)
                        
                    pipe.zadd(f"device:history:{device_id}", {json.dumps(message_value): float(timestamp)})
                    pipe.hset(f"device:last_state:{device_id}", mapping={
                        "payload": json.dumps(payload),
                        "timestamp": timestamp
                    })
                    pipe.publish(f"device-updates:{device_id}", json_message)
                   
                
                total_messages += len(batch_list)

            for device_id in processed_devices:
                # Remove todos os membros com score (timestamp) menor que 5 horas atrás
                pipe.zremrangebyscore(f"device:history:{device_id}", '-inf', five_hours_ago_ts)
            pipe.execute()
            self.logger.info(f"Lote de {total_messages} mensagens salvo")

            self.consumer.commit()
            self.logger.info(f"Offsets comitados no Kafka com sucesso.")

            self.batches.clear()

        except redis.exceptions.ConnectionError as e:
            self.logger.error(f"Conexão com Redis perdida: {e}. Tentando reconectar...")
            self.redis_client = self._connect_redis()
        except Exception as e:
            self.logger.error(f"Erro ao processar lote: {repr(e)}. As mensagens serão reprocessadas.")


    def run(self):
        self.redis_client = self._connect_redis()
        self.consumer = self._connect_kafka()
        
        while True:
            try:
                for message in self.consumer:
                    try:
                        deserialized_value = json.loads(message.value.decode('utf-8'))
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        self.logger.warning(f"Mensagem inválida no offset {message.offset}. Pulando.")
                        self.consumer.commit({TopicPartition(self.kafka_topic, message.partition): message.offset + 1})
                        continue

                    if message.partition not in self.batches:
                        self.batches[message.partition] = []
                    self.batches[message.partition].append({
                        "value": deserialized_value,
                        "offset": message.offset
                    })

                total_pending = sum(len(b) for b in self.batches.values())
                time_since_flush = time.time() - self.last_flush_time

                if total_pending >= self.batch_size or (total_pending > 0 and time_since_flush >= self.flush_interval):
                    self._process_batch()
                    self.last_flush_time = time.time()
            
            except Exception as e:
                self.logger.error(f"Erro inesperado no laço principal: {e}. O consumidor continuará.")
                time.sleep(5)

if __name__ == "__main__":
    logging.info("Iniciando o conector Kafka-Redis...")
    time.sleep(15)
    connector = KafkaRedisConsumer()
    connector.run()