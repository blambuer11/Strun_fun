# STRUN - Complete Deployment Checklist

## ✅ Phase 1: Development Complete (DONE)

- [x] Smart contracts deployed to Solana Devnet
  - Program ID: `9qpcky7wTGD3VHMMzVdaG2G2WrEi8SgpmVhhbyzJG8Mf`
- [x] Frontend PWA built and ready
- [x] Backend x402 payment verification implemented
- [x] Supabase database configured
- [x] Wallet integration (useWallet hook)

## 📋 Phase 2: Pre-Launch Preparation

### 2.1 Production Environment Setup

- [ ] Register production domain (strun.app)
- [ ] Setup production hosting (Vercel/Netlify/Cloudflare)
- [ ] Configure DNS and SSL certificates
- [ ] Deploy backend to production (VPS or serverless)
- [ ] Setup production Solana RPC endpoint (QuickNode/Helius)

### 2.2 Mainnet Deployment

- [ ] Deploy Anchor programs to Mainnet
  ```bash
  anchor deploy --provider.cluster mainnet
  ```
- [ ] Update frontend environment variables to Mainnet
- [ ] Test mainnet transactions with small amounts
- [ ] Fund platform treasury wallet

### 2.3 Required Documents

- [x] Privacy Policy (`/public/privacy-policy.html`)
- [x] Support Page (`/public/support.html`)
- [ ] Terms of Service (`/public/terms.html`)
- [ ] Cookie Policy (if applicable)

### 2.4 Legal & Compliance

- [ ] Review GDPR/CCPA compliance
- [ ] Consult lawyer for crypto regulations in target countries
- [ ] Prepare KYC/AML policy for large withdrawals
- [ ] Register business entity (if required)

## 📱 Phase 3: Solana Mobile dApp Store Submission

### 3.1 Prerequisites

- [ ] Install tools:
  ```bash
  npm install -g @bubblewrap/cli
  npm install -g @solana-mobile/dapp-store-cli
  ```

### 3.2 Generate Android Signing Key

```bash
keytool -genkey -v \
  -keystore android.keystore \
  -alias strun-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

- [ ] Store keystore securely (NOT in git)
- [ ] Save passwords in password manager
- [ ] Backup keystore to secure cloud storage

### 3.3 Update Digital Asset Links

- [ ] Get SHA-256 fingerprint from keystore
- [ ] Update `public/.well-known/assetlinks.json` with fingerprint
- [ ] Deploy to production
- [ ] Verify accessible at `https://strun.app/.well-known/assetlinks.json`

### 3.4 Build TWA (Trusted Web Activity)

```bash
# Initialize TWA
bubblewrap init --manifest https://strun.app/manifest.webmanifest

# Build APK
cd twa
./gradlew assembleRelease
```

- [ ] Test APK on physical Android device
- [ ] Test wallet connection (Phantom/Solflare mobile)
- [ ] Test all core features (run tracking, tasks, payments)

### 3.5 Create Publisher NFTs

```bash
# Create publisher account
dapp-store create publisher \
  --name "Strun Team" \
  --website "https://strun.app" \
  --contact "support@strun.app" \
  --keypair ~/.config/solana/id.json \
  --network mainnet

# Create app NFT
dapp-store create app \
  --name "Strun" \
  --android-package "app.strun.mobile" \
  --website "https://strun.app" \
  --category "Fitness" \
  --publisher-address <PUBLISHER_ADDRESS> \
  --keypair ~/.config/solana/id.json \
  --network mainnet

# Create release NFT
dapp-store create release \
  --app-address <APP_ADDRESS> \
  --version-name "1.0.0" \
  --version-code 1 \
  --apk ./twa/app/build/outputs/apk/release/app-release.apk \
  --keypair ~/.config/solana/id.json \
  --network mainnet
```

- [ ] Save all NFT addresses/transaction hashes
- [ ] Verify NFTs on Solana Explorer

### 3.6 Submit to dApp Store

```bash
dapp-store submit release \
  --release-address <RELEASE_ADDRESS> \
  --keypair ~/.config/solana/id.json \
  --network mainnet
```

- [ ] Wait for Solana Mobile team review (1-3 business days)
- [ ] Respond to any feedback/changes requested

## 🚀 Phase 4: Google Play Store (Optional, after dApp Store)

### 4.1 Google Play Console Setup

- [ ] Register Google Play Developer account ($25 one-time fee)
- [ ] Complete account verification
- [ ] Setup payment profiles

### 4.2 App Bundle Preparation

```bash
cd twa
./gradlew bundleRelease
```

- [ ] Generate AAB (Android App Bundle)
- [ ] Sign AAB with production keystore

