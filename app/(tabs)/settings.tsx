import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/store/useAuth';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Auth status</Text>
          <Text style={styles.value}>
            {user
              ? user.guest
                ? 'Guest'
                : 'Connected'
              : 'Not connected'}
          </Text>
          <Text style={styles.meta}>
            {user && !user.guest ? (user as any).email ?? 'Signed user' : 'No Supabase session'}
          </Text>
        </View>
        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Çıkış yap</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#11111110',
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
  },
  signOut: {
    marginTop: 'auto',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ff4d4d',
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
