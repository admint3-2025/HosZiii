'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Check,
  X,
  AlertCircle,
  Loader2,
  ClipboardCheck,
  Trophy,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AcademyQuiz, AcademyQuizQuestion, AcademyQuizAttempt } from '@/lib/types/academy';

interface QuizWithQuestions extends AcademyQuiz {
  questions: AcademyQuizQuestion[];
  module?: {
    id: string;
    title: string;
    course_id: string;
  };
}

type QuizState = 'loading' | 'ready' | 'in_progress' | 'submitted' | 'results';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [attempt, setAttempt] = useState<AcademyQuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState<AcademyQuizAttempt[]>([]);

  const fetchQuiz = useCallback(async () => {
    try {
      setQuizState('loading');

      // Get quiz with questions
      const quizRes = await fetch(`/api/academy/quizzes/${quizId}`);
      if (!quizRes.ok) {
        if (quizRes.status === 404) {
          setError('Evaluación no encontrada');
          return;
        }
        throw new Error('Error al cargar la evaluación');
      }
      const quizData = await quizRes.json();
      setQuiz(quizData);

      // Get previous attempts
      const attemptsRes = await fetch(`/api/academy/attempts?quizId=${quizId}`);
      const attemptsData = attemptsRes.ok ? await attemptsRes.json() : [];
      setPreviousAttempts(attemptsData);

      // Check if there's an in-progress attempt
      const inProgressAttempt = attemptsData.find((a: AcademyQuizAttempt) => 
        a.status === 'in_progress'
      );

      if (inProgressAttempt) {
        setAttempt(inProgressAttempt);
        // Restore answers if any
        if (inProgressAttempt.answers) {
          const savedAnswers = JSON.parse(inProgressAttempt.answers);
          setAnswers(new Map(Object.entries(savedAnswers).map(([k, v]) => [k, v as number])));
        }
        // Calculate remaining time
        if (quizData.time_limit_minutes) {
          const startTime = new Date(inProgressAttempt.started_at).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = quizData.time_limit_minutes * 60 - elapsed;
          setTimeRemaining(Math.max(0, remaining));
        }
        setQuizState('in_progress');
      } else {
        setQuizState('ready');
      }
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }, [quizId]);

  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId, fetchQuiz]);

  // Timer effect
  useEffect(() => {
    if (quizState !== 'in_progress' || timeRemaining === null) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState, timeRemaining]);

  const startQuiz = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/academy/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al iniciar la evaluación');
      }

      const attemptData = await res.json();
      setAttempt(attemptData);
      
      if (quiz?.time_limit_minutes) {
        setTimeRemaining(quiz.time_limit_minutes * 60);
      }
      
      setQuizState('in_progress');
    } catch (err) {
      console.error('Error starting quiz:', err);
      alert(err instanceof Error ? err.message : 'Error al iniciar');
    } finally {
      setSubmitting(false);
    }
  };

  const selectAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      newAnswers.set(questionId, optionIndex);
      return newAnswers;
    });
  };

  const handleSubmit = async () => {
    if (!attempt || !quiz) return;

    try {
      setSubmitting(true);

      // Convert answers map to object
      const answersObject: Record<string, number> = {};
      answers.forEach((value, key) => {
        answersObject[key] = value;
      });

      const res = await fetch(`/api/academy/attempts/${attempt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: JSON.stringify(answersObject),
          status: 'completed',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar la evaluación');
      }

      const resultData = await res.json();
      setAttempt(resultData);
      setQuizState('results');
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPassedStatus = () => {
    if (!attempt || !quiz) return null;
    return attempt.score !== null && attempt.score >= quiz.passing_score;
  };

  if (quizState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
        <p className="text-lg">{error || 'Evaluación no encontrada'}</p>
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

  // Ready state - show quiz info and start button
  if (quizState === 'ready') {
    const passedBefore = previousAttempts.some(
      (a) => a.score !== null && a.score >= quiz.passing_score
    );

    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>

        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ClipboardCheck className="w-10 h-10 text-blue-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 mb-6">{quiz.description}</p>
          )}

          <div className="flex justify-center gap-6 mb-8 text-sm">
            <div className="text-center">
              <p className="text-gray-500">Preguntas</p>
              <p className="text-xl font-bold text-gray-900">{quiz.questions.length}</p>
            </div>
            {quiz.time_limit_minutes && (
              <div className="text-center">
                <p className="text-gray-500">Tiempo límite</p>
                <p className="text-xl font-bold text-gray-900">{quiz.time_limit_minutes} min</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-gray-500">Puntaje mínimo</p>
              <p className="text-xl font-bold text-gray-900">{quiz.passing_score}%</p>
            </div>
          </div>

          {passedBefore && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700 flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                Ya aprobaste esta evaluación anteriormente
              </p>
            </div>
          )}

          {previousAttempts.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">Intentos anteriores:</p>
              <div className="flex justify-center gap-2">
                {previousAttempts.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    className={`px-3 py-1 rounded-full text-sm ${
                      a.score !== null && a.score >= quiz.passing_score
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {a.score !== null ? `${a.score}%` : 'N/A'}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={startQuiz}
            disabled={submitting}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <ClipboardCheck className="w-5 h-5" />
                {previousAttempts.length > 0 ? 'Intentar de nuevo' : 'Comenzar evaluación'}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Results state
  if (quizState === 'results' && attempt) {
    const passed = getPassedStatus();

    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
            passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {passed ? (
              <Trophy className="w-12 h-12 text-green-600" />
            ) : (
              <X className="w-12 h-12 text-red-600" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {passed ? '¡Felicidades!' : 'No aprobaste'}
          </h1>
          <p className="text-gray-600 mb-6">
            {passed
              ? 'Has aprobado la evaluación exitosamente.'
              : 'No alcanzaste el puntaje mínimo requerido.'}
          </p>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-500 mb-2">Tu puntaje</p>
            <p className={`text-5xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {attempt.score}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Puntaje mínimo: {quiz.passing_score}%
            </p>
          </div>

          <div className="flex justify-center gap-4">
            {quiz.module?.course_id && (
              <button
                onClick={() => router.push(`/corporativo/academia/curso/${quiz.module?.course_id}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Volver al curso
              </button>
            )}
            {!passed && (
              <button
                onClick={() => {
                  setAnswers(new Map());
                  setCurrentQuestionIndex(0);
                  setQuizState('ready');
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Intentar de nuevo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // In progress state - show quiz questions
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = answers.size;
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header with timer */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-lg border p-4">
        <div>
          <h1 className="font-bold text-gray-900">{quiz.title}</h1>
          <p className="text-sm text-gray-500">
            Pregunta {currentQuestionIndex + 1} de {quiz.questions.length}
          </p>
        </div>
        {timeRemaining !== null && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            <Clock className="w-5 h-5" />
            <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex gap-1">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(i)}
              className={`flex-1 h-2 rounded-full transition-colors ${
                answers.has(q.id)
                  ? 'bg-blue-600'
                  : i === currentQuestionIndex
                  ? 'bg-blue-300'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2 text-right">
          {answeredCount} de {quiz.questions.length} respondidas
        </p>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">
          {currentQuestion.question_text}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = answers.get(currentQuestion.id) === index;
            return (
              <button
                key={option.id}
                onClick={() => selectAnswer(currentQuestion.id, index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <span className={isSelected ? 'text-blue-900' : 'text-gray-700'}>
                    {option.text}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Anterior
        </button>

        <div className="flex items-center gap-3">
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount < quiz.questions.length}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Enviar evaluación
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Siguiente
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick navigation */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Navegación rápida</p>
        <div className="flex flex-wrap gap-2">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(i)}
              className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                i === currentQuestionIndex
                  ? 'bg-blue-600 text-white'
                  : answers.has(q.id)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white border text-gray-600 hover:bg-gray-100'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
