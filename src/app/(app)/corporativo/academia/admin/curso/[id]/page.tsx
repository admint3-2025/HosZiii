'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Video,
  FileText,
  FileText as FileDescription,
  Presentation,
  ClipboardCheck,
  Loader2,
  Check,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import type { AcademyCourse, AcademyModule, AcademyContent, AcademyQuiz } from '@/lib/types/academy';

interface ModuleWithContent extends AcademyModule {
  contents: AcademyContent[];
  quiz?: AcademyQuiz | null;
}

interface CourseWithModules extends Omit<AcademyCourse, 'area'> {
  modules: ModuleWithContent[];
  area?: { id: string; name: string } | null;
}

interface ContentFormData {
  title: string;
  content_type: string;
  video_url: string;
  document_url: string;
  text_content: string;
  video_duration_seconds: number;
  sort_order: number;
}

interface ModuleFormData {
  title: string;
  description: string;
  estimated_duration_minutes: number;
  sort_order: number;
}

const initialContentForm: ContentFormData = {
  title: '',
  content_type: 'video',
  video_url: '',
  document_url: '',
  text_content: '',
  video_duration_seconds: 600, // 10 minutes in seconds
  sort_order: 0,
};

const initialModuleForm: ModuleFormData = {
  title: '',
  description: '',
  estimated_duration_minutes: 30,
  sort_order: 0,
};

