import os
import logging

# Configuração do Logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Configurações MQTT
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_KEEPALIVE = 60
MQTT_DATA_TOPIC = "devices/+/data" 
MQTT_HELLO_TOPIC = "devices/+/hello" 

# Configurações Kafka
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_TOPIC_DATA = os.getenv("KAFKA_TOPIC", "iot-data")


# Configurações da API
API_HOST = "0.0.0.0"
API_PORT = 8000
DEVICE_OFFLINE_TIMEOUT = MQTT_KEEPALIVE * 2.5 # Tempo em segundos para considerar um dispositivo offline