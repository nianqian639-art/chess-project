#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Chesstong Production Deploy Script
# Usage: ./deploy.sh [--skip-build] [--skip-cert] [--domain chesstong.top]
# ─────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${DOMAIN:-chesstong.top}"
EMAIL="${EMAIL:-admin@chesstong.top}"
SKIP_BUILD=false
SKIP_CERT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-build) SKIP_BUILD=true; shift ;;
        --skip-cert)  SKIP_CERT=true; shift ;;
        --domain)     DOMAIN="$2"; shift 2 ;;
        --email)      EMAIL="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
INFRA_DIR="$PROJECT_ROOT/infra/docker"
NGINX_DIR="$PROJECT_ROOT/infra/nginx"
PROD_NGINX_CONF="$NGINX_DIR/chesstong.com.conf"
HTTP_ONLY_NGINX_CONF="$NGINX_DIR/chesstong.com.http-only.conf"
NGINX_BACKUP_CONF=""

require_command() {
    command -v "$1" >/dev/null 2>&1 || {
        echo "Missing required command: $1" >&2
        exit 1
    }
}

require_command docker
require_command curl

if [ ! -f "$BACKEND_DIR/.env.production" ]; then
    echo "Missing $BACKEND_DIR/.env.production" >&2
    exit 1
fi

if ! grep -Eq '^(QWEN_API_KEY|DASHSCOPE_API_KEY)=.+$' "$BACKEND_DIR/.env.production"; then
    echo "Set QWEN_API_KEY or DASHSCOPE_API_KEY in $BACKEND_DIR/.env.production before deploying." >&2
    exit 1
fi

restore_nginx_config() {
    if [ -n "$NGINX_BACKUP_CONF" ] && [ -f "$NGINX_BACKUP_CONF" ]; then
        cp "$NGINX_BACKUP_CONF" "$PROD_NGINX_CONF"
        rm -f "$NGINX_BACKUP_CONF"
        NGINX_BACKUP_CONF=""
    fi
}

trap restore_nginx_config EXIT

echo "============================================"
echo " Chesstong Deployment"
echo " Domain: $DOMAIN"
echo "============================================"

# ── Step 1: Build TypeScript ──────────────────────────
if [ "$SKIP_BUILD" = false ]; then
    echo ""
    echo "[1/5] Building TypeScript backend..."
    cd "$BACKEND_DIR"
    npm ci
    npm run build
    echo "  -> Build complete."
else
    echo ""
    echo "[1/5] Skipping TypeScript build (--skip-build)."
fi

# ── Step 2: Build Docker images ───────────────────────
echo ""
echo "[2/5] Building Docker images..."
cd "$INFRA_DIR"
docker compose -f docker-compose.prod.yml build --pull backend engine
echo "  -> Docker images built."

# ── Step 3: Start containers (without certbot) ────────
echo ""
echo "[3/5] Starting containers..."
if [ "$SKIP_CERT" = false ]; then
    NGINX_BACKUP_CONF="$(mktemp "${TMPDIR:-/tmp}/chesstong-nginx.XXXXXX")"
    cp "$PROD_NGINX_CONF" "$NGINX_BACKUP_CONF"
    sed "s/chesstong\.top/$DOMAIN/g" "$HTTP_ONLY_NGINX_CONF" > "$PROD_NGINX_CONF"
fi
docker compose -f docker-compose.prod.yml up -d backend engine nginx
echo "  -> Containers started."

# ── Step 4: Obtain SSL certificate ────────────────────
if [ "$SKIP_CERT" = false ]; then
    echo ""
    echo "[4/5] Obtaining SSL certificate via Certbot..."

    # Run certbot to obtain the certificate
    docker compose -f docker-compose.prod.yml run --rm \
        --entrypoint certbot \
        certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" -d "www.$DOMAIN"

    restore_nginx_config

    # Render the permanent HTTPS config for the same domain used by Certbot.
    NGINX_BACKUP_CONF="$(mktemp "${TMPDIR:-/tmp}/chesstong-nginx.XXXXXX")"
    cp "$PROD_NGINX_CONF" "$NGINX_BACKUP_CONF"
    sed "s/chesstong\.top/$DOMAIN/g" "$NGINX_BACKUP_CONF" > "$PROD_NGINX_CONF"
    rm -f "$NGINX_BACKUP_CONF"
    NGINX_BACKUP_CONF=""

    docker compose -f docker-compose.prod.yml restart nginx

    echo "  -> SSL certificate obtained and nginx restarted."
else
    echo ""
    echo "[4/5] Skipping SSL certificate (--skip-cert)."
fi

# ── Step 5: Verify ────────────────────────────────────
echo ""
echo "[5/5] Verifying deployment..."

sleep 3

# Check backend health
if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "  -> Backend health check: OK"
else
    echo "  -> Backend health check: FAILED (port 8080)"
fi

# Check nginx
if curl -sf http://localhost/health > /dev/null 2>&1; then
    echo "  -> Nginx proxy check: OK"
else
    echo "  -> Nginx proxy check: FAILED (port 80)"
fi

echo ""
echo "============================================"
echo " Deployment complete!"
echo ""
echo " Next steps:"
echo "   1. Check QWEN_API_KEY in $BACKEND_DIR/.env.production"
echo ""
echo "   2. Check logs:"
echo "      docker compose -f $INFRA_DIR/docker-compose.prod.yml logs -f"
echo ""
echo "   3. Visit: https://$DOMAIN/health"
echo "============================================"
