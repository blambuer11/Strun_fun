# Solana dApp Store'a Yayınlama Kılavuzu

## ✅ Hazırlık Durumu

Proje Solana dApp Store yayınlaması için hazır! İşte tamamlanmış adımlar:

### Tamamlanan Hazırlıklar
- ✅ `publishing/config.yaml` - Tam yapılandırılmış
- ✅ Media assets (icon, banner, screenshots) - Hazır
- ✅ GitHub Actions workflow - Otomatik deployment için yapılandırılmış
- ✅ APK build scripts - `scripts/build-production-apk.sh`
- ✅ Keystore generation script - `scripts/create-keystore.sh`

## 🚀 Deployment Adımları

### Adım 1: Android Keystore Oluşturma (İlk Defa)

Eğer daha önce keystore oluşturmadıysanız:

```bash
# Projeyi klonlayın
git clone <your-repo-url>
cd strun

# Keystore oluşturun
./scripts/create-keystore.sh

# Bu size soracak:
# - Keystore password (güvenli bir şifre)
# - Key password (başka bir güvenli şifre)
# - İsim, organizasyon bilgileri

# Çıktı: android/strun.keystore dosyası oluşacak
```

**ÖNEMLİ:** Bu keystore dosyasını ve şifrelerini çok güvenli saklayın! Bu olmadan update yayınlayamazsınız.

### Adım 2: GitHub Secrets Yapılandırması

GitHub repository → Settings → Secrets and variables → Actions → "New repository secret"

Eklenecek secrets:

```yaml
# 1. ANDROID_KEYSTORE_BASE64
#    Keystore dosyasını base64'e çevirin:
cat android/strun.keystore | base64 -w 0
#    Çıkan metni GitHub secret olarak ekleyin

# 2. KEYSTORE_PASSWORD
#    Keystore oluştururken girdiğiniz şifre

# 3. KEY_PASSWORD  
#    Key için girdiğiniz şifre (aynı olabilir)

# 4. SOLANA_PUBLISHER_KEYPAIR
#    Solana keypair JSON'ı (bir sonraki adımda oluşturacağız)

# 5. DAPP_STORE_APP_ADDRESS
#    App NFT adresi (ilk deploy sonrası dolacak)

# 6. VITE_SUPABASE_URL
https://ysutwfzdpfvziasxbbvn.supabase.co

# 7. VITE_SUPABASE_PUBLISHABLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdXR3ZnpkcGZ2emlhc3hiYnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzIzNTEsImV4cCI6MjA3NTMwODM1MX0.itprn-w66ZuVLV7ybtlfA4vSztf1iTW2UTOZXNrTafY

# 8. VITE_SUPABASE_PROJECT_ID
ysutwfzdpfvziasxbbvn

# 9. GOOGLE_MAPS_API_KEY (opsiyonel)
#    Harita özellikleri için

# 10. DISCORD_WEBHOOK_URL (opsiyonel)
#     Deployment bildirimleri için
```

### Adım 3: Solana Publisher Keypair Oluşturma

```bash
# Solana CLI kurulumu (macOS/Linux)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Yeni keypair oluşturun
solana-keygen new --outfile publisher-keypair.json

# Public key'i görüntüleyin
solana-keygen pubkey publisher-keypair.json

# Devnet için SOL alın (test için)
solana airdrop 2 <public-key> --url devnet

# VEYA Mainnet için SOL gönderin (gerçek yayın için)
# Bu adrese 0.5 SOL gönderin: <public-key>
```

**Publisher Keypair'i GitHub'a Ekleyin:**
```bash
# Keypair içeriğini kopyalayın
cat publisher-keypair.json

# GitHub Secrets → SOLANA_PUBLISHER_KEYPAIR olarak ekleyin
# Tüm JSON içeriğini olduğu gibi yapıştırın
```

### Adım 4: İlk Deployment - Publisher ve App NFT Oluşturma

İlk defa yayınlıyorsanız, manuel olarak Publisher ve App NFT oluşturmalısınız:

```bash
# Publishing dizinine gidin
cd publishing

# Dependencies yükleyin
npm install

# Environment variables ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin:
# - ANDROID_TOOLS_DIR (Android SDK yolunuz)
# - SOLANA_RPC_URL (devnet veya mainnet)

# 1. Publisher NFT oluşturun (bir kez)
npx dapp-store create publisher -k ../publisher-keypair.json -u https://api.devnet.solana.com -p 500000

# 2. App NFT oluşturun (bir kez)
npx dapp-store create app -k ../publisher-keypair.json -u https://api.devnet.solana.com -p 500000

# Bu komutlar çalıştığında, config.yaml'a otomatik olarak adresler yazılacak
# App address'i not alın ve GitHub Secrets'a DAPP_STORE_APP_ADDRESS olarak ekleyin
```

### Adım 5: APK Build ve Yayınlama

#### Otomatik Yayınlama (Tavsiye Edilen)

