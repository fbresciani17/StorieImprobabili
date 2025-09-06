// components/Page.js
import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const MAX_WIDTH = 720;

export function Page({ children }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.inner, { maxWidth: MAX_WIDTH }]}>
        {children}
      </View>
    </View>
  );
}

export function PageScroll({ children }) {
  const { colors } = useTheme();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView
        contentContainerStyle={[styles.rootScroll, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.inner, { maxWidth: MAX_WIDTH }]}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center', // centra orizzontalmente
  },
  rootScroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    padding: 16,
  },
});
