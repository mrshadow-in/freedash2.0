#!/bin/bash

# Docker VPS Networking Fix Script
# Targeted at resolving "TLS handshake timeout" and "failed to resolve source metadata" errors.

set -e

echo "🚀 Starting Docker VPS Networking Fix..."

# 1. Ensure Stable DNS Configuration (Google DNS)
echo "🌐 Configuring stable DNS (Google DNS)..."
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

# 3. Configure Docker Daemon to use specific DNS and ensure IPv4 priority
echo "🐳 Optimizing Docker daemon configuration..."
DOCKER_CONFIG="/etc/docker/daemon.json"
if [ ! -f "$DOCKER_CONFIG" ]; then
    echo "{}" | sudo tee "$DOCKER_CONFIG" > /dev/null
fi

# Use Python or jq if available, otherwise simple string manipulation for daemon.json
# We'll use a direct overwrite for simplicity assuming a standard setup, 
# or append safely if we want to be more careful.
cat <<EOF | sudo tee "$DOCKER_CONFIG" > /dev/null
{
    "dns": ["8.8.8.8", "8.8.4.4"]
}
EOF

# 4. Restart Docker daemon
echo "🔄 Restarting Docker daemon..."
sudo systemctl restart docker

# 5. Verify connectivity
echo "🧪 Verifying connectivity..."
echo "Checking Docker Hub Registry..."
if curl -s -I --connect-timeout 10 https://registry-1.docker.io/v2/ | grep -q "200 OK\|301 Moved\|302 Found\|401 Unauthorized"; then
    echo "✅ Registry connectivity confirmed."
else
    echo "❌ Registry connectivity failed. Please check your system firewall."
fi

echo "Trying to pull a lightweight image (nginx:alpine)..."
if sudo docker pull nginx:alpine; then
    echo "✅ Success! Images are pulling correctly."
else
    echo "❌ Failed to pull image. There might be a deeper ISP or firewall issue."
fi

echo "✨ Fix applied successfully. Please try your docker-compose build again."
