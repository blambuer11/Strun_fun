# 🎯 Deployment Hazırlık Kontrolü

## Solana dApp Store Yayınlama Durumu

### ✅ TAMAMLANAN HAZIRLIKLARI

#### 1. Yapılandırma Dosyaları ✓
- [x] `publishing/config.yaml` - Tam ve eksiksiz
  - App metadata: Strun
  - Descriptions: İngilizce açıklamalar hazır
  - URLs: strun.fun domain'i kullanılıyor
  - Category: Health
  - Content rating: E (Everyone)
  
- [x] `publishing/package.json` - CLI scripts hazır
- [x] `publishing/.env.example` - Environment örneği var

#### 2. Media Assets ✓
- [x] `publishing/media/icon-512x512.png` - 512x512 app icon
- [x] `publishing/media/banner-1200x600.png` - 1200x600 banner
- [x] `publishing/media/feature-1200x1200.png` - 1200x1200 feature graphic
- [x] `publishing/media/screenshot-login.png` - Login screenshot
- [x] `publishing/media/screenshot-tasks.png` - Tasks screenshot
- [x] `publishing/media/screenshot-myland.png` - My Land screenshot

#### 3. Build Scripts ✓
- [x] `scripts/create-keystore.sh` - Keystore oluşturma scripti
- [x] `scripts/build-production-apk.sh` - APK build scripti
- [x] `scripts/prepare-google-play-assets.sh` - Asset hazırlama scripti

#### 4. GitHub Actions Workflows ✓
- [x] `.github/workflows/deploy-dapp-store.yml` - Otomatik deployment
- [x] `.github/workflows/deploy-solana-mobile.yml` - Alternatif deployment

#### 5. Documentation ✓
- [x] `SOLANA_DAPP_STORE_DEPLOYMENT.md` - Detaylı deployment kılavuzu
- [x] `GITHUB_SECRETS_SETUP.md` - GitHub Secrets kurulum rehberi
- [x] `GOOGLE_PLAY_GUIDE.md` - Google Play yayınlama rehberi
- [x] `publishing/README.md` - Publishing dizini kılavuzu

---

## ⏳ YAPILMASI GEREKEN ADIMLAR

### Adım 1: Android Keystore Oluşturma
**Durum:** 🔴 Yapılmadı

**Yapılacaklar:**
```bash
# Lokal makinenizde çalıştırın
git clone <repository-url>
cd strun
./scripts/create-keystore.sh
```

**Çıktı:** `android/strun.keystore` dosyası oluşacak

**Önem:** 🔴 KRİTİK - Bu olmadan APK imzalananamaz

---

### Adım 2: GitHub Secrets Yapılandırması
**Durum:** 🔴 Yapılmadı

**Yapılacaklar:**
GitHub repository → Settings → Secrets and variables → Actions

**Gerekli 10 Secret:**

| Secret Adı | Durum | Önem | Kaynak |
|------------|-------|------|--------|
| ANDROID_KEYSTORE_BASE64 | 🔴 | Kritik | Adım 1'den |
| KEYSTORE_PASSWORD | 🔴 | Kritik | Adım 1'den |
| KEY_PASSWORD | 🔴 | Kritik | Adım 1'den |
| SOLANA_PUBLISHER_KEYPAIR | 🔴 | Kritik | Adım 3'ten |
| DAPP_STORE_APP_ADDRESS | 🟡 | Sonra | Adım 5'ten sonra |
| VITE_SUPABASE_URL | ✅ | Kritik | Zaten biliniyor |
| VITE_SUPABASE_PUBLISHABLE_KEY | ✅ | Kritik | Zaten biliniyor |
| VITE_SUPABASE_PROJECT_ID | ✅ | Kritik | Zaten biliniyor |
| GOOGLE_MAPS_API_KEY | 🟡 | Opsiyonel | Google Cloud Console |
| DISCORD_WEBHOOK_URL | 🟢 | Opsiyonel | Discord settings |

**Detaylar:** `GITHUB_SECRETS_SETUP.md` dosyasına bakın

---

### Adım 3: Solana Publisher Keypair
**Durum:** 🔴 Yapılmadı

**Yapılacaklar:**
```bash
# Solana CLI kurun
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Keypair oluşturun
solana-keygen new --outfile publisher-keypair.json

# Public key gösterin
solana-keygen pubkey publisher-keypair.json

# Devnet için SOL alın (test)
solana airdrop 2 <public-key> --url devnet

# VEYA Mainnet için 0.5 SOL gönderin (production)
```

**Çıktı:** `publisher-keypair.json` dosyası

**Önem:** 🔴 KRİTİK - NFT mint etmek için gerekli

---

### Adım 4: Lokal APK Build Testi
**Durum:** 🔴 Yapılmadı

**Yapılacaklar:**
```bash
# Android platform ekleyin
npx cap add android
npx cap sync android

# APK build edin
./scripts/build-production-apk.sh

# Çıktı kontrolü
ls -lh publishing/files/strun-release.apk
```

