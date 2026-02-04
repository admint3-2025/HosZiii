'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Download,
  BookOpen,
  Video,
  FileText,
  FileText as FileDescription,
  Presentation,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AcademyProgress, AcademyQuiz } from '@/lib/types/academy';

// Extended content type for UI
interface ContentItem {
  id: string;
  module_id: string;
  title: string;
  content_type: string;
  video_url: string | null;
  video_duration_seconds: number | null;
  document_url: string | null;
  text_content: string | null;
  embed_url: string | null;
  sort_order: number;
  description?: string;
}

interface ModuleWithContent {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  estimated_duration_minutes: number;
  contents: ContentItem[];
  progress?: AcademyProgress;
  quizzes?: AcademyQuiz[];
}

export default function ContentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleId = params.moduleId as string;
  const contentIdParam = searchParams.get('content');

  const [module, setModule] = useState<ModuleWithContent | null>(null);
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedContents, setCompletedContents] = useState<Set<string>>(new Set());
  const [markingComplete, setMarkingComplete] = useState(false);

  const fetchModule = useCallback(async () => {
    try {
      setLoading(true);

      // Get module with contents
      const moduleRes = await fetch(`/api/academy/modules/${moduleId}`);
      if (!moduleRes.ok) {
        if (moduleRes.status === 404) {
          setError('Módulo no encontrado');
          return;
        }
        throw new Error('Error al cargar el módulo');
      }
      const moduleData = await moduleRes.json();

      // Get contents for this module
      const contentsRes = await fetch(`/api/academy/content?moduleId=${moduleId}`);
      const contentsData = contentsRes.ok ? await contentsRes.json() : [];

      // Get progress
      const progressRes = await fetch(`/api/academy/progress?moduleId=${moduleId}`);
      const progressData = progressRes.ok ? await progressRes.json() : [];
      const progress = progressData.length > 0 ? progressData[0] : null;

      // Parse completed contents from progress
      const completed = new Set<string>(
        progress?.completed_contents ? JSON.parse(progress.completed_contents) : []
      );
      setCompletedContents(completed);

      const fullModule: ModuleWithContent = {
        ...moduleData,
        contents: contentsData.sort((a: ContentItem, b: ContentItem) => a.sort_order - b.sort_order),
        progress,
      };

      setModule(fullModule);

      // Set initial content
      if (contentsData.length > 0) {
        let initialIndex = 0;
        if (contentIdParam) {
          const idx = contentsData.findIndex((c: ContentItem) => c.id === contentIdParam);
          if (idx >= 0) initialIndex = idx;
        }
        setCurrentIndex(initialIndex);
        setCurrentContent(contentsData[initialIndex]);
      }
    } catch (err) {
      console.error('Error fetching module:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [moduleId, contentIdParam]);

  useEffect(() => {
    if (moduleId) {
      fetchModule();
    }
  }, [moduleId, fetchModule]);

  const navigateContent = (direction: 'prev' | 'next') => {
    if (!module?.contents) return;
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < module.contents.length) {
      setCurrentIndex(newIndex);
      setCurrentContent(module.contents[newIndex]);
    }
  };

  const markContentComplete = async () => {
    if (!currentContent || !module) return;
    
    try {
      setMarkingComplete(true);
      const newCompleted = new Set(completedContents);
      newCompleted.add(currentContent.id);
      
      // Check if all contents are completed
      const allCompleted = module.contents.every((c) => newCompleted.has(c.id));
      
      // Update progress
      await fetch('/api/academy/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          completed_contents: JSON.stringify(Array.from(newCompleted)),
          status: allCompleted ? 'completed' : 'in_progress',
          progress_percentage: Math.round((newCompleted.size / module.contents.length) * 100),
        }),
      });

      setCompletedContents(newCompleted);

      // Auto-navigate to next content if available
      if (currentIndex < module.contents.length - 1) {
        setTimeout(() => navigateContent('next'), 500);
      }
    } catch (err) {
      console.error('Error marking complete:', err);
    } finally {
      setMarkingComplete(false);
    }
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

  const renderContent = () => {
    if (!currentContent) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <p className="text-gray-500">Selecciona un contenido para comenzar</p>
        </div>
      );
    }

    switch (currentContent.content_type) {
      case 'video':
        return (
          <div className="relative bg-black rounded-lg overflow-hidden">
            <div className="aspect-video">
              {currentContent.video_url ? (
                <video
                  src={currentContent.video_url}
                  className="w-full h-full"
                  controls
                  onEnded={() => {
                    if (!completedContents.has(currentContent.id)) {
                      markContentComplete();
                    }
                  }}
                />
              ) : currentContent.embed_url ? (
                // Handle YouTube or other external videos
                <iframe
                  src={currentContent.embed_url.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <Video className="w-16 h-16 opacity-50" />
                </div>
              )}
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            {currentContent.document_url ? (
              <div className="aspect-[4/3]">
                <iframe
                  src={`${currentContent.document_url}#toolbar=1&navpanes=0`}
                  className="w-full h-full"
                  title={currentContent.title}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96">
                <FileDescription className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">Documento no disponible para vista previa</p>
                {currentContent.embed_url && (
                  <a
                    href={currentContent.embed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-5 h-5" />
                    Descargar documento
                  </a>
                )}
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="bg-white rounded-lg border p-6 max-h-[600px] overflow-y-auto">
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: currentContent.text_content || '' }}
            />
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
            <p className="text-gray-500">Tipo de contenido no soportado</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
        <p className="text-lg">{error || 'Módulo no encontrado'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
      </div>
    );
  }

  const progress = module.contents.length > 0
    ? Math.round((completedContents.size / module.contents.length) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/corporativo/academia/curso/${module.course_id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al curso
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{module.title}</h1>
            <p className="text-sm text-gray-500">
              Contenido {currentIndex + 1} de {module.contents.length}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">{progress}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-3">
          {/* Content viewer */}
          {renderContent()}

          {/* Content info */}
          {currentContent && (
            <div className="mt-4 bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentContent.title}
                  </h2>
                  {currentContent.description && (
                    <p className="text-gray-600 mt-1">{currentContent.description}</p>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {Math.round((currentContent.video_duration_seconds || 0) / 60)} min
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <button
                  onClick={() => navigateContent('prev')}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Anterior
                </button>

                <div className="flex items-center gap-3">
                  {completedContents.has(currentContent.id) ? (
                    <span className="flex items-center gap-2 text-green-600">
                      <Check className="w-5 h-5" />
                      Completado
                    </span>
                  ) : (
                    <button
                      onClick={markContentComplete}
                      disabled={markingComplete}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {markingComplete ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                      Marcar como completado
                    </button>
                  )}
                </div>

                <button
                  onClick={() => navigateContent('next')}
                  disabled={currentIndex === module.contents.length - 1}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Quiz button if module has quiz and all content completed */}
          {module.quizzes && module.quizzes.length > 0 && completedContents.size === module.contents.length && (
            <div className="mt-4 bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900">¡Has completado todo el contenido!</h3>
                    <p className="text-sm text-blue-700">Ahora puedes realizar la evaluación del módulo.</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/corporativo/academia/evaluacion/${module.quizzes![0].id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <ClipboardCheck className="w-5 h-5" />
                  Ir a la evaluación
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border p-4 sticky top-4">
            <h3 className="font-semibold text-gray-900 mb-4">Contenido del módulo</h3>
            <div className="space-y-2">
              {module.contents.map((content, index) => {
                const ContentIcon = getContentIcon(content.content_type);
                const isActive = currentIndex === index;
                const isCompleted = completedContents.has(content.id);

                return (
                  <button
                    key={content.id}
                    onClick={() => {
                      setCurrentIndex(index);
                      setCurrentContent(content);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? 'bg-green-100'
                        : isActive
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <ContentIcon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isActive ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {content.title}
                      </p>
                      <p className="text-xs text-gray-500">{Math.round((content.video_duration_seconds || 0) / 60)} min</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Module summary */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Completado:</span>
                <span className="font-medium text-gray-900">
                  {completedContents.size} / {module.contents.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