export default function CourseAdminPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Module form state
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleForm, setModuleForm] = useState<ModuleFormData>(initialModuleForm);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [savingModule, setSavingModule] = useState(false);
  const [deletingModule, setDeletingModule] = useState<string | null>(null);

  // Content form state
  const [showContentModal, setShowContentModal] = useState(false);
  const [contentForm, setContentForm] = useState<ContentFormData>(initialContentForm);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [savingContent, setSavingContent] = useState(false);
  const [deletingContent, setDeletingContent] = useState<string | null>(null);

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

      // Get content for each module
      const modulesWithContent = await Promise.all(
        (courseData.modules || []).map(async (module: AcademyModule) => {
          const contentRes = await fetch(`/api/academy/content?moduleId=${module.id}`);
          const contents = contentRes.ok ? await contentRes.json() : [];
          return {
            ...module,
            contents: contents.sort((a: AcademyContent, b: AcademyContent) => a.sort_order - b.sort_order),
          };
        })
      );

      setCourse({
        ...courseData,
        modules: modulesWithContent,
      });

      // Auto-expand first module
      if (modulesWithContent.length > 0) {
        setExpandedModules(new Set([modulesWithContent[0].id]));
      }
    } catch (err) {
      console.error('Error fetching course:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId, fetchCourse]);

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

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Video';
      case 'document':
        return 'Documento';
      case 'presentation':
        return 'Presentación';
      case 'text':
        return 'Texto';
      default:
        return type;
    }
  };

  // Module CRUD
  const openModuleModal = (module?: ModuleWithContent) => {
    if (module) {
      setEditingModuleId(module.id);
      setModuleForm({
        title: module.title,
        description: module.description || '',
        estimated_duration_minutes: module.estimated_duration_minutes,
        sort_order: module.sort_order,
      });
    } else {
      setEditingModuleId(null);
      setModuleForm({
        ...initialModuleForm,
        sort_order: course?.modules.length || 0,
      });
    }
    setShowModuleModal(true);
  };

  const saveModule = async () => {
    try {
      setSavingModule(true);

      const url = editingModuleId
        ? `/api/academy/modules/${editingModuleId}`
        : '/api/academy/modules';

      const res = await fetch(url, {
        method: editingModuleId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...moduleForm,
          course_id: courseId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      await fetchCourse();
      setShowModuleModal(false);
    } catch (err) {
      console.error('Error saving module:', err);
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingModule(false);
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm('¿Eliminar este módulo y todo su contenido?')) return;

    try {
      setDeletingModule(moduleId);
      const res = await fetch(`/api/academy/modules/${moduleId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      await fetchCourse();
    } catch (err) {
      console.error('Error deleting module:', err);
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingModule(null);
    }
  };

  // Content CRUD
  const openContentModal = (moduleId: string, content?: AcademyContent) => {
    setCurrentModuleId(moduleId);
    if (content) {
      setEditingContentId(content.id);
      setContentForm({
        title: content.title,
        content_type: content.content_type,
        video_url: content.video_url || '',
        document_url: content.document_url || '',
        text_content: content.text_content || '',
        video_duration_seconds: content.video_duration_seconds || 600,
        sort_order: content.sort_order,
      });
    } else {
      setEditingContentId(null);
      const courseModule = course?.modules.find((m) => m.id === moduleId);
      setContentForm({
        ...initialContentForm,
        sort_order: courseModule?.contents.length || 0,
      });
    }
    setShowContentModal(true);
  };

  const saveContent = async () => {
    if (!currentModuleId) return;

    try {
      setSavingContent(true);

      const url = editingContentId
        ? `/api/academy/content/${editingContentId}`
        : '/api/academy/content';

      const res = await fetch(url, {
        method: editingContentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contentForm,
          module_id: currentModuleId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      await fetchCourse();
      setShowContentModal(false);
    } catch (err) {
      console.error('Error saving content:', err);
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingContent(false);
    }
  };

  const deleteContent = async (contentId: string) => {
    if (!confirm('¿Eliminar este contenido?')) return;

    try {
      setDeletingContent(contentId);
      const res = await fetch(`/api/academy/content/${contentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      await fetchCourse();
    } catch (err) {
      console.error('Error deleting content:', err);
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingContent(null);
    }
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
          onClick={() => router.push('/corporativo/academia/admin')}
          className="mt-4 text-blue-600 hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al admin
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/corporativo/academia/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-sm text-gray-500">{course.area?.name || 'Sin área'}</p>
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          </div>
        </div>

        <button
          onClick={() => openModuleModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo módulo
        </button>
      </div>

      {/* Modules list */}
      <div className="space-y-4">
        {course.modules.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Este curso no tiene módulos</p>
            <button
              onClick={() => openModuleModal()}
              className="text-blue-600 hover:underline"
            >
              Crear el primer módulo
            </button>
          </div>
        ) : (
          course.modules.map((module, moduleIndex) => {
            const isExpanded = expandedModules.has(module.id);
            return (
              <div key={module.id} className="bg-white rounded-xl border overflow-hidden">
                {/* Module header */}
                <div className="flex items-center p-4 bg-gray-50 border-b">
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="p-1 hover:bg-gray-200 rounded mr-2"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </button>

                  <GripVertical className="w-5 h-5 text-gray-400 mr-3 cursor-grab" />

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {moduleIndex + 1}. {module.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {module.contents.length} contenidos • {module.estimated_duration_minutes} min
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModuleModal(module)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Editar módulo"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteModule(module.id)}
                      disabled={deletingModule === module.id}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Eliminar módulo"
                    >
                      {deletingModule === module.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Module content */}
                {isExpanded && (
                  <div className="p-4">
                    {module.description && (
                      <p className="text-gray-600 mb-4">{module.description}</p>
                    )}

                    {/* Content list */}
                    <div className="space-y-2 mb-4">
                      {module.contents.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">
                          Sin contenido. Agrega videos, documentos o texto.
                        </p>
                      ) : (
                        module.contents.map((content, contentIndex) => {
                          const ContentIcon = getContentIcon(content.content_type);
                          return (
                            <div
                              key={content.id}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 group"
                            >
                              <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border">
                                <ContentIcon className="w-4 h-4 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {contentIndex + 1}. {content.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {getContentTypeLabel(content.content_type)} • {Math.round((content.video_duration_seconds || 0) / 60)} min
                                </p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openContentModal(module.id, content)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteContent(content.id)}
                                  disabled={deletingContent === content.id}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                >
                                  {deletingContent === content.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Add content button */}
                    <button
                      onClick={() => openContentModal(module.id)}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Agregar contenido
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingModuleId ? 'Editar módulo' : 'Nuevo módulo'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del módulo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción del módulo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duración estimada (minutos)
                </label>
                <input
                  type="number"
                  min={1}
                  value={moduleForm.estimated_duration_minutes}
                  onChange={(e) => setModuleForm({ ...moduleForm, estimated_duration_minutes: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowModuleModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveModule}
                disabled={savingModule || !moduleForm.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingModule ? (
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

      {/* Content Modal */}
      {showContentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingContentId ? 'Editar contenido' : 'Nuevo contenido'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={contentForm.title}
                  onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Título del contenido"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de contenido
                  </label>
                  <select
                    value={contentForm.content_type}
                    onChange={(e) => setContentForm({ ...contentForm, content_type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="video">Video</option>
                    <option value="document">Documento</option>
                    <option value="presentation">Presentación</option>
                    <option value="text">Texto/Artículo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duración (minutos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={Math.round(contentForm.video_duration_seconds / 60)}
                    onChange={(e) => setContentForm({ ...contentForm, video_duration_seconds: (parseInt(e.target.value) || 10) * 60 })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {contentForm.content_type === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contenido (HTML)
                  </label>
                  <textarea
                    value={contentForm.text_content}
                    onChange={(e) => setContentForm({ ...contentForm, text_content: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="<p>Escribe el contenido aquí...</p>"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {contentForm.content_type === 'video' ? 'URL del video' : 'URL del documento'}
                    </label>
                    <input
                      type="url"
                      value={contentForm.content_type === 'video' ? contentForm.video_url : contentForm.document_url}
                      onChange={(e) => setContentForm({ 
                        ...contentForm, 
                        ...(contentForm.content_type === 'video' 
                          ? { video_url: e.target.value } 
                          : { document_url: e.target.value })
                      })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowContentModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveContent}
                disabled={savingContent || !contentForm.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingContent ? (
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
    </div>
  );
}
