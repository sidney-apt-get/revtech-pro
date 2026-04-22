import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Contact } from '@/lib/supabase'

async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

async function createContact(c: Omit<Contact, 'id' | 'user_id' | 'created_at'>) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('contacts').insert({ ...c, user_id: user!.id }).select().single()
  if (error) throw error
  return data
}

async function updateContact({ id, ...c }: Partial<Contact> & { id: string }) {
  const { data, error } = await supabase.from('contacts').update(c).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function deleteContact(id: string) {
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) throw error
}

export function useContacts() {
  return useQuery({ queryKey: ['contacts'], queryFn: fetchContacts })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}
