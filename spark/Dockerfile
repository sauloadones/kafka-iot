# ===============================
# Base Spark com PySpark (manual)
# ===============================
FROM python:3.11-slim

# Desativa prompts interativos e força UTF-8
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC
ENV LANG=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
    default-jdk \
    wget \
    tar \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Instala o Spark manualmente
ENV SPARK_VERSION=3.5.0
RUN wget https://archive.apache.org/dist/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop3.tgz \
    && tar -xzf spark-${SPARK_VERSION}-bin-hadoop3.tgz -C /opt \
    && mv /opt/spark-${SPARK_VERSION}-bin-hadoop3 /opt/spark \
    && rm spark-${SPARK_VERSION}-bin-hadoop3.tgz

# Configura variáveis de ambiente do Spark
ENV SPARK_HOME=/opt/spark
ENV PATH="${SPARK_HOME}/bin:${PATH}"
ENV PYSPARK_PYTHON=python3
ENV PYTHONUNBUFFERED=1

# Cria pasta de trabalho
WORKDIR /opt/spark-apps

# Copia dependências Python e instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o script principal
# Copia o script principal E o modelo
COPY spark_data_process_service.py .
COPY spoilage_model.py .


# Variáveis padrão
ENV REDIS_HOST=localhost
ENV REDIS_PORT=6379
ENV REDIS_PASSWORD=1234
ENV API_URL=https://nest:3000/data-process

# Comando padrão
CMD ["spark-submit", "spark_data_process_service.py"]
