#!/bin/bash
# Local APK build script for Strun

set -e

echo "🏗️  Building Strun Android APK Locally"
echo "======================================"
echo ""

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed"
        exit 1
    fi
}

echo "Checking prerequisites..."
check_command node
check_command npm
check_command java

echo "✅ All prerequisites met"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build PWA
echo "🔨 Building PWA..."
npm run build

# Setup Capacitor
echo "📱 Setting up Capacitor..."
npx cap add android || echo "Android platform already added"
npx cap sync android

# Build APK
echo "🏭 Building Android APK..."
cd android
chmod +x gradlew

# Check if we should build release or debug
if [ -f "app/strun-release.keystore" ]; then
    echo "Found keystore, building RELEASE APK..."
    
    # Prompt for passwords
    read -sp "Enter keystore password: " KEYSTORE_PASSWORD
    echo ""
    read -sp "Enter key password: " KEY_PASSWORD
    echo ""
    
    # Build release
    STRUN_RELEASE_STORE_FILE=strun-release.keystore \
    STRUN_RELEASE_STORE_PASSWORD="$KEYSTORE_PASSWORD" \
    STRUN_RELEASE_KEY_ALIAS=strun-key \
    STRUN_RELEASE_KEY_PASSWORD="$KEY_PASSWORD" \
    ./gradlew assembleRelease
    
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "✅ Release APK built successfully!"
else
    echo "No keystore found, building DEBUG APK..."
    ./gradlew assembleDebug
    
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "✅ Debug APK built successfully!"
    echo ""
    echo "⚠️  To build release APK, run: ./scripts/create-keystore.sh"
    echo "   Then place keystore in: android/app/strun-release.keystore"
fi

cd ..

# Copy to publishing directory if release
if [ -f "android/$APK_PATH" ] && [[ "$APK_PATH" == *"release"* ]]; then
    mkdir -p publishing/files
    cp "android/$APK_PATH" publishing/files/strun-release.apk
    echo ""
    echo "📋 APK copied to: publishing/files/strun-release.apk"
fi

echo ""
echo "📱 APK Location: android/$APK_PATH"
echo ""
echo "🎉 Build complete!"
echo ""
echo "Next steps:"
if [[ "$APK_PATH" == *"release"* ]]; then
    echo "  1. Test APK: adb install android/$APK_PATH"
    echo "  2. Deploy to dApp Store: cd publishing && npm run deploy"
else
    echo "  1. Test APK: adb install android/$APK_PATH"
    echo "  2. Create keystore for release builds: ./scripts/create-keystore.sh"
fi
