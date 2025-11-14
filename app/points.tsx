import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { usePoints } from '@/store/usePoints';
import { useTheme } from '@/store/useTheme';

export default function PointsScreen() {
  const { palette } = useTheme();
  const totalPoints = usePoints((state) => state.total);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.content}>
        <Text style={[styles.label, { color: palette.text }]}>Current total</Text>
        <Text style={[styles.points, { color: palette.accent }]}>{totalPoints} XP</Text>
        <Text style={[styles.description, { color: palette.text }]}>
          You earn points by completing plans and focus sessions.
        </Text>
        <View
          style={[
            styles.infoCard,
            {
              borderColor: palette.border,
              backgroundColor: palette.card,
            },
          ]}>
          <Text style={[styles.infoTitle, { color: palette.text }]}>Keep building momentum</Text>
          <Text style={[styles.infoText, { color: palette.text }]}>
            Consistency keeps your XP rising. Focus on regular plans and tracked sessions to keep
            your streak alive.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  points: {
    fontSize: 48,
    fontWeight: '700',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 12,
  },
  infoCard: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
