import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RoomBoardClient from './ui/RoomBoardClient';

export const metadata = {
  title: 'Tablero de Habitaciones | ZIII HoS',
  description: 'Vista consolidada del estado operativo de habitaciones en todas las propiedades',
};

export default async function RoomBoardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <RoomBoardClient />;
}
