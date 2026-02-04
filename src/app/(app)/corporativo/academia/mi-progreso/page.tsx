import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MyProgressDashboard from './ui/MyProgressDashboard';

interface Enrollment {
  id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  completed_at?: string | null;
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    estimated_duration_minutes: number;
    difficulty_level: string;
    certificate_template: string | null;
    is_mandatory: boolean;
    area: { id: string; name: string } | null;
  };
}

interface ModuleInfo {
  course_id: string;
}

export default async function MyProgressPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's enrollments with course and progress data
  const { data: enrollments } = await supabase
    .from('academy_enrollments')
    .select(`
      *,
      course:academy_courses(
        id,
        title,
        description,
        thumbnail_url,
        estimated_duration_minutes,
        difficulty_level,
        certificate_template,
        is_mandatory,
        area:academy_areas(id, name)
      )
    `)
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false });

  // Get user's progress for all enrolled courses
  const { data: progress } = await supabase
    .from('academy_progress')
    .select('*')
    .eq('user_id', user.id);

  // Get user's certificates
  const { data: certificates } = await supabase
    .from('academy_certificates')
    .select(`
      *,
      course:academy_courses(id, title)
    `)
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false });

  // Get module counts per course for enrolled courses
  const courseIds = (enrollments as Enrollment[] | null)?.map((e) => e.course_id) || [];
  let moduleCounts: Record<string, number> = {};
  
  if (courseIds.length > 0) {
    const { data: modules } = await supabase
      .from('academy_modules')
      .select('course_id')
      .in('course_id', courseIds);
    
    if (modules) {
      moduleCounts = (modules as ModuleInfo[]).reduce((acc: Record<string, number>, m: ModuleInfo) => {
        acc[m.course_id] = (acc[m.course_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <MyProgressDashboard
        enrollments={enrollments || []}
        progress={progress || []}
        certificates={certificates || []}
        moduleCounts={moduleCounts}
      />
    </div>
  );
}
