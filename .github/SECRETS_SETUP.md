# GitHub Secrets Setup Guide

Bu dosya, GitHub Actions için gerekli secret'ların nasıl ayarlanacağını gösterir.

## 🔐 Required Secrets

### 1. ANDROID_KEYSTORE_BASE64

Android keystore dosyasının base64 encoded versiyonu.

**Oluşturma:**
```bash
# Önce keystore oluştur (ilk kez)
./scripts/create-keystore.sh

# Base64'e çevir
cat android/app/strun-release.keystore | base64 > keystore-base64.txt

# Windows için:
certutil -encode android/app/strun-release.keystore keystore-base64.txt

# Linux/Mac için tek satırda:
cat android/app/strun-release.keystore | base64 | tr -d '\n'
```

**GitHub'a Ekleme:**
1. Repository → Settings → Secrets and variables → Actions
2. New repository secret
3. Name: `ANDROID_KEYSTORE_BASE64`
4. Value: Base64 string'i yapıştır

---

### 2. KEYSTORE_PASSWORD

Keystore dosyasının şifresi.

**Value:** Keystore oluştururken girdiğin şifre (örn: `YourSecurePassword123`)

---

### 3. KEY_ALIAS

Keystore içindeki key'in alias'ı.

**Value:** `strun-key` (veya `create-keystore.sh` çalıştırırken farklı bir alias kullandıysan o)

---

### 4. KEY_PASSWORD

Key'in şifresi.

**Value:** Genelde keystore password ile aynı (keystore oluştururken girdiğin)

---

### 5. SOLANA_KEYPAIR

Solana wallet keypair JSON dosyası.

**Oluşturma:**
```bash
# Solana CLI kur
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Yeni wallet oluştur
solana-keygen new --outfile ~/.config/solana/id.json

# Public key'i görüntüle
solana-keygen pubkey ~/.config/solana/id.json

# Devnet SOL al (test için)
solana airdrop 2 --url devnet

# Keypair'i kopyala
cat ~/.config/solana/id.json
```

**GitHub'a Ekleme:**
1. Yukarıdaki komutla çıkan JSON array'i kopyala
2. Repository → Settings → Secrets and variables → Actions
3. New repository secret
4. Name: `SOLANA_KEYPAIR`
5. Value: JSON array'i yapıştır (örn: `[123,45,67,...]`)

---

### 6. VITE_SUPABASE_URL

Supabase project URL'i.

**Value:** `https://ysutwfzdpfvziasxbbvn.supabase.co`

---

### 7. VITE_SUPABASE_ANON_KEY

Supabase anonymous key.

**Value:** `.env` dosyasından kopyala veya:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdXR3ZnpkcGZ2emlhc3hiYnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzIzNTEsImV4cCI6MjA3NTMwODM1MX0.itprn-w66ZuVLV7ybtlfA4vSztf1iTW2UTOZXNrTafY
```

---

## ✅ Verification Checklist

Secret'ları ekledikten sonra kontrol et:

```bash
# Local'de build test et
npm run build
npx cap sync android
cd android
./gradlew assembleRelease

# APK oluştuysa secret'lar doğrudur
ls -lh app/build/outputs/apk/release/
```

## 🔒 Security Best Practices

1. **Asla Git'e commit etme:**
   - Keystore dosyaları
   - Password'ler
   - Private key'ler
   - Keypair'ler

2. **Güvenli yedekleme:**
   - Keystore'u 1Password, LastPass gibi yerlerde sakla
   - Keypair'i güvenli bir cloud'da tut
   - Password'leri şifreli not defterine yaz

3. **Erişim kontrolü:**
   - Sadece gerekli kişilere secret erişimi ver
   - GitHub repository'yi private tut
   - 2FA aktif et

## 🆘 Sorun Giderme

### Secret görmüyorum
- Repository admin olman gerekiyor
- Settings → Secrets yerine Secrets and variables → Actions'a git

### Base64 encoding çalışmıyor
**Linux/Mac:**
```bash
base64 -i android/app/strun-release.keystore -o keystore.base64
cat keystore.base64 | tr -d '\n' > keystore-oneline.txt
```

**Windows:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android\app\strun-release.keystore")) | Out-File keystore-base64.txt
```

### Solana keypair hatası
```bash
# Format'ı kontrol et - array olmalı
cat ~/.config/solana/id.json | jq

# JSON valid mi?
cat ~/.config/solana/id.json | jq . > /dev/null && echo "Valid JSON" || echo "Invalid JSON"
```

### Build hala başarısız
1. Secrets'ların isimlerini kontrol et (case-sensitive)
2. Boşluk karakteri olmamalı
3. Satır sonu karakterlerini temizle

## 📝 Secret'ları Güncelleme

Bir secret'ı güncellemek için:

1. Settings → Secrets and variables → Actions
2. Secret'ın yanındaki "Update" butonuna tıkla
3. Yeni değeri gir
4. "Update secret" tıkla

## 🎯 Hızlı Setup Komutu

Tüm secret'ları tek komutla eklemek için (GitHub CLI gerekli):

```bash
# GitHub CLI kur
# Mac: brew install gh
# Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# Login
gh auth login

# Secret'ları ekle
gh secret set ANDROID_KEYSTORE_BASE64 < keystore-base64.txt
gh secret set KEYSTORE_PASSWORD -b"YourPassword"
gh secret set KEY_ALIAS -b"strun-key"
gh secret set KEY_PASSWORD -b"YourPassword"
gh secret set SOLANA_KEYPAIR < ~/.config/solana/id.json
gh secret set VITE_SUPABASE_URL -b"https://ysutwfzdpfvziasxbbvn.supabase.co"
gh secret set VITE_SUPABASE_ANON_KEY -b"eyJhbGc..."

# Verify
gh secret list
```
