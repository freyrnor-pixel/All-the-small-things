All the Small Things
====================

A life-management app designed for people with ADHD and anxiety.
Built with React Native + Expo (iOS & Android).

PURPOSE
-------
Help offload mental workload by managing tasks, shopping lists,
meal planning, health logging, and receipt scanning — all in one place.
After a short first-time setup, the app runs itself.

FEATURES
--------
* Home screen — Today's tasks and shopping preview
* Tasks — One-off or recurring, with "Start at time" or timed sessions
* Shopping list — Weekly and monthly modes, auto-reset, store tracking
* Meals — Dish library with ingredients, random picker, push to list
* Health — Symptom log with severity tracking and 30-day overview
* Scan — Photograph receipts to parse and add items to your list
* Settings — Notifications, reset preferences, shopping list mode
* Onboarding — 3-step setup wizard, then no maintenance needed
* Bubble/radial navigation — Minimal, low-distraction UI

DESIGN
------
* Warm, calm color palette (cream, soft orange, muted green)
* Expandable containers — see only what you need
* Norwegian language interface
* Local-only storage (no account, no internet required)

TECH STACK
----------
* React Native + Expo SDK 56
* TypeScript
* Expo Router (file-based navigation)
* Zustand (state management)
* expo-sqlite (local SQLite database)
* expo-notifications (local push notifications)
* expo-camera + expo-image-picker (receipt scanning)

GETTING STARTED (DEVELOPMENT)
------------------------------
1. Install Node.js 20+
2. npm install
3. npx expo start
4. Scan the QR code with Expo Go (Android/iOS)
   OR press 'a' for Android emulator, 'i' for iOS simulator

BUILD
-----
npx expo run:android
npx expo run:ios   (requires macOS + Xcode)

DATA
----
All data is stored locally on the device in a SQLite database.
Nothing is ever sent to a server.
The app ships with a pre-seeded list of common Norwegian grocery
and household items to make getting started easier.
