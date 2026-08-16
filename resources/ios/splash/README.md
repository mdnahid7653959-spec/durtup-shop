# iOS Launch Screen (Splash Screen)

iOS uses a Launch Screen storyboard for splash screens.

## Setup Options

### Option 1: Storyboard (Recommended)

After running `npx cap add ios`, edit `ios/App/App/Base.lproj/LaunchScreen.storyboard`:

1. Open in Xcode
2. Set background color to #f97316
3. Add centered ImageView with your logo
4. Add constraints for proper positioning

### Option 2: Static Images (Legacy)

Create images for all device sizes:

| Device | Portrait | Landscape |
|--------|----------|-----------|
| iPhone SE | 640x1136 | 1136x640 |
| iPhone 8 | 750x1334 | 1334x750 |
| iPhone 8 Plus | 1242x2208 | 2208x1242 |
| iPhone X/XS | 1125x2436 | 2436x1125 |
| iPhone XR/11 | 828x1792 | 1792x828 |
| iPhone 12/13 | 1170x2532 | 2532x1170 |
| iPhone 12/13 Pro Max | 1284x2778 | 2778x1284 |
| iPhone 14 Pro | 1179x2556 | 2556x1179 |
| iPhone 14 Pro Max | 1290x2796 | 2796x1290 |
| iPad | 1536x2048 | 2048x1536 |
| iPad Pro 12.9" | 2048x2732 | 2732x2048 |

## Storyboard Template

```xml
<!-- LaunchScreen.storyboard -->
<!-- Set background to #f97316 -->
<!-- Center an ImageView with your logo -->
<!-- Add "MegaMart" text below (optional) -->
```

## Capacitor Config

Already configured in `capacitor.config.ts`:
- Background color: #f97316
- Spinner: White, Large
- Full screen immersive mode

## Design Guidelines

- Background: #f97316 (MegaMart Orange)
- Logo: White "M" or MegaMart logo
- Keep design simple - this shows for 1-2 seconds
- Don't include text that needs translation
