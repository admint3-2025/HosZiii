import ResetPasswordForm from './ui/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="card-body space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Restablecer contraseña</h1>
              <p className="text-sm text-gray-600 mt-1">
                Define una nueva contraseña para tu cuenta.
              </p>
            </div>
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </main>
  )
}
