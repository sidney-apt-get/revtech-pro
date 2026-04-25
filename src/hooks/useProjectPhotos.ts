import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type ProjectPhoto } from '@/lib/supabase'

export function useProjectPhotos(projectId: string) {
  return useQuery({
    queryKey: ['photos', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_photos')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as ProjectPhoto[]
    },
    enabled: !!projectId,
  })
}

export function usePhotosByProjects(projectIds: string[]) {
  return useQuery({
    queryKey: ['photos-bulk', projectIds.join(',')],
    queryFn: async () => {
      if (!projectIds.length) return [] as ProjectPhoto[]
      const { data, error } = await supabase
        .from('project_photos')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ProjectPhoto[]
    },
    enabled: projectIds.length > 0,
  })
}

export function useAllPhotoMeta() {
  return useQuery({
    queryKey: ['photos-meta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_photos')
        .select('id, project_id, photo_url, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      const counts: Record<string, number> = {}
      const latest: Record<string, string> = {}
      ;(data ?? []).forEach(row => {
        counts[row.project_id] = (counts[row.project_id] ?? 0) + 1
        if (!latest[row.project_id]) latest[row.project_id] = row.photo_url
      })
      return { counts, latest }
    },
  })
}

export function useUploadPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      projectId, phase, file, caption,
    }: { projectId: string; phase: string; file: File; caption?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${projectId}/${phase}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('project-photos')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('project-photos').getPublicUrl(path)
      const { error } = await supabase.from('project_photos').insert({
        project_id: projectId,
        user_id: user.id,
        phase,
        photo_url: publicUrl,
        caption: caption || null,
      })
      if (error) throw error
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['photos', projectId] })
      qc.invalidateQueries({ queryKey: ['photos-meta'] })
    },
  })
}

export function useDeletePhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, photoUrl, projectId }: { id: string; photoUrl: string; projectId: string }) => {
      const base = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/project-photos/`
      const path = photoUrl.startsWith(base) ? photoUrl.slice(base.length) : ''
      if (path) await supabase.storage.from('project-photos').remove([path])
      const { error } = await supabase.from('project_photos').delete().eq('id', id)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ['photos', projectId as string] })
      qc.invalidateQueries({ queryKey: ['photos-meta'] })
    },
  })
}

export function useUpdateCaption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, caption, projectId }: { id: string; caption: string; projectId: string }) => {
      const { error } = await supabase.from('project_photos').update({ caption }).eq('id', id)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ['photos', projectId as string] })
    },
  })
}
