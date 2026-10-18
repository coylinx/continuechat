#!/usr/bin/env bash
# Publish site/www plus the current release zip to continuechat.coylin.com (nginx on the "sg" SSH host).
# Run from anywhere: bash site/deploy.sh   (build the zip first with `npm run pack`)
set -euo pipefail
cd "$(dirname "$0")/.."

HOST=${HOST:-sg}
DEST=/var/www/continuechat.coylin.com
VERSION=$(node -p "require('./package.json').version")
ZIP=release/continuechat-v$VERSION.zip

[ -f "$ZIP" ] || { echo "missing $ZIP — run npm run pack first" >&2; exit 1; }
grep -q "continuechat-v$VERSION.zip" site/www/index.html || { echo "site/www/index.html does not link continuechat-v$VERSION.zip — update the download link" >&2; exit 1; }

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
cp -r site/www/. "$STAGE/"
mkdir -p "$STAGE/download"
cp "$ZIP" "$STAGE/download/"

rsync -az --delete "$STAGE/" "$HOST:/tmp/continuechat-site/"
ssh "$HOST" "sudo rsync -a --delete --chown=root:root --chmod=D755,F644 /tmp/continuechat-site/ $DEST/ && rm -rf /tmp/continuechat-site"
echo "deployed v$VERSION → https://continuechat.coylin.com/"
