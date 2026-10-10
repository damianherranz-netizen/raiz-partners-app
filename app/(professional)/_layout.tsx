import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from '../../lib/colors'

function TabIcon({ emoji, label, focused }: {
  emoji: string; label: string; focused: boolean
}) {
  return (
    <View style={styles.tabItem}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  )
}

export default function ProfessionalLayout() {
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, {
          height: 80 + insets.bottom,
          paddingBottom: insets.bottom + 10,
        }],
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: C.textLight,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index"
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon emoji="🏠" label="Inicio" focused={focused} /> }} />
      <Tabs.Screen name="mensajes"
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon emoji="💬" label="Mensajes" focused={focused} /> }} />
      <Tabs.Screen name="profile"
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon emoji="👤" label="Perfil" focused={focused} /> }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: C.white,
    borderTopColor: C.border,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  tabItem:        { alignItems: 'center', gap: 3 },
  tabEmoji:       { fontSize: 24 },
  tabLabel:       { fontSize: 10, color: C.textLight, fontWeight: '500' },
  tabLabelActive: { color: '#F59E0B', fontWeight: '700' },
})