import redis
import json
import requests
import time
import math
from datetime import datetime
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, avg, max, min, stddev, count, when, window, corr
)
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, LongType
import os
from spark.spoilage_model import GrainSpoilagePredictor


# CONFIGURAÇÕES

REDIS_HOST = os.getenv("REDIS_HOST", "iot-kafka-pip.northcentralus.cloudapp.azure.com")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "1234")
API_URL = os.getenv("API_URL", "http://nest-api:3000/data-process")
SILO_CONF_URL = os.getenv("SILO_CONF_URL", "http://nest-api:3000/silos/conf")

# URL base para buscar dados do silo (ex: /silos/1)
SILO_API_URL = os.getenv("SILO_API_URL", "http://nest-api:3000/silos") 

DEVICE_TO_SILO = {
    "0C4EA065A598": 1,
    # "OUTRO_DEVICE_ID": 2,
}

#  Limites removidos daqui, serão buscados da API
PROCESS_INTERVAL = 300   # 5 minutos
CHECK_INTERVAL = 120     # 2 minutos


# FUNÇÃO MQ135 → CO2 (ppm)

def mq135_to_co2_ppm(rs, r0=1040):
    """
    Converte a resistência Rs (ohms) do MQ135 em CO2 (ppm aproximado).
    Curva empírica baseada em gráficos de datasheet e calibrações comuns.
    """
    if not rs or rs <= 0 or not r0 or r0 <= 0:
        return None
    try:
        ratio = rs / r0
        # Curva para CO₂ (aproximação logarítmica)
        a = -0.42
        b = 1.92
        ppm = math.pow(10, ((math.log10(ratio) - b) / a))
        return round(ppm, 2)
    except Exception:
        return None


# INICIALIZA SPARK

spark = SparkSession.builder \
    .appName("MultiSiloDataProcess-Service") \
    .getOrCreate()


# CONEXÃO REDIS

r = redis.StrictRedis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    decode_responses=True
)


# VERIFICA SE O SILO ESTÁ PRONTO

def wait_for_silo_ready(silo_id: int):
    """Aguarda até o silo estar configurado no NestJS."""
    while True:
        try:
            res = requests.get(f"{SILO_CONF_URL}/{silo_id}")
            if res.status_code == 200:
                if res.json() is True:
                    print(f" Silo #{silo_id} confirmado! Iniciando processamento...")
                    return
                else:
                    print(f" Silo #{silo_id} ainda não pronto. Tentando novamente em {CHECK_INTERVAL}s...")
            else:
                print(f" Erro ao verificar silo #{silo_id}: {res.status_code}")
        except Exception as e:
            print(f" Falha ao checar silo #{silo_id}: {repr(e)}")
        time.sleep(CHECK_INTERVAL)


# FUNÇÃO DE PROCESSAMENTO (COM CORRELAÇÃO E SPOILAGE RISK)

