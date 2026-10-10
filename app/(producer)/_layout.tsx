import { useState } from 'react'
import { Tabs, useRouter } from 'expo-router'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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

function MenuModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()

  function navegar(ruta: string) {
    onClose()
    setTimeout(() => router.push(ruta as any), 100)
  }

  const opciones = [
    { emoji: '📦', label: 'Mis ventas',            ruta: '/(producer)/products' },
    { emoji: '🧾', label: 'Mis pedidos',            ruta: '/(producer)/orders' },
    { emoji: '💶', label: 'Ayudas y subvenciones',  ruta: '/(producer)/subvenciones' },
    { emoji: '📄', label: 'Documentos',             ruta: '/(producer)/documentos' },
    { emoji: '🎓', label: 'Directorio profesionales', ruta: '/(producer)/profesionales' },
    { emoji: '👤', label: 'Mi perfil',              ruta: '/(producer)/profile' },
  ]

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>🌱 RAÍZ Partners</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCerrar}>
              <Text style={styles.modalCerrarText}>✕</Text>
            </TouchableOpacity>
          </View>
          {opciones.map((op) => (
            <TouchableOpacity
              key={op.ruta}
              style={styles.menuItem}
              onPress={() => navegar(op.ruta)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemEmoji}>{op.emoji}</Text>
              <Text style={styles.menuItemLabel}>{op.label}</Text>
              <Text style={styles.menuItemFlecha}>›</Text>
            </TouchableOpacity>
          ))}
        </SafeAreaView>
      </Pressable>
    </Modal>
  )
}

export default function ProducerLayout() {
  const insets = useSafeAreaInsets()
  const [menuVisible, setMenuVisible] = useState(false)

  return (
    <>
      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [styles.tabBar, {
            height: 80 + insets.bottom,
            paddingBottom: insets.bottom + 10,
          }],
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.textLight,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🏠" label="Inicio" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="tienda"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🛍️" label="Comprar" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="mensajes"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="💬" label="Mensajes" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="mas"
          options={{
            tabBarIcon: () => (
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                style={styles.masBtn}
              >
                <Text style={styles.masEmoji}>☰</Text>
                <Text style={styles.masLabel}>Más</Text>
              </TouchableOpacity>
            ),
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => setMenuVisible(true)}
              />
            ),
          }}
        />

        {/* Pantallas ocultas — accesibles desde el menú */}
        <Tabs.Screen name="products"      options={{ href: null }} />
        <Tabs.Screen name="orders"        options={{ href: null }} />
        <Tabs.Screen name="subvenciones"  options={{ href: null }} />
        <Tabs.Screen name="documentos"    options={{ href: null }} />
        <Tabs.Screen name="profile"       options={{ href: null }} />
      </Tabs>
    </>
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
  tabLabelActive: { color: C.primary, fontWeight: '700' },
  masBtn:         { alignItems: 'center', gap: 3 },
  masEmoji:       { fontSize: 24 },
  masLabel:       { fontSize: 10, color: C.textLight, fontWeight: '500' },

  // Modal menú
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitulo:     { fontSize: 18, fontWeight: '800', color: C.primary },
  modalCerrar:     { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  modalCerrarText: { fontSize: 16, color: C.textSub },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
    gap: 14,
  },
  menuItemEmoji: { fontSize: 22 },
  menuItemLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: C.text },
  menuItemFlecha:{ fontSize: 20, color: C.textLight },
})