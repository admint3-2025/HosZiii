'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Lock,
  Check,
  Clock,
  Users,
  Star,
  Award,
  BookOpen,
  Video,
  FileText,
  FileText as FileDescription,
  Presentation,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type {
  AcademyCourse,
  AcademyEnrollment,
  AcademyProgress,
  AcademyModule,
} from '@/lib/types/academy';

interface ModuleWithProgress extends AcademyModule {
  progress?: AcademyProgress;
  isLocked: boolean;
  contents?: Array<{
    id: string;
    title: string;
    content_type: string;
    video_duration_seconds: number | null;
    sort_order: number;
  }>;
  quiz_id?: string | null;
}

interface CourseWithEnrollment extends AcademyCourse {
  enrollment: AcademyEnrollment | null;
  modules_with_progress: ModuleWithProgress[];
  total_enrolled: number;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseWithEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const supabase = createSupabaseBrowserClient();

  const fetchCourse = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get course with modules
      const courseRes = await fetch(`/api/academy/courses/${courseId}`);
      if (!courseRes.ok) {
        if (courseRes.status === 404) {
          setError('Curso no encontrado');
          return;
        }
        throw new Error('Error al cargar el curso');
      }
      const courseData = await courseRes.json();

      // Get user enrollment
      const enrollmentRes = await fetch(`/api/academy/enrollments?courseId=${courseId}`);
      const enrollmentData = enrollmentRes.ok ? await enrollmentRes.json() : [];
      const enrollment = enrollmentData.length > 0 ? enrollmentData[0] : null;

      // Get progress for each module if enrolled
      let modulesWithProgress: ModuleWithProgress[] = [];
      if (courseData.modules && courseData.modules.length > 0) {
        const progressRes = await fetch(`/api/academy/progress?courseId=${courseId}`);
        const progressData = progressRes.ok ? await progressRes.json() : [];
        
        const progressMap = new Map<string, AcademyProgress>(
          progressData.map((p: AcademyProgress) => [p.module_id, p])
        );

        modulesWithProgress = courseData.modules.map((module: AcademyModule, index: number) => {
          const moduleProgress = progressMap.get(module.id);
          // First module is always unlocked, others depend on previous completion
          let isLocked = false;
          if (index > 0 && enrollment) {
            const prevModule = courseData.modules[index - 1];
            const prevProgress = progressMap.get(prevModule.id);
            isLocked = !prevProgress || prevProgress.status !== 'completed';
          }
          if (!enrollment) {
            isLocked = true;
          }
          return {
            ...module,
            progress: moduleProgress,
            isLocked,
          };
        });
      }

