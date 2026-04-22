import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '@/hooks/useContacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Contact } from '@/lib/supabase'
import { Plus, Pencil, Trash2, Mail, Phone, MapPin, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const types = ['Fornecedor', 'Cliente', 'Parceiro', 'Outro'] as const
type ContactType = typeof types[number]

const TYPE_COLORS: Record<ContactType, string> = {
  'Fornecedor': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Cliente': 'bg-green-500/15 text-green-400 border-green-500/25',
  'Parceiro': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'Outro': 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
}

const schema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  type: z.enum(types).default('Fornecedor'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('UK'),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function Contacts() {
  const { data: contacts = [], isLoading } = useContacts()
  const create = useCreateContact()
  const update = useUpdateContact()
  const remove = useDeleteContact()

  const [filterType, setFilterType] = useState<ContactType | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { type: 'Fornecedor', country: 'UK' },
  })

  const filtered = filterType === 'all' ? contacts : contacts.filter(c => c.type === filterType)

  function openNew() {
    setEditing(null)
    reset({ type: 'Fornecedor', country: 'UK' })
    setModalOpen(true)
  }

  function openEdit(c: Contact) {
    setEditing(c)
    reset({
      name: c.name,
      type: c.type,
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      country: c.country,
      notes: c.notes ?? '',
    })
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    const payload = {
      name: data.name,
      type: data.type,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      country: data.country || 'UK',
      notes: data.notes || null,
    }
    if (editing) await update.mutateAsync({ id: editing.id, ...payload })
    else await create.mutateAsync(payload as Parameters<typeof create.mutateAsync>[0])
    setModalOpen(false)
  }

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">A carregar...</div>

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Contactos</h1>
          <p className="text-text-muted text-sm mt-0.5">{contacts.length} contactos</p>
        </div>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4" /> Novo</Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilterType('all')} className={cn('rounded-full px-3 py-1 text-xs font-medium border transition-colors', filterType === 'all' ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:text-text-primary')}>
          Todos ({contacts.length})
        </button>
        {types.map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={cn('rounded-full px-3 py-1 text-xs font-medium border transition-colors', filterType === t ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:text-text-primary')}>
            {t} ({contacts.filter(c => c.type === t).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-text-muted">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum contacto encontrado</p>
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-accent/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-text-primary truncate">{c.name}</h3>
                  {c.city && <p className="text-xs text-text-muted">{c.city}, {c.country}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', TYPE_COLORS[c.type])}>{c.type}</span>
                </div>
              </div>
              <div className="space-y-1 text-xs text-text-muted">
                {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /><span className="truncate">{c.email}</span></div>}
                {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
                {c.address && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /><span className="truncate">{c.address}</span></div>}
              </div>
              {c.notes && <p className="text-xs text-text-muted italic border-t border-border pt-2">{c.notes}</p>}
              <div className="flex justify-end gap-1 pt-1 border-t border-border">
                <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove.mutate(c.id)} className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-danger transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar contacto' : 'Novo contacto'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={watch('type')} onValueChange={(v) => setValue('type', v as ContactType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input {...register('phone')} /></div>
              <div className="space-y-1.5"><Label>Cidade</Label><Input {...register('city')} /></div>
              <div className="space-y-1.5"><Label>País</Label><Input {...register('country')} /></div>
            </div>
            <div className="space-y-1.5"><Label>Morada</Label><Input {...register('address')} /></div>
            <div className="space-y-1.5"><Label>Notas</Label><Textarea {...register('notes')} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'A guardar...' : editing ? 'Actualizar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
