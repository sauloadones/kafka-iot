from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.services.mqtt_service import MqttService

class CommandPayload(BaseModel):
    command: str

def create_api(mqtt_service: MqttService) -> FastAPI:
    """Cria e configura a aplicação FastAPI, injetando o serviço MQTT."""
    
    app = FastAPI(
        title="IoT Bridge API",
        description="API para monitorar e controlar dispositivos IoT."
    )

    @app.get("/devices", tags=["Devices"])
    def list_online_devices():
        """
        Retorna uma lista de todos os dispositivos que estão atualmente online
        e o timestamp da última vez que foram vistos.
        """
        online_devices = mqtt_service.get_online_devices()
        return {
            "online_count": len(online_devices),
            "devices": online_devices
        }

    @app.post("/devices/{device_id}/command", tags=["Commands"])
    def send_device_command(device_id: str, payload: CommandPayload):
        """
        Envia um comando (ex: 'start' ou 'stop') para um dispositivo específico.
        """
        online_devices = mqtt_service.get_online_devices()
        if device_id not in online_devices:
            raise HTTPException(
                status_code=404, 
                detail=f"Dispositivo '{device_id}' não encontrado ou está offline."
            )
        
        success = mqtt_service.send_command(device_id, payload.command)

        if not success:
            raise HTTPException(
                status_code=500,
                detail=f"Falha ao enviar comando MQTT para o dispositivo '{device_id}'."
            )

        return {
            "status": "success",
            "device_id": device_id,
            "command_sent": payload.command
        }
        
    return app