def process_device(device_key: str, silo_id: int, min_timestamp: int, silo_config: dict):
    
    # Helper para converter NaN, Inf e None para float
    
    def sanitize_float(value, default=0.0):
        """Converte None, NaN, ou Inf para um valor float padrão."""
        if value is None or math.isnan(value) or math.isinf(value):
            return default
        return float(value)
        
    try:
        raw_data = r.zrangebyscore(device_key, min_timestamp, "+inf")
        if not raw_data:
            print(f" Nenhum dado novo em {device_key}")
            return

        data = []
        for record_json in raw_data:
            record = json.loads(record_json)
            
            payload_data = record.get("payload", "{}")
            payload = {}
            
            if isinstance(payload_data, str):
                try:
                    payload = json.loads(payload_data)
                except json.JSONDecodeError:
                    print(f" Falha ao decodificar payload string: {payload_data}")
                    payload = {} 
            elif isinstance(payload_data, dict):
                payload = payload_data
            else:
                try:
                    payload = json.loads("{}")
                except:
                    payload = {}

            co2_ppm = mq135_to_co2_ppm(payload.get("mq_rs", 0))

            try:
                temp = float(payload.get("temperature"))
            except (ValueError, TypeError):
                temp = None
            
            try:
                hum = float(payload.get("humidity"))
            except (ValueError, TypeError):
                hum = None

            data.append({
                "device_id": record.get("device_id"),
                "timestamp": record.get("timestamp"),
                "temperature": temp,
                "humidity": hum,
                "co2_ppm": co2_ppm,
            })

        if not data:
            print(f"ℹ Nenhum dado válido para processar em {device_key} após o parse.")
            return

        schema = StructType([
            StructField("device_id", StringType(), True),
            StructField("timestamp", LongType(), True),
            StructField("temperature", DoubleType(), True),
            StructField("humidity", DoubleType(), True),
            StructField("co2_ppm", DoubleType(), True),
        ])

        df = spark.createDataFrame(data, schema)
        df = df.withColumn("timestamp", col("timestamp").cast("timestamp"))
        
        max_temp = silo_config.get("maxTemperature", 40.0)
        max_hum = silo_config.get("maxHumidity", 80.0)

        grouped = df.groupBy(
            window(col("timestamp"), "5 minutes")
        ).agg(
            # Médias, Max, Min, etc.
            avg("temperature").alias("averageTemperature"),
            avg("humidity").alias("averageHumidity"),
            avg("co2_ppm").alias("averageAirQuality"),
            max("temperature").alias("maxTemperature"),
            min("temperature").alias("minTemperature"),
            max("humidity").alias("maxHumidity"),
            min("humidity").alias("minHumidity"),
            stddev("temperature").alias("stdTemperature"),
            stddev("humidity").alias("stdHumidity"),
            stddev("co2_ppm").alias("stdAirQuality"),
            (count(when(col("temperature") > max_temp, True)) / count("*") * 100).alias("percentOverTempLimit"),
            (count(when(col("humidity") > max_hum, True)) / count("*") * 100).alias("percentOverHumLimit"),
            
            # Adicionando cálculos de correlação
            corr("temperature", "humidity").alias("corrTempHum"),
            corr("temperature", "co2_ppm").alias("corrTempAir"),
            corr("humidity", "co2_ppm").alias("corrHumAir")
        )

        for row in grouped.collect():
            period_start = row["window"].start
            period_end = row["window"].end
            
            percent_over_temp = sanitize_float(row["percentOverTempLimit"])
            percent_over_hum = sanitize_float(row["percentOverHumLimit"])
            std_air_quality = sanitize_float(row["stdAirQuality"])

            environmentScore = 100 - (
                (percent_over_temp) * 0.3 +
                (percent_over_hum) * 0.3 +
                (std_air_quality / 10) * 0.4 
            )
            
            # Coletando os valores de correlação
            # O sanitize_float é crucial aqui, pois corr() pode retornar NaN
            corr_temp_hum = sanitize_float(row["corrTempHum"])
            corr_temp_air = sanitize_float(row["corrTempAir"])
            corr_hum_air = sanitize_float(row["corrHumAir"])
            spoilage_risk_prob = None
            risk_category = None
            emoji = ""
            action = ""
            
            try:
                aggregated_data = {
                    'averageTemperature': sanitize_float(row["averageTemperature"]),
                    'averageHumidity': sanitize_float(row["averageHumidity"]),
                    'averageAirQuality': sanitize_float(row["averageAirQuality"]),
                    'stdTemperature': sanitize_float(row["stdTemperature"]),
                    'stdHumidity': sanitize_float(row["stdHumidity"]),
                    'percentOverTempLimit': percent_over_temp,
                    'percentOverHumLimit': percent_over_hum,
                }
                
                spoilage_risk_prob = spoilage_predictor.predict_spoilage_risk(aggregated_data)
                risk_category, emoji, action = spoilage_predictor.get_risk_category(spoilage_risk_prob)
                
            except Exception as e:
                print(f" Erro ao calcular spoilage risk para {device_key}: {repr(e)}")
                print(f"    → Continuando sem dados de spoilage (será ignorado)")
                spoilage_risk_prob = None
                risk_category = None
           

            # ====== CONSTRUIR DTO COM VALIDAÇÃO ======
            dto = {
                "siloId": silo_id,
                "periodStart": period_start.isoformat(),
                "periodEnd": period_end.isoformat(),
                "averageTemperature": sanitize_float(row["averageTemperature"]),
                "averageHumidity": sanitize_float(row["averageHumidity"]),
                "averageAirQuality": sanitize_float(row["averageAirQuality"]),
                "maxTemperature": sanitize_float(row["maxTemperature"]),
                "minTemperature": sanitize_float(row["minTemperature"]),
                "maxHumidity": sanitize_float(row["maxHumidity"]),
                "minHumidity": sanitize_float(row["minHumidity"]),
                "stdTemperature": sanitize_float(row["stdTemperature"]),
                "stdHumidity": sanitize_float(row["stdHumidity"]),
                "stdAirQuality": std_air_quality,
                "percentOverTempLimit": percent_over_temp,
                "percentOverHumLimit": percent_over_hum,
                "environmentScore": sanitize_float(environmentScore),
                "alertsCount": corr_temp_hum,
                "criticalAlertsCount": corr_temp_air,
            }
            
            # Adicionar spoilage APENAS se calculado com sucesso
            if spoilage_risk_prob is not None and risk_category is not None:
                dto["spoilageRiskProbability"] = spoilage_risk_prob
                dto["spoilageRiskCategory"] = risk_category
            else:
                print(f" ℹSpoilage risk não será enviado para este período")
            # ========================================

            try:
                res = requests.post(API_URL, json=dto)
                
                if 200 <= res.status_code < 300:
                    print(f" [{device_key}] {period_start} → {period_end}")
                    print(f"   ├─ Status: {res.status_code} (Salvo!)")
                    if spoilage_risk_prob is not None:
                        print(f"   ├─ Spoilage Risk: {emoji} {risk_category} ({spoilage_risk_prob:.1%})")
                        print(f"   └─ Ação: {action}")
                    else:
                        print(f"   └─ (sem dados de spoilage)")
                else:
                    print(f" [{device_key}] API Rejeitou {period_start} → {period_end} | {res.status_code}")
                    try:
                        print(f"   └── Motivo: {res.json()}") 
                    except:
                        print(f"   └── Motivo: {res.text}")
                        
            except Exception as e:
                print(f" Falha ao ENVIAR dados do {device_key}: {repr(e)}")

    except Exception as e:
        print(f" Erro processando {device_key}: {repr(e)}")