```bash
# Version tag ile yayınlayın
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions otomatik olarak:
# 1. APK'yı build eder
# 2. Release NFT oluşturur
# 3. dApp Store'a submit eder
```

#### Manuel Yayınlama

Eğer manuel yayınlamak isterseniz:

```bash
# 1. APK build edin
./scripts/build-production-apk.sh

# 2. Publishing dizinine geçin
cd publishing

# 3. Validasyon yapın
npm run validate

# 4. Release NFT oluşturun
npx dapp-store create release -k ../publisher-keypair.json -b $ANDROID_TOOLS_DIR -u https://api.devnet.solana.com -p 500000

# 5. Submit edin
npx dapp-store publish submit -k ../publisher-keypair.json -u https://api.devnet.solana.com --requestor-is-authorized --complies-with-solana-dapp-store-policies
```

### Adım 6: Review Süreci

1. **Solana Mobile Discord'a Katılın:**
   - https://discord.gg/solanamobile
   - #developer role alın
   - #dapp-store kanalında submit ettiğinizi bildirin

2. **Review Bilgileri:**
   - Review süresi: 3-7 gün
   - Contact: dAppStore@solanamobile.com
   - Portal: https://dapp-store-publisher-portal.solanamobile.com/

3. **Test Account:**
   - Email: test@strun.fun
   - Password: (review sırasında iletişimde verilmeli)

## 📱 Mainnet'e Yayınlama

Test tamamlandıktan sonra mainnet için:

1. **RPC URL'i değiştirin:**
   ```bash
   # publishing/.env
   SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
   # Veya daha hızlı private RPC kullanın (önerilir)
   ```

2. **Publisher keypair'e mainnet SOL gönderin:**
   ```bash
   # Minimum 0.5 SOL (NFT mint ve fees için)
   ```

3. **Tag ile yayınlayın:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

## 🔄 Güncelleme Yayınlama

Yeni version için:

1. **Version numarasını güncelleyin:**
   ```bash
   # publishing/config.yaml
   version_name: "1.0.1"  # Yeni version
   version_code: 2        # Artan sayı
   ```

2. **Tag oluşturun ve yayınlayın:**
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. **Otomatik olarak:**
   - Yeni Release NFT oluşturulur
   - dApp Store'a submit edilir
   - GitHub Release oluşturulur

## 🔍 Deployment Kontrolü

### GitHub Actions'da İzleme
1. Repository → Actions sekmesi
2. En son workflow'u inceleyin
3. Her adımın başarılı olduğunu kontrol edin

### dApp Store Portal'da İzleme
1. https://dapp-store-publisher-portal.solanamobile.com/
2. Publisher keypair ile giriş yapın
3. App status'ünü görüntüleyin

### Solana Explorer'da Kontrol
```
https://explorer.solana.com/address/<RELEASE_NFT_ADDRESS>?cluster=devnet
```

## 📊 dApp Store Link

Yayınlandıktan sonra:

**Devnet:**
```
solana-dapp://devnet/<APP_NFT_ADDRESS>
```

**Mainnet:**
```
solana-dapp://mainnet/<APP_NFT_ADDRESS>
```

App NFT Address: `config.yaml` dosyasında otomatik doldurulur.

## 🎯 Hızlı Başlangıç Checklist

- [ ] Android keystore oluşturuldu
- [ ] GitHub Secrets yapılandırıldı (10 adet)
- [ ] Solana publisher keypair oluşturuldu ve fonlandı
- [ ] Publisher NFT mint edildi
- [ ] App NFT mint edildi
- [ ] App address GitHub'a eklendi
- [ ] APK build testi yapıldı
- [ ] First release v1.0.0 tag'i ile yayınlandı
- [ ] Solana Discord'da review talep edildi
- [ ] Review tamamlandı ✅

## 🆘 Sorun Giderme

### APK Build Hatası
```bash
# Java version kontrolü
java -version  # 17 olmalı

# Android SDK kontrolü
echo $ANDROID_HOME
```

### Solana Transaction Başarısız
```bash
# RPC değiştirin (private RPC kullanın)
# Priority fee artırın: -p 1000000

# SOL balance kontrolü
solana balance <public-key>
```

### Digital Asset Links Hatası
```bash
# public/.well-known/assetlinks.json kontrolü
# SHA-256 fingerprint eşleşiyor mu?
keytool -list -v -keystore android/strun.keystore
```

## 📞 Destek

- **Email:** info@strun.fun
- **Discord:** Solana Mobile - #dapp-store
- **GitHub Issues:** Repository'nizdeki issues bölümü
- **dApp Store Team:** dAppStore@solanamobile.com

## 🔐 Güvenlik Notları

⚠️ **ASLA GitHub'a commit etmeyin:**
- `android/strun.keystore`
- `publisher-keypair.json`
- `publishing/.env`
- Şifreler ve private keys

✅ **Güvenli saklayın:**
- Keystore dosyasını 3 farklı yere yedekleyin
- Publisher keypair'i güvenli password manager'da saklayın
- Şifreleri encrypted not defterinde tutun
