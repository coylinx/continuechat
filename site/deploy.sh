#!/usr/bin/env bash
# Publish site/www to continuechat.coylin.com (nginx on the "sg" SSH host). The extension itself ships via the Chrome Web Store.
# Run from anywhere: bash site/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

HOST=${HOST:-sg}
DEST=/var/www/continuechat.coylin.com

rsync -az --delete site/www/ "$HOST:/tmp/continuechat-site/"
ssh "$HOST" "sudo rsync -a --delete --chown=root:root --chmod=D755,F644 /tmp/continuechat-site/ $DEST/ && rm -rf /tmp/continuechat-site"
echo "deployed → https://continuechat.coylin.com/"
