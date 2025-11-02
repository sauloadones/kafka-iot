FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /app/app

# Expõe a porta que a API irá usar
EXPOSE 8000

# O comando agora inicia o servidor Uvicorn
CMD ["python", "-m", "app.main"]

