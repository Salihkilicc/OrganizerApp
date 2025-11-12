import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/store/useTheme';

export type ButtonType = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  type?: ButtonType;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  type = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { palette } = useTheme();
  const isDisabled = Boolean(disabled || loading);

  const backgroundColor =
    type === 'primary'
      ? palette.accent
      : type === 'secondary'
      ? palette.card
      : 'transparent';

  const borderColor = type === 'ghost' ? 'transparent' : palette.border;
  const textColor = type === 'primary' ? '#fff' : palette.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
