import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import KawaiiDice from '../components/KawaiiDice';


export default function GeneratorScreen() {
const { colors } = useTheme();


return (
<View style={[styles.container, { backgroundColor: colors.background }]}>
<Text style={[styles.title, { color: colors.primary }]}>Storie Improbabili</Text>
<Text style={[styles.subtitle, { color: colors.text }]}>Generatore di elementi narrativi</Text>
<KawaiiDice />
</View>
);
}


const styles = StyleSheet.create({
container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
subtitle: { fontSize: 16, opacity: 0.8 },
});