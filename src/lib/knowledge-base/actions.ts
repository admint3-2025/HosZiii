'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface KBArticle {
  id: string
  title: string
  summary: string | null
  solution: string
  category_level1: string
  category_level2: string | null
  category_level3: string | null
  source_ticket_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  status: 'pending' | 'approved' | 'rejected' | 'draft'
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  views_count: number
  helpful_count: number
  not_helpful_count: number
  times_used: number
  relevance_score: number
  tags: string[] | null
  keywords: string | null
  deleted_at: string | null
  deleted_by: string | null
}

/**
 * Buscar artículos de KB por categorías
 */
export async function searchKBArticlesByCategory(
  categoryLevel1: string,
  categoryLevel2?: string | null,
  categoryLevel3?: string | null
): Promise<{ success: boolean; articles?: KBArticle[]; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient()
    
    let query = supabase
      .from('knowledge_base_articles')
      .select('*')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .eq('category_level1', categoryLevel1)
      .order('relevance_score', { ascending: false })
      .limit(5)
    
    if (categoryLevel2) {
      query = query.eq('category_level2', categoryLevel2)
    }
    
    if (categoryLevel3) {
      query = query.eq('category_level3', categoryLevel3)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return { success: true, articles: data || [] }
  } catch (error) {
    console.error('Error searching KB articles:', error)
    return { success: false, error: 'Error al buscar artículos' }
  }
}

/**
 * Buscar artículos por texto libre
 */
export async function searchKBArticlesByText(
  searchText: string
): Promise<{ success: boolean; articles?: KBArticle[]; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('knowledge_base_articles')
      .select('*')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .or(`title.ilike.%${searchText}%,summary.ilike.%${searchText}%,solution.ilike.%${searchText}%`)
      .order('relevance_score', { ascending: false })
      .limit(10)
    
    if (error) throw error
    
    return { success: true, articles: data || [] }
  } catch (error) {
    console.error('Error searching KB articles:', error)
    return { success: false, error: 'Error al buscar artículos' }
  }
}

/**
 * Obtener artículo por ID
 */
export async function getKBArticle(
  articleId: string
): Promise<{ success: boolean; article?: KBArticle; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('knowledge_base_articles')
      .select('*')
      .eq('id', articleId)
      .single()
    
    if (error) throw error
    
    // Incrementar views_count
    await supabase
      .from('knowledge_base_articles')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', articleId)
    
    return { success: true, article: data }
  } catch (error) {
    console.error('Error getting KB article:', error)
    return { success: false, error: 'Error al obtener artículo' }
  }
}

/**
 * Registrar uso de artículo
 */
export async function registerKBArticleUsage(
  articleId: string,
  ticketId: string | null,
  wasHelpful: boolean | null,
  feedbackComment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('No authenticated')
    
    // Registrar uso
    const { error: usageError } = await supabase
      .from('knowledge_base_usage')
      .insert({
        article_id: articleId,
        ticket_id: ticketId,
        used_by: user.id,
        was_helpful: wasHelpful,
        feedback_comment: feedbackComment
      })
    
    if (usageError) throw usageError
    
    // Actualizar contadores en el artículo
    if (wasHelpful !== null) {
      const { data: article } = await supabase
        .from('knowledge_base_articles')
        .select('helpful_count, not_helpful_count, times_used')
        .eq('id', articleId)
        .single()
      
      if (article) {
        await supabase
          .from('knowledge_base_articles')
          .update({
            helpful_count: article.helpful_count + (wasHelpful ? 1 : 0),
            not_helpful_count: article.not_helpful_count + (wasHelpful ? 0 : 1),
            times_used: article.times_used + 1
          })
          .eq('id', articleId)
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error registering KB usage:', error)
    return { success: false, error: 'Error al registrar uso' }
  }
}

/**
 * Aprobar artículo (admin/supervisor)
 */
export async function approveKBArticle(
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('No authenticated')
    
    // Verificar permisos
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
      throw new Error('Sin permisos')
    }
    
    const { error } = await supabase
      .from('knowledge_base_articles')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', articleId)
    
    if (error) throw error
    
    revalidatePath('/knowledge-base')
    return { success: true }
  } catch (error) {
    console.error('Error approving KB article:', error)
    return { success: false, error: 'Error al aprobar artículo' }
  }
}

/**
 * Rechazar artículo
 */
export async function rejectKBArticle(
  articleId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('No authenticated')
    
    const { error } = await supabase
      .from('knowledge_base_articles')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', articleId)
    
    if (error) throw error
    
    revalidatePath('/knowledge-base')
    return { success: true }
  } catch (error) {
    console.error('Error rejecting KB article:', error)
    return { success: false, error: 'Error al rechazar artículo' }
  }
}

/**
 * Obtener artículos pendientes de revisión
 */
export async function getPendingKBArticles(): Promise<{
  success: boolean
  articles?: (KBArticle & {
    creator?: { full_name: string }
    source_ticket?: { ticket_number: number; title: string }
  })[]
  error?: string
}> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('knowledge_base_articles')
      .select(`
        *,
        creator:profiles!knowledge_base_articles_created_by_fkey(full_name),
        source_ticket:tickets!knowledge_base_articles_source_ticket_id_fkey(ticket_number, title)
      `)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return { success: true, articles: data || [] }
  } catch (error) {
    console.error('Error getting pending KB articles:', error)
    return { success: false, error: 'Error al obtener artículos pendientes' }
  }
}

/**
 * Crear artículo manualmente
 */
export async function createKBArticle(data: {
  title: string
  summary: string
  solution: string
  category_level1: string
  category_level2?: string
  category_level3?: string
  tags?: string[]
}): Promise<{ success: boolean; articleId?: string; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('No authenticated')
    
    const keywords = `${data.title} ${data.summary} ${data.solution}`
    
    const { data: article, error } = await supabase
      .from('knowledge_base_articles')
      .insert({
        title: data.title,
        summary: data.summary,
        solution: data.solution,
        category_level1: data.category_level1,
        category_level2: data.category_level2,
        category_level3: data.category_level3,
        tags: data.tags,
        keywords,
        created_by: user.id,
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath('/knowledge-base')
    return { success: true, articleId: article.id }
  } catch (error) {
    console.error('Error creating KB article:', error)
    return { success: false, error: 'Error al crear artículo' }
  }
}
