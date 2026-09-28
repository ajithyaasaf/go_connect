# GoConnect - Run Commands Guide

---

## 1. Expo EAS Cloud Build (No Local Android Studio / SDK Needed) 🚀

Since you are using **Expo Build (EAS)** instead of compiling locally on your PC:

### Step 1: Login to your Expo account:
```bash
npx eas-cli login
```

### Step 2: Build Installable Android APK in the Cloud:
```bash
npx eas-cli build -p android --profile preview
```
*EAS will compile the project in the cloud and give you a direct download link and QR code to install the `.apk` on your phone!*

### (Optional) Build Google Play Store Bundle (.aab):
```bash
npx eas-cli build -p android --profile production
```

---

## 2. Over-The-Air (OTA) Updates (Instant Updates Without Rebuilding APK) ⚡

Once the APK is installed on users' devices via EAS, you **do not need to build a new APK** for UI, styling, or logic updates! Push updates directly over the air:

### Package and Release OTA Update:
```bash
npm run ota:bundle -- --version 1.0.1 --bundleVersion 101 --channel production --notes "New features and UI improvements"
```

> **Customizable Parameters:**
> - `--version`: Semantic app version (e.g. `1.0.1`, `1.0.2`)
> - `--bundleVersion`: Incrementing number (e.g. `101`, `102`, `103`)
> - `--channel`: `production` | `staging` | `canary`
> - `--mandatory`: `true` | `false` *(forces instant restart on user devices if true)*
> - `--notes`: Release notes shown to users in the update popup

*Generated bundle will be saved at: `dist/ota/[channel]/v[bundleVersion]/index.android.bundle`*

---

## 3. Local Development & Testing

### Start Metro Bundler:
```bash
npm start
```
*(To clear cache: `npm start -- --reset-cache`)*

### Run on Local Emulator / Connected Device (if developing locally):
```bash
npm run android
```

---

## 4. Code Quality & Type Check

### Check for TypeScript Errors:
```bash
npx tsc --noEmit
```

---

## 5. (Alternative) Local Gradle Build (Optional)

If you ever need to build locally without Expo Cloud:
```bash
cd android && ./gradlew assembleDebug && cd ..    # Debug APK
cd android && ./gradlew assembleRelease && cd ..  # Release APK
```
