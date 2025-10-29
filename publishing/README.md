# Strun - Solana dApp Store Publishing

This directory contains all resources needed to publish Strun to the Solana dApp Store.

## Directory Structure

```
publishing/
├── config.yaml           # Main configuration file
├── .env                  # Environment variables (DO NOT COMMIT)
├── .env.example          # Environment variables template
├── keypair.json          # Solana keypair (DO NOT COMMIT)
├── media/                # Publishing assets
│   ├── icon-512.png      # 512x512 app icon
│   ├── banner-1200x600.png    # 1200x600 banner
│   ├── feature-1200x1200.png  # 1200x1200 feature graphic (optional)
│   ├── screenshot-*.png  # Screenshots (min 4)
│   ├── preview-video.mp4 # Preview video (optional)
│   └── app-release.apk   # Signed release APK
└── README.md             # This file
```

## Prerequisites

### 1. Node.js (v18-v21)

```bash
node -v  # Must be between v18.0.0 and v21.7.3

# Enable corepack for pnpm
corepack enable
corepack prepare pnpm@latest --activate
```

### 2. Android SDK Build Tools

**Option A: Android Studio (Recommended)**
- Download from: https://developer.android.com/studio
- After installation, SDK tools are at:
  - MacOS: `~/Library/Android/sdk/build-tools/{version}`
  - Linux: `~/Android/Sdk/build-tools/{version}`
  - Windows: `C:\Users\YourName\AppData\Local\Android\Sdk\build-tools\{version}`

**Option B: Standalone SDK**
- Follow: https://developer.android.com/tools/releases/build-tools

### 3. Java Development Kit (JDK 17)

**Option A: Android Studio JBR (Recommended if you have Android Studio)**
- MacOS: `/Applications/Android Studio.app/Contents/jbr/Contents/Home`
- Find your path: Android Studio → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK

**Option B: OpenJDK 17**
- Download: https://openjdk.org/projects/jdk/17/

Set `JAVA_HOME` environment variable:
```bash
# MacOS/Linux (add to ~/.zshrc or ~/.bashrc)
export JAVA_HOME="/path/to/jdk-17"

# Windows (System Properties → Environment Variables)
JAVA_HOME=C:\Program Files\Java\jdk-17
```

### 4. ffmpeg (Required for video assets)

```bash
# MacOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows (Chocolatey)
choco install ffmpeg

# Verify installation
ffmpeg -version
```

### 5. Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Verify
solana --version
```

## Setup Steps

### 1. Initialize Publishing Directory

```bash
cd publishing
pnpm init
pnpm install --save-dev @solana-mobile/dapp-store-cli
npx dapp-store init
```

### 2. Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env with your paths
nano .env
```

Set these variables:
- `ANDROID_TOOLS_DIR`: Path to Android SDK build tools (e.g., `~/Library/Android/sdk/build-tools/34.0.0`)
- `JAVA_HOME`: Path to JDK (e.g., `/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home`)
- `SOLANA_RPC_URL`: Use devnet for testing, mainnet for production
- `SOLANA_KEYPAIR_PATH`: Path to your keypair (default: `./keypair.json`)

### 3. Create Solana Keypair

```bash
# Generate new keypair
solana-keygen new --outfile keypair.json

# CRITICAL: Backup this file securely!
# - Use password manager (1Password, Bitwarden)
# - Store in encrypted cloud storage
# - Keep offline backup

# Fund keypair (Devnet for testing)
solana airdrop 2 --keypair keypair.json --url devnet

# For Mainnet, fund with real SOL from exchange
```

**Security Checklist:**
- [ ] Keypair backed up in 3+ locations
- [ ] Never committed to Git (added to `.gitignore`)
- [ ] Encrypted at rest
- [ ] Access restricted to authorized personnel only

### 4. Prepare Publishing Assets

Create `media/` directory and add:

#### Required Assets:

