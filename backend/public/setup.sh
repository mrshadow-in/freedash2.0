#!/bin/bash

# FreeDash Remote Node Setup Script
# This script prepares a fresh VPS to be used as a Node for FreeDash.

set -e

# Check for root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root"
  exit 1
fi

echo "======================================"
echo " FreeDash Node Installer"
echo "======================================"

# 1. Update System
echo "[+] Updating system packages..."
apt-get update -qq

# 2. Install Docker
echo "[+] Installing Docker..."
if ! command -v docker &> /dev/null; then
    apt-get install -y docker.io
    systemctl enable --now docker
else
    echo "Docker already installed."
fi

# 3. Enable Swap (Optional but recommended for game servers)
if [ ! -f /swapfile ]; then
    echo "[+] Configuring Swap (2GB)..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
else
    echo "Swap already configured."
fi

# 4. Configure Firewall (UFW) if active
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        echo "[+] Allowing SSH and Ports..."
        ufw allow 22/tcp
        ufw allow 25565:25600/tcp # Game ports
        ufw allow 25565:25600/udp
        ufw reload
    fi
fi

# 5. Output Info
IP=$(curl -s ifconfig.me)
echo "======================================"
echo " Setup Complete!"
echo "======================================"
echo "Node IP: $IP"
echo "SSH Port: 22"
echo "SSH User: root"
echo ""
echo "Go to your Admin Panel -> Nodes -> Create New"
echo "Enter the IP and credentials above."
echo "======================================"
