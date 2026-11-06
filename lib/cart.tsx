import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from './auth'

export type CartItem = {
  key: string
  id: string
  tipo: 'proveedor' | 'productor'
  name: string
  price: number
  unit_type: string
  image: string | null
  seller_id: string
  seller_name: string | null
  qty: number
  unico: boolean
}

type CartCtx = {
  items: CartItem[]
  add: (item: Omit<CartItem, 'qty' | 'key'>) => boolean
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  total: number
  count: number
}

const Ctx = createContext<CartCtx>({} as CartCtx)

export function CartProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const uid = session?.user?.id ?? null
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setItems([])
    if (!uid) return
    AsyncStorage.getItem(`raiz_cart_v1_${uid}`)
      .then(v => { if (v) setItems(JSON.parse(v)) })
      .finally(() => setLoaded(true))
  }, [uid])

  useEffect(() => {
    if (loaded && uid) {
      AsyncStorage.setItem(`raiz_cart_v1_${uid}`, JSON.stringify(items))
    }
  }, [items, loaded, uid])

  function add(item: Omit<CartItem, 'qty' | 'key'>): boolean {
    const key = `${item.tipo}-${item.id}`
    const existe = items.find(i => i.key === key)
    if (existe) {
      if (item.unico) return false
      setItems(prev => prev.map(i => i.key === key ? { ...i, qty: i.qty + 1 } : i))
      return true
    }
    setItems(prev => [...prev, { ...item, key, qty: 1 }])
    return true
  }

  function setQty(key: string, qty: number) {
    if (qty < 1) return
    setItems(prev => prev.map(i => i.key === key && !i.unico ? { ...i, qty } : i))
  }

  function remove(key: string) {
    setItems(prev => prev.filter(i => i.key !== key))
  }

  function clear() { setItems([]) }

  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const count = items.reduce((s, i) => s + i.qty, 0)

  return (
    <Ctx.Provider value={{ items, add, setQty, remove, clear, total, count }}>
      {children}
    </Ctx.Provider>
  )
}

export const useCart = () => useContext(Ctx)