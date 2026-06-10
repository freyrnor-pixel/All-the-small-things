/**
 * App.tsx — UNUSED default Expo template; the real entry is index.ts → expo-router/entry.
 *
 * Leftover "Hello World" component from `create-expo-app`. The app uses
 * expo-router file-based routing (see app/), so this default App component is
 * never mounted and can be deleted.
 *
 * Connections:
 *   Imports → —
 *   Used by → nothing (dead default template; real entry is index.ts)
 *   Data    → none (presentational)
 *
 * Edit notes:
 *   - Do not wire app logic here — it is never rendered. Screens live in app/.
 *   - Safe to delete; kept only as scaffolding.
 */
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
