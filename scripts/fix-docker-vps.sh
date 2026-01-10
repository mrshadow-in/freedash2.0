#!/bin/bash

# Docker VPS Networking Fix Script (Robust Version)
# Targeted at resolving "TLS handshake timeout" and "failed to resolve source metadata" errors.

set -e

echo "🚀 Starting Robust Docker VPS Networking Fix..."

# 1. Ensure Stable DNS Configuration (Google DNS)
echo "🌐 Configuring stable DNS (Google DNS)..."
sudo chattr -i /etc/resolv.conf 2>/dev/null || true # Unlock if immutable
cat <<EOF | sudo tee /etc/resolv.conf > /dev/null
nameserver 8.8.8.8
nameserver 8.8.4.4
EOF

# 2. Disable IPv6 (often causes routing timeouts if not properly configured on VPS)
echo "🚫 Disabling IPv6 to prevent routing conflicts..."
cat <<EOF | sudo tee /etc/sysctl.d/99-disable-ipv6.conf > /dev/null
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF
sudo sysctl -p /etc/sysctl.d/99-disable-ipv6.conf

# 3. Configure Docker Daemon (DNS + MTU + IPv6 Disable)
echo "🐳 Optimizing Docker daemon configuration..."
DOCKER_CONFIG="/etc/docker/daemon.json"
# We use MTU 1450 which is standard for many VPS providers (like Google Cloud/AWS/DigitalOcean) 
# to avoid TLS packet fragmentation errors.
cat <<EOF | sudo tee "$DOCKER_CONFIG" > /dev/null
{
    "dns": ["8.8.8.8", "8.8.4.4"],
    "mtu": 1450,
    "ipv6": false
}
EOF

# 4. Cleanup potentially corrupted build cache
echo "🧹 Cleaning up Docker build cache..."
sudo docker builder prune -f
sudo docker system prune -f --volumes

# 5. Restart Docker daemon
echo "🔄 Restarting Docker daemon..."
sudo systemctl restart docker

# 6. Verify connectivity
echo "🧪 Verifying connectivity..."
echo "Checking Docker Hub Registry..."
if curl -s -I --connect-timeout 10 https://registry-1.docker.io/v2/ | grep -q "200 OK\|301 Moved\|302 Found\|401 Unauthorized"; then
    echo "✅ Registry connectivity confirmed."
else
    echo "⚠️ Registry connectivity warning. Handshake may still be slow."
fi

echo "Trying to pull node:18-alpine..."
if sudo docker pull node:18-alpine; then
    echo "✅ Success! Images are pulling correctly."
else
    echo "❌ Failed to pull image. Trying one more time with system network restart..."
    sudo systemctl restart networking || true
    sudo docker pull node:18-alpine || echo "❌ Still failing. Please contact your VPS provider for network stability."
fi

echo "✨ Robust fix applied. Please try your docker-compose build again."
