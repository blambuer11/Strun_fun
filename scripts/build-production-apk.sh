#!/bin/bash

# Strun Production APK Build Script for Solana Mobile dApp Store
# This script builds a production-ready APK for deployment to Solana dApp Store

set -e

echo "🚀 Starting Strun Production APK Build..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

if ! command -v java &> /dev/null; then
    echo -e "${RED}Error: Java is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm ci

# Build PWA
echo -e "${BLUE}Building PWA...${NC}"
npm run build

# Use production config
echo -e "${BLUE}Copying production config...${NC}"
cp capacitor.config.production.ts capacitor.config.ts.backup
mv capacitor.config.production.ts capacitor.config.ts

# Sync with Capacitor
echo -e "${BLUE}Syncing with Capacitor...${NC}"
npx cap sync android

# Build APK
echo -e "${BLUE}Building APK...${NC}"
cd android

# Make gradlew executable
chmod +x gradlew

# Check for keystore
if [ -f "app/strun-release.keystore" ]; then
    echo -e "${GREEN}Found release keystore, building signed APK...${NC}"
    
    # Prompt for passwords
    read -sp "Enter keystore password: " KEYSTORE_PASSWORD
    echo
    read -sp "Enter key password: " KEY_PASSWORD
    echo
    
    # Build release APK
    ./gradlew assembleRelease \
        -Pandroid.injected.signing.store.file=app/strun-release.keystore \
        -Pandroid.injected.signing.store.password=$KEYSTORE_PASSWORD \
        -Pandroid.injected.signing.key.alias=strun \
        -Pandroid.injected.signing.key.password=$KEY_PASSWORD
    
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    
    if [ -f "$APK_PATH" ]; then
        echo -e "${GREEN}✓ Release APK built successfully!${NC}"
        
        # Copy to publishing directory
        mkdir -p ../publishing/files
        cp "$APK_PATH" ../publishing/files/strun-release.apk
        
        echo -e "${GREEN}✓ APK copied to publishing/files/strun-release.apk${NC}"
        
        # Get APK info
        echo -e "${BLUE}APK Information:${NC}"
        ls -lh "$APK_PATH"
        
        # Calculate SHA-256 fingerprint
        echo -e "${BLUE}SHA-256 Fingerprint:${NC}"
        keytool -list -v -keystore app/strun-release.keystore -alias strun -storepass $KEYSTORE_PASSWORD | grep SHA256
        
    else
        echo -e "${RED}Error: APK file not found at $APK_PATH${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: Release keystore not found!${NC}"
    echo "Please create a keystore first using: ./scripts/create-keystore.sh"
    exit 1
fi

cd ..

# Restore original config
if [ -f "capacitor.config.ts.backup" ]; then
    mv capacitor.config.ts.backup capacitor.config.ts
fi

echo -e "${GREEN}✓ Production APK build complete!${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo "1. Test the APK: adb install publishing/files/strun-release.apk"
echo "2. Update assetlinks.json with the SHA-256 fingerprint shown above"
echo "3. Deploy to Solana dApp Store using: cd publishing && npm run deploy"
