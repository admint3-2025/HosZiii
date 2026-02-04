'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { AcademyArea, AcademyCourse, DifficultyLevel, EnrollmentStatus } from '@/lib/types/academy'
import { difficultyLabels, difficultyColors, enrollmentStatusLabels, enrollmentStatusColors } from '@/lib/types/academy'

interface CourseWithEnrollment extends AcademyCourse {
  enrollment: { status: EnrollmentStatus; final_score: number | null } | null
}

interface AcademyCatalogProps {
  areas: AcademyArea[]
  courses: CourseWithEnrollment[]
  isAdmin: boolean
  userName: string
}

export default function AcademyCatalog({ areas, courses, isAdmin, userName }: AcademyCatalogProps) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyMandatory, setShowOnlyMandatory] = useState(false)

  // Filtrar cursos
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      if (selectedArea && course.area_id !== selectedArea) return false
      if (selectedDifficulty && course.difficulty_level !== selectedDifficulty) return false
      if (showOnlyMandatory && !course.is_mandatory) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchTitle = course.title.toLowerCase().includes(query)
        const matchDesc = course.description?.toLowerCase().includes(query)
        if (!matchTitle && !matchDesc) return false
      }
      return true
    })
  }, [courses, selectedArea, selectedDifficulty, searchQuery, showOnlyMandatory])

  // Estadísticas
  const stats = useMemo(() => {
    const enrolled = courses.filter(c => c.enrollment).length
    const completed = courses.filter(c => c.enrollment?.status === 'completed').length
    const inProgress = courses.filter(c => c.enrollment?.status === 'in_progress').length
    return { total: courses.length, enrolled, completed, inProgress }
  }, [courses])

  const clearFilters = () => {
    setSelectedArea(null)
    setSelectedDifficulty(null)
    setSearchQuery('')
    setShowOnlyMandatory(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🎓</span>
                <h1 className="text-3xl font-bold">Academia</h1>
              </div>
              <p className="text-amber-100">
                Bienvenido, {userName}. Explora nuestros cursos de capacitación hotelera.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/corporativo/academia/mi-progreso"
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Mi Progreso
              </Link>

              {isAdmin && (
                <Link
                  href="/corporativo/academia/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Administrar
                </Link>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-sm text-amber-100">Cursos Disponibles</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.enrolled}</div>
              <div className="text-sm text-amber-100">Inscritos</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.inProgress}</div>
              <div className="text-sm text-amber-100">En Progreso</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.completed}</div>
              <div className="text-sm text-amber-100">Completados</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            {/* Búsqueda */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar cursos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Área */}
            <select
              value={selectedArea || ''}
              onChange={(e) => setSelectedArea(e.target.value || null)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Todas las áreas</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>
                  {area.icon} {area.name}
                </option>
              ))}
            </select>

            {/* Dificultad */}
            <select
              value={selectedDifficulty || ''}
              onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyLevel || null)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Todas las dificultades</option>
              <option value="basico">Básico</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>

            {/* Obligatorios */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyMandatory}
                onChange={(e) => setShowOnlyMandatory(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-gray-600">Solo obligatorios</span>
            </label>

            {/* Limpiar */}
            {(selectedArea || selectedDifficulty || searchQuery || showOnlyMandatory) && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Áreas como tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedArea(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedArea
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Todos
          </button>
          {areas.map(area => (
            <button
              key={area.id}
              onClick={() => setSelectedArea(area.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                selectedArea === area.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span>{area.icon}</span>
              {area.name}
            </button>
          ))}
        </div>

        {/* Grid de cursos */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay cursos disponibles</h3>
            <p className="text-gray-500">Intenta ajustar los filtros o vuelve más tarde.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CourseCard({ course }: { course: CourseWithEnrollment }) {
  const enrollment = course.enrollment

  return (
    <Link
      href={`/corporativo/academia/curso/${course.id}`}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-amber-200 transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-amber-100 to-orange-100 overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-50">{course.area?.icon || '📖'}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {course.is_mandatory && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
              Obligatorio
            </span>
          )}
          {enrollment && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${enrollmentStatusColors[enrollment.status]}`}>
              {enrollmentStatusLabels[enrollment.status]}
            </span>
          )}
        </div>

        {/* Área badge */}
        {course.area && (
          <div 
            className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: course.area.color || '#f59e0b' }}
          >
            {course.area.icon} {course.area.name}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors line-clamp-2">
          {course.title}
        </h3>

        {course.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {course.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {course.estimated_duration_minutes} min
            </span>
            <span className={`px-2 py-0.5 rounded-full ${difficultyColors[course.difficulty_level]}`}>
              {difficultyLabels[course.difficulty_level]}
            </span>
          </div>

          {enrollment?.status === 'completed' && enrollment.final_score !== null && (
            <span className="font-medium text-green-600">
              {enrollment.final_score}%
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
