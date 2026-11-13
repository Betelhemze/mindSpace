# Mindspace Automated Updates

This document describes how Mindspace uses Expo EAS Update and GitHub Actions to deliver over-the-air (OTA) updates without requiring users to reinstall the APK.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Initial Setup](#initial-setup)
- [Everyday Development Workflow](#everyday-development-workflow)
- [Manual OTA Update](#manual-ota-update)
- [When You Need a New APK (Native Build)](#when-you-need-a-new-apk-native-build)
- [OTA vs Native Change Matrix](#ota-vs-native-change-matrix)
- [Update Channels](#update-channels)
- [Data Safety](#data-safety)
- [Troubleshooting](#troubleshooting)

---

## Overview

Mindspace uses two update mechanisms:

| Method | What changes | Rebuild APK? | User action |
|--------|-------------|-------------|-------------|
| **OTA Update** | JavaScript, TypeScript, styles, images, new screens | No | None — automatic |
| **Native Build** | Native modules, `app.json` native config, SDK version | Yes | Download and install new APK |

OTA updates are delivered through **Expo EAS Update** and published automatically by **GitHub Actions** when you push to `main`.

## How It Works

```
You push to main
       │
       ▼
GitHub Actions runs
  ├─ npm ci
  ├─ TypeScript check
  ├─ Jest tests
  └─ eas update --channel preview
       │
       ▼
Update published to Expo servers
       │
       ▼
Your phone's Mindspace app checks for updates
  (on app open, and when returning from background)
       │
       ▼
Update downloads silently in the background
       │
       ▼
Applied on next app restart
  (never interrupts active use)
```

## Initial Setup

Complete these steps once before OTA updates can work.

### 1. Create an Expo Access Token

1. Go to [expo.dev/accounts/[your-account]/settings/access-tokens](https://expo.dev/accounts/settings/access-tokens)
2. Click **Create Token**
3. Name it `mindspace-github-actions`
4. Select **Robot** or **Personal** token type
5. Copy the generated token

### 2. Add the Token to GitHub Secrets

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `EXPO_TOKEN`
4. Value: paste the token from step 1
5. Click **Add secret**

### 3. Build Your First Preview APK

The first APK must be built with the OTA update configuration included. Run:

```bash
npx eas-cli@latest build --profile preview --platform android
```

Or trigger the **Mindspace Native Build** workflow from GitHub Actions:
1. Go to **Actions** → **Mindspace Native Build**
2. Click **Run workflow**
3. Select profile: `preview`, platform: `android`

### 4. Install the Preview APK

Download the APK from [expo.dev](https://expo.dev) and install it on your phone. This APK contains the `expo-updates` native module that enables OTA updates.

> **Important:** Your old APK (built before this setup) does NOT have `expo-updates` compiled in. You must install the new preview APK at least once.

## Everyday Development Workflow

1. Make your code changes
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "Add mood tracking to journal entries"
   git push origin main
   ```
3. GitHub Actions automatically:
   - Runs TypeScript checks
   - Runs all tests
   - If everything passes, publishes an OTA update
4. Next time you open Mindspace on your phone, the update downloads silently
5. The update applies on your next app restart

That's it. No APK download, no reinstall.

## Manual OTA Update

If you need to publish an update without pushing to `main`:

```bash
# From your project directory
npx eas-cli@latest update --channel preview --message "Description of changes"
```

Or use GitHub Actions:
1. Go to **Actions** → **Mindspace OTA Update**
2. Click **Run workflow**
3. Enter a message describing the update

## When You Need a New APK (Native Build)

Some changes cannot be delivered via OTA. You need a new APK when you:

- Add or remove a native module (e.g., `expo install expo-camera`)
- Change native configuration in `app.json` (permissions, package name, icons)
- Upgrade the Expo SDK version
- Change the `app.json` version (which changes the runtime version)

To build:

```bash
npx eas-cli@latest build --profile preview --platform android
```

Then download and install the new APK on your phone.

## OTA vs Native Change Matrix

| Change Type | Delivery Method | Examples |
|---|---|---|
| TypeScript / JavaScript logic | ✅ OTA | Bug fixes, new features, refactors |
| React components & screens | ✅ OTA | New screens, layout changes, component updates |
| Styles & themes | ✅ OTA | Colors, spacing, fonts, dark mode |
| Images & assets (JS-bundled) | ✅ OTA | Icons, illustrations |
| Database migrations | ✅ OTA | New columns, tables (additive only) |
| Expo config plugins | ❌ Native build | Adding `expo-camera`, `expo-notifications` |
| Native permissions | ❌ Native build | Camera, location, contacts |
| `app.json` version change | ❌ Native build | `"version": "1.0.0"` → `"1.1.0"` |
| Expo SDK upgrade | ❌ Native build | SDK 58 → SDK 59 |
| Android package name | ❌ Native build | `com.mindspace.journal` |
| App icons & splash screen | ❌ Native build | Adaptive icons, splash images |

## Update Channels

| Channel | Purpose | Build Profile | Trigger |
|---------|---------|---------------|---------|
| `preview` | Your personal testing APK | `preview` | Push to `main` or manual |
| `production` | Future public releases | `production` | Manual only |

## Data Safety

OTA updates are safe for your journal data because:

1. **Database files are untouched** — OTA updates only replace the JavaScript bundle. Your SQLite database lives on the device filesystem and is never modified by the update process.

2. **Encryption keys persist** — Your database encryption key is stored in the device's SecureStore (Android Keystore). OTA updates cannot access or modify SecureStore values.

3. **Migrations are additive** — Database migrations only add new tables or columns. They never drop or recreate existing data. Each migration is tracked and only runs once.

4. **No force reload** — Mindspace downloads updates in the background and applies them on the next natural app restart. You are never interrupted while writing a journal entry.

5. **Rollback safety** — If an OTA update causes a crash, `expo-updates` automatically rolls back to the previous working version.

## Troubleshooting

### Update isn't showing up on my phone

1. **Check the update was published:** Go to [expo.dev](https://expo.dev) → your project → Updates. You should see the latest update listed under the `preview` channel.

2. **Force an update check:** Close and reopen the app. Mindspace checks for updates on every app open.

3. **Check runtime version match:** The runtime version of your installed APK must match the published update. If you changed `app.json` `version`, you need a new APK.

4. **Check GitHub Actions:** Go to your repo → Actions → look for any failed runs.

### GitHub Actions workflow failed

1. **Missing EXPO_TOKEN:** Check Settings → Secrets → `EXPO_TOKEN` exists and is valid.

2. **TypeScript errors:** Fix locally with `npm run typecheck`.

3. **Test failures:** Fix locally with `npm test`.

4. **EAS CLI errors:** Check if `eas.json` is valid JSON and the project ID matches.

### App crashes after update

`expo-updates` has built-in rollback protection. If the app crashes on launch with a bad update, it automatically reverts to the last working version. To fix:

1. Fix the bug in your code
2. Push the fix to `main`
3. A new OTA update will be published with the fix

### "No compatible update found"

This means the runtime version of your installed APK doesn't match any published update. Solutions:

- If you changed `app.json` `version`: build and install a new preview APK
- If you upgraded the Expo SDK: build and install a new preview APK
- If you added a native module: build and install a new preview APK

