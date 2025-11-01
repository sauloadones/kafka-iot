import paho.mqtt.client as mqtt
from kafka import KafkaProducer
import json
import time
import threading
import queue
import logging

# =========================
# Logging
# =========================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# =========================
# Configurações
# =========================
MQTT_BROKER = "IP_DO_SERVIDOR"  # broker público da placa
MQTT_PORT = 1883
KAFKA_BROKER = "localhost:9092"
KAFKA_TOPIC = "iot-data"

# Buffer para mensagens que não puderam ser enviadas ao Kafka
kafka_queue = queue.Queue(maxsize=1000)

# =========================
# Serviço MQTT (somente dados)
# =========================
class MQTTDataBridge:
    def __init__(self, broker, port, keepalive=60):
        self.broker = broker
        self.port = port
        self.keepalive = keepalive
        self.client = mqtt.Client()
        self.on_data_callback = None

        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

    def register_callback(self, on_data):
        """Registra a função que será chamada com dados recebidos."""
        self.on_data_callback = on_data

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logging.info("Conectado ao MQTT Broker com sucesso!")
            client.subscribe("devices/+/data")  # só tópicos de dados
        else:
            logging.error(f"Falha na conexão MQTT, rc={rc}")

    def on_message(self, client, userdata, msg):
        device_id = msg.topic.split('/')[1]
        payload = msg.payload.decode()
        logging.info(f"Mensagem recebida do dispositivo {device_id}: {payload}")
        if self.on_data_callback:
            self.on_data_callback(device_id, payload)

    def connect(self):
        while True:
            try:
                logging.info(f"Conectando ao MQTT Broker {self.broker}:{self.port}...")
                self.client.connect(self.broker, self.port, self.keepalive)
                break
            except Exception as e:
                logging.error(f"Erro ao conectar ao MQTT: {e}. Tentando novamente em 5s...")
                time.sleep(5)

    def start(self):
        self.client.loop_start()
        logging.info("Loop MQTT iniciado.")

# =========================
# Serviço Kafka (somente envio de dados)
# =========================
class KafkaDataBridge:
    def __init__(self, broker, topic):
        self.broker = broker
        self.topic = topic
        self.producer = None
        self.connect()

    def connect(self):
        while True:
            try:
                self.producer = KafkaProducer(
                    bootstrap_servers=[self.broker],
                    value_serializer=lambda v: json.dumps(v).encode('utf-8')
                )
                logging.info("Conectado ao Kafka com sucesso!")
                break
            except Exception as e:
                logging.error(f"Erro ao conectar ao Kafka: {e}. Tentando novamente em 5s...")
                time.sleep(5)

    def send(self, data):
        try:
            self.producer.send(self.topic, data)
            self.producer.flush()
            logging.info(f"Dado enviado para Kafka: {data}")
        except Exception as e:
            logging.error(f"Erro ao enviar para Kafka, adicionando ao buffer: {e}")
            kafka_queue.put(data)

    def retry_buffered_messages(self):
        while True:
            if not kafka_queue.empty():
                data = kafka_queue.get()
                self.send(data)
            time.sleep(1)

# =========================
# Callback de dados
# =========================
def mqtt_data_callback(device_id, payload):
    message = {
        "device_id": device_id,
        "payload": payload,
        "timestamp": int(time.time())
    }
    kafka_bridge.send(message)

# =========================
# Inicialização
# =========================
mqtt_bridge = MQTTDataBridge(MQTT_BROKER, MQTT_PORT)
kafka_bridge = KafkaDataBridge(KAFKA_BROKER, KAFKA_TOPIC)

mqtt_bridge.register_callback(on_data=mqtt_data_callback)
threading.Thread(target=kafka_bridge.retry_buffered_messages, daemon=True).start()

mqtt_bridge.connect()
mqtt_bridge.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    logging.info("Serviço encerrado.")
    mqtt_bridge.client.loop_stop()
