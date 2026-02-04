// =====================================================
// TIPOS PARA MÓDULO ACADEMIA
// Sistema de Gestión de Aprendizaje (LMS)
// =====================================================

// Área de aprendizaje (departamento hotelero)
export interface AcademyArea {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Nivel de dificultad
export type DifficultyLevel = 'basico' | 'intermedio' | 'avanzado'

// Curso
export interface AcademyCourse {
  id: string
  area_id: string | null
  title: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  difficulty_level: DifficultyLevel
  estimated_duration_minutes: number
  is_mandatory: boolean
  is_published: boolean
  is_active: boolean
  prerequisites: string[] // course_ids
  target_roles: string[]
  target_locations: string[]
  passing_score: number
  allow_retakes: boolean
  max_retakes: number | null
  certificate_template: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Relaciones
  area?: AcademyArea
  modules?: AcademyModule[]
  enrollments_count?: number
  completions_count?: number
}

// Módulo/Lección
export interface AcademyModule {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  estimated_duration_minutes: number
  is_required: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  // Relaciones
  course?: AcademyCourse
  content?: AcademyContent[]
  quizzes?: AcademyQuiz[]
  // Estado del usuario
  user_progress?: AcademyProgress
}

// Tipo de contenido
export type ContentType = 'video' | 'document' | 'text' | 'embed' | 'image'
export type VideoProvider = 'youtube' | 'vimeo' | 'direct' | 'upload'

// Contenido
export interface AcademyContent {
  id: string
  module_id: string
  title: string
  content_type: ContentType
  video_url: string | null
  video_provider: VideoProvider | null
  video_duration_seconds: number | null
  document_url: string | null
  document_type: string | null
  text_content: string | null
  embed_url: string | null
  image_url: string | null
  image_caption: string | null
  sort_order: number
  is_downloadable: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  // Estado del usuario
  is_viewed?: boolean
  is_completed?: boolean
}

// Tipo de quiz
export type QuizType = 'module' | 'final' | 'practice'

// Evaluación
export interface AcademyQuiz {
  id: string
  module_id: string | null
  course_id: string | null
  title: string
  description: string | null
  quiz_type: QuizType
  time_limit_minutes: number | null
  passing_score: number
  randomize_questions: boolean
  randomize_answers: boolean
  show_correct_answers: boolean
  max_attempts: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Relaciones
  questions?: AcademyQuizQuestion[]
  questions_count?: number
  // Estado del usuario
  user_attempts?: AcademyQuizAttempt[]
  best_score?: number
  passed?: boolean
}

// Tipo de pregunta
export type QuestionType = 'multiple_choice' | 'true_false' | 'multiple_select'

// Opción de respuesta
export interface QuestionOption {
  id: string
  text: string
  is_correct: boolean
}

// Pregunta
export interface AcademyQuizQuestion {
  id: string
  quiz_id: string
  question_text: string
  question_type: QuestionType
  options: QuestionOption[]
  explanation: string | null
  points: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Estado de inscripción
export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'failed' | 'expired'

// Inscripción
export interface AcademyEnrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  enrolled_by: string | null
  status: EnrollmentStatus
  started_at: string | null
  completed_at: string | null
  expires_at: string | null
  final_score: number | null
  created_at: string
  updated_at: string
  // Relaciones
  course?: AcademyCourse
  user?: {
    id: string
    full_name: string
    email?: string
  }
  progress?: AcademyProgress[]
  certificates?: AcademyCertificate[]
}

// Estado de progreso
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed'

// Progreso de contenido individual
export interface ContentProgressItem {
  viewed: boolean
  completed: boolean
  time_spent: number // segundos
  last_viewed_at?: string
}

// Progreso
export interface AcademyProgress {
  id: string
  user_id: string
  module_id: string
  enrollment_id: string | null
  status: ProgressStatus
  started_at: string | null
  completed_at: string | null
  time_spent_seconds: number
  content_progress: Record<string, ContentProgressItem>
  created_at: string
  updated_at: string
  // Relaciones
  module?: AcademyModule
}

// Estado de intento
export type AttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'expired'

// Respuesta a pregunta
export interface QuestionAnswer {
  selected_options: string[] // option ids
  is_correct: boolean
}

// Intento de quiz
export interface AcademyQuizAttempt {
  id: string
  user_id: string
  quiz_id: string
  enrollment_id: string | null
  attempt_number: number
  started_at: string
  submitted_at: string | null
  time_spent_seconds: number | null
  answers: Record<string, QuestionAnswer>
  score: number | null
  points_earned: number
  points_possible: number
  passed: boolean | null
  status: AttemptStatus
  created_at: string
  updated_at: string
  // Relaciones
  quiz?: AcademyQuiz
}

// Certificado
export interface AcademyCertificate {
  id: string
  user_id: string
  course_id: string
  enrollment_id: string | null
  certificate_number: string
  issued_at: string
  expires_at: string | null
  final_score: number | null
  user_name: string
  course_title: string
  issued_by_name: string | null
  issued_by_id: string | null
  pdf_url: string | null
  verification_code: string | null
  created_at: string
  // Relaciones
  course?: AcademyCourse
}

// Bookmark/Favorito
export interface AcademyBookmark {
  id: string
  user_id: string
  course_id: string | null
  module_id: string | null
  content_id: string | null
  notes: string | null
  created_at: string
  // Relaciones
  course?: AcademyCourse
  module?: AcademyModule
  content?: AcademyContent
}

// =====================================================
// TIPOS PARA API Y FORMULARIOS
// =====================================================

// Crear/Actualizar curso
export interface CourseFormData {
  area_id?: string
  title: string
  slug?: string
  description?: string
  thumbnail_url?: string
  difficulty_level?: DifficultyLevel
  estimated_duration_minutes?: number
  is_mandatory?: boolean
  is_published?: boolean
  prerequisites?: string[]
  target_roles?: string[]
  target_locations?: string[]
  passing_score?: number
  allow_retakes?: boolean
  max_retakes?: number | null
}

// Crear/Actualizar módulo
export interface ModuleFormData {
  course_id: string
  title: string
  description?: string
  sort_order?: number
  estimated_duration_minutes?: number
  is_required?: boolean
}

// Crear/Actualizar contenido
export interface ContentFormData {
  module_id: string
  title: string
  content_type: ContentType
  video_url?: string
  video_provider?: VideoProvider
  video_duration_seconds?: number
  document_url?: string
  document_type?: string
  text_content?: string
  embed_url?: string
  image_url?: string
  image_caption?: string
  sort_order?: number
  is_downloadable?: boolean
}

// Crear/Actualizar quiz
export interface QuizFormData {
  module_id?: string
  course_id?: string
  title: string
  description?: string
  quiz_type?: QuizType
  time_limit_minutes?: number | null
  passing_score?: number
  randomize_questions?: boolean
  randomize_answers?: boolean
  show_correct_answers?: boolean
  max_attempts?: number | null
}

// Crear/Actualizar pregunta
export interface QuestionFormData {
  quiz_id: string
  question_text: string
  question_type: QuestionType
  options: QuestionOption[]
  explanation?: string
  points?: number
  sort_order?: number
}

// Respuesta de quiz submission
export interface QuizSubmission {
  quiz_id: string
  attempt_id: string
  answers: Record<string, string[]> // question_id -> selected option ids
}

// Estadísticas de curso
export interface CourseStats {
  total_enrollments: number
  active_enrollments: number
  completions: number
  average_score: number | null
  completion_rate: number
  average_time_minutes: number | null
}

// Estadísticas del usuario
export interface UserAcademyStats {
  total_courses_enrolled: number
  courses_completed: number
  courses_in_progress: number
  certificates_earned: number
  average_score: number | null
  total_time_spent_minutes: number
}

// Curso con estadísticas de progreso del usuario
export interface CourseWithProgress extends AcademyCourse {
  enrollment?: AcademyEnrollment
  progress_percentage: number
  modules_completed: number
  total_modules: number
  next_module?: AcademyModule
}

// Filtros para búsqueda de cursos
export interface CourseFilters {
  area_id?: string
  difficulty_level?: DifficultyLevel
  is_mandatory?: boolean
  search?: string
}

// Labels para UI
export const difficultyLabels: Record<DifficultyLevel, string> = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

export const difficultyColors: Record<DifficultyLevel, string> = {
  basico: 'bg-green-100 text-green-800',
  intermedio: 'bg-yellow-100 text-yellow-800',
  avanzado: 'bg-red-100 text-red-800',
}

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  enrolled: 'Inscrito',
  in_progress: 'En Progreso',
  completed: 'Completado',
  failed: 'No Aprobado',
  expired: 'Expirado',
}

export const enrollmentStatusColors: Record<EnrollmentStatus, string> = {
  enrolled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
}

export const contentTypeLabels: Record<ContentType, string> = {
  video: 'Video',
  document: 'Documento',
  text: 'Texto',
  embed: 'Contenido Externo',
  image: 'Imagen',
}

export const contentTypeIcons: Record<ContentType, string> = {
  video: '🎬',
  document: '📄',
  text: '📝',
  embed: '🔗',
  image: '🖼️',
}
