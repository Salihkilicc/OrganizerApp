import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useI18n } from '@/i18n/useI18n';

export default function ModalScreen() {
  const { t } = useI18n();
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{t((d) => d.common.modalTitle)}</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">{t((d) => d.common.modalGoHome)}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
