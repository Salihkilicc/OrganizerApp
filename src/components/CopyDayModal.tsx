import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/store/useTheme';
import { useI18n } from '@/i18n/useI18n';

type CopyDayModalProps = {
  visible: boolean;
  sourceDate: string;
  onClose: () => void;
  onConfirm: (targetDates: string[]) => void;
};

const padNumber = (value: number): string => value.toString().padStart(2, '0');

const formatIsoDate = (value: Date): string =>
  `${value.getFullYear()}-${padNumber(value.getMonth() + 1)}-${padNumber(value.getDate())}`;

const parseIsoDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date();
  }
  return new Date(year, month - 1, day);
};

const formatSourceLabel = (value: string): string => {
  const date = parseIsoDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

const buildCandidates = (sourceDate: string, lookAhead = 7) => {
  const start = parseIsoDate(sourceDate);
  const base = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const candidates: { iso: string; label: string }[] = [];
  for (let offset = 1; offset <= lookAhead; offset += 1) {
    const target = new Date(base);
    target.setDate(target.getDate() + offset);
    candidates.push({
      iso: formatIsoDate(target),
      label: target.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    });
  }
  return candidates;
};

export function CopyDayModal({
  visible,
  sourceDate,
  onClose,
  onConfirm,
}: CopyDayModalProps) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const candidates = useMemo(() => buildCandidates(sourceDate), [sourceDate]);

  useEffect(() => {
    if (!visible) {
      setSelectedDates([]);
    }
  }, [visible]);

  const toggleDate = (value: string) => {
    setSelectedDates((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const handleCopy = () => {
    if (!selectedDates.length) return;
    onConfirm([...selectedDates]);
    onClose();
  };

  const title = `${t((d) => d.plan.copyModal.titlePrefix)} ${formatSourceLabel(sourceDate)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.helper, { color: palette.text }]}>
            {t((d) => d.plan.copyModal.helper)}
          </Text>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {candidates.map((candidate) => {
              const isSelected = selectedDates.includes(candidate.iso);
              return (
                <Pressable
                  key={candidate.iso}
                  onPress={() => toggleDate(candidate.iso)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: isSelected ? palette.accent : palette.background,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.rowLabel,
                        { color: isSelected ? palette.background : palette.text },
                      ]}
                    >
                      {candidate.label}
                    </Text>
                    <Text
                      style={[
                        styles.rowSubLabel,
                        { color: isSelected ? palette.background : palette.text },
                      ]}
                    >
                      {candidate.iso}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.indicator,
                      {
                        borderColor: palette.border,
                        backgroundColor: isSelected ? palette.background : 'transparent',
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
          {!selectedDates.length && (
            <Text style={[styles.warning, { color: palette.text }]}>
              {t((d) => d.plan.copyModal.warning)}
            </Text>
          )}
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: palette.text }]}>
                {t((d) => d.common.cancel)}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleCopy}
              disabled={!selectedDates.length}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: selectedDates.length ? palette.tint : palette.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              >
                <Text
                  style={[
                    styles.buttonLabel,
                    {
                      color: selectedDates.length ? palette.card : palette.text,
                    },
                  ]}
                >
                {t((d) => d.plan.copyModal.copy)}
                </Text>
              </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  helper: {
    fontSize: 13,
    marginBottom: 12,
  },
  list: {
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  rowSubLabel: {
    fontSize: 13,
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  warning: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
