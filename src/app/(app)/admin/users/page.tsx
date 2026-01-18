import { createSupabaseServerClient } from '@/lib/supabase/server'
import UserCreateForm from './ui/UserCreateForm'
import UserList from './ui/UserList'

export default async function AdminUsersPage() {
  // La validación de rol está en /admin/layout.tsx

  return (
    <main className="p-6 space-y-4">
      {/* Header compacto */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl -ml-24 -mb-24"></div>

        <div className="relative z-10 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Usuarios</h1>
              <p className="text-blue-100 text-[11px]">Administración de usuarios y roles</p>
            </div>
          </div>
        </div>
      </div>
      <UserCreateForm />
      <UserList />
    </main>
  )
}
