#!/usr/bin/env bash
# Generate a self-signed certificate for https://clerkos.local.
# For production, replace with a certificate from your municipal/internal CA
# so browsers on the domain trust it via Group Policy.
set -euo pipefail

CERT_DIR="$(dirname "$0")/../certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:4096 -days 825 \
  -keyout "$CERT_DIR/clerkos.key" \
  -out "$CERT_DIR/clerkos.crt" \
  -subj "/C=US/ST=NJ/O=Municipality/CN=clerkos.local" \
  -addext "subjectAltName=DNS:clerkos.local,DNS:localhost,IP:127.0.0.1"

chmod 600 "$CERT_DIR/clerkos.key"
echo "Certificate written to $CERT_DIR/clerkos.crt (valid 825 days)."
echo "Distribute clerkos.crt to workstations via Group Policy or MDM."