1. **Icon** (`icon-512.png`)
   - Size: 512x512 pixels
   - Format: PNG with transparency
   - Follow: https://developer.android.com/google-play/resources/icon-design-specifications

2. **Banner** (`banner-1200x600.png`)
   - Size: 1200x600 pixels
   - Format: PNG or JPG
   - Used in dApp Store listing

3. **Screenshots** (minimum 4)
   - Recommended: 1920x1080 pixels (1080p)
   - Minimum: 1080px width/height
   - All must have same orientation (landscape or portrait)
   - All must have same aspect ratio
   - Name: `screenshot-1-*.png`, `screenshot-2-*.png`, etc.

#### Optional Assets:

4. **Feature Graphic** (`feature-1200x1200.png`)
   - Size: 1200x1200 pixels
   - Required for Editor's Choice placement

5. **Preview Video** (`preview-video.mp4`)
   - Format: MP4
   - Minimum: 720p resolution
   - Recommended: 1080p
   - Max duration: 2 minutes

### 5. Build & Sign Release APK

```bash
# Navigate to TWA directory (from root)
cd ../twa

# Build release APK
./gradlew assembleRelease

# Copy APK to publishing directory
cp app/build/outputs/apk/release/app-release.apk ../publishing/media/

# Verify APK signature
jarsigner -verify -verbose -certs ../publishing/media/app-release.apk
```

### 6. Configure config.yaml

Edit `config.yaml` and replace all `<<values>>`:

- `android_package`: `app.strun.mobile`
- `version_name`: `1.0.0`
- `version_code`: `1`
- App descriptions and metadata
- File paths to assets in `media/`

**DO NOT MODIFY:**
- `app.address`
- `publisher.address`
- `release.address`

(These are auto-populated by CLI)

### 7. Validate Configuration

```bash
npx dapp-store validate -k keypair.json -b $ANDROID_TOOLS_DIR

# Expected output:
# ✓ App JSON valid!
# ✓ Release JSON valid!
```

## Publishing Workflow

### First-Time Publishing (New App)

#### Step 1: Create Publisher NFT (One-time)

```bash
npx dapp-store create publisher \
  --name "Strun Team" \
  --website "https://strun.app" \
  --email "support@strun.app" \
  -k keypair.json \
  -u devnet

# For production (Mainnet):
# -u https://api.mainnet-beta.solana.com
```

Save the Publisher Address printed to console!

#### Step 2: Create App NFT (One-time per app)

```bash
npx dapp-store create app \
  -k keypair.json \
  -u devnet

# With custom priority fee (recommended for Mainnet):
# -p 1000000
```

Save the App Address - it's also written to `config.yaml`

#### Step 3: Create Release NFT (Per version)

```bash
npx dapp-store create release \
  -k keypair.json \
  -b $ANDROID_TOOLS_DIR \
  -u devnet

# This uploads APK and assets, then mints Release NFT
```

**Note:** This step may take several minutes due to file uploads.

#### Step 4: Submit for Review

```bash
npx dapp-store publish submit \
  -k keypair.json \
  -u https://api.mainnet-beta.solana.com \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies

# By submitting, you agree to:
# - Solana Mobile dApp Store Developer Agreement
# - Publisher Policy
```

#### Step 5: Contact Solana Mobile Team

1. Join Solana Mobile Discord: https://discord.gg/solanamobile
2. Get "Developer" role in #developer channel
3. Post in #dapp-store:
   ```
   📱 New App Submission
   App: Strun
   Release NFT: [YOUR_RELEASE_ADDRESS]
   Publisher: [YOUR_EMAIL]
   Status: Ready for review
   ```

### Updating Existing App

For subsequent releases:

```bash
# 1. Update config.yaml
# - Increment version_code (e.g., 1 → 2)
# - Update version_name (e.g., "1.0.0" → "1.0.1")
# - Update new_in_version text

# 2. Build new APK and copy to media/

# 3. Validate
npx dapp-store validate -k keypair.json -b $ANDROID_TOOLS_DIR

# 4. Create new Release NFT
npx dapp-store create release -k keypair.json -b $ANDROID_TOOLS_DIR -u mainnet

# 5. Submit update
npx dapp-store publish submit -k keypair.json -u mainnet --requestor-is-authorized --complies-with-solana-dapp-store-policies
```

## CLI Commands Reference

```bash
# Help
npx dapp-store --help
npx dapp-store <command> --help

# Update CLI
pnpm install --save-dev @solana-mobile/dapp-store-cli@latest

# Validate config
npx dapp-store validate -k <keypair> -b <android_tools>

# Create Publisher (one-time)
npx dapp-store create publisher -k <keypair> -u <rpc_url>

# Create App (one-time per app)
npx dapp-store create app -k <keypair> -u <rpc_url>

# Create Release (per version)
npx dapp-store create release -k <keypair> -b <android_tools> -u <rpc_url>

# Submit to dApp Store
npx dapp-store publish submit -k <keypair> -u <rpc_url> --requestor-is-authorized --complies-with-solana-dapp-store-policies

# Set custom priority fee (in lamports)
# Add to any command: -p 1000000
```

## Troubleshooting

### Node version error

```bash
# Check version
node -v

# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install compatible version
nvm install 21
nvm use 21
```

### Android tools not found

```bash
# Find Android SDK location
which sdkmanager

# Set in .env
echo 'ANDROID_TOOLS_DIR="/path/to/sdk/build-tools/34.0.0"' >> .env
```

### JAVA_HOME not set

```bash
# Find Java installation
/usr/libexec/java_home -V  # MacOS
which java  # Linux

# Set environment variable
export JAVA_HOME="/path/to/jdk"
```

### APK upload timeout

- Check internet speed (min 0.25 MB/s upload)
- Use private RPC (not public Solana RPC)
- Reduce APK size by removing unused assets
- Try during off-peak hours

### Priority fee too low (Transaction failed)

```bash
# Increase priority fee to 1,000,000 lamports
npx dapp-store create release -k keypair.json -p 1000000 -u mainnet
```

## Asset Checklist

Before submitting, verify:

- [ ] Icon is exactly 512x512 PNG
- [ ] Banner is exactly 1200x600 PNG
- [ ] Minimum 4 screenshots provided
- [ ] All screenshots have same orientation
- [ ] All screenshots have same aspect ratio
- [ ] APK is signed with unique key (not Google Play key)
- [ ] APK is release build (not debug)
- [ ] All URLs in config.yaml are accessible (https)
- [ ] Privacy policy and terms are published
- [ ] config.yaml has no `<<placeholder>>` values remaining

## Security Best Practices

1. **Never commit:**
   - `keypair.json`
   - `.env`
   - `android.keystore`

2. **Always backup:**
   - Keypair (3+ secure locations)
   - Keystore (encrypted cloud + offline)
   - Config files (Git repo)

3. **Restrict access:**
   - Keypair: CI/CD secrets only
   - Production RPC: rate-limited, authenticated

## Links & Resources

- [dApp Store CLI Docs](https://docs.solanamobile.com/dapp-publishing/intro)
- [Publisher Portal](https://dapp-store.solanamobile.com/)
- [Publisher Policy](https://docs.solanamobile.com/dapp-publishing/publisher-policy)
- [Solana Mobile Discord](https://discord.gg/solanamobile)
- [Example Apps](https://github.com/solana-mobile/dapp-publishing)

## Support

- **Technical Issues:** #dapp-store on Solana Mobile Discord
- **Policy Questions:** support@solanamobile.com
- **App-Specific:** support@strun.app

---

**Next Steps After This Setup:**
1. Complete asset creation (icons, screenshots)
2. Test on devnet
3. Deploy to mainnet
4. Submit for review

Good luck! 🚀
