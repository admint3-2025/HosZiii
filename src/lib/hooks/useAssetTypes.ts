import { useEffect, useState } from 'react'
import { getAssetTypesByCategory } from '@/lib/assets/asset-fields'

type TypeItem = { value: string; label: string; category: string }

export function useAssetTypes() {
  const [categories, setCategories] = useState<Record<string, { value: string; label: string }[]>>(getAssetTypesByCategory())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/asset-types')
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()
        const rows: TypeItem[] = data.assetTypes || []
        const map: Record<string, { value: string; label: string }[]> = {}
        rows.forEach((r) => {
          const cat = r.category || 'General'
          if (!map[cat]) map[cat] = []
          map[cat].push({ value: r.value, label: r.label })
        })
        if (mounted) setCategories(map)
      } catch (err) {
        // keep default static mapping on error
        console.debug('useAssetTypes: using static mapping', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return { categories, loading }
}