### 4.3 Store Listing

- [ ] Prepare screenshots (phone, tablet, 7-inch tablet)
- [ ] Create feature graphic (1024x500)
- [ ] Write store description (short & full)
- [ ] Select appropriate content rating
- [ ] Complete data safety form
- [ ] Add privacy policy link

### 4.4 Testing

- [ ] Internal testing track (alpha)
- [ ] Closed testing (beta) with 20+ testers
- [ ] Fix bugs reported during testing
- [ ] Open testing (optional)

### 4.5 Production Release

- [ ] Submit for review
- [ ] Wait for approval (1-7 days)
- [ ] Staged rollout (10% → 50% → 100%)

## 📊 Phase 5: Post-Launch Operations

### 5.1 Monitoring

- [ ] Setup error tracking (Sentry)
- [ ] Configure analytics (Amplitude/Mixpanel)
- [ ] Setup uptime monitoring (UptimeRobot)
- [ ] Monitor Solana RPC performance
- [ ] Track wallet balances (treasury, payouts)

### 5.2 Backend Automation

- [ ] Setup cron jobs for:
  - [ ] Owner payout batching (daily)
  - [ ] Task generation workers
  - [ ] Photo verification queue processing
  - [ ] NFT metadata updates
- [ ] Configure auto-scaling for serverless functions

### 5.3 Marketing & Community

- [ ] Launch social media (Twitter, Discord)
- [ ] Create announcement blog post
- [ ] Submit to crypto/web3 directories
- [ ] Reach out to Solana ecosystem influencers
- [ ] Create tutorial videos
- [ ] Launch referral program

### 5.4 User Support

- [ ] Setup support email forwarding
- [ ] Create FAQ knowledge base
- [ ] Train support team (if applicable)
- [ ] Setup Discord/Telegram for community support

## 🔒 Phase 6: Security & Audits

### 6.1 Smart Contract Audit

- [ ] Internal security review
- [ ] Hire professional auditor (OtterSec, Kudelski, etc.)
- [ ] Fix critical/high severity issues
- [ ] Publish audit report

### 6.2 Backend Security

- [ ] Penetration testing
- [ ] SQL injection tests
- [ ] Rate limiting verification
- [ ] API key rotation
- [ ] HTTPS/TLS configuration audit

### 6.3 Bug Bounty Program

- [ ] Create bug bounty policy
- [ ] Setup rewards structure
- [ ] List on Immunefi or similar platform

## 📈 Phase 7: Growth & Iteration

### 7.1 Metrics Tracking

- [ ] Daily Active Users (DAU)
- [ ] Task completion rate
- [ ] Payment success rate
- [ ] Wallet connection success rate
- [ ] Retention (D1, D7, D30)

### 7.2 Feature Roadmap

- [ ] Group runs & leaderboards
- [ ] Sponsored tasks from brands
- [ ] Advanced land trading marketplace
- [ ] Social features (following, challenges)
- [ ] Integration with fitness wearables

### 7.3 Internationalization

- [ ] Multi-language support (Turkish, Spanish, Portuguese)
- [ ] Regional task generation
- [ ] Currency conversion for local markets

## ⚠️ Critical Reminders

1. **Never commit secrets to Git:**
   - `.env` files
   - `android.keystore`
   - Solana keypairs
   - API keys

2. **Backup everything:**
   - Database snapshots (daily)
   - Keystore files (encrypted cloud storage)
   - Solana keypairs (hardware wallet + paper backup)

3. **Test payments thoroughly:**
   - Start with devnet USDC
   - Test with small mainnet amounts first
   - Verify replay protection
   - Test refund flows

4. **Legal compliance:**
   - Not financial advice disclaimer
   - Age restrictions (13+)
   - Gambling regulations (if applicable in your region)
   - Data protection laws

## 📚 Resources

- [Solana Mobile Docs](https://docs.solanamobile.com/)
- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)
- [dApp Store Publisher Portal](https://dapp-store.solanamobile.com/)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Google Play Console](https://play.google.com/console)

## 🆘 Need Help?

- **Technical Issues:** See `SOLANA_MOBILE_DEPLOYMENT.md` for detailed guide
- **Smart Contract Help:** Anchor Discord, Solana Stack Exchange
- **dApp Store Issues:** Solana Mobile Discord #dapp-store channel
- **Community:** Create GitHub Issues for open-source contributors

---

## Current Status: ✅ Ready for Phase 3

All code is production-ready. Next steps:
1. Deploy to production domain
2. Generate signing key
3. Build TWA APK
4. Submit to Solana dApp Store

**Estimated time to launch:** 2-3 weeks (including review periods)

Good luck! 🚀
