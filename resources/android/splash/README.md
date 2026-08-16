# Android Splash Screen

Android 12+ uses the new SplashScreen API. Here's how to set up your splash screen:

## Splash Screen Assets

### For Android 11 and below:
Create splash screen images in these sizes:

| Density | Size | Folder |
|---------|------|--------|
| mdpi | 320x480 | drawable-mdpi |
| hdpi | 480x800 | drawable-hdpi |
| xhdpi | 720x1280 | drawable-xhdpi |
| xxhdpi | 1080x1920 | drawable-xxhdpi |
| xxxhdpi | 1440x2560 | drawable-xxxhdpi |

File name: `splash.png`

### For Android 12+ (Adaptive Splash):
- Create a centered icon: 288x288 px (including 96px padding)
- Background color is set in `capacitor.config.ts`

## After Running `npx cap add android`

1. Create `android/app/src/main/res/drawable/splash.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background"/>
    <item
        android:drawable="@drawable/ic_splash"
        android:gravity="center"/>
</layer-list>
```

2. Add to `android/app/src/main/res/values/colors.xml`:

```xml
<color name="splash_background">#f97316</color>
```

3. Place your splash icon as `ic_splash.png` in drawable folders

## Design Guidelines

- Use MegaMart logo or "M" symbol
- Background: #f97316 (Orange)
- Logo/Icon: White
- Keep design simple and centered
