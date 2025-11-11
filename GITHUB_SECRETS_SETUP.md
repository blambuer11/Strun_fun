# GitHub Secrets Yapılandırması

Solana dApp Store deployment için GitHub repository'nizde aşağıdaki secrets'ları yapılandırmalısınız.

## 📍 Secrets'ları Nasıl Eklerim?

1. GitHub repository'nize gidin
2. **Settings** sekmesine tıklayın
3. Sol menüden **Secrets and variables** → **Actions** seçin
4. **New repository secret** butonuna tıklayın
5. Secret adını ve değerini girin
6. **Add secret** butonuna tıklayın

## 🔑 Gerekli Secrets Listesi

### 1. ANDROID_KEYSTORE_BASE64
**Açıklama:** Android APK imzalamak için kullanılan keystore dosyasının base64 kodlanmış hali.

**Nasıl Oluşturulur:**
```bash
# Önce keystore oluşturun (eğer yoksa)
./scripts/create-keystore.sh

# Keystore'u base64'e çevirin
cat android/strun.keystore | base64 -w 0

# macOS için:
cat android/strun.keystore | base64

# Çıkan metni kopyalayın ve GitHub'a yapıştırın
```

**Örnek Değer:**
```
MIIKpAIBAzCCCl4GCSqGSIb3DQEHAaCCCk8EggpLMIIKRzCCBW0GCSqG...
(çok uzun bir metin olacak, tamamen kopyalayın)
```

---

### 2. KEYSTORE_PASSWORD
**Açıklama:** Keystore dosyasının şifresi.

**Değer:** Keystore oluştururken girdiğiniz şifre (örn: `MySecurePassword123!`)

**⚠️ Güvenlik:** Bu şifreyi çok güvenli tutun, kaybetmeyin!

---

### 3. KEY_PASSWORD
**Açıklama:** Keystore içindeki key'in şifresi.

**Değer:** Key için girdiğiniz şifre (genelde keystore password ile aynı)

**Not:** Eğer farklı bir şifre girdiyseniz, onu kullanın.

---

### 4. SOLANA_PUBLISHER_KEYPAIR
**Açıklama:** Solana dApp Store'da NFT mint etmek için kullanılacak keypair'in JSON formatı.

**Nasıl Oluşturulur:**
```bash
# Solana CLI kurun (eğer yoksa)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Yeni keypair oluşturun
solana-keygen new --outfile publisher-keypair.json

# Public address'i gösterin
solana-keygen pubkey publisher-keypair.json
# Örnek çıktı: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# Bu adrese SOL gönderin (mainnet için ~0.5 SOL)
# Devnet için test: solana airdrop 2 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --url devnet

# Keypair'in TAMAMEN içeriğini kopyalayın
cat publisher-keypair.json
```

**Örnek Değer:**
```json
[174,47,154,16,202,193,206,113,199,190,53,133,169,175,31,56,222,53,138,189,224,216,117,173,10,149,44,138,57,104,118,129,235,245,183,249,214,98,167,43,98,221,144,35,156,186,23,165,28,53,163,240,242,196,139,151,20,173,196,53,204,7,141,27]
```

**⚠️ ÇOK ÖNEMLİ:** Bu keypair'i başka hiçbir yere yazmayın, sadece GitHub Secrets'a ekleyin!

---

### 5. DAPP_STORE_APP_ADDRESS
**Açıklama:** İlk defa App NFT oluşturduğunuzda alacağınız adres.

**Ne Zaman Eklenir:** İlk deployment'tan SONRA, publisher ve app NFT'lerini oluşturduktan sonra.

**Nasıl Bulunur:**
```bash
# İlk defa manuel olarak app NFT oluşturduktan sonra
cd publishing
npx dapp-store create app -k ../publisher-keypair.json -u https://api.devnet.solana.com -p 500000

# Terminal çıktısında göreceksiniz:
# App created: <APP_ADDRESS>
# Bu adresi kopyalayın

# VEYA config.yaml dosyasına bakın:
cat config.yaml | grep "address:"
```

