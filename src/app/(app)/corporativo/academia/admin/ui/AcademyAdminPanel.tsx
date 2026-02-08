'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Users,
  Award,
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Loader2,
  Check,
} from 'lucide-react';
import type { AcademyArea, AcademyCourse } from '@/lib/types/academy';

interface CourseWithStats extends Omit<AcademyCourse, 'area' | 'modules'> {
  area: { id: string; name: string } | null;
  modules: { count: number }[];
  enrollments: { count: number }[];
}

interface Props {
  areas: AcademyArea[];
  courses: CourseWithStats[];
  stats: {
    totalCourses: number;
    totalEnrollments: number;
    completedEnrollments: number;
    certificatesIssued: number;
  };
}

type TabType = 'courses' | 'areas' | 'reports';

interface CourseFormData {
  title: string;
  description: string;
  area_id: string;
  thumbnail_url: string;
  estimated_duration_minutes: number;
  difficulty_level: string;
  is_mandatory: boolean;
  certificate_template: string;
  is_published: boolean;
}

const initialCourseForm: CourseFormData = {
  title: '',
  description: '',
  area_id: '',
  thumbnail_url: '',
  estimated_duration_minutes: 60,
  difficulty_level: 'basico',
  is_mandatory: false,
  certificate_template: '',
  is_published: false,
};

