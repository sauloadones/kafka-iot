import logging
import threading
import uvicorn
import json
import time

from app import settings
from app.services.mqtt_service import MqttService
from app.services.kafka_service import KafkaService
from app.api import create_api

# --- Inicialização dos Serviços ---
mqtt_service = MqttService()
kafka_service = KafkaService()
app = create_api(mqtt_service=mqtt_service) # Cria a API injetando o serviço MQTT

# --- Lógica de Negócio (Callbacks) ---
def data_handler_callback(device_id: str, payload: str):
    """
    Callback que formata a mensagem e a entrega ao KafkaService.
    """
    try:
        data_dict = json.loads(payload)
        message = {
            "device_id": device_id,
            "payload": data_dict,
            "timestamp": int(time.time())
        }
        # Passa o device_id como 'key' e a mensagem como 'value' para o kafka criar reparticoes por id de placa
        kafka_service.send_data(key=device_id, value=message)

    except Exception as e:
        logging.error(f"Erro ao processar dados de '{device_id}': {e}")

# --- Ponto de Entrada da Aplicação ---
def main():
    # 1. Registra o callback de dados no serviço MQTT
    mqtt_service.register_data_callback(data_handler_callback)
    
    # 2. Conecta ao MQTT
    mqtt_service.connect()
    
    # 3. Inicia o loop do MQTT em segundo plano (NÃO bloqueia a execução)
    mqtt_service.start_background_loop()
    
    # 5. Inicia o servidor da API (Uvicorn)
    logging.info(f"Iniciando API na porta {settings.API_PORT}")
    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT,
        forwarded_allow_ips='*',  # Allow proxy headers from all sources
        proxy_headers=True        # Use proxy headers
    )

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.info("Serviço encerrado pelo usuário.")