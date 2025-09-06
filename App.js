import 'react-native-gesture-handler';
import React from 'react';
import { Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme, navThemeFor } from './theme/ThemeContext';
import GeneratorScreen from './screens/GeneratorScreen';
import EditorScreen from './screens/EditorScreen';
import StoriesScreen from './screens/StoriesScreen';

const Tab = createBottomTabNavigator();

function RootNavigator() {
  const { mode, colors, toggle } = useTheme();

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer theme={navThemeFor(mode)}>
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            tabBarActiveTintColor: colors.tabActive,
            tabBarInactiveTintColor: colors.tabInactive,
            tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
            headerRight: () => (
              <Pressable onPress={toggle} style={{ paddingHorizontal: 16 }}>
                <Ionicons
                  name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                  size={22}
                  color={colors.text}
                />
              </Pressable>
            ),
          }}
        >
          <Tab.Screen
            name="Genera"
            component={GeneratorScreen}
            options={{
              tabBarIcon: ({ focused, color, size }) => (
                <Ionicons
                  name={focused ? 'flask' : 'flask-outline'}
                  size={size}
                  color={color}
                />
              ), // 👈 VIRGOLA QUI
              title: 'Generatore',
            }}
          />

          <Tab.Screen
            name="Editor"
            component={EditorScreen}
            options={{
              tabBarIcon: ({ focused, color, size }) => (
                <Ionicons
                  name={focused ? 'create' : 'create-outline'}
                  size={size}
                  color={color}
                />
              ), // 👈 VIRGOLA QUI
            }}
          />

          <Tab.Screen
            name="Storie"
            component={StoriesScreen}
            options={{
              tabBarIcon: ({ focused, color, size }) => (
                <Ionicons
                  name={focused ? 'book' : 'book-outline'}
                  size={size}
                  color={color}
                />
              ), // 👈 VIRGOLA QUI
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
