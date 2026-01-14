# ZIII HoS

Help Desk ITIL (tickets, comentarios, auditoría)

## Stack
- Hosting: Vercel
- Auth + DB: Supabase

## 1) Requisitos locales
- Node.js 20+

## 2) Configurar Supabase
1. Crea un proyecto en Supabase.
2. En el SQL Editor ejecuta los scripts:
   - `supabase/schema.sql`
   - `supabase/policies.sql`
   - `supabase/seed.sql`
3. Crea usuarios en Supabase Auth (Email/Password).
4. (Opcional) Asigna roles iniciales (N1/N2/Supervisor/Auditor) desde el SQL Editor usando:
   - `select public.set_user_role('admin@tuempresa.com', 'supervisor', 'Administrador');`
   Nota: el trigger `handle_new_user` crea automáticamente un registro en `profiles` al crear un usuario.
5. Copia variables en `.env.local` desde `.env.example`.

## 3) Correr local
```bash
npm install
npm run dev
```

### Windows (PowerShell)
También puedes correrlo con un solo comando:
```powershell
./scripts/run-local.ps1
```

## 4) Deploy (Vercel)
1. Sube este repo a GitHub.
2. Importa el proyecto en Vercel.
3. Configura env vars en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
