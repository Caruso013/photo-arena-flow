#!/bin/bash

# Script para baixar modelos do face-api.js
# Os modelos são necessários para o reconhecimento facial funcionar

echo "📦 Baixando modelos de reconhecimento facial..."

cd public/models

# URLs dos modelos
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

# Lista de modelos necessários
models=(
  "tiny_face_detector_model-weights_manifest.json"
  "tiny_face_detector_model-shard1"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model-shard1"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model-shard1"
  "face_recognition_model-shard2"
  "face_expression_model-weights_manifest.json"
  "face_expression_model-shard1"
)

# Baixar cada modelo
for model in "${models[@]}"; do
  if [ ! -f "$model" ]; then
    echo "⬇️  Baixando $model..."
    curl -L -O "$BASE_URL/$model"
  else
    echo "✅ $model já existe"
  fi
done

echo "✅ Todos os modelos foram baixados!"
echo "📁 Modelos salvos em: public/models/"
