'use client'

import { useState } from 'react'

type Result = {
  id: string
  name: string
  code: string
}

export default function LocationCreateForm() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [businessType, setBusinessType] = useState<'hotel' | 'corporate' | 'office' | 'warehouse' | 'other'>('hotel')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('México')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [managerName, setManagerName] = useState('')
  const [totalRooms, setTotalRooms] = useState('')
  const [totalFloors, setTotalFloors] = useState('')
  const [brand, setBrand] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  async function submit() {
    setError(null)
    setResult(null)

    if (!name.trim()) {
      setError('Nombre requerido')
      return
    }

    if (!code.trim()) {
      setError('Código requerido (ej: MTY, CDMX)')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          business_type: businessType,
          city: city.trim(),
          state: state.trim(),
          country: country.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          manager_name: managerName.trim(),
          // Campos hoteleros opcionales (solo si la migración fue aplicada)
          ...(businessType === 'hotel' && totalRooms ? { total_rooms: parseInt(totalRooms, 10) } : {}),
          ...(businessType === 'hotel' && totalFloors ? { total_floors: parseInt(totalFloors, 10) } : {}),
          ...(businessType === 'hotel' && brand.trim() ? { brand: brand.trim() } : {}),
        }),
      })

      const text = await res.text()
      if (!res.ok) {
        setError(text || `Error ${res.status}`)
        return
      }

      const json = JSON.parse(text) as Result
      setResult(json)
      setName('')
      setCode('')
      setBusinessType('hotel')
      setCity('')
      setState('')
      setCountry('México')
      setAddress('')
      setPhone('')
      setEmail('')
      setManagerName('')
      setTotalRooms('')
      setTotalFloors('')
      setBrand('')
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="p-4 space-y-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Crear ubicación</div>
          <div className="text-[11px] text-gray-600 mt-0.5">
            Registra ciudades o empresas para segmentar tickets y reportes.
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-medium text-gray-700">Nombre *</label>
            <input
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sede Central Monterrey"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Código *</label>
            <input
              className="input mt-1"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="MTY, CDMX, GDL..."
              autoComplete="off"
              maxLength={10}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-gray-700">Tipo de Negocio *</label>
            <select
              className="input mt-1"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as any)}
            >
              <option value="hotel">🏨 Propiedad Hotelera</option>
              <option value="corporate">🏢 Corporativo / Oficina Central</option>
              <option value="office">🏢 Oficina</option>
              <option value="warehouse">🏭 Almacén / Bodega</option>
              <option value="other">💼 Otro</option>
            </select>
            <p className="mt-1 text-[10px] text-gray-500">
              {businessType === 'hotel' && 'Aparece en selectores de inspecciones hoteleras'}
              {businessType === 'corporate' && 'NO aparece en selectores de hoteles (solo reportes corporativos)'}
              {businessType !== 'hotel' && businessType !== 'corporate' && 'Uso administrativo general'}
            </p>
          </div>

          {businessType === 'hotel' && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">Habitaciones Totales</label>
                <input
                  className="input mt-1"
                  type="number"
                  min="1"
                  value={totalRooms}
                  onChange={(e) => setTotalRooms(e.target.value)}
                  placeholder="120"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700">Pisos</label>
                <input
                  className="input mt-1"
                  type="number"
                  min="1"
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(e.target.value)}
                  placeholder="6"
                  autoComplete="off"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-gray-700">Marca / Cadena Hotelera</label>
                <input
                  className="input mt-1"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Microtel Inn & Suites, Ramada Encore…"
                  autoComplete="off"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Ciudad</label>
            <input
              className="input mt-1"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Monterrey"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Estado</label>
            <input
              className="input mt-1"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Nuevo León"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">País</label>
            <input
              className="input mt-1"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="México"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Teléfono</label>
            <input
              className="input mt-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 81 1234 5678"
              autoComplete="off"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-gray-700">Dirección</label>
            <input
              className="input mt-1"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Av. Principal #123, Col. Centro"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Email de contacto</label>
            <input
              className="input mt-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contacto@empresa.com"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700">Responsable</label>
            <input
              className="input mt-1"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="Gerente de Sede"
              autoComplete="off"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">{error}</div>
        ) : null}

        {result ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-2.5 py-2 text-xs text-green-800">
            Ubicación creada: <span className="font-semibold">{result.name}</span> ({result.code})
          </div>
        ) : null}

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Procesando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}
