# Mindspace — Private Personal Thought Journal

Mindspace is a production-quality, mobile-first personal thought journaling application built with React Native, Expo, and TypeScript. It is designed for daily, long-term personal journaling on mobile devices with an uncompromising focus on **data integrity**, **privacy**, **offline-first reliability**, and **zero-friction thought capture**.

---

## 1. Architectural Philosophy & Guarantees

1. **Zero External Dependence**: 100% offline. Zero tracking scripts, analytics, cloud syncs, or third-party backend servers. Your private thoughts never leave your device unless you explicitly export an encrypted backup.
2. **Encrypted at Rest (SQLCipher)**: The local SQLite database (`mindspace.db`) is encrypted using 256-bit AES encryption via SQLCipher native modules.
3. **Hardware Key Isolation**: The database encryption key is generated using cryptographically secure random bytes (`expo-crypto`) and stored in hardware-backed keychain / Keystore via `expo-secure-store`. The key is never logged, never stored in plain-text preferences, and never exposed to JavaScript storage engines like AsyncStorage.
4. **Draft Resilience & Interruption Protection**: Writing is protected against accidental closure, app switching, and process interruption via debounced persistence and active `AppState` lifecycle listeners.
5. **No Silent Overwrites or Data Loss**: Database writes use transactions and integrity verification (`PRAGMA integrity_check`). Deletions are recoverable soft-deletes by default.

---

## 2. Technology Stack

- **Framework**: React Native 0.88, Expo SDK 58, TypeScript 6 (strict mode enabled).
- **Navigation**: Expo Router (file-based routing with deep linking, modal stacks, and bottom tabs).
- **Database**: SQLite via `expo-sqlite` with native SQLCipher encryption plugin (`useSQLCipher: true`, `enableFTS: true`).
- **Secret & Key Storage**: Expo SecureStore (hardware keychain/Keystore with `AFTER_FIRST_UNLOCK` access).
- **Biometric Security**: Expo Local Authentication (Face ID, Touch ID, Android Biometrics) with fallback 4-digit PIN.
- **Typography & Icons**: Custom warm notebook design palette with `@expo/vector-icons` (Feather glyphs).
- **Testing**: Jest and TypeScript test runners (`ts-jest`) with comprehensive repository, migration, validation, and backup test suites.

---

## 3. Database Schema & Architecture

The database is stored locally in `mindspace.db` with WAL mode enabled (`PRAGMA journal_mode = WAL;`) for high concurrency and crash resilience.

### Schema Version 1 — Initial Schema

#### `thoughts`
The primary table storing committed journal entries:
```sql
CREATE TABLE IF NOT EXISTS thoughts (
  id TEXT PRIMARY KEY NOT NULL,        -- Cryptographically generated UUID v4
  content TEXT NOT NULL,               -- Journal reflection body
  created_at TEXT NOT NULL,            -- ISO 8601 UTC timestamp
  updated_at TEXT NOT NULL,            -- ISO 8601 UTC timestamp
  deleted_at TEXT NULL                 -- Soft-delete timestamp for recoverable deletion
);

CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thoughts_deleted_at ON thoughts(deleted_at);
```

#### `drafts`
Stores uncommitted, active thoughts being typed in the editor:
```sql
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts(updated_at DESC);
```

