# 🚀 Solana dApp Store Deployment - Quick Start

**From code to dApp Store in 5 steps!**

## Prerequisites Checklist

- [ ] Node.js v18-21 installed (`node -v`)
- [ ] Android Studio installed (or standalone Android SDK)
- [ ] Java JDK 17 installed
- [ ] Solana CLI installed
- [ ] 2+ SOL in wallet (for NFT minting + fees)

## Step 1: Setup Publishing Environment (5 min)

```bash
# Navigate to publishing directory
cd publishing

# Install dependencies
npm init -y
npm install --save-dev @solana-mobile/dapp-store-cli

# Initialize dApp Store CLI
npx dapp-store init

# Create environment file
cp .env.example .env

# Edit .env with your paths
nano .env
```

**Required in `.env`:**
- `ANDROID_TOOLS_DIR`: Path to SDK build tools (e.g., `~/Library/Android/sdk/build-tools/34.0.0`)
- `JAVA_HOME`: Path to JDK 17 (e.g., `/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home`)

## Step 2: Create Solana Keypair (2 min)

```bash
# Generate keypair
solana-keygen new --outfile keypair.json

# ⚠️ CRITICAL: Backup this file NOW!
# - Copy to password manager
# - Store in encrypted cloud storage
# - Create offline backup

# Fund keypair (Devnet for testing)
solana airdrop 2 --keypair keypair.json --url devnet

# For Mainnet, buy SOL from exchange and transfer
```

## Step 3: Prepare Assets (30 min)

**Create `media/` directory and add:**

```bash
mkdir -p media
cd media
```

### Required Files:

1. **icon-512.png** (512x512 pixels)
2. **banner-1200x600.png** (1200x600 pixels)
3. **4+ screenshots** (1920x1080 recommended, all same orientation)
4. **app-release.apk** (signed release build)

**Quick asset generation:**

```bash
# From root directory, build TWA APK
cd ../twa
./gradlew assembleRelease

# Copy APK to publishing
cp app/build/outputs/apk/release/app-release.apk ../publishing/media/

# Take screenshots using Chrome DevTools
# F12 → Device Toolbar (Cmd+Shift+M) → Pixel 5 → Capture
```

See `media/ASSETS_REQUIREMENTS.md` for detailed specs.

## Step 4: Configure & Validate (5 min)

```bash
cd publishing

# Edit config.yaml
# - Replace all <<placeholders>>
# - Update version info
# - Add asset file paths
nano config.yaml

# Validate configuration
npx dapp-store validate \
  -k keypair.json \
  -b $ANDROID_TOOLS_DIR

# Expected output:
# ✓ App JSON valid!
# ✓ Release JSON valid!
```

## Step 5: Publish to dApp Store (10 min)

### 5a. Create Publisher NFT (one-time)

```bash
npx dapp-store create publisher \
  --name "Strun Team" \
  --website "https://strun.app" \
  --email "support@strun.app" \
  -k keypair.json \
  -u devnet

# Save the Publisher Address!
```

### 5b. Create App NFT (one-time per app)

```bash
npx dapp-store create app \
  -k keypair.json \
  -u devnet

# Address automatically saved to config.yaml
```

### 5c. Create Release NFT (per version)

```bash
npx dapp-store create release \
  -k keypair.json \
  -b $ANDROID_TOOLS_DIR \
  -u devnet

# ⏳ This may take 5-10 minutes (uploads APK + assets)
```

### 5d. Submit for Review

```bash
# Switch to Mainnet for production
npx dapp-store publish submit \
  -k keypair.json \
  -u https://api.mainnet-beta.solana.com \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies
```

## Step 6: Contact Solana Mobile Team

1. Join [Solana Mobile Discord](https://discord.gg/solanamobile)
2. Get "Developer" role in #developer
3. Post in #dapp-store:

```
📱 New App Submission
App: Strun
Release NFT: [YOUR_RELEASE_ADDRESS]
Publisher: support@strun.app
Status: Ready for review
```

---

## Troubleshooting

### "Node version error"
```bash
nvm install 21
nvm use 21
```

### "JAVA_HOME not set"
```bash
# MacOS (if using Android Studio)
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Add to ~/.zshrc for persistence
echo 'export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"' >> ~/.zshrc
```

### "Android tools not found"
```bash
# Find SDK location
ls ~/Library/Android/sdk/build-tools/

# Use latest version (e.g., 34.0.0)
echo 'ANDROID_TOOLS_DIR="~/Library/Android/sdk/build-tools/34.0.0"' >> .env
```

### "APK upload timeout"
- Use private RPC URL (not public Solana RPC)
- Check internet speed (min 0.25 MB/s upload)
- Try during off-peak hours

---

## CI/CD Automation (Optional)

After manual first publish, automate updates:

1. Add GitHub Secrets:
   - `SOLANA_PUBLISHER_KEYPAIR`
   - `ANDROID_KEYSTORE_BASE64`
   - `DAPP_STORE_APP_ADDRESS`

2. Push git tag:
```bash
git tag v1.0.1
git push origin v1.0.1
```

3. GitHub Actions automatically:
   - Builds APK
   - Mints Release NFT
   - Submits to dApp Store

See `.github/workflows/deploy-dapp-store.yml` for workflow details.

---

## Next Steps After Approval

✅ **Approved!** Your app is now live in Solana dApp Store.

**What to do next:**

1. **Monitor**
   - Check [Publisher Portal](https://dapp-store.solanamobile.com/) for stats
   - Watch for user reviews and feedback

2. **Market**
   - Announce on Twitter, Discord
   - Share Release NFT link
   - Create demo videos

3. **Update**
   - Increment version in `config.yaml`
   - Build new APK
   - Run `create release` and `submit` again

4. **Expand** (optional)
   - Submit to Google Play Store
   - Add more localized languages
   - Create promotional materials

---

## Full Documentation

For detailed info, see:
- `SOLANA_MOBILE_DEPLOYMENT.md` - Complete deployment guide
- `README_DEPLOYMENT.md` - Full checklist and roadmap
- `publishing/README.md` - Publishing directory guide
- `publishing/media/ASSETS_REQUIREMENTS.md` - Asset specifications

---

## Support

- **Technical:** [Solana Mobile Discord](https://discord.gg/solanamobile) #dapp-store
- **Policy:** support@solanamobile.com
- **App-Specific:** support@strun.app

---

**Estimated Total Time:** 1-2 hours (first time)  
**Review Time:** 1-3 business days

Good luck! 🎉