export default function AcademyAdminPanel({ areas, courses: initialCourses, stats }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('courses');
  const [courses, setCourses] = useState(initialCourses);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Course form state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState<CourseFormData>(initialCourseForm);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Area form state
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [areaDescription, setAreaDescription] = useState('');
  const [areasList, setAreasList] = useState(areas);
  const [savingArea, setSavingArea] = useState(false);

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = !filterArea || course.area_id === filterArea;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'published' ? course.is_published : !course.is_published);
    return matchesSearch && matchesArea && matchesStatus;
  });

  const openCourseModal = (course?: CourseWithStats) => {
    if (course) {
      setEditingCourseId(course.id);
      setCourseForm({
        title: course.title,
        description: course.description || '',
        area_id: course.area_id || '',
        thumbnail_url: course.thumbnail_url || '',
        estimated_duration_minutes: course.estimated_duration_minutes,
        difficulty_level: course.difficulty_level,
        is_mandatory: course.is_mandatory,
        certificate_template: course.certificate_template || '',
        is_published: course.is_published,
      });
    } else {
      setEditingCourseId(null);
      setCourseForm(initialCourseForm);
    }
    setShowCourseModal(true);
  };

  const saveCourse = async () => {
    try {
      setSaving(true);
      
      const url = editingCourseId 
        ? `/api/academy/courses/${editingCourseId}`
        : '/api/academy/courses';
      
      const res = await fetch(url, {
        method: editingCourseId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      // Refresh page to get updated data
      router.refresh();
      setShowCourseModal(false);
    } catch (err) {
      console.error('Error saving course:', err);
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeleting(courseId);
      const res = await fetch(`/api/academy/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err) {
      console.error('Error deleting course:', err);
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const saveArea = async () => {
    if (!areaName.trim()) return;

    try {
      setSavingArea(true);
      const res = await fetch('/api/academy/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: areaName,
          description: areaDescription,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear área');
      }

      const newArea = await res.json();
      setAreasList((prev) => [...prev, newArea]);
      setShowAreaModal(false);
      setAreaName('');
      setAreaDescription('');
    } catch (err) {
      console.error('Error saving area:', err);
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingArea(false);
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'basic': return 'Básico';
      case 'intermediate': return 'Intermedio';
      case 'advanced': return 'Avanzado';
      default: return level;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'published': return 'Publicado';
      case 'archived': return 'Archivado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Administrar Academia</h1>
            <p className="text-gray-600">Gestiona cursos, módulos y contenido</p>
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
              <p className="text-sm text-gray-500">Cursos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inscripciones</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEnrollments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedEnrollments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Certificados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.certificatesIssued}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'courses'
                ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Cursos
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'areas'
                ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Áreas
          </button>
        </div>

        <div className="p-6">
          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar cursos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las áreas</option>
                  {areasList.map((area) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Archivado</option>
                </select>

                <button
                  onClick={() => openCourseModal()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nuevo curso
                </button>
              </div>

              {/* Courses table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Curso</th>
                      <th className="pb-3 font-medium">Área</th>
                      <th className="pb-3 font-medium">Módulos</th>
                      <th className="pb-3 font-medium">Inscritos</th>
                      <th className="pb-3 font-medium">Estado</th>
                      <th className="pb-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course) => (
                      <tr key={course.id} className="border-b last:border-0">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                              {course.thumbnail_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={course.thumbnail_url}
                                  alt=""
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <BookOpen className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{course.title}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{getDifficultyLabel(course.difficulty_level)}</span>
                                {course.is_mandatory && (
                                  <span className="text-red-600">• Obligatorio</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-gray-600">
                          {course.area?.name || '-'}
                        </td>
                        <td className="py-4 text-gray-600">
                          {course.modules?.[0]?.count || 0}
                        </td>
                        <td className="py-4 text-gray-600">
                          {course.enrollments?.[0]?.count || 0}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(course.is_published ? 'published' : 'draft')}`}>
                            {getStatusLabel(course.is_published ? 'published' : 'draft')}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/corporativo/academia/admin/curso/${course.id}`)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Ver/Editar módulos"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openCourseModal(course)}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                              title="Editar curso"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteCourse(course.id)}
                              disabled={deleting === course.id}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                              title="Eliminar"
                            >
                              {deleting === course.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredCourses.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron cursos</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Areas Tab */}
          {activeTab === 'areas' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Áreas de capacitación</h2>
                <button
                  onClick={() => setShowAreaModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nueva área
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {areasList.map((area) => {
                  const courseCount = courses.filter((c) => c.area_id === area.id).length;
                  return (
                    <div
                      key={area.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: area.color || '#e5e7eb' }}
                        >
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-gray-500">{courseCount} cursos</span>
                      </div>
                      <h3 className="font-medium text-gray-900 mt-3">{area.name}</h3>
                      {area.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {area.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {areasList.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay áreas definidas</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingCourseId ? 'Editar curso' : 'Nuevo curso'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del curso"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción del curso"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Área
                  </label>
                  <select
                    value={courseForm.area_id}
                    onChange={(e) => setCourseForm({ ...courseForm, area_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar área</option>
                    {areasList.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dificultad
                  </label>
                  <select
                    value={courseForm.difficulty_level}
                    onChange={(e) => setCourseForm({ ...courseForm, difficulty_level: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="basic">Básico</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duración (minutos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={courseForm.estimated_duration_minutes}
                    onChange={(e) => setCourseForm({ ...courseForm, estimated_duration_minutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={courseForm.is_published ? 'published' : 'draft'}
                    onChange={(e) => setCourseForm({ ...courseForm, is_published: e.target.value === 'published' })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Borrador</option>
                    <option value="published">Publicado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de imagen
                </label>
                <input
                  type="url"
                  value={courseForm.thumbnail_url}
                  onChange={(e) => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={courseForm.is_mandatory}
                    onChange={(e) => setCourseForm({ ...courseForm, is_mandatory: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Curso obligatorio</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!courseForm.certificate_template}
                    onChange={(e) => setCourseForm({ ...courseForm, certificate_template: e.target.checked ? 'default' : '' })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Emitir certificado</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCourseModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveCourse}
                disabled={saving || !courseForm.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Area Modal */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Nueva área</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del área"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={areaDescription}
                  onChange={(e) => setAreaDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción del área"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAreaModal(false);
                  setAreaName('');
                  setAreaDescription('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveArea}
                disabled={savingArea || !areaName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingArea ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Crear área
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
