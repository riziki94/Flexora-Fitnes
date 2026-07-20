# Kitozon — App Store & Google Play Deployment Guide

## Prerequisites
- Node.js 18+, Bun
- Xcode 15+ (macOS for iOS builds)
- Android Studio (for Android builds)
- Apple Developer account ($99/year)
- Google Play Developer account ($25 one-time)

---

## Project Structure

```
/home/team/shared/site/
├── capacitor.config.ts   # Capacitor configuration
├── android/              # Android native project
├── ios/                  # iOS native project
├── resources/
│   ├── icon.png          # App icon (1024×1024)
│   ├── splash.png        # Splash screen (2732×2732)
│   ├── icon-192.png      # Fallback icon
│   └── icon-512.png      # High-res icon reference
├── dist/client/          # Built web assets (bundled into native apps)
├── public/
│   ├── splash.html       # Standalone splash screen HTML
│   └── icons/            # PWA icons (icon-192.png, icon-512.png, icon-maskable.png)
├── scripts/
│   ├── generate-capacitor-html.js    # Generates index.html for Capacitor
│   ├── generate-capacitor-assets.js  # Generates app store icons/splash
│   └── generate-icons.js             # Generates PWA icons
└── APP_STORE.md          # This file
```

---

## Configuration Summary

| Setting | Value |
|---------|-------|
| **Bundle ID** | `no.kitozon.app` |
| **App Name** | `Kitozon` |
| **Live URL** | `https://99fd63a0f31eb0122b727076a94fe1ae.ctonew.app` |
| **Theme Color** | `#059669` (emerald green) |
| **Splash Background** | `#059669` |
| **Server Mode** | Live URL (production) |

---

## Build Process

### 1. Build the web app and sync with Capacitor

```bash
cd /home/team/shared/site
bun run build:cap
```

This runs three steps:
1. `bun run build` — builds the TanStack Start app into `dist/client/`
2. `bun run scripts/generate-capacitor-html.js` — generates `dist/client/index.html` for Capacitor
3. `bunx cap sync` — copies web assets into `ios/` and `android/` native projects

### Alternative commands

```bash
bun run cap:sync         # Sync web assets only (after building separately)
bun run cap:open:ios     # Open iOS project in Xcode
bun run cap:open:android # Open Android project in Android Studio
```

### 2. Regenerate app store assets (when branding changes)

```bash
bun run scripts/generate-capacitor-assets.js
```

This generates `resources/icon.png` and `resources/splash.png` from the PWA icons.

---

## iOS — Apple App Store

### Open in Xcode

```bash
cd /home/team/shared/site
bun run cap:open:ios
```

Or manually:
```bash
open ios/App/App.xcworkspace
```

### Steps to publish

1. **Set your Team:** In Xcode, select the "App" target → Signing & Capabilities → choose your Apple Developer team.

2. **Update version:** In Xcode, set the Version (e.g. `1.0.0`) and Build number (e.g. `1`).

3. **App Store Connect:**
   - Go to https://appstoreconnect.apple.com
   - Create a new app with bundle ID `no.kitozon.app`
   - Fill in app description, screenshots, privacy policy URL

4. **Archive & upload:**
   - In Xcode: Product → Archive
   - When archive completes: Distribute App → App Store Connect → Upload

