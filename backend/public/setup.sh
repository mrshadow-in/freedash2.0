#!/bin/bash
# FreeDash Wings Installer
# Usage: curl -sL <URL>/setup.sh | bash -s <TOKEN> <PANEL_URL>

set -e

TOKEN=$1
PANEL_URL=$2

if [ -z "$TOKEN" ] || [ -z "$PANEL_URL" ]; then
  echo "Usage: setup.sh <TOKEN> <PANEL_URL>"
  echo "This script is intended to be run via the Auto-Deploy command in the Panel."
  exit 1
fi

echo "======================================"
echo " FreeDash Wings Installer"
echo "======================================"

# 1. Update & Install Dependencies
echo "[+] Installing Dependencies..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null
apt-get update -qq
apt-get install -y nodejs docker.io tar unzip git

systemctl enable --now docker

# 2. Setup Wings Directory
echo "[+] Setting up Wings..."
mkdir -p /opt/freedash-wings
cd /opt/freedash-wings

# 3. Download Wings Source
echo "[+] Downloading Agent Code..."
# Attempt to download from Panel
curl -sL "$PANEL_URL/static/wings.tar.gz" -o wings.tar.gz
if [ ! -s wings.tar.gz ]; then
    echo "Failed to download wings.tar.gz from $PANEL_URL/static/wings.tar.gz"
    echo "Please ensure the Panel is reachable."
    exit 1
fi

tar -xzf wings.tar.gz --strip-components=1
rm wings.tar.gz

# 4. Install NPM Packages
echo "[+] Installing NPM Packages..."
npm install --silent
npm run build

# 5. Write Config
echo "[+] Configuring..."
cat > config.json <<EOF
{
  "port": 3005,
  "token": "$TOKEN",
  "panelUrl": "$PANEL_URL"
}
EOF

# 6. Create Systemd Service
echo "[+] Installing Systemd Service..."
cat > /etc/systemd/system/freedash-wings.service <<EOF
[Unit]
Description=FreeDash Wings Agent
After=docker.service network.target

[Service]
User=root
WorkingDirectory=/opt/freedash-wings
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now freedash-wings

echo "======================================"
echo " Wings Installed & Started!"
echo " Wings Port: 3005"
echo "======================================"
