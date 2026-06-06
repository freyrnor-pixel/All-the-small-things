import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTaskStore } from '@/store/useTaskStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import TaskItem from '@/components/TaskItem';
import BubbleMenu from '@/components/BubbleMenu';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const DAYS_NO = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTHS_NO = [
  'januar','februar','mars','april','mai','juni',
  'juli','august','september','oktober','november','desember',
];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatDate(d: Date) {
  return `${DAYS_NO[d.getDay()]} ${d.getDate()}. ${MONTHS_NO[d.getMonth()]}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const today = todayStr();
  const userName = useSettingsStore((s) => s.userName);
  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const toggleTask = useTaskStore((s) => s.toggle);
  const shoppingItems = useShoppingStore((s) => s.items);

  const todayTasks = tasksForDate(today);
  const pendingShopping = shoppingItems
    .filter((i) => i.listType === 'weekly' && !i.checked)
    .slice(0, 5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 10) return 'God morgen';
    if (h < 17) return 'God dag';
    return 'God kveld';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {greeting()}{userName ? `, ${userName}` : ''}!
          </Text>
          <Text style={styles.dateLabel}>{formatDate(new Date())}</Text>
        </View>

        {/* Today's tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Oppgaver i dag</Text>
            <Pressable
              style={styles.addBtn}
              onPress={() => router.push('/task-form')}
            >
              <Text style={styles.addBtnText}>+ Ny</Text>
            </Pressable>
          </View>
          {todayTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Ingen oppgaver i dag! Nyt dagen</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {todayTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  onPress={() => router.push({ pathname: '/task-form', params: { id: task.id } })}
                />
              ))}
            </View>
          )}
        </View>

        {/* Shopping preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Handle snart</Text>
            <Pressable onPress={() => router.push('/shopping')}>
              <Text style={styles.seeAll}>Se alt →</Text>
            </Pressable>
          </View>
          {pendingShopping.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Handlelisten er tom — bra jobbet!</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {pendingShopping.map((item) => (
                <View key={item.id} style={styles.shoppingPreviewRow}>
                  <View style={styles.shoppingDot} />
                  <Text style={styles.shoppingPreviewName}>
                    {item.amount} {item.unit} {item.name}
                  </Text>
                </View>
              ))}
              {shoppingItems.filter((i) => i.listType === 'weekly' && !i.checked).length > 5 && (
                <Text style={styles.moreText}>
                  + {shoppingItems.filter((i) => i.listType === 'weekly' && !i.checked).length - 5} til
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Bottom padding for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <BubbleMenu />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  content: { padding: Spacing.md },
  header: { marginBottom: Spacing.lg },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  dateLabel: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  addBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  addBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.orange,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  emptyCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  shoppingPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: Spacing.sm,
  },
  shoppingDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.green,
  },
  shoppingPreviewName: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  moreText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
});
