import AssetCreateForm from './ui/AssetCreateForm'

export default function NewAssetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Activo</h1>
        <p className="text-sm text-gray-600 mt-1">Registra un nuevo activo en el inventario</p>
      </div>

      <AssetCreateForm />
    </div>
  )
}
