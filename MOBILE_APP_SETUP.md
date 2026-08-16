# MegaMart Mobile App Setup Guide

এই গাইড আপনাকে MegaMart ওয়েবসাইটকে Android এবং iOS native app এ রূপান্তর করতে সাহায্য করবে।

## 🚀 Quick Start

### Prerequisites (পূর্বশর্ত)

1. **Node.js** (v18 বা তার উপরে)
2. **Android Studio** (Android app এর জন্য)
3. **Xcode** (iOS app এর জন্য - শুধুমাত্র Mac)
4. **Git**

### Step 1: Clone Project from GitHub

1. আপনার GitHub repository থেকে local machine এ clone করুন:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Add Platforms

#### Android:
```bash
npx cap add android
```

#### iOS (Mac only):
```bash
npx cap add ios
```

### Step 4: Build & Sync

```bash
npm run build
npx cap sync
```

### Step 5: Run the App

#### Android:
```bash
npx cap run android
```
অথবা Android Studio তে খুলুন:
```bash
npx cap open android
```

#### iOS:
```bash
npx cap run ios
```
অথবা Xcode এ খুলুন:
```bash
npx cap open ios
```

---

## 📱 Android Setup (বিস্তারিত)

### Generate APK/AAB

1. Android Studio তে প্রজেক্ট খুলুন
2. `Build > Generate Signed Bundle / APK` এ যান
3. APK অথবা AAB নির্বাচন করুন
4. Keystore তৈরি করুন (প্রথমবার)
5. Build করুন

### App Icon Setup

1. Android Studio তে: `File > New > Image Asset`
2. আপনার 1024x1024 icon সিলেক্ট করুন
3. সব density এর জন্য icons generate হবে

### Splash Screen Setup

1. `android/app/src/main/res/` এ যান
2. `drawable` ফোল্ডারে splash.xml তৈরি করুন
3. আপনার splash icon যোগ করুন

---

## 🍎 iOS Setup (বিস্তারিত)

### Requirements
- macOS computer
- Xcode 14+
- Apple Developer Account ($99/year for App Store)

### App Icon Setup

1. Xcode এ প্রজেক্ট খুলুন
2. `Assets.xcassets > AppIcon` এ যান
3. 1024x1024 icon drag & drop করুন

### Launch Screen

1. `LaunchScreen.storyboard` edit করুন
2. Background color সেট করুন: #f97316
3. Logo ImageView যোগ করুন

### Build for App Store

1. Xcode এ: `Product > Archive`
2. Organizer থেকে App Store Connect এ upload করুন

---

## 🔔 Push Notifications Setup

### Firebase Cloud Messaging (Android)

1. Firebase Console এ প্রজেক্ট তৈরি করুন
2. `google-services.json` ডাউনলোড করুন
3. `android/app/` এ রাখুন

### Apple Push Notification (iOS)

1. Apple Developer Portal এ যান
2. Push Notification certificate তৈরি করুন
3. Xcode এ Signing & Capabilities এ Push Notifications enable করুন

---

## 🔧 Production Build

### For Production Release

`capacitor.config.ts` এ server URL remove করুন:

```typescript
// server: {
//   url: '...',
//   cleartext: true
// }
```

এতে app সরাসরি bundled assets use করবে।

### Build Commands

```bash
# Clean build
rm -rf dist
npm run build

# Sync with native platforms
npx cap sync

# Update native dependencies
npx cap update android
npx cap update ios
```

---

## 📦 File Structure

```
├── android/                 # Android native project
│   ├── app/
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── res/    # Icons, splash screens
│   │   │       └── java/   # Native code
│   │   └── build.gradle
│   └── capacitor.settings.gradle
│
├── ios/                     # iOS native project
│   ├── App/
│   │   ├── App/
│   │   │   ├── Assets.xcassets/  # Icons
│   │   │   └── Base.lproj/       # Storyboards
│   │   └── App.xcodeproj/
│   └── Podfile
│
├── resources/              # Resource guides
│   ├── android/
│   │   ├── icon/
│   │   └── splash/
│   └── ios/
│       ├── icon/
│       └── splash/
│
├── src/                    # Web app source
├── capacitor.config.ts     # Capacitor configuration
└── package.json
```

---

## ❓ Troubleshooting

### Common Issues

1. **Build fails after npm install**
   ```bash
   npm run build
   npx cap sync
   ```

2. **Android Gradle sync error**
   - Android Studio: `File > Sync Project with Gradle Files`

3. **iOS Pod install error**
   ```bash
   cd ios/App
   pod install --repo-update
   ```

4. **White screen on app launch**
   - Check `capacitor.config.ts` server URL
   - Verify `npm run build` completed successfully

### Useful Commands

```bash
# Check Capacitor doctor
npx cap doctor

# Update Capacitor
npx cap update

# Clean Android build
cd android && ./gradlew clean

# Clean iOS build
cd ios/App && xcodebuild clean
```

---

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)

---

## 🎉 Success!

আপনার MegaMart app এখন ready! 

- ✅ Android APK/AAB generate করুন
- ✅ Google Play Store এ publish করুন
- ✅ iOS App Store এ publish করুন

Happy Coding! 🚀
