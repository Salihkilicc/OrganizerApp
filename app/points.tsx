import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { usePoints } from '@/store/usePoints';
import { useTheme } from '@/store/useTheme';
import { useRouter } from 'expo-router';

const themeOptions = ['Light', 'Dark', 'Ninja'];
const badges = ['Early Bird', 'Focus Master', 'Streak 7+'];
const profilePlaceholders = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function PointsScreen() {
  const { palette } = useTheme();
  const totalPoints = usePoints((state) => state.total);
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text style={[styles.backIcon, { color: palette.text }]}>‹</Text>
          </Pressable>
          <Text style={[styles.totalLabel, { color: palette.text }]}>
            Total Points: {totalPoints}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Themes</Text>
          <View style={styles.row}>
            {themeOptions.map((item) => (
              <Pressable
                key={item}
                onPress={() => undefined}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                  },
                ]}>
                <Text style={[styles.cardText, { color: palette.text }]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Badges</Text>
          <View style={[styles.row, styles.badgeRow]}>
            {badges.map((item) => (
              <View
                key={item}
                style={[
                  styles.badge,
                  { backgroundColor: palette.card, borderColor: palette.border },
                ]}>
                <Text style={[styles.cardText, { color: palette.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Profile Photos</Text>
          <View style={[styles.row, styles.photoRow]}>
            {profilePlaceholders.map((item) => (
              <View
                key={item}
                style={[
                  styles.photo,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                  },
                ]}>
                <Text style={[styles.cardText, { color: palette.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  themeCard: {
    width: 100,
    height: 70,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginBottom: 12,
  },
  badgeRow: {
    justifyContent: 'center',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 6,
    marginVertical: 6,
  },
  photoRow: {
    justifyContent: 'flex-start',
  },
  photo: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
