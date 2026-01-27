import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../_contexts/ThemeContext';

export function DarkModeToggle() {
  const { isDark, toggleTheme, colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={toggleTheme}
    >
      <Text style={[styles.toggleText, { color: colors.text }]}>
        {isDark ? '☀️' : '🌙'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 20,
  },
});
