import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Project } from '@/lib/supabase'

async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function generateTicketNumber(prefix = 'RT'): Promise<string> {
  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('projects')
    .select('ticket_number')
    .like('ticket_number', `${prefix}-${year}-%`)
    .order('ticket_number', { ascending: false })
    .limit(1)
  if (!data || data.length === 0) return `${prefix}-${year}-001`
  const last = parseInt(data[0].ticket_number?.split('-')[2] ?? '0', 10)
  return `${prefix}-${year}-${String(last + 1).padStart(3, '0')}`
}

async function createProject(p: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser()
  const ticket_number = p.ticket_number ?? await generateTicketNumber()
  const { data, error } = await supabase.from('projects').insert({ ...p, user_id: user!.id, ticket_number }).select().single()
  if (error) throw error
  return data
}

async function updateProject({ id, ...p }: Partial<Project> & { id: string }) {
  const { data, error } = await supabase.from('projects').update(p).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
