# Building the UnFocus APK on your own PC

This guide builds a release **APK** entirely on your machine — **no Expo cloud
build credits used** (so it works even though the expo.dev build limit is hit).

> Why a fresh native build (not an OTA update)? This release adds three **native**
> modules — `expo-font`, `expo-haptics`, and the bundled **Nunito** font. Native
> code can't ship over the OTA channel, so the APK must be compiled. `app.json`
> is already bumped to **version 1.1.0 / versionCode 11** so it installs cleanly
> over your existing 1.0.0 app without wiping your local data.

---

## 1. One-time prerequisites

Install these once (skip any you already have):

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | 20 or 22 LTS | https://nodejs.org |
| **Git** | any | to pull the branch |
| **JDK (Java)** | **17** | Temurin 17: https://adoptium.net — RN 0.85 needs JDK 17 |
| **Android Studio** | latest | https://developer.android.com/studio — gives you the Android SDK + build tools |

After installing Android Studio, open it once and let it finish downloading the
SDK. Then set the `ANDROID_HOME` environment variable to your SDK path:

- **Windows** (PowerShell, run once):
  ```powershell
  setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
  ```
  Then **close and reopen** the terminal.
- **macOS / Linux** (add to `~/.zshrc` or `~/.bashrc`):
  ```bash
  export ANDROID_HOME="$HOME/Library/Android/sdk"   # macOS
  # export ANDROID_HOME="$HOME/Android/Sdk"         # Linux
  export PATH="$PATH:$ANDROID_HOME/platform-tools"
  ```

Verify the toolchain:
```bash
node -v        # v20.x or v22.x
java -version  # should say 17
adb --version  # confirms Android platform-tools are on PATH
```

---

## 2. Get the code

```bash
git clone https://github.com/freyrnor-pixel/all-the-small-things.git
cd all-the-small-things
git checkout claude/adhd-task-life-app-TOdFj
git pull
```
(If you already have the repo, just `git fetch` + `git checkout` the branch + `git pull`.)

---

## 3. Install dependencies

This project needs the legacy-peer-deps flag (an Expo peer-dependency quirk):

```bash
npm install --legacy-peer-deps
```

---

## 4. Generate the native Android project

This is a managed Expo project, so the `android/` folder isn't in git — generate it:

```bash
npx expo prebuild --platform android --clean
```

This reads `app.json` (icons, permissions, version, plugins) and creates a native
`android/` directory wired up with all the modules.

---

## 5. Build the release APK

**macOS / Linux:**
```bash
cd android
./gradlew assembleRelease
cd ..
```

**Windows (PowerShell or CMD):**
```powershell
cd android
.\gradlew.bat assembleRelease
cd ..
```

First run downloads Gradle + dependencies and takes ~5–15 min. When it finishes
you'll see `BUILD SUCCESSFUL`.

Your APK is here:
```
android/app/build/outputs/apk/release/app-release.apk
```

> This is a debug-signed release APK — perfect for sideloading onto your own
> phone. (It's fine for personal use; it is **not** signed for the Play Store.)

---

## 6. Put it on your phone

Pick whichever is easiest:

- **USB:** enable Developer Options → USB debugging on the phone, plug in, then:
  ```bash
  adb install -r android/app/build/outputs/apk/release/app-release.apk
  ```
  (`-r` reinstalls over the existing app and **keeps your data**.)
- **No cable:** copy `app-release.apk` to the phone (email/Drive/USB transfer),
  tap it, and allow "install from unknown sources" when prompted.

That's it — open UnFocus and you'll see the new rounded font, themes, haptics,
and all the design updates.

---

## Troubleshooting

- **"App not installed" / "package conflicts with existing"** — Android is
  refusing a downgrade. The new build is versionCode 11; if your installed app
  somehow has a higher code, bump `"versionCode"` in `app.json` (android section)
  to a bigger number, re-run steps 4–5. Last resort: uninstall the old app first
  (this **erases local data** — tasks, habits, shopping lists).
- **`SDK location not found`** — `ANDROID_HOME` isn't set; redo step 1 and reopen
  the terminal. (Or create `android/local.properties` with
  `sdk.dir=/full/path/to/Android/Sdk`.)
- **Gradle / Java version errors** — make sure `java -version` reports **17**, not
  8/11/21. Point `JAVA_HOME` at your JDK 17 if you have several installed.
- **`npm install` peer-dependency errors** — make sure you used
  `--legacy-peer-deps` (step 3).
- **Out of memory during build** — add `org.gradle.jvmargs=-Xmx4g` to
  `android/gradle.properties` and rebuild.

---

## Alternative: `eas build --local` (macOS / Linux only)

If you prefer the EAS toolchain, this runs the build **on your machine** and does
**not** consume cloud build credits:
```bash
npm install -g eas-cli
eas build --platform android --profile preview --local
```
Not supported on Windows — use the Gradle steps above there.
