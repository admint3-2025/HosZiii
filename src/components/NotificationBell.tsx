'use client'

import { useEffect, useState } from 'react'
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
  const supabase = createSupabaseBrowserClient()

  // Obtener usuario actual de forma segura
  useEffect(() => {
    async function getUser() {
      const user = await getSafeUser(supabase)
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

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
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === updatedNotif.id ? updatedNotif : n
              )
            )
            // Recalcular contador solo si cambió is_read
            if (payload.old.is_read !== updatedNotif.is_read) {
              setUnreadCount((prev) => updatedNotif.is_read ? prev - 1 : prev + 1)
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
  }, [userId])

  // Solicitar permisos de notificaciones del navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  async function loadNotifications() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter((n: any) => !n.is_read).length || 0)
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function markAsRead(id: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marcando notificación como leída:', error)
    }
  }

  async function markAllAsRead() {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
      
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)

      if (error) throw error

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marcando todas como leídas:', error)
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
      default:
        return '🔔'
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
                    onClick={markAllAsRead}
                    className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                  >
                    Marcar todas como leídas
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
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50/30' : ''
                      }`}
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
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                            )}
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
                                href={`/tickets/${notification.ticket_id}`}
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
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Marcar como leída
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    // Aquí podrías redirigir a una página de todas las notificaciones
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
