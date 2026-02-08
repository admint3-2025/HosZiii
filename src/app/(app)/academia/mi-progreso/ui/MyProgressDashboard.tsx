'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Award,
  Clock,
  Check,
  Play,
  Download,
  Trophy,
  Flame,
  Target,
  ArrowLeft,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import type { AcademyProgress } from '@/lib/types/academy';

interface EnrollmentCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  estimated_duration_minutes: number;
  difficulty_level: string;
  certificate_template: string | null;
  is_mandatory: boolean;
  area: { id: string; name: string } | null;
}

interface EnrollmentWithCourse {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  completed_at?: string | null;
  course: EnrollmentCourse;
}

interface CertificateWithCourse {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  pdf_url: string | null;
  verification_code: string | null;
  course: { id: string; title: string };
}

interface Props {
  enrollments: EnrollmentWithCourse[];
  progress: AcademyProgress[];
  certificates: CertificateWithCourse[];
  moduleCounts: Record<string, number>;
}

type TabType = 'in_progress' | 'completed' | 'certificates';

export default function MyProgressDashboard({
  enrollments,
  progress,
  certificates,
  moduleCounts,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('in_progress');

  // Calculate statistics
  const inProgressCourses = enrollments.filter((e) => e.status === 'in_progress');
  const completedCourses = enrollments.filter((e) => e.status === 'completed');
  const totalHoursLearned = completedCourses.reduce(
    (sum, e) => sum + Math.round((e.course?.estimated_duration_minutes || 0) / 60),
    0
  );

  // Calculate progress percentage for each course
  const getProgressPercentage = (courseId: string): number => {
    const courseProgress = progress.filter((p) => {
      // Find if this progress belongs to a module of this course
      const enrollment = enrollments.find((e) => e.course_id === courseId);
      return enrollment && p.status !== undefined;
    });
    const completedModules = courseProgress.filter((p) => p.status === 'completed').length;
    const totalModules = moduleCounts[courseId] || 1;
    return Math.round((completedModules / totalModules) * 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const tabs = [
    {
      id: 'in_progress' as TabType,
      label: 'En progreso',
      icon: Play,
      count: inProgressCourses.length,
    },
    {
      id: 'completed' as TabType,
      label: 'Completados',
      icon: Check,
      count: completedCourses.length,
    },
    {
      id: 'certificates' as TabType,
      label: 'Certificados',
      icon: Award,
      count: certificates.length,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/academia')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi Progreso</h1>
            <p className="text-gray-600">Seguimiento de tu aprendizaje</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total inscritos</p>
              <p className="text-2xl font-bold text-gray-900">{enrollments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Flame className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En progreso</p>
              <p className="text-2xl font-bold text-gray-900">{inProgressCourses.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completados</p>
              <p className="text-2xl font-bold text-gray-900">{completedCourses.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Horas aprendidas</p>
              <p className="text-2xl font-bold text-gray-900">{totalHoursLearned}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* In Progress Tab */}
          {activeTab === 'in_progress' && (
            <div>
              {inProgressCourses.length === 0 ? (
                <div className="text-center py-12">
                  <Play className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No tienes cursos en progreso</p>
                  <button
                    onClick={() => router.push('/academia')}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    Explorar catálogo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {inProgressCourses.map((enrollment) => {
                    const progressPercent = getProgressPercentage(enrollment.course_id);
                    return (
                      <div
                        key={enrollment.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => router.push(`/academia/curso/${enrollment.course_id}`)}
                      >
                        <div className="w-20 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          {enrollment.course.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={enrollment.course.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <BookOpen className="w-8 h-8 text-white/80" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {enrollment.course.is_mandatory && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                Obligatorio
                              </span>
                            )}
                            {enrollment.course.area && (
                              <span className="text-xs text-gray-500">
                                {enrollment.course.area.name}
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-900 truncate">
                            {enrollment.course.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {progressPercent}%
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-400" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Completed Tab */}
          {activeTab === 'completed' && (
            <div>
              {completedCourses.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aún no has completado ningún curso</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedCourses.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center gap-4 p-4 bg-green-50 rounded-lg"
                    >
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900">
                          {enrollment.course.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Completado el {formatDate(enrollment.completed_at || enrollment.enrolled_at)}
                          {' • '}
                          {Math.round(enrollment.course.estimated_duration_minutes / 60)}h
                        </p>
                      </div>
                      {enrollment.course.certificate_template && (
                        <button
                          onClick={() => router.push(`/academia/curso/${enrollment.course_id}`)}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                        >
                          <Award className="w-4 h-4" />
                          Ver certificado
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <div>
              {certificates.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aún no tienes certificados</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Completa cursos con certificado habilitado
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 bg-yellow-200 rounded-full flex items-center justify-center">
                          <Trophy className="w-7 h-7 text-yellow-700" />
                        </div>
                        <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded font-mono">
                          {cert.verification_code}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">
                        {cert.course.title}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mb-4">
                        <Calendar className="w-4 h-4" />
                        Emitido: {formatDate(cert.issued_at)}
                      </p>
                      {cert.pdf_url && (
                        <a
                          href={cert.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                          <Download className="w-5 h-5" />
                          Descargar certificado
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
