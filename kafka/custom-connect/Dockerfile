FROM confluentinc/cp-kafka-connect-base:7.5.0
USER root

RUN microdnf install -y curl unzip

# Instalar o Redis Sink Connector oficial
RUN confluent-hub install --no-prompt jcustenborder/kafka-connect-redis:0.0.5

USER appuser
