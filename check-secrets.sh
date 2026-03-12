#!/usr/bin/env bash
# check-secrets.sh — Prueft Workflow-Dateien auf versehentlich committete Secrets
# Verwendung: bash check-secrets.sh [--strict]
#
# Credential-IDs (z.B. "id: 'FVE8T8mYCgIRpSyv'") sind OKAY — das sind n8n-interne
# Referenzen, keine echten Secrets. Dieses Script sucht nach ECHTEN Credentials.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

WORKFLOW_DIR="workflows"
FOUND=0

# Patterns die auf echte Secrets hindeuten
PATTERNS=(
    'password\s*[:=]'
    'api_key\s*[:=]'
    'apiKey\s*[:=]\s*["\x27][A-Za-z0-9]'
    'secret\s*[:=]\s*["\x27][A-Za-z0-9]'
    'token\s*[:=]\s*["\x27][A-Za-z0-9]'
    'Bearer [A-Za-z0-9\-._~+/]+'
    'sk-[A-Za-z0-9]{20,}'
    'AIza[A-Za-z0-9\-_]{35}'
    'ghp_[A-Za-z0-9]{36}'
    'AKIA[A-Z0-9]{16}'
)

# Erlaubte Patterns (false positives)
ALLOWED=(
    'googlePalmApi'      # n8n credential type name
    'telegramApi'        # n8n credential type name
    'credentials:'       # n8nac credential reference block
    'description'        # Tool descriptions mentioning "token" etc.
)

echo -e "${YELLOW}Secret-Check fuer n8n-autopilot${NC}"
echo "================================="
echo ""

for pattern in "${PATTERNS[@]}"; do
    while IFS= read -r match; do
        [ -z "$match" ] && continue

        # Pruefen ob es ein erlaubtes Pattern ist
        skip=false
        for allowed in "${ALLOWED[@]}"; do
            if echo "$match" | grep -qi "$allowed"; then
                skip=true
                break
            fi
        done

        if [ "$skip" = false ]; then
            echo -e "${RED}WARNUNG:${NC} $match"
            FOUND=$((FOUND + 1))
        fi
    done < <(grep -rniE "$pattern" "$WORKFLOW_DIR" 2>/dev/null || true)
done

# Auch .env und credentials.json pruefen
for danger_file in .env .env.local .env.production credentials.json; do
    if [ -f "$danger_file" ]; then
        if git ls-files --error-unmatch "$danger_file" > /dev/null 2>&1; then
            echo -e "${RED}WARNUNG: $danger_file ist im Git-Index!${NC}"
            FOUND=$((FOUND + 1))
        fi
    fi
done

echo ""
if [ "$FOUND" -eq 0 ]; then
    echo -e "${GREEN}Keine Secrets gefunden. Alles sauber.${NC}"
    exit 0
else
    echo -e "${RED}$FOUND potenzielle(s) Secret(s) gefunden!${NC}"
    echo "Bitte pruefen und ggf. aus den Dateien entfernen."
    if [ "${1:-}" = "--strict" ]; then
        exit 1
    fi
    exit 0
fi
