# Publishing Assets Requirements

Place all required assets in this directory before publishing.

## Required Assets

### 1. App Icon (`icon-512.png`)

**Specifications:**
- Size: Exactly 512 x 512 pixels
- Format: PNG with transparency (alpha channel)
- File size: < 1 MB
- Design: Follow [Google Play Icon Guidelines](https://developer.android.com/google-play/resources/icon-design-specifications)

**Design Tips:**
- Use simple, recognizable imagery
- Avoid text (except short acronyms)
- Ensure visibility at small sizes (48x48)
- Test on light and dark backgrounds
- Maintain brand consistency

**How to Create:**
```bash
# From Figma/Sketch export at 512x512
# Or resize existing logo:
convert logo.png -resize 512x512 icon-512.png

# Optimize file size:
pngquant icon-512.png --output icon-512-optimized.png
```

### 2. Banner Graphic (`banner-1200x600.png`)

**Specifications:**
- Size: Exactly 1200 x 600 pixels (2:1 ratio)
- Format: PNG or JPG
- File size: < 2 MB
- Design: Eye-catching, represents app well

**Content Guidelines:**
- Include app name/logo
- Show key features visually
- Avoid excessive text
- Use high contrast for readability

**Template:**
```
┌─────────────────────────────────────────┐
│  [Logo]     STRUN                       │
│                                         │
│  Move. Earn. Own.                       │
│  [Screenshot] [Screenshot] [Screenshot] │
└─────────────────────────────────────────┘
```

### 3. Feature Graphic (`feature-1200x1200.png`) - OPTIONAL

**Specifications:**
- Size: Exactly 1200 x 1200 pixels (1:1 ratio)
- Format: PNG or JPG
- File size: < 2 MB
- Purpose: Featured in Editor's Choice carousel

**When to Include:**
- If aiming for Editor's Choice placement
- If you have high-quality promotional art

### 4. Screenshots (Minimum 4 required)

**Specifications:**
- Minimum resolution: 1080 pixels (width or height)
- Recommended: 1920 x 1080 pixels (landscape) or 1080 x 1920 (portrait)
- Format: PNG or JPG
- File size: < 5 MB each
- Minimum quantity: 4
- Maximum quantity: 8

**Critical Rules:**
- ✅ **ALL screenshots MUST have same orientation** (all landscape OR all portrait)
- ✅ **ALL screenshots MUST have same aspect ratio** (e.g., all 16:9)
- ❌ Do NOT mix landscape and portrait
- ❌ Do NOT mix different aspect ratios

**Recommended Screenshots:**

1. `screenshot-1-dashboard.png`
   - Main dashboard with stats, wallet, profile
   - Show XP, level, balance prominently

2. `screenshot-2-run-tracking.png`
   - Active run with map and real-time stats
   - Highlight GPS tracking and route visualization

3. `screenshot-3-tasks.png`
   - Task list or task details
   - Show rewards (SOL, USDC, XP)

4. `screenshot-4-land-nft.png`
   - Land parcel ownership or "My Land" screen
   - Display owned parcels on map

5. `screenshot-5-community.png` (optional)
   - Community feed with posts and achievements

6. `screenshot-6-wallet.png` (optional)
   - Wallet page showing balances and transactions

**How to Capture:**

**Method 1: Device Screenshot**
```bash
# Android (via adb)
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./

# iOS Simulator
Cmd + S (saves to Desktop)
```

**Method 2: Chrome DevTools**
```bash
# Open app in Chrome
# Press F12 → Toggle Device Toolbar (Cmd+Shift+M)
# Set device to Pixel 5 (1080x2340)
# Capture screenshot
```

**Method 3: Figma Mockups** (Recommended for clean screenshots)
```bash
# Use device frames from:
# - Facebook Design Resources
# - Figma Device Mockup plugins
# Place actual app screenshots inside frames
```

### 5. Preview Video (`preview-video.mp4`) - OPTIONAL

**Specifications:**
- Format: MP4
- Resolution: Minimum 720p (1280x720), recommended 1080p (1920x1080)
- Duration: 15 seconds - 2 minutes
- File size: < 100 MB
- Codec: H.264
- Audio: Optional (AAC recommended)

**Requirements:**
- Must have `ffmpeg` installed on your system
- Video should showcase key features
- Keep it engaging and fast-paced

**How to Create:**

**Screen Recording:**
```bash
# MacOS (QuickTime)
# File → New Screen Recording → Record

# Android
adb shell screenrecord /sdcard/demo.mp4
adb pull /sdcard/demo.mp4

# iOS
# Use built-in Screen Recording in Control Center
```

**Editing:**
```bash
# Trim video
ffmpeg -i input.mp4 -ss 00:00:05 -to 00:01:30 -c copy output.mp4

# Add fade in/out
ffmpeg -i input.mp4 -vf "fade=t=in:st=0:d=1,fade=t=out:st=29:d=1" output.mp4

# Compress for smaller file size
ffmpeg -i input.mp4 -vcodec h264 -acodec aac -b:v 2M output.mp4
```

### 6. Release APK (`app-release.apk`)

**Specifications:**
- Must be signed with production keystore (not debug)
- Must NOT be signed with Google Play key (if planning dual distribution)
- Version code must match `config.yaml`

**How to Generate:**
```bash
# From TWA directory
cd ../twa
./gradlew assembleRelease

# APK location:
# twa/app/build/outputs/apk/release/app-release.apk

# Copy to publishing media
cp app/build/outputs/apk/release/app-release.apk ../publishing/media/
```

**Verify Signature:**
```bash
jarsigner -verify -verbose -certs app-release.apk
```

## File Naming Convention

Use consistent naming:
```
media/
├── icon-512.png
├── banner-1200x600.png
├── feature-1200x1200.png (optional)
├── screenshot-1-dashboard.png
├── screenshot-2-run-tracking.png
├── screenshot-3-tasks.png
├── screenshot-4-land-nft.png
├── screenshot-5-community.png (optional)
├── preview-video.mp4 (optional)
└── app-release.apk
```

## Validation Checklist

Before running `npx dapp-store validate`:

### Icon
- [ ] Exactly 512x512 pixels
- [ ] PNG format with transparency
- [ ] File size < 1 MB
- [ ] Looks good at small sizes (48x48 preview)

### Banner
- [ ] Exactly 1200x600 pixels
- [ ] Represents app well
- [ ] Text is readable
- [ ] File size < 2 MB

### Screenshots
- [ ] Minimum 4 screenshots
- [ ] All have same orientation (landscape or portrait)
- [ ] All have same aspect ratio
- [ ] Minimum 1080px width/height
- [ ] File size < 5 MB each
- [ ] Show actual app UI (not mockups)

### APK
- [ ] Signed with production keystore
- [ ] Release build (not debug)
- [ ] Version matches config.yaml
- [ ] Package name: `app.strun.mobile`

### Optional Assets
- [ ] Feature graphic: 1200x1200 (if included)
- [ ] Preview video: MP4, 720p+ (if included)

## Tools & Resources

### Design Tools
- [Figma](https://figma.com) - UI design and mockups
- [Canva](https://canva.com) - Quick graphics and banners
- [Photopea](https://photopea.com) - Free online Photoshop alternative

### Image Optimization
```bash
# Install ImageMagick
brew install imagemagick  # MacOS
sudo apt install imagemagick  # Linux

# Optimize PNG
pngquant input.png --output output.png

# Optimize JPG
jpegoptim --max=85 input.jpg

# Batch optimize
find . -name "*.png" -exec pngquant {} --output {}-optimized.png \;
```

### Validation Tools
```bash
# Check image dimensions
identify icon-512.png
# Output: icon-512.png PNG 512x512 ...

# Check aspect ratio
identify -format "%w / %h\n" screenshot-1.png
# Should be consistent across all screenshots

# Check APK details
aapt dump badging app-release.apk | grep -E 'package|versionCode|versionName'
```

## Common Issues

### Issue: Screenshots rejected (inconsistent orientation)
**Solution:** Ensure all screenshots are either landscape or portrait, not mixed.

### Issue: Icon looks blurry at small sizes
**Solution:** Simplify design, remove fine details, increase contrast.

### Issue: Banner file size too large
**Solution:**
```bash
# Compress PNG
pngquant banner-1200x600.png --quality=80-90 --output banner-optimized.png

# Or convert to JPG
convert banner-1200x600.png -quality 85 banner-1200x600.jpg
```

### Issue: Video upload fails
**Solution:**
- Ensure `ffmpeg` is installed: `ffmpeg -version`
- Check file size < 100 MB
- Use H.264 codec: `ffmpeg -i input.mp4 -vcodec h264 output.mp4`

## Need Help?

- **Design Feedback:** Post in #dapp-store Discord channel
- **Technical Issues:** See main `README.md` troubleshooting section
- **Examples:** Check [Solana Mobile Example Apps](https://github.com/solana-mobile/dapp-publishing/tree/main/packages/example/publishing)

---

**Ready to validate?**

```bash
cd ../
npx dapp-store validate -k keypair.json -b $ANDROID_TOOLS_DIR
```

If validation passes, proceed to publishing steps in `README.md`! ✅
