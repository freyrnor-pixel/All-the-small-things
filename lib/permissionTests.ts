/**
 * permissionTests.ts — Minimal smoke tests for permission requests.
 *
 * Exports functions to test each permission (microphone, location, calendar,
 * contacts, activity recognition, media library). Used by settings.tsx debug
 * section to verify permissions round-trip correctly after native build.
 *
 * Connections:
 *   Imports → expo-audio, expo-location, expo-calendar, expo-contacts, expo-sensors, expo-media-library
 *   Used by → none currently — the debug-mode test buttons in app/settings.tsx were
 *     reverted because this file imports native modules (expo-audio, expo-location,
 *     expo-calendar, expo-contacts, expo-sensors, expo-media-library) that aren't
 *     compiled into the currently-installed APK (runtime 1.0.0 / build 148977ec).
 *     Re-wire this back into settings.tsx only after a new native build/APK that
 *     includes these packages has shipped.
 *   Data    → none (permissions only)
 *
 * Edit notes:
 *   - Each function requests its permission and returns true if granted, false otherwise.
 *   - These are fire-and-forget test calls — not meant to be integrated into real flows yet.
 */
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Location from 'expo-location';
import * as Calendar from 'expo-calendar';
import * as Contacts from 'expo-contacts';
import { DeviceMotion } from 'expo-sensors';
import * as MediaLibrary from 'expo-media-library';

export async function testMicrophonePermission(): Promise<boolean> {
  try {
    const { status } = await requestRecordingPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.error('Microphone permission test failed:', e);
    return false;
  }
}

export async function testLocationForegroundPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.error('Foreground location permission test failed:', e);
    return false;
  }
}

export async function testLocationBackgroundPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.error('Background location permission test failed:', e);
    return false;
  }
}

export async function testCalendarPermission(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.error('Calendar permission test failed:', e);
    return false;
  }
}

export async function testContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.error('Contacts permission test failed:', e);
    return false;
  }
}

export async function testActivityRecognitionPermission(): Promise<boolean> {
  try {
    const { status } = await DeviceMotion.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.error('Activity recognition test failed:', e);
    return false;
  }
}

export async function testMediaLibraryPermission(): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.error('Media library permission test failed:', e);
    return false;
  }
}
