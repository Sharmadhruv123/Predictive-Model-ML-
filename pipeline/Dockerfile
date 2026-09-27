FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev gcc

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV DAGSTER_HOME=/app/dagster_home
RUN mkdir -p $DAGSTER_HOME
COPY dagster.yaml $DAGSTER_HOME/dagster.yaml

# Expose webserver port
EXPOSE 3000
