# Strun - Google Play Store Yayın Rehberi

Uygulamanızı Google Play Store'a yayınlamak için gereken tüm adımlar ve bilgiler.

## 📋 Ön Hazırlık Kontrol Listesi

### ✅ Gerekli Dosyalar
- [x] APK build script (`scripts/build-production-apk.sh`)
- [x] Keystore oluşturma scripti (`scripts/create-keystore.sh`)
- [x] Privacy Policy (`public/privacy-policy.html` - https://strun.fun/privacy-policy.html)
- [x] Support sayfası (`public/support.html` - https://strun.fun/support.html)
- [x] Uygulama ikonları (`public/pwa-512x512.png`)
- [ ] Google Play Store görselleri (aşağıda oluşturulacak)

### ✅ Teknik Gereksinimler
- [x] Android Target SDK: 34
- [x] Minimum SDK: 24
- [x] App ID: `app.strun.mobile`
- [x] Version: 1.0.0 (code: 1)
- [x] Lokasyon izinleri tanımlı
- [x] Notification izinleri tanımlı

---

## 🎨 ADIM 1: Google Play Store Görsellerini Hazırla

Google Play Store farklı boyutlarda görseller gerektirir:

### Gerekli Görseller:

1. **Uygulama İkonu** (512x512 PNG)
   - ✅ Mevcut: `public/pwa-512x512.png`
   - Arka plan şeffaf OLMAMALI

2. **Özellik Görseli** (1024x500 PNG/JPG)
   - Ana banner, Play Store'da üstte görünür
   - Metin minimal olmalı (görsel ön planda)

3. **Telefon Ekran Görüntüleri** (Minimum 2, Maksimum 8)
   - Önerilen boyut: 1080x1920 veya 1080x2400 (portrait)
   - Tüm screenshot'lar aynı aspect ratio'da olmalı
   - En az 2 screenshot gerekli
   - İdeal: 4-6 screenshot (farklı özellikler göster)

4. **7-inch Tablet Screenshots** (Opsiyonel, önerilir)
   - Boyut: 1200x1920
   - Minimum 2 screenshot

5. **10-inch Tablet Screenshots** (Opsiyonel)
   - Boyut: 1920x2560
   - Minimum 2 screenshot

6. **Promo Video** (Opsiyonel)
   - YouTube URL
   - 30-120 saniye önerilir

### Görsel Hazırlama Komutları:

```bash
# Klasör oluştur
mkdir -p publishing/google-play/assets

# Özellik görseli oluştur (örnekle)
convert publishing/media/banner-1200x600.png \
  -resize 1024x500! \
  publishing/google-play/assets/feature-graphic.png

# Ekran görüntülerini düzenle (1080x1920)
# Mevcut screenshot'ları kullan ve boyutlandır
convert publishing/media/screenshot-login.png \
  -resize 1080x1920 \
  -background white -gravity center -extent 1080x1920 \
  publishing/google-play/assets/screenshot-1-login.png

convert publishing/media/screenshot-tasks.png \
  -resize 1080x1920 \
  -background white -gravity center -extent 1080x1920 \
  publishing/google-play/assets/screenshot-2-tasks.png

convert publishing/media/screenshot-myland.png \
  -resize 1080x1920 \
  -background white -gravity center -extent 1080x1920 \
  publishing/google-play/assets/screenshot-3-myland.png
```

**ÖNEMLİ:** Ekran görüntüleri gerçek uygulama içeriği göstermeli:
- Login/Onboarding ekranı
- Ana özellikler (Run tracking, Tasks, My Land)
- Community/Social features
- Wallet integration
- Örnek rewards/achievements

---

## 🔑 ADIM 2: APK'yı Oluştur ve İmzala

### 2.1. Keystore Oluştur (İlk Kez)

```bash
./scripts/create-keystore.sh

# Çıktıda gösterilen bilgileri kaydet:
# - Keystore path: strun-release.keystore
# - Key alias: strun-key
# - SHA-256 fingerprint
# - Passwords

# Keystore'u güvenli yerlere backup'la
cp strun-release.keystore ~/Dropbox/strun-backups/
cp strun-release.keystore ~/Google\ Drive/strun-backups/
```

### 2.2. Production APK Build Et

```bash
# APK'yı build et
./scripts/build-production-apk.sh

# Şifreler sorulduğunda keystore oluştururken belirlediğin şifreleri gir

# Çıktı: publishing/files/strun-release.apk
```

### 2.3. APK'yı Test Et

```bash
# Test cihazına yükle
adb devices  # Cihaz bağlı mı kontrol et
adb install -r publishing/files/strun-release.apk

# Test et:
# ✅ Uygulama açılıyor
# ✅ Email login çalışıyor
# ✅ Wallet bağlanıyor
# ✅ GPS tracking çalışıyor
# ✅ Task oluşturuluyor
# ✅ Land NFT mint edilebiliyor
# ✅ Community feed çalışıyor
```

---

## 🚀 ADIM 3: Google Play Console'da Uygulama Oluştur

### 3.1. Google Play Console'a Giriş

1. https://play.google.com/console adresine git
2. Google hesabınla giriş yap
3. **Gerekli:** Bir kerelik $25 developer kayıt ücreti öde (eğer ilk kez kayıt oluyorsan)

### 3.2. Yeni Uygulama Oluştur

1. "Create app" butonuna tıkla
2. Formu doldur:

**App Details:**
- **App name:** Strun
- **Default language:** English (United States)
- **App or game:** App
- **Free or paid:** Free

**Declarations:**
- [ ] ✅ Comply with Google Play's Developer Program Policies
- [ ] ✅ Comply with US export laws
- [ ] ✅ App content (privacy policy link gerekli)

3. "Create app" tıkla

---

## 📝 ADIM 4: Store Listing (Mağaza Bilgileri)

Google Play Console → Store presence → Main store listing

### App Details (Uygulama Detayları)

**App name:**
```
Strun - Run, Own Land, Earn Crypto
```

**Short description (80 karakter max):**
```
Run to own NFT land, earn SOL & USDC rent. AI tasks with blockchain rewards.
```

**Full description (4000 karakter max):**
```
🏃 Run. Own. Earn.

Strun revolutionizes fitness by combining running with blockchain ownership. Every step claims territory as NFT land parcels on Solana blockchain.

🔥 KEY FEATURES

🏃 Track & Earn
• Real-time GPS tracking with route mapping
• Earn XP and level up with every run
• Mint run history as verifiable NFTs
• Compete on leaderboards

🗺️ Own Land
• Claim hexagonal parcels (H3 grid system)
• Mint Land NFTs for areas you've run
• Set rent prices in USDC for your parcels
• Earn passive income when others use your land

💰 Crypto Payments
• Instant on-chain USDC payments
• Pay rent to land owners seamlessly
• Verified transactions on Solana blockchain
• Low fees, sub-second confirmations

🎯 AI-Powered Tasks
• Location-based challenges powered by AI
• Photo verification with computer vision
• SOL and USDC rewards for completing tasks
• Community-created sponsored tasks

🤝 Social Features
• Share achievements to community feed
• Join group runs and challenges
• Follow friends and compete
• Unlock exclusive badges

🏆 Progression System
• XP-based leveling (100 XP = 1 level)
• Daily task limits reset each day
• Referral rewards for inviting friends
• Achievement badges and milestones

⚡ Blockchain Benefits
• True ownership of fitness data
• Transparent, verifiable achievements
• Decentralized land ownership economy
• Interoperable NFTs (tradeable)
• Community-driven rewards

🔧 Technology
• Built on Solana blockchain
• Mobile Wallet Adapter integration
• Supports Phantom, Solflare, and other Solana wallets
• IPFS decentralized storage
• Real-time anti-cheat systems

🚀 Getting Started
1. Create account & connect Solana wallet
2. Enable GPS permissions
3. Start your first run
4. Claim land and complete tasks
5. Earn rewards and level up!

Join the Web3 fitness revolution. Download Strun today!

📧 Support: info@strun.fun
🌐 Website: https://strun.fun
```

### Graphic Assets (Görseller)

Upload etmeniz gerekenler:

1. **App icon** (512x512)
   - Upload: `public/pwa-512x512.png`

2. **Feature graphic** (1024x500)
   - Upload: `publishing/google-play/assets/feature-graphic.png`

3. **Phone screenshots** (Minimum 2)
   - Upload: `publishing/google-play/assets/screenshot-*.png`
   - En az 2, en çok 8 screenshot
   - Sıralama önemli (ilk 2-3 en önemli özellikler olmalı)

4. **Tablet screenshots** (Opsiyonel ama önerilir)
   - 7-inch ve 10-inch için ayrı screenshot'lar

### Categorization (Kategori)

**App category:**
```
Health & Fitness
```

**Tags (en çok 5):**
```
- fitness
- running
- blockchain
- crypto
- nft
```

### Contact Details

**Email:**
```
info@strun.fun
```

**Phone:** (Opsiyonel)
```
[Telefon numaranız varsa]
```

**Website:**
```
https://strun.fun
```

### External Marketing (Opsiyonel)

**Privacy Policy URL:**
```
https://strun.fun/privacy-policy.html
```

---

## 🔒 ADIM 5: App Content (Uygulama İçeriği)

### Privacy Policy

**Privacy policy URL:**
```
https://strun.fun/privacy-policy.html
```

### App Access

**All functionality available without restrictions?**
```
No
```

**Instructions for access:**
```
App requires:
1. Email account creation (instant, no verification)
2. Solana wallet (Phantom or Solflare recommended)
3. Location permissions for GPS tracking
4. Camera permissions for photo tasks (optional)

Test account:
Email: test@strun.fun
Password: TestStrun2024!

Note: Wallet connection required for blockchain features.
```

### Ads

**Does your app contain ads?**
```
No
```

### Content Rating

Questionnaire doldurulacak. Örnek cevaplar:

**App category:** Health & Fitness

**Violence:**
- Contains violence? No
- Contains blood? No

**Sexual Content:**
- Contains sexual content? No

**Language:**
- Contains profanity? No

**Controlled Substances:**
- References drugs/alcohol/tobacco? No

**Gambling:**
- Contains simulated gambling? No

**User Interaction:**
- Users can interact? Yes
- Users can share personal info? Yes (wallet addresses, photos, posts)
- User-generated content? Yes (community posts, photos)

**Expected Rating:** PEGI 3 / ESRB Everyone

### Target Audience & Content

**Age groups:**
```
- 18-24: Yes
- 25-34: Yes
- 35-44: Yes
- 45-54: Yes
- 55+: Yes
```

**Target age group:** Adults (18+)

### News Apps (Geçersiz)
```
Is this a news app? No
```

### COVID-19 Contact Tracing & Status Apps (Geçersiz)
```
Is this a COVID-19 app? No
```

### Data Safety

**Data Collection (Toplanan Veriler):**

Location data:
- Precise location: Yes (for GPS tracking)
- Approximate location: Yes
- Purpose: App functionality (route tracking)
- Optional: No
- Encrypted in transit: Yes
- Can user request deletion: Yes

Personal info:
- Email address: Yes
- Purpose: Account management
- Optional: No
- Encrypted: Yes
- Can delete: Yes

Photos:
- Photos: Yes (for task verification)
- Purpose: App functionality
- Optional: Yes
- Encrypted: Yes
- Can delete: Yes

App activity:
- App interactions: Yes
- Purpose: Analytics
- Optional: No
- Encrypted: Yes
- Can delete: Yes

Financial info:
- Payment info: No (uses external wallet)

**Data Sharing:**
- Do you share data with third parties? No
- Blockchain data is public by design (explain in privacy policy)

**Data Security:**
- Is data encrypted in transit? Yes
- Can users request data deletion? Yes
- Committed to Google Play Families Policy? No (not a family app)

### Government Apps (Geçersiz)
```
Is this a government app? No
```

---

## 📦 ADIM 6: App Release (Uygulama Yayını)

### Production Track

**Select countries/regions:**
```
Worldwide (All countries)
```

**veya specific countries:**
```
- Turkey
- United States
- United Kingdom
- Germany
- France
- Spain
- Italy
- Netherlands
- UAE
- Saudi Arabia
(daha fazla ekle)
```

### Create Release

1. "Create new release" tıkla

2. **App signing by Google Play:**
   - "Continue" ile Google Play App Signing'i aktif et
   - Google, APK'nızı kendi anahtarıyla imzalayacak
   - Upload ettiğiniz APK "Upload key" olarak kullanılacak

3. **Upload APK:**
   - `publishing/files/strun-release.apk` dosyasını sürükle-bırak

4. **Release name:**
   ```
   1.0.0 (Initial Release)
   ```

5. **Release notes (Sürüm notları):**
   ```
   🎉 Initial Release - Strun v1.0.0

   Features:
   • GPS run tracking with route mapping
   • Land NFT minting on Solana blockchain
   • AI-powered location-based tasks
   • Instant USDC payments and rent system
   • Community feed and social features
   • XP progression and achievements
   • Wallet integration (Phantom, Solflare)

   Join the Web3 fitness revolution!
   ```

6. "Save" → "Review release"

7. **Rollout percentage:**
   - İlk release için: 20% (test için)
   - Sorun yoksa: 50% → 100%

8. "Start rollout to production"

---

## ✅ ADIM 7: Review Submission Checklist

Release'i göndermeden önce kontrol et:

### Store Listing
- [x] App name, short/long description yazıldı
- [x] 512x512 app icon yüklendi
- [x] 1024x500 feature graphic yüklendi
- [x] Minimum 2 phone screenshot yüklendi
- [x] Category seçildi (Health & Fitness)
- [x] Contact email eklendi (info@strun.fun)
- [x] Privacy policy URL eklendi

### App Content
- [x] Privacy policy URL doğrulandı
- [x] Content rating questionnaire dolduruldu
- [x] Target audience seçildi
- [x] Data safety form dolduruldu
- [x] App access instructions (test account) yazıldı

### App Releases
- [x] APK uploaded and signed
- [x] Release notes yazıldı
- [x] Countries selected
- [x] Rollout percentage belirlendi

---

## ⏱️ ADIM 8: Review Süreci

### Bekleme Süresi
- **Ortalama:** 3-7 gün
- **Hızlı:** 1-2 gün
- **Yavaş:** 7-14 gün (eğer manuel review gerekirse)

### Review Durumu
Google Play Console'da takip edilebilir:
- "Under review" → Google inceliyor
- "Approved" → Onaylandı, yayında!
- "Rejected" → Reddedildi (feedback kontrol et)

### Olası Red Nedenleri ve Çözümleri

**1. Privacy Policy Eksik/Yetersiz**
- Çözüm: Privacy policy'de location, camera, ve blockchain data collection açıkça belirtilmeli

**2. Permissions İzahı Yetersiz**
- Çözüm: App description'da her permission'ın neden gerekli olduğunu açıkla

**3. Misleading Content**
- Çözüm: Screenshot'lar ve description gerçek app functionality göstermeli

**4. Minimum Functionality**
- Çözüm: App test edilebilir olmalı, test account bilgileri verilmeli

**5. Blockchain/Crypto Policy**
- Çözüm: Google'ın crypto policy'sine uygunluk (NFT, gambling değil, utility)

---

## 📊 ADIM 9: Yayın Sonrası

### Monitoring

**Play Console Dashboard:**
- Crashes & ANRs: Düzenli kontrol et
- Ratings & reviews: Kullanıcı geri bildirimleri
- User acquisition: Download istatistikleri
- Pre-launch reports: Google'ın otomatik testleri

### Marketing

**Play Store Optimization (ASO):**
- Anahtar kelime optimizasyonu
- A/B testing (screenshots, description)
- Promo campaigns

**External Marketing:**
- Website: https://strun.fun
- Social media (Twitter, Reddit, Discord)
- Press releases
- Influencer partnerships

### Updates

**Güncelleme Yayınlama:**
```bash
# 1. Version güncelle
# capacitor.config.ts → version
# twa-manifest.json → appVersionCode, appVersionName

# 2. Yeni APK build et
./scripts/build-production-apk.sh

# 3. Play Console'da yeni release oluştur
# Production → Create new release
# APK upload → Release notes → Save → Review → Start rollout
```

---

## 🎯 Google Play Store Başvurusu İçin Gerekli Argümanlar

Başvuru formunda doldurmanız gereken tüm bilgiler:

### 1. App Details (Uygulama Detayları)
```yaml
App Name: "Strun - Run, Own Land, Earn Crypto"
Package Name: "app.strun.mobile"
Default Language: "English (United States)"
App Type: "App"
Category: "Health & Fitness"
Free or Paid: "Free"
Contains Ads: "No"
```

### 2. Store Listing
```yaml
Short Description: "Run to own NFT land, earn SOL & USDC rent. AI tasks with blockchain rewards."
Full Description: [Yukarıdaki uzun açıklama]
App Icon: "public/pwa-512x512.png"
Feature Graphic: "publishing/google-play/assets/feature-graphic.png"
Screenshots: 
  - "publishing/google-play/assets/screenshot-1-login.png"
  - "publishing/google-play/assets/screenshot-2-tasks.png"
  - "publishing/google-play/assets/screenshot-3-myland.png"
Tags: ["fitness", "running", "blockchain", "crypto", "nft"]
```

### 3. Contact Information
```yaml
Email: "info@strun.fun"
Website: "https://strun.fun"
Phone: "[Opsiyonel]"
```

### 4. Privacy & Legal
```yaml
Privacy Policy URL: "https://strun.fun/privacy-policy.html"
Terms of Service URL: "https://strun.fun/terms"
```

### 5. App Access (Test Account)
```yaml
All Functionality Available: "No"
Access Instructions: |
  App requires:
  1. Email account creation (instant, no verification needed)
  2. Solana wallet (Phantom or Solflare recommended)
  3. Location permissions for GPS tracking
  4. Camera permissions for photo tasks (optional)
  
  Test Account:
  Email: test@strun.fun
  Password: TestStrun2024!
  
  Notes: 
  - Wallet connection required for blockchain features
  - GPS simulation can be used for testing
  - SOL tokens needed for transaction fees (testnet supported)
```

### 6. Content Rating
```yaml
App Category: "Health & Fitness"
Violence: "No"
Sexual Content: "No"
Profanity: "No"
Controlled Substances: "No"
Gambling: "No"
User Interaction: "Yes"
Shares Personal Info: "Yes"
User Generated Content: "Yes"
Expected Rating: "PEGI 3 / ESRB Everyone"
```

### 7. Target Audience
```yaml
Target Age Groups: ["18-24", "25-34", "35-44", "45-54", "55+"]
Primary Target: "Adults (18+)"
```

### 8. Data Safety Declaration
```yaml
Location Data:
  Collected: "Yes"
  Types: ["Precise location", "Approximate location"]
  Purpose: "App functionality (GPS tracking)"
  Optional: "No"
  Encrypted: "Yes"
  Deletable: "Yes"

Personal Info:
  Collected: "Yes"
  Types: ["Email address", "Name"]
  Purpose: "Account management"
  Optional: "No"
  Encrypted: "Yes"
  Deletable: "Yes"

Photos:
  Collected: "Yes"
  Purpose: "App functionality (task verification)"
  Optional: "Yes"
  Encrypted: "Yes"
  Deletable: "Yes"

App Activity:
  Collected: "Yes"
  Types: ["App interactions", "In-app search history"]
  Purpose: "Analytics, App functionality"
  Optional: "No"
  Encrypted: "Yes"
  Deletable: "Yes"

Financial Info:
  Collected: "No"
  Note: "Uses external Solana wallet (Phantom/Solflare)"

Data Sharing: "No"
Data Encrypted in Transit: "Yes"
Data Deletion Available: "Yes"
```

### 9. App Releases
```yaml
Version Code: 1
Version Name: "1.0.0"
Release Type: "Production"
Countries: "Worldwide" # veya specific list
Rollout Percentage: 20% # İlk release için
APK Path: "publishing/files/strun-release.apk"

Release Notes: |
  🎉 Initial Release - Strun v1.0.0

  Features:
  • GPS run tracking with route mapping
  • Land NFT minting on Solana blockchain
  • AI-powered location-based tasks
  • Instant USDC payments and rent system
  • Community feed and social features
  • XP progression and achievements
  • Wallet integration (Phantom, Solflare)

  Join the Web3 fitness revolution!
```

---

## 🚨 Önemli Notlar

### ⚠️ Google Play vs Solana dApp Store

**ÖNEMLİ:** Google Play ve Solana dApp Store için **AYNI APK'yı kullanabilirsiniz**, ancak:

1. **Signing farklı:**
   - Google Play: Google'ın kendi anahtarıyla yeniden imzalar
   - Solana dApp Store: Sizin upload key'inizle kalır

2. **Asset'ler farklı:**
   - Google Play: 1024x500 feature graphic gerekli
   - Solana dApp Store: 1200x600 banner gerekli

3. **Review süreci farklı:**
   - Google Play: Otomatik + manuel review (3-7 gün)
   - Solana dApp Store: Manuel review + Discord onay (2-7 gün)

### 💰 Maliyetler

```yaml
Google Play Developer Account: $25 (bir kerelik)
Domain (strun.fun): ~$12/yıl
Supabase/Lovable Cloud: Kullanıma göre
Solana dApp Store: ~0.2 SOL (NFT minting)
```

### 📞 Destek

**Google Play Review Issues:**
- Play Console → Help & Feedback
- Email: googledevelopers@google.com

**App-Specific Support:**
- Email: info@strun.fun
- Website: https://strun.fun

---

## ✅ Hepsi Hazır!

Tüm bu adımları tamamladıktan sonra uygulamanız hem Google Play Store hem de Solana dApp Store'da yayında olacak! 🎉

**Son Checklist:**
- [ ] APK build edildi ve test edildi
- [ ] Tüm görsel asset'ler hazırlandı
- [ ] Google Play Console'da app oluşturuldu
- [ ] Store listing tamamlandı
- [ ] App content formu dolduruldu
- [ ] Release başlatıldı
- [ ] Review submitted

**İyi şanslar! 🚀**
