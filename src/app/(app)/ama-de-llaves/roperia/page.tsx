export const metadata = {
  title: 'Ropería | Ama de Llaves | ZIII HoS',
}

export default function HousekeepingLaundryPage() {
  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Ropería</h1>
        <p className="text-sm text-slate-500 font-medium">Ama de Llaves</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="text-sm font-semibold text-slate-900">Próximamente</div>
          <div className="mt-1 text-sm text-slate-600">
            Aquí se gestionarán blancos, consumos, entradas/salidas y control básico de ropería.
          </div>
        </div>
      </div>
    </main>
  )
}