5. **Submit for review:**
   - In App Store Connect, complete the submission form
   - Add screenshot sets for each device size (iPhone 6.7", 6.5", 5.5")
   - Submit for App Review

### iOS-specific notes
- `ios/App/App/Info.plist` is configured with:
  - `CFBundleDisplayName` = `"Kitozon"`
  - `UILaunchStoryboardName` = `"LaunchScreen"` (the native launch screen storyboard)
  - `UIViewControllerBasedStatusBarAppearance` = `true`
  - Bundle ID is set via `$(PRODUCT_BUNDLE_IDENTIFIER)` (derived from Xcode project settings)
- The app uses WKWebView to render web content from the live production URL.
- Status bar style is dark with emerald (#059669) background.
- Ensure `ios/App/App.xcodeproj` has `PRODUCT_BUNDLE_IDENTIFIER` set to `no.kitozon.app`.

---

## Android — Google Play Store

### Open in Android Studio

```bash
cd /home/team/shared/site
bun run cap:open:android
```

Or manually: open the `android/` directory in Android Studio.

### Steps to publish

1. **Create a keystore** (first time only):
   ```bash
   keytool -genkey -v -keystore kitozon-release.keystore \
     -alias kitozon -keyalg RSA -keysize 2048 -validity 10000
   ```
   Keep this keystore file safe — you need it for all future updates.

2. **Configure signing** in `android/app/build.gradle` with your keystore credentials.

3. **Update version:** In `android/app/build.gradle`, update `versionCode` (integer) and `versionName` (string).

4. **Build the release AAB/APK:**
   ```bash
   cd android
   ./gradlew bundleRelease   # For AAB (preferred by Google Play)
   # or
   ./gradlew assembleRelease # For APK
   ```

5. **Upload to Google Play Console:**
   - Go to https://play.google.com/console
   - Create a new app with package name `no.kitozon.app`
   - Upload the `.aab` file under Production or Testing
   - Fill in store listing: description, screenshots, feature graphic
   - Submit for review

### Android-specific notes
- Package name set to `no.kitozon.app` in `android/app/build.gradle`.
- `allowMixedContent` is `false` (HTTPS-only, production mode).
- Launcher background color: `#059669`.
- Minimum SDK: 24 (Android 7.0 Nougat).
- Target/Compile SDK: 36.
- Permissions in `AndroidManifest.xml`: `INTERNET` only (add camera, location, etc. if needed).

---

## App Icons

### Current icons
Icons are already generated and located at:
- `public/icons/icon-192.png` — PWA 192×192 icon
- `public/icons/icon-512.png` — PWA 512×512 icon
- `public/icons/icon-maskable.png` — PWA maskable icon (with safe zone)
- `resources/icon.png` — 1024×1024 for Capacitor/iOS
- `resources/splash.png` — 2732×2732 splash image

### Regenerating icons
To regenerate all icons from scratch:
```bash
cd /home/team/shared/site
bun run scripts/generate-icons.js          # PWA icons (uses sharp)
bun run scripts/generate-capacitor-assets.js # Capacitor + splash
```

### Required icon sizes for app stores
| Platform | Size | File |
|----------|------|------|
| iOS (App Store) | 1024×1024 | `resources/icon.png` |
| iOS (all sizes) | Generated by Xcode from 1024×1024 | — |
| Android adaptive | 108dp foreground + background layers | `android/app/src/main/res/` |
| Android legacy | 48–192dp | `android/app/src/main/res/` |

---

## Splash Screen

A standalone splash screen is available at `public/splash.html`:
- Solid emerald green (#059669) background
- White "K" logo in a rounded square
- "Kitozon" title and "Sustainable Container Homes" subtitle

This shows briefly as the Capacitor WebView loads. The native splash is configured in `ios/App/App/LaunchScreen.storyboard` and via `SplashScreen` plugin in `capacitor.config.ts`.

---

## Important: Live URL Mode

Kitozon is configured to load from the **live production URL** in Capacitor:

```ts
// capacitor.config.ts
server: {
  url: 'https://99fd63a0f31eb0122b727076a94fe1ae.ctonew.app',
  cleartext: false,
}
```

This means:
- ✅ Server functions (`createServerFn`) work — the app connects to the live backend
- ✅ Supabase queries work — authentication and database calls go through the live server
- ✅ Dynamic data (device data, profile info) is always up to date
- ❌ The app requires an internet connection — it is NOT offline-first

If you need offline support, remove `server.url` and bundle assets — but server functions and Supabase calls will not work without connectivity.

---

## Before Submitting

- [ ] Test on real iOS devices (iPhone, iPad)
- [ ] Test on real Android devices (phone, tablet)
- [ ] Verify HTTPS is working on the live URL
- [ ] Confirm app permissions are correct (camera, location if used)
- [ ] Check all app store listing requirements (screenshots, descriptions, privacy policy)
- [ ] Increment version/build numbers for every submission
- [ ] Run `npx cap doctor` and fix any warnings

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `bun run build:cap` | Build web app + generate Capacitor HTML + sync to native projects |
| `bun run cap:sync` | Sync web assets to native projects |
| `bun run cap:open:ios` | Open iOS project in Xcode |
| `bun run cap:open:android` | Open Android project in Android Studio |
| `bun run publish` | Deploy web app to port 3000 |
| `bun run scripts/generate-capacitor-assets.js` | Regenerate app store icons/splash |
| `bun run scripts/generate-icons.js` | Regenerate PWA icons |
| `npx cap doctor` | Check Capacitor project health |