# LOOP PRINCIPAL

print(" Serviço Spark iniciado (modo contínuo de 5 minutos).")

# Inicializar preditor FORA do loop
spoilage_predictor = GrainSpoilagePredictor()

# Espera até o silo existir
for silo_id in DEVICE_TO_SILO.values():
    wait_for_silo_ready(silo_id)

last_run = int(time.time()) - PROCESS_INTERVAL

while True:
    start_time = datetime.utcnow()
    print(f"\n[{start_time}] Iniciando ciclo de processamento...")

    device_keys = r.keys("device:history:*")
    for device_key in device_keys:
        device_id = device_key.split(":")[-1]
        silo_id = DEVICE_TO_SILO.get(device_id)
        if not silo_id:
            print(f" {device_id} não mapeado para silo, ignorando...")
            continue
            
        # Buscar a configuração do silo
        silo_config = {}
        try:
            res = requests.get(f"{SILO_API_URL}/{silo_id}")
            if res.status_code == 200:
                silo_config = res.json()
                print(f"ℹ Configuração carregada para Silo #{silo_id} (Temp Max: {silo_config.get('maxTemperature')})")
            else:
                print(f" Falha ao buscar config do silo #{silo_id} ({res.status_code}), usando padrões.")
        except Exception as e:
            print(f" Erro ao buscar config do silo #{silo_id}: {repr(e)}, usando padrões.")
            
        # Processar dispositivo com configuração do silo
        process_device(device_key, silo_id, last_run, silo_config)

    last_run = int(time.time())
    print("Ciclo concluído. Próximo em 5 minutos...")
    print(" [keep-alive] Serviço ativo e aguardando novo ciclo.")
    time.sleep(PROCESS_INTERVAL)
