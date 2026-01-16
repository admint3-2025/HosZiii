"use client"

import { useEffect, useState } from 'react'

type Props = {
  iso?: string | null
  options?: Intl.DateTimeFormatOptions
}

export default function ClientDate({ iso, options }: Props) {
  const [label, setLabel] = useState<string>('')

  useEffect(() => {
    if (!iso) {
      setLabel('—')
      return
    }
    try {
      const d = new Date(iso)
      // Let the browser format in the user's locale/timezone
      setLabel(d.toLocaleString(undefined, options))
    } catch (e) {
      setLabel(iso)
    }
  }, [iso, options])

  return <span title={iso || ''}>{label}</span>
}
