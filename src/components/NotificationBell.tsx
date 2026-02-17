'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient, getSafeUser } from '@/lib/supabase/browser'
import Link from 'next/link'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  ticket_id: string | null
  ticket_number: number | null
  is_read: boolean
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isCorporate, setIsCorporate] = useState(false)
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const loadNotifications = useCallback(async () => {
    try {
      // Solo cargar notificaciones NO leídas — las leídas se eliminan
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error

      let filteredData = data || []

      // FILTRO DE SEGURIDAD: Ocultar notificaciones de inspección a usuarios NO corporativos
      if (userRole && userRole !== 'admin' && !isCorporate) {
        filteredData = filteredData.filter(n => n.type !== 'inspection_critical')
      }

      setNotifications(filteredData)
      setUnreadCount(filteredData.length)

      // Limpiar notificaciones antiguas leídas en background (por si quedaron)
      supabase
        .from('notifications')
        .delete()
        .eq('is_read', true)
        .then(({ error: delErr }) => {
          if (delErr) console.error('[NotificationBell] Error limpiando leídas:', delErr)
        })
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, userRole, isCorporate])

  // Obtener usuario actual y su rol de forma segura
  useEffect(() => {
    async function getUserAndRole() {
      const user = await getSafeUser(supabase)
      if (user) {
        setUserId(user.id)
        
        // Obtener rol del usuario desde profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_corporate')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setUserRole(profile.role)
          setIsCorporate(Boolean((profile as any)?.is_corporate))
        }
      }
    }
    getUserAndRole()
  }, [supabase])

  // Cargar notificaciones iniciales y suscribirse a cambios
  useEffect(() => {
    if (!userId) return

    loadNotifications()
    
    // Suscribirse a cambios en tiempo real FILTRADOS POR USUARIO
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`, // FILTRO CRÍTICO
        },
        (payload: any) => {
          console.log('[NotificationBell] Realtime event:', payload.eventType, payload)
          
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification
            
            // FILTRO DE SEGURIDAD: Ignorar notificaciones de inspección para usuarios NO corporativos
            if (newNotif.type === 'inspection_critical' && 
                userRole && userRole !== 'admin' && !isCorporate) {
              console.log('[NotificationBell] Notificación de inspección ignorada para rol:', userRole)
              return
            }
            
            setNotifications((prev) => [newNotif, ...prev])
            setUnreadCount((prev) => prev + 1)
            
            // Mostrar notificación del navegador si está permitido
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotif.title, {
                body: newNotif.message,
                icon: '/favicon.ico',
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification
            if (updatedNotif.is_read) {
              // Leída = desaparece del listado
              setNotifications((prev) => prev.filter((n) => n.id !== updatedNotif.id))
              setUnreadCount((prev) => Math.max(0, prev - 1))
            } else {
              setNotifications((prev) =>
                prev.map((n) => n.id === updatedNotif.id ? updatedNotif : n)
              )
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id))
            if (!payload.old.is_read) {
              setUnreadCount((prev) => Math.max(0, prev - 1))
            }
          }
        }
      )
      .subscribe((status: any) => {
        console.log('[NotificationBell] Subscription status:', status)
      })

    return () => {
      console.log('[NotificationBell] Unsubscribing from channel')
      supabase.removeChannel(channel)
    }
  }, [userId, userRole, loadNotifications, supabase])

  // Solicitar permisos de notificaciones del navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  async function markAsRead(id: string) {
    try {
      // Eliminar de la UI inmediatamente
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setUnreadCount((prev) => Math.max(0, prev - 1))

      // Eliminar de la BD (push = efímero, leída = desaparece)
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error eliminando notificación:', error)
      // Recargar por si el estado quedó inconsistente
      loadNotifications()
    }
  }

  async function dismissAll() {
    try {
      const ids = notifications.map((n) => n.id)
      if (ids.length === 0) return

      // Limpiar UI inmediatamente
      setNotifications([])
      setUnreadCount(0)

      // Eliminar de la BD
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', ids)

      if (error) throw error
    } catch (error) {
      console.error('Error eliminando notificaciones:', error)
      loadNotifications()
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'TICKET_CREATED':
        return '📨'
      case 'TICKET_ASSIGNED':
        return '🎯'
      case 'TICKET_STATUS_CHANGED':
        return '🔄'
      case 'TICKET_COMMENT_ADDED':
        return '💬'
      case 'TICKET_RESOLVED':
        return '✅'
      case 'TICKET_CLOSED':
        return '🔒'
      case 'TICKET_ESCALATED':
        return '⚠️'
      case 'inspection_critical':
        return '🚨'
      default:
        return '🔔'
    }
  }

  // Helper para detectar tipo de notificación
  function getNotificationTheme(title: string, message: string) {
    const isMantenimiento = title.includes('[Mantenimiento]') || 
                            message.toLowerCase().includes('mantenimiento')
    const isIT = title.includes('[IT]')
    
    return {
      isMantenimiento,
      isIT,
      cleanTitle: title
    }
  }

  function getTimeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Ahora'
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-300 hover:text-violet-300 hover:bg-violet-500/10 rounded-xl transition-all border border-transparent hover:border-violet-500/30"
        aria-label="Notificaciones"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-slate-800 animate-pulse shadow-lg shadow-rose-500/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[9999] max-h-[600px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  Notificaciones
                  {unreadCount > 0 && (
                    <span className="ml-2 text-xs font-normal text-violet-600">
                      ({unreadCount} nueva{unreadCount !== 1 ? 's' : ''})
                    </span>
                  )}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={dismissAll}
                    className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                  >
                    Limpiar todas
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="text-4xl mb-3">🔔</div>
                  <p className="text-sm text-gray-500">No tienes notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => {
                    const theme = getNotificationTheme(notification.title, notification.message)
                    const bgColor = theme.isMantenimiento 
                        ? 'bg-orange-50/40' 
                        : theme.isIT 
                          ? 'bg-indigo-50/40' 
                          : 'bg-blue-50/30'
                    const badgeColor = theme.isMantenimiento 
                      ? 'bg-orange-600' 
                      : theme.isIT 
                        ? 'bg-indigo-600' 
                        : 'bg-blue-600'
                    
                    return (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors ${bgColor}`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 text-2xl">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {theme.cleanTitle}
                            </p>
                            <div className={`w-2 h-2 ${badgeColor} rounded-full flex-shrink-0 mt-1`}></div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">
                              {getTimeAgo(notification.created_at)}
                            </span>
                            {notification.ticket_id && (
                              <Link
                                href={
                                  // Detectar si es ticket de mantenimiento por el título/mensaje
                                  notification.title.toLowerCase().includes('mantenimiento') ||
                                  notification.message.toLowerCase().includes('mantenimiento')
                                    ? `/mantenimiento/tickets/${notification.ticket_id}`
                                    : `/tickets/${notification.ticket_id}`
                                }
                                onClick={() => {
                                  markAsRead(notification.id)
                                  setIsOpen(false)
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Ver ticket →
                              </Link>
                            )}
                            {/* Link para solicitudes de baja (TICKET_ESCALATED sin ticket_id) */}
                            {!notification.ticket_id && notification.type === 'TICKET_ESCALATED' && notification.title.includes('Baja') && (
                              <Link
                                href="/assets/disposals"
                                onClick={() => {
                                  markAsRead(notification.id)
                                  setIsOpen(false)
                                }}
                                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                              >
                                Ver solicitud →
                              </Link>
                            )}
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-gray-400 hover:text-red-500 ml-auto"
                              title="Descartar"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  )
}
