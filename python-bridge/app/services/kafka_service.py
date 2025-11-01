
import logging
import os
import json
from confluent_kafka import Producer 
from app import settings

class KafkaService:
    def __init__(self):
        producer_config = {
            "bootstrap.servers": settings.KAFKA_BROKER
        }

        self.producer = Producer(producer_config)
        
        logging.info("Produtor JSON para Kafka conectado com sucesso!")

    def send_data(self, key, value):
        """Envia uma mensagem para o Kafka como JSON."""
        try:
            # Serializa o dicionário 'value' para uma string JSON e a codifica para bytes
            json_value = json.dumps(value).encode('utf-8')
            # Codifica a chave (que é uma string) para bytes
            encoded_key = key.encode('utf-8')

            self.producer.produce(topic=settings.KAFKA_TOPIC_DATA, key=encoded_key, value=json_value)
            self.producer.flush(10)
            logging.info(f"Dado JSON enviado para o tópico '{settings.KAFKA_TOPIC_DATA}' com Chave='{key}': {value}")
        except Exception as e:
            logging.error(f"Erro ao enviar mensagem JSON para o Kafka: {e}")