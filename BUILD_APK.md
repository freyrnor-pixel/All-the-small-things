# Build the UnFocus app on your PC

Follow these steps in order. This builds the app on your own computer — it does
**not** use any Expo build credits.

---

## Step 1 — Install these 3 things (once)

1. **Node.js** (LTS) → https://nodejs.org
2. **Java JDK 17** → https://adoptium.net (pick version 17)
3. **Android Studio** → https://developer.android.com/studio
   - Open it once after installing and let it finish downloading. Then close it.

---

## Step 2 — Tell your PC where Android is (once)

Open a terminal and run the line for your system, then **close and reopen the terminal**.

**Windows (PowerShell):**
```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
```

**Mac:**
```bash
echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
```

---

## Step 3 — Get the app's code

```bash
git clone https://github.com/freyrnor-pixel/all-the-small-things.git
cd all-the-small-things
git checkout claude/unfocus-design-recommendations-w2u64b
```

---

## Step 4 — Build it

Copy-paste this whole block and let it run (the first time takes ~10–15 min):

**Windows:**
```powershell
npm install --legacy-peer-deps
npx expo prebuild --platform android --clean
cd android
.\gradlew.bat assembleRelease
cd ..
```

**Mac:**
```bash
npm install --legacy-peer-deps
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
cd ..
```

When it says **BUILD SUCCESSFUL**, your app file is here:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Step 5 — Put it on your phone

Easiest way: copy that `app-release.apk` file to your phone (email it to
yourself, or use Google Drive / a USB cable), then tap it on the phone to
install. If the phone asks, allow "install from unknown sources".

Your existing tasks, habits, and lists stay intact.

---

## If something goes wrong

- **"app not installed"** → uninstall the old UnFocus first, then install again.
  (Note: uninstalling erases your saved tasks/habits/lists.)
- **"SDK location not found"** → you missed Step 2, or didn't reopen the terminal.
- **Java / Gradle version error** → run `java -version`; it must say **17**.
- **`npm install` errors** → make sure you included `--legacy-peer-deps`.
