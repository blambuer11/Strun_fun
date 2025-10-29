#!/bin/bash
# Script to create Android signing keystore for Strun

set -e

echo "🔐 Creating Android Signing Keystore for Strun"
echo "================================================"
echo ""
echo "⚠️  IMPORTANT: Store this keystore securely!"
echo "    You'll need it for all future app updates."
echo ""

# Keystore details
KEYSTORE_FILE="strun-release.keystore"
KEY_ALIAS="strun-key"
VALIDITY_DAYS=10000

# Prompt for passwords
read -sp "Enter keystore password: " KEYSTORE_PASSWORD
echo ""
read -sp "Confirm keystore password: " KEYSTORE_PASSWORD_CONFIRM
echo ""

if [ "$KEYSTORE_PASSWORD" != "$KEYSTORE_PASSWORD_CONFIRM" ]; then
    echo "❌ Passwords don't match!"
    exit 1
fi

read -sp "Enter key password (can be same as keystore): " KEY_PASSWORD
echo ""
read -sp "Confirm key password: " KEY_PASSWORD_CONFIRM
echo ""

if [ "$KEY_PASSWORD" != "$KEY_PASSWORD_CONFIRM" ]; then
    echo "❌ Passwords don't match!"
    exit 1
fi

# Generate keystore
echo ""
echo "Generating keystore..."

keytool -genkeypair \
    -v \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity $VALIDITY_DAYS \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=Strun, OU=Mobile, O=Strun, L=Unknown, ST=Unknown, C=US"

echo ""
echo "✅ Keystore created successfully: $KEYSTORE_FILE"
echo ""

# Get SHA-256 fingerprint
echo "📋 SHA-256 Fingerprint (for assetlinks.json):"
keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -storepass "$KEYSTORE_PASSWORD" | grep "SHA256:"

echo ""
echo "🔒 Security Checklist:"
echo "  ✓ Backup keystore to secure location (3+ places)"
echo "  ✓ Never commit to Git"
echo "  ✓ Add to GitHub Secrets as ANDROID_KEYSTORE_BASE64:"
echo ""
echo "    base64 -i $KEYSTORE_FILE | pbcopy  # MacOS"
echo "    base64 -w 0 $KEYSTORE_FILE | xclip  # Linux"
echo ""
echo "  ✓ Add passwords to GitHub Secrets:"
echo "    - KEYSTORE_PASSWORD"
echo "    - KEY_PASSWORD"
echo ""
echo "🎉 Done! Keep this keystore safe!"
