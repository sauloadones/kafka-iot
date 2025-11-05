# app.py (bridge) — versão enxuta e compatível com seu compose

import os, json, time, math, logging, queue, threading
import paho.mqtt.client as mqtt
from kafka import KafkaProducer

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')

# ===== Config por ENV (casa com o docker-compose) =====
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT   = int(os.getenv("MQTT_PORT", "1883"))
KAFKA_BROKER= os.getenv("KAFKA_BROKER", "redpanda:29092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "iot-data")
R0          = float(os.getenv("MQ135_R0", "5500"))

kafka_queue = queue.Queue(maxsize=1000)

def calculate_co2_ppm(rs, r0=R0):
    try:
        ratio = float(rs) / float(r0)
        return round(116.6020682 * math.pow(ratio, -2.7690348537), 2)
    except Exception as e:
        logging.exception("Erro no cálculo de CO2"); return None

class KafkaDataBridge:
    def __init__(self, broker, topic):
        self.topic = topic
        self.producer = None
        self.broker = broker
        self.connect()

    def connect(self):
        while True:
            try:
                self.producer = KafkaProducer(
                    bootstrap_servers=[self.broker],
                    value_serializer=lambda v: json.dumps(v, ensure_ascii=False).encode("utf-8"),
                    linger_ms=5,
                )
                logging.info(f"Kafka conectado em {self.broker}")
                break
            except Exception as e:
                logging.error(f"Kafka erro: {e}; retry 5s"); time.sleep(5)

    def send(self, key_bytes, data):
        try:
            self.producer.send(self.topic, key=key_bytes, value=data)
        except Exception as e:
            logging.error(f"Falha send → buffer: {e}"); 
            try: kafka_queue.put_nowait((key_bytes, data))
            except queue.Full: logging.error("Buffer Kafka cheio; descartando mensagem")

    def retry(self):
        while True:
            try:
                key_bytes, data = kafka_queue.get(timeout=1)
                self.send(key_bytes, data)
            except queue.Empty:
                pass

class MQTTDataBridge:
    def __init__(self, broker, port, keepalive=60):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.broker, self.port, self.keepalive = broker, port, keepalive

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logging.info("MQTT conectado"); client.subscribe("devices/+/data")
        else:
            logging.error(f"MQTT rc={rc}")

    def on_message(self, client, userdata, msg):
        device_id = msg.topic.split('/')[1]
        try:
            raw = json.loads(msg.payload.decode())
        except Exception:
            logging.error("Payload MQTT não é JSON; ignorando"); return

        # Calcula CO2 se tiver mq_rs
        if "mq_rs" in raw and raw["mq_rs"] is not None:
            raw["co2_ppm"] = calculate_co2_ppm(raw["mq_rs"])

        # Mensagem achatada (sem 'payload' aninhado)
        event = {
            "device_id": device_id,
            "timestamp": int(time.time()),
            **raw
        }

        kafka_bridge.send(device_id.encode(), event)
        logging.info(f"Enviado ao Kafka: {event}")

    def start(self):
        while True:
            try:
                logging.info(f"Conectando MQTT {self.broker}:{self.port}")
                self.client.connect(self.broker, self.port, self.keepalive)
                break
            except Exception as e:
                logging.error(f"MQTT erro: {e}; retry 5s"); time.sleep(5)
        self.client.loop_start()

# ===== Boot =====
kafka_bridge = KafkaDataBridge(KAFKA_BROKER, KAFKA_TOPIC)
threading.Thread(target=kafka_bridge.retry, daemon=True).start()

mqtt_bridge = MQTTDataBridge(MQTT_BROKER, MQTT_PORT)
mqtt_bridge.start()

try:
    while True: time.sleep(1)
except KeyboardInterrupt:
    pass
