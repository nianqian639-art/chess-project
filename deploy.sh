#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Chesstong Production Deploy Script
# Usage: ./deploy.sh [--skip-build] [--skip-cert] [--domain chesstong.com]
# ─────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${DOMAIN:-chesstong.com}"
EMAIL="${EMAIL:-admin@chesstong.com}"
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
NGINX_BACKUP_CONF="$NGINX_DIR/chesstong.com.conf.deploy-backup"

restore_nginx_config() {
    if [ -f "$NGINX_BACKUP_CONF" ]; then
        mv "$NGINX_BACKUP_CONF" "$PROD_NGINX_CONF"
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
    cp "$PROD_NGINX_CONF" "$NGINX_BACKUP_CONF"
    sed "s/chesstong.com/$DOMAIN/g" "$HTTP_ONLY_NGINX_CONF" > "$PROD_NGINX_CONF"
fi
docker compose -f docker-compose.prod.yml up -d backend engine ollama nginx
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

    mv "$NGINX_BACKUP_CONF" "$PROD_NGINX_CONF"
    trap - EXIT

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
echo "   1. If using Ollama, pull the model:"
echo "      docker exec chesstong-ollama ollama pull qwen3:8b"
echo ""
echo "   2. Check logs:"
echo "      docker compose -f $INFRA_DIR/docker-compose.prod.yml logs -f"
echo ""
echo "   3. Visit: https://$DOMAIN/health"
echo "============================================"
