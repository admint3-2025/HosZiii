'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Props = {
  attachment: {
    id: string
    file_name: string
    storage_path: string
    file_size: number
  } | null
}

export default function BEOPdfThumbnail({ attachment }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function getUrl() {
      if (!attachment) return
      
      setLoading(true)
      try {
        const supabase = createSupabaseBrowserClient()
        const { data } = await supabase.storage
          .from('ticket-attachments')
          .createSignedUrl(attachment.storage_path, 3600)
        
        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl)
        }
      } catch (error) {
        console.error('Error getting signed URL:', error)
      } finally {
        setLoading(false)
      }
    }

    getUrl()
  }, [attachment])

  if (!attachment) {
    return (
      <div className="w-16 h-20 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-16 h-20 bg-gray-50 rounded border border-gray-200 flex items-center justify-center animate-pulse">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        if (signedUrl) window.open(signedUrl, '_blank')
      }}
      className="group relative w-16 h-20 bg-red-50 rounded border-2 border-red-200 hover:border-red-400 transition-all overflow-hidden"
      title={`Ver PDF: ${attachment.file_name}`}
    >
      {/* PDF Icon */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <svg className="w-8 h-8 text-red-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
        <span className="text-[8px] font-bold text-red-600 uppercase mt-0.5">PDF</span>
      </div>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-red-600 bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
        <svg className="w-4 h-4 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </div>
      
      {/* File size badge */}
      <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-[8px] font-medium py-0.5 text-center">
        {(attachment.file_size / 1024).toFixed(0)}KB
      </div>
    </button>
  )
}
