#!/bin/bash

# Script para probar el token de un usuario en Supabase local
# Uso: ./scripts/test-token.sh boanegro4@yopmail.com

EMAIL="${1:-boanegro4@yopmail.com}"
SUPABASE_URL="http://127.0.0.1:54321"
ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

echo "🔐 Probando autenticación para: $EMAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Solicitar contraseña
read -sp "Ingresa la contraseña para $EMAIL: " PASSWORD
echo ""

# Intentar hacer login
echo "📡 Intentando autenticación..."
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Verificar si fue exitoso
if echo "$RESPONSE" | grep -q "access_token"; then
  TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  echo "✅ Autenticación exitosa!"
  echo ""
  echo "🔑 Token generado:"
  echo "$TOKEN" | head -c 50
  echo "..."
  echo ""
  echo "📋 Token completo (para usar en Authorization header):"
  echo "Bearer $TOKEN"
  echo ""
  echo "💡 Puedes usar este token en el frontend o en las peticiones al backend"
else
  echo "❌ Error en la autenticación:"
  echo "$RESPONSE" | grep -o '"message":"[^"]*' | cut -d'"' -f4 || echo "$RESPONSE"
fi