      // Get total enrollments for this course
      const { count } = await supabase
        .from('academy_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      setCourse({
        ...courseData,
        enrollment,
        modules_with_progress: modulesWithProgress,
        total_enrolled: count || 0,
      });
    } catch (err) {
      console.error('Error fetching course:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [courseId, supabase]);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId, fetchCourse]);

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      const res = await fetch('/api/academy/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al inscribirse');
      }
      // Refresh course data
      await fetchCourse();
    } catch (err) {
      console.error('Error enrolling:', err);
      alert(err instanceof Error ? err.message : 'Error al inscribirse');
    } finally {
      setEnrolling(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Video;
      case 'document':
        return FileDescription;
      case 'presentation':
        return Presentation;
      case 'text':
        return FileText;
      case 'quiz':
        return ClipboardCheck;
      default:
        return BookOpen;
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'basic':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'basic':
        return 'B+Ìsico';
      case 'intermediate':
        return 'Intermedio';
      case 'advanced':
        return 'Avanzado';
      default:
        return level;
    }
  };

  const calculateProgress = () => {
    if (!course?.modules_with_progress) return 0;
    const completed = course.modules_with_progress.filter(
      (m) => m.progress?.status === 'completed'
    ).length;
    return Math.round((completed / course.modules_with_progress.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
        <p className="text-lg">{error || 'Curso no encontrado'}</p>
        <button
          onClick={() => router.push('/academia')}
          className="mt-4 text-blue-600 hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al cat+Ìlogo
        </button>
      </div>
    );
  }

  const progress = calculateProgress();
  const isEnrolled = !!course.enrollment;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/academia')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver al cat+Ìlogo
      </button>

      {/* Course header */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
        <div className="md:flex">
          {/* Thumbnail */}
          <div className="md:w-1/3 h-48 md:h-auto bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            {course.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="w-20 h-20 text-white/80" />
            )}
          </div>

          {/* Info */}
          <div className="md:w-2/3 p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {course.is_mandatory && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  Obligatorio
                </span>
              )}
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(course.difficulty_level)}`}>
                {getDifficultyLabel(course.difficulty_level)}
              </span>
              {course.area && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  {course.area.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
            <p className="text-gray-600 mb-4">{course.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {Math.round(course.estimated_duration_minutes / 60)} horas
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {course.modules?.length || 0} m+¶dulos
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {course.total_enrolled} inscritos
              </span>
              {course.certificate_template && (
                <span className="flex items-center gap-1 text-green-600">
                  <Award className="w-4 h-4" />
                  Certificado
                </span>
              )}
            </div>

            {/* Enrollment / Progress */}
            {isEnrolled ? (
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{progress}%</span>
                </div>
                <p className="text-sm text-gray-500">
                  {course.enrollment?.status === 'completed' ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Curso completado
                    </span>
                  ) : (
                    <>
                      {course.modules_with_progress.filter((m) => m.progress?.status === 'completed').length} de{' '}
                      {course.modules_with_progress.length} m+¶dulos completados
                    </>
                  )}
                </p>
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Inscribiendo...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Inscribirme al curso
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Course content */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Contenido del curso</h2>

        {course.modules_with_progress.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Este curso a+¶n no tiene m+¶dulos disponibles.
          </p>
        ) : (
          <div className="space-y-3">
            {course.modules_with_progress.map((module, index) => {
              const isExpanded = expandedModules.has(module.id);
              const ModuleIcon = module.progress?.status === 'completed'
                ? Check
                : module.isLocked
                ? Lock
                : Play;
              const iconColor = module.progress?.status === 'completed'
                ? 'text-green-600'
                : module.isLocked
                ? 'text-gray-400'
                : 'text-blue-600';

              return (
                <div key={module.id} className="border rounded-lg overflow-hidden">
                  {/* Module header */}
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        module.progress?.status === 'completed'
                          ? 'bg-green-100'
                          : module.isLocked
                          ? 'bg-gray-100'
                          : 'bg-blue-100'
                      }`}>
                        <ModuleIcon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900">
                          {index + 1}. {module.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {module.estimated_duration_minutes} min
                          {module.progress?.status === 'in_progress' && (
                            <span className="ml-2 text-blue-600">En progreso</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Module content */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4">
                      {module.description && (
                        <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                      )}
                      
                      {module.contents && module.contents.length > 0 ? (
                        <div className="space-y-2">
                          {module.contents.map((content) => {
                            const ContentIcon = getContentIcon(content.content_type);
                            return (
                              <button
                                key={content.id}
                                onClick={() => {
                                  if (!module.isLocked) {
                                    router.push(`/academia/aprender/${module.id}?content=${content.id}`);
                                  }
                                }}
                                disabled={module.isLocked}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                  module.isLocked
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white hover:bg-blue-50 text-gray-700'
                                }`}
                              >
                                <ContentIcon className="w-5 h-5" />
                                <span className="flex-1">{content.title}</span>
                                <span className="text-sm text-gray-400">
                                  {Math.round((content.video_duration_seconds || 0) / 60)} min
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Sin contenido disponible
                        </p>
                      )}

                      {/* Quiz button if module has quiz */}
                      {module.quizzes && module.quizzes.length > 0 && (
                        <button
                          onClick={() => {
                            if (!module.isLocked && module.quizzes) {
                              router.push(`/academia/evaluacion/${module.quizzes[0].id}`);
                            }
                          }}
                          disabled={module.isLocked}
                          className={`mt-3 w-full flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${
                            module.isLocked
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <ClipboardCheck className="w-5 h-5" />
                          Realizar evaluaci+¶n
                        </button>
                      )}

                      {/* Start learning button */}
                      {!module.isLocked && module.progress?.status !== 'completed' && (
                        <button
                          onClick={() => router.push(`/academia/aprender/${module.id}`)}
                          className="mt-3 w-full flex items-center justify-center gap-2 p-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          <Play className="w-5 h-5" />
                          {module.progress?.status === 'in_progress' ? 'Continuar m+¶dulo' : 'Comenzar m+¶dulo'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Certificate section if completed */}
      {course.enrollment?.status === 'completed' && course.certificate_template && (
        <div className="mt-6 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-yellow-200 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-yellow-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-800">-ÌFelicidades!</h3>
              <p className="text-yellow-700">Has completado el curso exitosamente.</p>
            </div>
            <button
              onClick={() => router.push(`/academia/mi-progreso?certificate=${courseId}`)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 flex items-center gap-2"
            >
              <Star className="w-5 h-5" />
              Ver certificado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