**Örnek Değer:**
```
8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR2
```

**Not:** İlk deployment için bu secret boş kalabilir, daha sonra eklersiniz.

---

### 6. VITE_SUPABASE_URL
**Açıklama:** Supabase project URL'iniz.

**Değer:**
```
https://ysutwfzdpfvziasxbbvn.supabase.co
```

---

### 7. VITE_SUPABASE_PUBLISHABLE_KEY
**Açıklama:** Supabase anon/public key'iniz.

**Değer:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdXR3ZnpkcGZ2emlhc3hiYnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzIzNTEsImV4cCI6MjA3NTMwODM1MX0.itprn-w66ZuVLV7ybtlfA4vSztf1iTW2UTOZXNrTafY
```

---

### 8. VITE_SUPABASE_PROJECT_ID
**Açıklama:** Supabase project ID'niz.

**Değer:**
```
ysutwfzdpfvziasxbbvn
```

---

### 9. GOOGLE_MAPS_API_KEY (Opsiyonel)
**Açıklama:** Google Maps API key'i (harita özellikleri için).

**Nasıl Oluşturulur:**
1. https://console.cloud.google.com/google/maps-apis
2. API key oluşturun
3. Maps JavaScript API, Geocoding API, Static Maps API'yi etkinleştirin

**Not:** Bu olmadan da deployment çalışır, ancak harita özellikleri kısıtlı olur.

---

### 10. DISCORD_WEBHOOK_URL (Opsiyonel)
**Açıklama:** Deployment bildirimlerini Discord'a göndermek için webhook URL.

**Nasıl Oluşturulur:**
1. Discord sunucunuzda bir kanala sağ tıklayın
2. **Edit Channel** → **Integrations** → **Webhooks**
3. **New Webhook** oluşturun
4. **Copy Webhook URL**

**Örnek Değer:**
```
https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
```

---

## ✅ Secrets Kontrol Listesi

Deployment yapmadan önce bu listede işaretleyin:

- [ ] ANDROID_KEYSTORE_BASE64 ✓
- [ ] KEYSTORE_PASSWORD ✓
- [ ] KEY_PASSWORD ✓
- [ ] SOLANA_PUBLISHER_KEYPAIR ✓
- [ ] DAPP_STORE_APP_ADDRESS (ilk deploy sonrası)
- [ ] VITE_SUPABASE_URL ✓
- [ ] VITE_SUPABASE_PUBLISHABLE_KEY ✓
- [ ] VITE_SUPABASE_PROJECT_ID ✓
- [ ] GOOGLE_MAPS_API_KEY (opsiyonel)
- [ ] DISCORD_WEBHOOK_URL (opsiyonel)

## 🔐 Güvenlik Uyarıları

⚠️ **ASLA:**
- Bu secrets'ları kod içinde yazmayın
- GitHub issues/comments'te paylaşmayın
- Screenshot'larında görünmesine izin vermeyin
- Public repository'de saklamamayın

✅ **DAIMA:**
- Secret değerleri güvenli password manager'da yedekleyin
- Publisher keypair'in 3 farklı backup'ını alın
- Keystore dosyasını güvenli cloud storage'da saklayın
- Şifreleri karmaşık ve güçlü yapın

## 🚀 Deployment Sonrası

Tüm secrets'lar eklendikten sonra:

```bash
# Tag oluşturun ve push edin
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions otomatik olarak çalışacak
# Actions sekmesinden ilerlemeyi izleyin
```

## 🆘 Sorunlar?

**Secret düzenleme:** Bir kez ekledikten sonra secret değerini göremezsiniz, sadece yeniden ekleyebilirsiniz.

**Secret silme:** Secret adının yanındaki "Remove" butonuyla silebilirsiniz.

**Test etme:** Secrets'ı test etmek için workflow'u manuel çalıştırın (Actions → workflow seçin → Run workflow).

---

**Hazır mısınız?** → `SOLANA_DAPP_STORE_DEPLOYMENT.md` dosyasındaki deployment adımlarına geçin!