#### `app_settings`
Encrypted application settings:
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### Full-Text Search (`thoughts_fts`)
SQLite FTS5 virtual table synchronized via database triggers:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS thoughts_fts USING fts5(
  thought_id UNINDEXED,
  content,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Triggers automatically maintain FTS synchronization on INSERT, UPDATE, and DELETE
```
*Note: If the underlying SQLite engine does not compile FTS5, the `SearchRepository` automatically and transparently falls back to parameterized `LIKE %query%` queries without throwing errors.*

### Schema Version 2 — Categories

#### `thoughts.category` column
Added via migration `002_add_category`:
```sql
ALTER TABLE thoughts ADD COLUMN category TEXT NULL;
-- NULL = uncategorised (default for all pre-existing entries)

CREATE INDEX IF NOT EXISTS idx_thoughts_category ON thoughts(category);
```

---

## 4. Categories System

Thoughts can be tagged with one of 8 predefined categories. Categories are optional — a thought can always be saved without selecting one.

| Slug | Label | Icon |
|---|---|---|
| `study` | Study | book-open |
| `life` | Life | sun |
| `relationship` | Relationship | heart |
| `religious` | Religious | star |
| `health` | Health | activity |
| `work` | Work | briefcase |
| `creative` | Creative | pen-tool |
| `random` | Random | shuffle |

Category slugs are stored as plain text in the `thoughts.category` column. The full metadata (label, colour, icon) is resolved at runtime from `src/constants/categories.ts`.

### Where categories appear

- **Write screen** — A horizontal scrollable row of coloured pills appears below the editor. Tap a pill to tag the thought before saving. Tap the same pill again or **None** to clear the selection.
- **Edit screen** — The existing category is pre-selected when you open an entry. Change or clear it and tap **Update thought** to persist.
- **Journal screen** — A filter bar sits between the search bar and the entry list. Tap **All** to see everything or any category pill to show only that subset. The filter applies to both the chronological grouped view and to live search results simultaneously.
- **Thought cards** — Each saved entry displays a small coloured badge in the top-right corner showing its category name and icon.

---

## 5. Encryption Lifecycle & Security Limitations

### Key Lifecycle
1. **First Launch**: When the database connection initializes, `getOrCreateDatabaseEncryptionKey()` requests the master key from Expo SecureStore. If absent, it generates 32 bytes (256 bits) of random data from the device CSPRNG (`Crypto.getRandomBytesAsync(32)`), encodes it to hexadecimal, and saves it in SecureStore with `AFTER_FIRST_UNLOCK` accessibility.
2. **Key Attachment**: Immediately after opening `mindspace.db`, the raw 256-bit key is configured using `PRAGMA key = "x'<hex_key>'"`.
3. **Integrity Probe**: A query against `sqlite_master` and `PRAGMA integrity_check` runs to verify decryption was successful before accepting queries.
4. **Failure Defense**: If decryption fails (e.g., incorrect key or file corruption), the application **aborts and throws**. It **never** silently deletes or recreates the database file.

### Security Limitations & Honest Disclosures
- **Unlocked Device Access**: Biometric lock and PIN lock provide defense against casual access or lending your unlocked phone to someone. However, physical possession of an unlocked phone by an attacker with ADB or physical debugging tools could theoretically allow reading memory while the app process is active.
- **No Remote Cloud Backup**: Because there is no central server, **Mindspace cannot reset your PIN or recover your journal if you delete the app or lose your phone without an exported backup**.
- **Backup Responsibility**: The user must periodically use the **Export Backup** feature in Settings to maintain offline copies of their journal.

---

## 6. Application Screens & Features

1. **Home Screen** (`src/app/(tabs)/index.tsx`):
   - Time-based greeting ("Good morning / afternoon / evening") and formatted date.
   - Today's captured thoughts counter pill.
   - Prominent "Write a thought" card with visual status if an unfinished draft exists.
   - Recent reflections list with preview and quick edit/delete actions.

2. **Quick Write Screen** (`src/app/write.tsx`):
   - Minimal distraction-free notepad interface.
   - No required title or mood — just open and write.
   - **Category picker** — horizontal scrollable pill row; tap any category to tag the thought before saving. Completely optional.
   - Automatic debounced persistence (`useDraft`).
   - AppState listener: immediately persists pending drafts to SQLite when the app moves to background.
   - Double-tap save prevention.

3. **Journal History & Search** (`src/app/(tabs)/journal.tsx`):
   - Full chronological feed grouped by day ("Today", "Yesterday", "Nov 11").
   - **Category filter bar** — tap any category pill (Study, Life, Relationship, Religious, Health, Work, Creative, Random) to filter the entire journal to just that category. Tap "All" to see everything.
   - Integrated offline search bar with FTS5 and substring matching.
   - Search + category filter work together (shows only entries matching both criteria).
   - Real-time query filtering and clear button.

4. **Calendar Navigation** (`src/app/(tabs)/calendar.tsx`):
   - Interactive monthly calendar with previous/next month navigation.
   - Visual dots indicating days that contain recorded thoughts.
   - Day selection reveals all thoughts recorded on that date.

5. **Settings & Security** (`src/app/(tabs)/settings.tsx`):
   - Biometrics toggle (Face ID / Fingerprint).
   - 4-digit PIN toggle with setup modal.
   - Inactivity auto-lock timeout configuration (Immediate, 1 min, 5 min, 15 min, Never).
   - Manual "Lock Mindspace now" button.
   - Export Backup (cryptographically verified JSON payload).
   - Restore Backup (integrity checksum verification and duplicate deduplication).
   - Database diagnostics (SQLCipher, schema version, record counts).

6. **Edit Screen** (`src/app/edit/[id].tsx`):
   - Update existing entries with full audit timestamps (`updated_at`).
   - **Category picker** pre-loaded with the entry's current category — change it or clear it.

---

## 7. Installation & Development

### Prerequisites
- Node.js >= 20
- npm >= 10
- Expo CLI (`npx expo`)

### Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Run TypeScript typecheck
npm run typecheck

# 3. Run unit tests
npm test

# 4. Start Expo development server
npx expo start
```

---

## 8. Running on an Android Phone

Because Mindspace uses **expo-sqlite with SQLCipher** (native C code) and **expo-local-authentication**, it cannot run inside the standard **Expo Go** app. You need a **development build** — a custom version of the app installed directly on your phone.

### Option A — EAS Cloud Build (Recommended, no Android Studio needed)

EAS (Expo Application Services) builds the native `.apk` for you in the cloud.

**Step 1 — Install EAS CLI**
```bash
npm install -g eas-cli
```

**Step 2 — Log in to Expo**
```bash
eas login
# Create a free account at https://expo.dev if you don't have one
```

**Step 3 — Configure EAS for your project** (first time only)
```bash
eas build:configure
```

**Step 4 — Build the development `.apk`**
```bash
eas build --profile development --platform android
```
This uploads your project to EAS servers and builds the APK. It typically takes 5–15 minutes. When done, EAS prints a download URL.

**Step 5 — Install the APK on your phone**
- Download the `.apk` from the EAS link (open the link on your phone or transfer via USB).
- On your Android phone go to **Settings → Security → Install unknown apps** and allow your browser or file manager to install APKs.
- Open the downloaded APK file and tap **Install**.

**Step 6 — Connect to your dev server**
```bash
npx expo start
```
- Open the installed **Mindspace dev build** on your phone.
- Scan the QR code shown in the terminal, or type the server address manually.
- The app will load and run with live reload enabled.

---

### Option B — Local Build with Android Studio

Use this if you want to avoid EAS or want a faster rebuild loop.

**Prerequisites**:
- Android Studio installed with Android SDK
- A USB cable or Wi-Fi ADB connection to your phone
- USB debugging enabled on the phone (**Developer Options → USB Debugging**)

```bash
# Build and deploy directly to a connected Android device
npx expo run:android
```

This compiles the native code locally and installs it on your phone in one step. After that, `npx expo start` works the same way.

---

### Option C — Preview / Production Build (fully standalone)

If you want an APK that runs without a dev server (self-contained, no QR scan needed):

```bash
eas build --profile preview --platform android
```

Download and install the resulting APK the same way as Option A Step 5. No dev server or computer needed after installation.

---

### Enabling USB Debugging on Android

If you haven't done this before:

1. Open **Settings** on your phone.
2. Scroll to **About phone** → tap **Build number** seven times until you see "You are now a developer!"
3. Go back to **Settings → Developer Options**.
4. Enable **USB Debugging**.
5. Connect the phone via USB and accept the "Allow USB debugging?" prompt.

---

## 9. Mindspace Browser Extension (Chrome & Microsoft Edge)

Mindspace also includes a dedicated, lightweight browser extension built with Vite, React, and Manifest V3 located in the [`extension/`](./extension) directory.

### Key Extension Features
- **Side Panel**: Dock Mindspace in Chrome or Edge's side panel to take study or reflection notes alongside any website.
- **Toolbar Popup**: Click the extension icon to capture a thought in < 25 milliseconds.
- **Right-Click Web Capture**: Highlight any text on any page → Right-click → **"Save to Mindspace"**. It automatically saves the quote with a link back to the source webpage!
- **8 Categories**: Study, Life, Relationship, Religious, Health, Work, Creative, and Random.
- **Interoperable Backup**: Export/import JSON backups that are 100% compatible with the Mindspace mobile Android app.

### How to Load into Chrome or Edge
1. Open **Google Chrome** (`chrome://extensions`) or **Microsoft Edge** (`edge://extensions`).
2. Toggle on **Developer mode** (switch in the top-right corner on Chrome, or bottom-left on Edge).
3. Click **"Load unpacked"**.
4. Select the build directory:
   `c:\Users\Latitude\OneDrive\Desktop\projects\mindSpace\extension\dist`
5. Pin **Mindspace** to your browser toolbar!

### Rebuilding the Extension
```bash
cd extension
npm run build
```

---

## 10. Testing Suite

The project includes unit test suites covering data validation, date formatting, repository operations, duplicate prevention, soft-deletes, and backup verification:

```bash
npm test
```

### Verified Test Suites (25 tests, 4 suites):
- `__tests__/validation.test.ts`: Content validation, UUID v4 format verification, ISO date checking, FTS query sanitization.
- `__tests__/dateUtils.test.ts`: UTC ISO timestamps, local date grouping, "Today"/"Yesterday" calculation.
- `__tests__/repositories.test.ts`: Thought creation (with category), editing (with category update), soft-deletion, restoration, duplicate prevention, draft upsert/cleanup, settings storage, and search fallback.
- `__tests__/backupService.test.ts`: SHA-256 payload checksum calculation, corrupted backup rejection, format verification.

---

## 11. License

Private and confidential personal thought journaling application.
