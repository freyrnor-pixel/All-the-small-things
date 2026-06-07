import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import QuickAddSheet from '@/components/QuickAddSheet';
import { Colors, FontSize, Radius, Shadow, Spacing, getTheme } from '@/constants/theme';

const DAYS_NO = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTHS_NO = [
  'januar','februar','mars','april','mai','juni',
  'juli','august','september','oktober','november','desember',
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isWithinWorkHours(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  return nowMins >= startMins && nowMins < endMins;
}

export default function HomeScreen() {
  const router = useRouter();
  const today = todayStr();
  const settings = useSettingsStore();
  const tasksForDate = useTaskStore((s) => s.tasksForDate);
  const backlogTasksFn = useTaskStore((s) => s.backlogTasks);
  const completedCountFn = useTaskStore((s) => s.completedCount);
  const toggleTask = useTaskStore((s) => s.toggle);
  const shoppingItems = useShoppingStore((s) => s.items);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const theme = getTheme(settings.colorTheme);

  const isWorkModeActive = useMemo(() => {
    if (settings.workModeSessionOverride) return false;
    if (settings.workModeEnabled) return true;
    if (settings.enforceWorkHours && isWithinWorkHours(settings.workHoursStart, settings.workHoursEnd)) return true;
    return false;
  }, [
    settings.workModeSessionOverride,
    settings.workModeEnabled,
    settings.enforceWorkHours,
    settings.workHoursStart,
    settings.workHoursEnd,
  ]);

  const allTodayTasks = tasksForDate(today);
  const todayTasks = settings.essentialsModeEnabled
    ? allTodayTasks.filter((t) => t.importance === 'essential')
    : allTodayTasks;

  const backlog = backlogTasksFn(today);
  const completedCount = completedCountFn();

  const pendingShopping = shoppingItems
    .filter((i) => i.listType === 'weekly' && !i.checked)
    .slice(0, 5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 10) return 'God morgen';
    if (h < 17) return 'God dag';
    return 'God kveld';
  };

  function handleWorkModeOverride() {
    Alert.alert(
      'Bytt til personlig modus?',
      'Husk å fokusere på det som er foran deg! Jobb-modus vil deaktiveres frem til du åpner appen på nytt.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Bytt likevel',
          onPress: () => settings.setWorkModeSessionOverride(true),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      {/* Work mode banner */}
      {isWorkModeActive && (
        <View style={[styles.workBanner, { backgroundColor: theme.orange }]}>
          <Text style={styles.workBannerText}>💼 Jobb-modus aktiv</Text>
          <Pressable style={styles.overrideBtn} onPress={handleWorkModeOverride}>
            <Text style={styles.overrideBtnText}>Bytt modus</Text>
          </Pressable>
        </View>
      )}

      {/* Essentials mode banner */}
      {settings.essentialsModeEnabled && (
        <Pressable
          style={styles.essentialsBanner}
          onPress={() => settings.update({ essentialsModeEnabled: false })}
        >
          <Text style={styles.essentialsBannerText}>⭐ Kun viktige oppgaver — trykk for å se alle</Text>
        </Pressable>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.text }]}>
              {greeting()}{settings.userName ? `, ${settings.userName}` : ''}!
            </Text>
            <Text style={[styles.dateLabel, { color: theme.textLight }]}>
              {DAYS_NO[new Date().getDay()]} {new Date().getDate()}. {MONTHS_NO[new Date().getMonth()]}
            </Text>
          </View>
          <Pressable
            style={[styles.essentialsBtn, settings.essentialsModeEnabled && { backgroundColor: theme.orange }]}
            onPress={() => settings.update({ essentialsModeEnabled: !settings.essentialsModeEnabled })}
          >
            <Text style={[styles.essentialsBtnText, settings.essentialsModeEnabled && { color: Colors.white }]}>
              {settings.essentialsModeEnabled ? '⭐ Fokus' : '⭐'}
            </Text>
          </Pressable>
        </View>

        {/* Today's tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {settings.essentialsModeEnabled ? '⭐ Viktige oppgaver i dag' : 'Oppgaver i dag'}
            </Text>
            <Pressable
              style={[styles.addBtn, { backgroundColor: theme.orange }]}
              onPress={() => router.push('/task-form')}
            >
              <Text style={styles.addBtnText}>+ Ny</Text>
            </Pressable>
          </View>
          {todayTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.offWhite }]}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>
                {settings.essentialsModeEnabled
                  ? 'Ingen viktige oppgaver i dag — bra!'
                  : 'Ingen oppgaver i dag! Nyt dagen 🌿'}
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.white }]}>
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
          {settings.essentialsModeEnabled && allTodayTasks.length > todayTasks.length && (
            <Pressable onPress={() => settings.update({ essentialsModeEnabled: false })}>
              <Text style={[styles.seeAll, { color: theme.orange }]}>
                + {allTodayTasks.length - todayTasks.length} vanlige oppgaver skjult →
              </Text>
            </Pressable>
          )}
        </View>

        {/* Backlog */}
        {backlog.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textLight }]}>
                Restliste ({backlog.length})
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: theme.offWhite }]}>
              {backlog.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  onPress={() => router.push({ pathname: '/task-form', params: { id: task.id } })}
                  muted
                />
              ))}
            </View>
            <Text style={[styles.backlogHint, { color: theme.textLight }]}>
              Hvert lite steg teller — bare ta ett om gangen.
            </Text>
          </View>
        )}

        {/* Shopping preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Handle snart</Text>
            <Pressable onPress={() => router.push('/shopping')}>
              <Text style={[styles.seeAll, { color: theme.orange }]}>Se alt →</Text>
            </Pressable>
          </View>
          {pendingShopping.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.offWhite }]}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>Handlelisten er tom — bra jobbet!</Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.white }]}>
              {pendingShopping.map((item) => (
                <View key={item.id} style={styles.shoppingPreviewRow}>
                  <View style={[styles.shoppingDot, { backgroundColor: theme.green }]} />
                  <Text style={[styles.shoppingPreviewName, { color: theme.text }]}>
                    {item.amount} {item.unit} {item.name}
                  </Text>
                </View>
              ))}
              {shoppingItems.filter((i) => i.listType === 'weekly' && !i.checked).length > 5 && (
                <Text style={[styles.moreText, { color: theme.textLight }]}>
                  + {shoppingItems.filter((i) => i.listType === 'weekly' && !i.checked).length - 5} til
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Gentle points */}
        {settings.showPoints && completedCount > 0 && (
          <View style={[styles.pointsCard, { backgroundColor: theme.offWhite }]}>
            <Text style={[styles.pointsText, { color: theme.textLight }]}>
              Du har fullført {completedCount} {completedCount === 1 ? 'ting' : 'ting'} — småting teller!
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <QuickAddSheet visible={quickAddVisible} onClose={() => setQuickAddVisible(false)} />
      <BubbleMenu onNewTask={() => setQuickAddVisible(true)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  workBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  workBannerText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  overrideBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  overrideBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  essentialsBanner: {
    backgroundColor: '#FFF8E6',
    borderBottomWidth: 1,
    borderBottomColor: '#F6C344',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  essentialsBannerText: { fontSize: FontSize.xs, color: '#8A6A00', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  dateLabel: {
    fontSize: FontSize.md,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  essentialsBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.grayLight,
    marginTop: 4,
  },
  essentialsBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textLight,
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
  },
  addBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  addBtnText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },
  seeAll: { fontSize: FontSize.sm, fontWeight: '600' },
  card: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.card,
  },
  emptyCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: { fontSize: FontSize.sm },
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
  },
  shoppingPreviewName: { fontSize: FontSize.md },
  moreText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  backlogHint: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pointsCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pointsText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
});