**Önem:** 🟡 ORTA - GitHub Actions'dan önce test için

---

### Adım 5: İlk Publisher ve App NFT'leri
**Durum:** 🔴 Yapılmadı

**Yapılacaklar:**
```bash
cd publishing
npm install

# Publisher NFT (bir kez)
npx dapp-store create publisher -k ../publisher-keypair.json -u https://api.devnet.solana.com -p 500000

# App NFT (bir kez)
npx dapp-store create app -k ../publisher-keypair.json -u https://api.devnet.solana.com -p 500000
```

**Çıktı:** 
- Publisher address (config.yaml'a yazılır)
- App address (config.yaml'a yazılır)

**Önem:** 🔴 KRİTİK - İlk deployment için zorunlu

**Not:** App address'i GitHub Secrets'a DAPP_STORE_APP_ADDRESS olarak ekleyin

---

### Adım 6: İlk Deployment (Devnet Test)
**Durum:** 🔴 Yapılmadı

**Yapılacaklar:**
```bash
# Tüm secrets eklendikten sonra
git tag v0.1.0-devnet
git push origin v0.1.0-devnet
```

**Önem:** 🟡 ORTA - Production öncesi test

---

### Adım 7: Solana Discord Review Talebi
**Durum:** 🔴 Yapılmadı

**Yapılacaklar:**
1. https://discord.gg/solanamobile - Katılın
2. #developer role alın
3. #dapp-store kanalında şu mesajı bırakın:

```
Hi! I've submitted Strun app for review.
App: Strun - Run, Own Land, Earn Crypto
Category: Health & Fitness
Package: app.strun.mobile
Publisher: <PUBLISHER_ADDRESS>
App NFT: <APP_NFT_ADDRESS>
Release NFT: <RELEASE_NFT_ADDRESS>

Ready for review! Thanks!
```

**Önem:** 🔴 KRİTİK - Review süreci başlatmak için

---

### Adım 8: Mainnet Production Deployment
**Durum:** 🔴 Yapılmadı

**Yapılacaklar:**
```bash
# Devnet review tamamlandıktan sonra

# 1. Publisher keypair'e mainnet SOL gönderin (0.5 SOL)

# 2. Mainnet için publisher ve app NFT oluşturun
cd publishing
npx dapp-store create publisher -k ../publisher-keypair.json -u https://api.mainnet-beta.solana.com -p 500000
npx dapp-store create app -k ../publisher-keypair.json -u https://api.mainnet-beta.solana.com -p 500000

# 3. GitHub'da mainnet tag oluşturun
git tag v1.0.0
git push origin v1.0.0
```

**Önem:** 🔴 KRİTİK - Gerçek yayın

---

## 📊 Genel Hazırlık Durumu

**Toplam İlerleme:** 5/13 (38%)

```
████████████░░░░░░░░░░░░░░░░░░░░░░ 38%
```

### Tamamlanan: 5 ✅
- Yapılandırma dosyaları
- Media assets
- Build scripts
- GitHub workflows
- Documentation

### Yapılacak: 8 🔴
- Keystore oluşturma
- GitHub Secrets (7 adet kritik)
- Solana keypair oluşturma
- Lokal APK build
- Publisher NFT mint
- App NFT mint
- İlk deployment (devnet)
- Discord review talebi

---

## 🚀 Hemen Başlayın

**Tahmini Süre:** 2-3 saat (ilk defa için)

### Sıradaki Adım:
```bash
# 1. Repository'yi klonlayın
git clone <your-repo-url>
cd strun

# 2. Keystore oluşturun
./scripts/create-keystore.sh

# 3. GITHUB_SECRETS_SETUP.md dosyasını açın
# 4. Secrets'ları tek tek GitHub'a ekleyin
```

---

## 📚 Referans Dokümanları

1. **Detaylı Deployment:** `SOLANA_DAPP_STORE_DEPLOYMENT.md`
2. **GitHub Secrets:** `GITHUB_SECRETS_SETUP.md`
3. **Google Play:** `GOOGLE_PLAY_GUIDE.md` (alternatif yayın)
4. **Publishing Kılavuzu:** `publishing/README.md`

---

## 🆘 Yardım

Herhangi bir adımda takıldınız mı?

- **Email:** info@strun.fun
- **Discord:** Solana Mobile - #dapp-store
- **dApp Store Team:** dAppStore@solanamobile.com

---

## 🎯 Yayınlanma Sonrası

Uygulamanız yayınlandığında şuradan erişilebilir olacak:

**Solana dApp Store Link:**
```
solana-dapp://mainnet/<YOUR_APP_NFT_ADDRESS>
```

**Solana Mobile Store:**
Doğrudan Saga ve Chapter 2 cihazlarındaki dApp Store'da görünecek!

---

**Hazır mısınız? İlk adımı atın:** `./scripts/create-keystore.sh` 🚀
