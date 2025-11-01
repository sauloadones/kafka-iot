import logging
import time
from typing import Dict
import paho.mqtt.client as mqtt
from app import settings

class MqttService:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self._data_callback = None
        # Dicionário para rastrear dispositivos e quando foram vistos pela última vez
        self.online_devices: Dict[str, float] = {}

    def register_data_callback(self, callback):
        logging.info("Callback para tratamento de dados MQTT registrado.")
        self._data_callback = callback

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logging.info(f"Conectado ao MQTT Broker em '{settings.MQTT_BROKER}' com sucesso!")
            # Inscreve-se nos tópicos de dados e de 'hello'
            client.subscribe([(settings.MQTT_DATA_TOPIC, 0), (settings.MQTT_HELLO_TOPIC, 0)])
            logging.info(f"Inscrito nos tópicos: '{settings.MQTT_DATA_TOPIC}' e '{settings.MQTT_HELLO_TOPIC}'")
        else:
            logging.error(f"Falha na conexão com MQTT, código de retorno: {rc}")

    def _on_message(self, client, userdata, msg):
        try:
            topic_parts = msg.topic.split('/')
            if len(topic_parts) < 2:
                return

            device_id = topic_parts[1]
            topic_type = topic_parts[2] if len(topic_parts) > 2 else ""

            # [cite_start]Se a mensagem for no tópico 'hello', atualizamos o status do dispositivo [cite: 28]
            if topic_type == 'hello':
                self.online_devices[device_id] = time.time()
                logging.info(f"Dispositivo '{device_id}' está online. Total online: {len(self.get_online_devices())}")

            # [cite_start]Se for no tópico de 'data', processamos os dados [cite: 30]
            elif topic_type == 'data':
                payload = msg.payload.decode()
                logging.info(f"Mensagem de dados recebida de '{device_id}': {payload}")
                if self._data_callback:
                    self._data_callback(device_id, payload)
        
        except Exception as e:
            logging.error(f"Erro ao processar mensagem MQTT: {e}")
    
    def get_online_devices(self) -> Dict[str, float]:
        """Retorna uma lista de IDs de dispositivos considerados online."""
        now = time.time()
        # Filtra apenas os dispositivos que deram sinal de vida recentemente
        active_devices = {
            dev_id: last_seen for dev_id, last_seen in self.online_devices.items()
            if (now - last_seen) < settings.DEVICE_OFFLINE_TIMEOUT
        }
        self.online_devices = active_devices # Limpa a lista de dispositivos antigos
        return active_devices

    def connect(self):
        logging.info(f"Conectando ao MQTT Broker {settings.MQTT_BROKER}:{settings.MQTT_PORT}...")
        self.client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, settings.MQTT_KEEPALIVE)

    def start_background_loop(self):
        """Inicia o loop em uma thread de fundo (não bloqueante)."""
        logging.info("Iniciando o loop de escuta MQTT em segundo plano.")
        self.client.loop_start()

    def send_command(self, device_id: str, command: str):
        # A lógica de envio de comando permanece a mesma
        command_topic = f"devices/{device_id}/commands"
        result = self.client.publish(command_topic, command)
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logging.info(f"Comando '{command}' enviado com sucesso para o tópico '{command_topic}'.")
            return True
        else:
            logging.error(f"Falha ao enviar comando para o tópico '{command_topic}'. Código: {result.rc}")
            return False