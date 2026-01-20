#!/bin/bash

# 🤖 Test Script para Integración Telegram
# Uso: bash test-telegram.sh

set -e

echo "🤖 Test Suite - Integración Telegram"
echo "======================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
API_URL="${API_URL:-http://localhost:3000}"
TEST_USER_TOKEN="${TEST_USER_TOKEN:-test_token}"
TEST_CHAT_ID="${TEST_CHAT_ID:-123456789}"

echo -e "${BLUE}Configuración:${NC}"
echo "  API URL: $API_URL"
echo "  Chat ID: $TEST_CHAT_ID"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[1/5]${NC} Health Check..."
if curl -s "$API_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API respondiendo${NC}"
else
    echo -e "${YELLOW}⚠️ ${NC} API no responde en $API_URL (normal si no está corriendo)"
    echo "     Ejecuta: npm run dev"
fi
echo ""

# Test 2: Verificar archivos
echo -e "${YELLOW}[2/5]${NC} Verificar archivos..."
FILES=(
    "src/lib/telegram/client.ts"
    "src/lib/telegram/service.ts"
    "src/lib/telegram/templates.ts"
    "src/lib/notifications/multi-channel.ts"
    "src/app/api/telegram/webhook/route.ts"
    "src/app/api/telegram/link/route.ts"
    "src/app/api/telegram/status/route.ts"
    "supabase/migration-telegram-integration.sql"
)

missing_files=0
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file"
    else
        echo -e "  ${RED}❌${NC} $file (FALTA)"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los archivos existen${NC}"
else
    echo -e "${RED}❌ Faltan $missing_files archivos${NC}"
fi
echo ""

# Test 3: Verificar variables de entorno
echo -e "${YELLOW}[3/5]${NC} Verificar variables de entorno..."
if grep -q "TELEGRAM_BOT_TOKEN" .env.local 2>/dev/null; then
    echo -e "  ${GREEN}✅${NC} TELEGRAM_BOT_TOKEN configurado"
else
    echo -e "  ${RED}⚠️ ${NC} TELEGRAM_BOT_TOKEN no encontrado en .env.local"
    echo -e "     Agrega: ${BLUE}TELEGRAM_BOT_TOKEN=your_token_here${NC}"
fi
echo ""

# Test 4: Test de compilación TypeScript
echo -e "${YELLOW}[4/5]${NC} Compilación TypeScript..."
if [ -f "tsconfig.json" ]; then
    echo -e "  ${GREEN}✅${NC} tsconfig.json encontrado"
    # No ejecutamos la compilación real, solo verificamos que existe
else
    echo -e "  ${RED}❌${NC} tsconfig.json no encontrado"
fi
echo ""

# Test 5: Documentación
echo -e "${YELLOW}[5/5]${NC} Verificar documentación..."
DOCS=(
    "TELEGRAM-INTEGRATION-SETUP.md"
    "TELEGRAM-EXAMPLES.md"
    "TELEGRAM-ROADMAP.md"
    "TELEGRAM-VALIDATION-CHECKLIST.md"
    "TELEGRAM-SUMMARY.md"
    "TELEGRAM-ARCHITECTURE.md"
    "TELEGRAM-INDEX.md"
)

missing_docs=0
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "  ${GREEN}✅${NC} $doc"
    else
        echo -e "  ${RED}❌${NC} $doc (FALTA)"
        missing_docs=$((missing_docs + 1))
    fi
done

if [ $missing_docs -eq 0 ]; then
    echo -e "${GREEN}✅ Documentación completa${NC}"
else
    echo -e "${RED}❌ Faltan $missing_docs documentos${NC}"
fi
echo ""

# Resumen
echo "======================================"
echo -e "${GREEN}✅ Test Suite Completado${NC}"
echo ""
echo -e "${BLUE}Próximos pasos:${NC}"
echo "  1. Crear bot en BotFather (@BotFather /newbot)"
echo "  2. Agregar TELEGRAM_BOT_TOKEN a .env.local"
echo "  3. Ejecutar: npm run dev"
echo "  4. Ver: TELEGRAM-INTEGRATION-SETUP.md"
echo "  5. Validar: TELEGRAM-VALIDATION-CHECKLIST.md"
echo ""
