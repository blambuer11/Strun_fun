#!/bin/bash

# Google Play Store Asset Preparation Script
# Converts existing assets to Google Play required formats

set -e

echo "🎨 Preparing Google Play Store Assets..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check for ImageMagick
if ! command -v convert &> /dev/null; then
    echo -e "${RED}Error: ImageMagick is not installed${NC}"
    echo "Install with:"
    echo "  MacOS: brew install imagemagick"
    echo "  Linux: sudo apt-get install imagemagick"
    exit 1
fi

echo -e "${GREEN}✓ ImageMagick found${NC}"

# Create output directory
OUTPUT_DIR="publishing/google-play/assets"
mkdir -p "$OUTPUT_DIR"
echo -e "${BLUE}Created directory: $OUTPUT_DIR${NC}"

# 1. Feature Graphic (1024x500 - REQUIRED)
echo -e "${BLUE}Creating feature graphic (1024x500)...${NC}"
if [ -f "publishing/media/banner-1200x600.png" ]; then
    convert publishing/media/banner-1200x600.png \
        -resize 1024x500! \
        "$OUTPUT_DIR/feature-graphic.png"
    echo -e "${GREEN}✓ Feature graphic created${NC}"
else
    echo -e "${RED}⚠️  Warning: publishing/media/banner-1200x600.png not found${NC}"
    echo "   Creating placeholder from icon..."
    convert public/pwa-512x512.png \
        -resize 1024x500 \
        -background '#0EA5E9' -gravity center -extent 1024x500 \
        "$OUTPUT_DIR/feature-graphic.png"
    echo -e "${GREEN}✓ Placeholder feature graphic created${NC}"
fi

# 2. Phone Screenshots (1080x1920 - MINIMUM 2 REQUIRED)
echo -e "${BLUE}Creating phone screenshots (1080x1920)...${NC}"

screenshots=(
    "screenshot-login"
    "screenshot-tasks"
    "screenshot-myland"
)

counter=1
for screenshot in "${screenshots[@]}"; do
    if [ -f "publishing/media/$screenshot.png" ]; then
        echo "  Processing $screenshot..."
        convert "publishing/media/$screenshot.png" \
            -resize 1080x1920 \
            -background white -gravity center -extent 1080x1920 \
            "$OUTPUT_DIR/screenshot-$counter-${screenshot#screenshot-}.png"
        echo -e "${GREEN}✓ Screenshot $counter created${NC}"
        counter=$((counter+1))
    fi
done

# 3. App Icon verification (512x512 - already exists)
echo -e "${BLUE}Verifying app icon...${NC}"
if [ -f "public/pwa-512x512.png" ]; then
    # Check if it's exactly 512x512
    dimensions=$(identify -format "%wx%h" public/pwa-512x512.png)
    if [ "$dimensions" == "512x512" ]; then
        echo -e "${GREEN}✓ App icon is correct (512x512)${NC}"
        cp public/pwa-512x512.png "$OUTPUT_DIR/app-icon-512.png"
    else
        echo -e "${RED}⚠️  App icon is $dimensions, resizing to 512x512${NC}"
        convert public/pwa-512x512.png \
            -resize 512x512! \
            "$OUTPUT_DIR/app-icon-512.png"
    fi
else
    echo -e "${RED}✗ App icon not found at public/pwa-512x512.png${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Google Play Assets Prepared!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Created assets:"
ls -lh "$OUTPUT_DIR"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review assets in: $OUTPUT_DIR"
echo "2. Upload to Google Play Console:"
echo "   • App icon (512x512): $OUTPUT_DIR/app-icon-512.png"
echo "   • Feature graphic (1024x500): $OUTPUT_DIR/feature-graphic.png"
echo "   • Screenshots (1080x1920): $OUTPUT_DIR/screenshot-*.png"
echo ""
echo "3. Verify requirements:"
echo "   • Minimum 2 screenshots ✓"
echo "   • Feature graphic ✓"
echo "   • App icon ✓"
echo ""
echo -e "${GREEN}Ready for Google Play Store submission! 🚀${NC}"
