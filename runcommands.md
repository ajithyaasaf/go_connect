# GoConnect - Run Commands Guide

---

## 1. Expo EAS Cloud Build (No Local Android Studio / SDK Needed) 🚀

The project is linked to Expo account **`godivatech`** (`@godivatech/goconnect` - Project ID: `d8a3b796-9d4b-47b1-a893-e8e5a63d5431`).

### Step 1: Verify Expo account login:
```bash
npx eas-cli whoami
```
*(If not logged in, run `npx eas-cli login`)*

### Step 2: Build Installable Android APK in the Cloud:
```bash
npx eas-cli build -p android --profile preview
```
*EAS will compile the Android APK in the cloud and provide a direct `.apk` download link & QR code to install on your phone or emulator.*

#### 📱 Active Android Preview Build (with Notifications & Exact Alarms):
- **Build ID**: `ccfa2a79-ecd6-46dc-99b1-e97fc6439196`
- **EAS Dashboard**: [View on Expo.dev](https://expo.dev/accounts/godivatech/projects/goconnect/builds/ccfa2a79-ecd6-46dc-99b1-e97fc6439196)

#### 📱 Previous Baseline Build:
- **Build ID**: `d66c2d36-9392-454a-aee8-084e6f09ad1b`
- **Direct APK Download**: [Download GoConnect Baseline APK (66.1 MB)](https://expo.dev/artifacts/eas/nXpyCNWWO2FzkPZpLl5EB8y5BvBnxpA5Qx1oOalTGdE.apk)

### (Optional) Build Google Play Store Bundle (.aab):
```bash
npx eas-cli build -p android --profile production
```

---

## 2. Over-The-Air (OTA) Updates (Instant Updates Without Reinstalling APK) ⚡

Once the APK is installed, you **never need to build or reinstall a new APK** for JavaScript, styling, components, or logic updates. Push updates directly over the air:

### Package and Prepare OTA Release:
```bash
npm run ota:bundle -- --version 1.0.1 --bundleVersion 101 --channel production --notes "New features and UI improvements"
```

### Advanced OTA Parameters:
```bash
npm run ota:bundle -- --version 1.0.1 --bundleVersion 101 --channel production --rollout 25 --mandatory true --apkUrl "https://..." --notes "Critical bug fix"
```

> **Supported CLI Parameters:**
> - `--version`: Semantic app version (e.g. `1.0.1`, `1.0.2`)
> - `--bundleVersion`: Incrementing number (e.g. `101`, `102`, `103`)
> - `--channel`: `production` | `staging` | `canary`
> - `--rollout`: `1` to `100` *(staged cohort rollout percentage)*
> - `--mandatory`: `true` | `false` *(forces instant restart on user devices)*
> - `--apkUrl`: *(optional fallback download link if native APK upgrade is needed)*
> - `--notes`: Release notes shown to users in the update popup

*Generated files saved at: `dist/ota/[channel]/v[bundleVersion]/`*
- `index.android.bundle` (Upload to Firebase Storage / Cloud Storage)
- `manifest.json` (Add to Firestore collection `ota_releases`)

---

## 3. Trigger Instant Remote OTA Update via Push Notification 🔔

To force immediate update checks on all active devices without waiting for app restarts:
Send an FCM push message with:
```json
{
  "data": {
    "type": "OTA_UPDATE",
    "mandatory": "true"
  }
}
```

---

## 4. Local Development & Verification

### Run TypeScript Type Check:
```bash
npx tsc --noEmit
```

### Start Metro Bundler:
```bash
npm start -- --reset-cache
```

### Run on Connected Android Device / Emulator (Local Dev):
```bash
npm run android
```

