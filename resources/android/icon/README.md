# Android App Icons

Place your app icons in this folder structure. Android requires icons in different densities:

## Icon Sizes Required

| Density | Icon Size | Folder Name |
|---------|-----------|-------------|
| mdpi | 48x48 | drawable-mdpi |
| hdpi | 72x72 | drawable-hdpi |
| xhdpi | 96x96 | drawable-xhdpi |
| xxhdpi | 144x144 | drawable-xxhdpi |
| xxxhdpi | 192x192 | drawable-xxxhdpi |

## File Names

- `ic_launcher.png` - Standard app icon
- `ic_launcher_round.png` - Round app icon (Android 7.1+)
- `ic_launcher_foreground.png` - Adaptive icon foreground
- `ic_launcher_background.png` - Adaptive icon background

## After Creating Icons

After you run `npx cap add android`, copy these icons to:
`android/app/src/main/res/`

Or use Android Studio's Image Asset Studio to generate all required sizes.

## Recommended Tools

1. **Android Asset Studio**: https://romannurik.github.io/AndroidAssetStudio/
2. **App Icon Generator**: https://appicon.co/
3. **Android Studio**: Built-in Image Asset Studio

## Color Scheme for MegaMart

- Primary Color: #f97316 (Orange)
- Background: #ffffff (White)
- Icon should have "M" logo or shopping cart symbol
