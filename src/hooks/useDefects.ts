import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type DefectEntry, type Project } from '@/lib/supabase'

const SEED_DEFECTS = [
  { equipment_type: 'Smartphone', brand: 'Apple', model: 'iPhone', common_defect: 'Não liga', likely_cause: 'Bateria descarregada ou circuito de carregamento danificado', required_parts: ['Bateria', 'Cabo de carga'], avg_repair_time_hours: 1, avg_parts_cost: 25, difficulty: 'Fácil', success_rate: 92 },
  { equipment_type: 'Smartphone', brand: 'Apple', model: 'iPhone', common_defect: 'Ecrã partido', likely_cause: 'Impacto físico', required_parts: ['Ecrã completo OLED'], avg_repair_time_hours: 1.5, avg_parts_cost: 80, difficulty: 'Médio', success_rate: 98 },
  { equipment_type: 'Smartphone', brand: 'Apple', model: 'iPhone', common_defect: 'Bateria fraca', likely_cause: 'Desgaste natural (> 500 ciclos)', required_parts: ['Bateria'], avg_repair_time_hours: 0.5, avg_parts_cost: 20, difficulty: 'Fácil', success_rate: 99 },
  { equipment_type: 'Smartphone', brand: 'Apple', model: 'iPhone', common_defect: 'Touch ID não funciona', likely_cause: 'Botão Home danificado ou cabo flex roto', required_parts: ['Botão Home', 'Cabo flex'], avg_repair_time_hours: 1, avg_parts_cost: 30, difficulty: 'Difícil', success_rate: 75 },
  { equipment_type: 'Smartphone', brand: 'Samsung', model: 'Galaxy', common_defect: 'Ecrã partido', likely_cause: 'Impacto físico', required_parts: ['Ecrã AMOLED completo'], avg_repair_time_hours: 2, avg_parts_cost: 90, difficulty: 'Médio', success_rate: 96 },
  { equipment_type: 'Smartphone', brand: 'Samsung', model: 'Galaxy', common_defect: 'Não carrega', likely_cause: 'Porta USB-C danificada ou placa de carregamento', required_parts: ['Placa USB-C', 'Cabo flex'], avg_repair_time_hours: 1.5, avg_parts_cost: 15, difficulty: 'Médio', success_rate: 88 },
  { equipment_type: 'Smartphone', brand: 'Samsung', model: 'Galaxy', common_defect: 'Câmara falha', likely_cause: 'Módulo de câmara defeituoso ou cabo desconectado', required_parts: ['Módulo câmara'], avg_repair_time_hours: 1, avg_parts_cost: 40, difficulty: 'Médio', success_rate: 90 },
  { equipment_type: 'Tablet', brand: 'Apple', model: 'iPad', common_defect: 'Ecrã partido', likely_cause: 'Impacto físico', required_parts: ['Digitalizador', 'Vidro'], avg_repair_time_hours: 2, avg_parts_cost: 60, difficulty: 'Médio', success_rate: 95 },
  { equipment_type: 'Tablet', brand: 'Apple', model: 'iPad', common_defect: 'Não liga', likely_cause: 'Bateria descarregada ou IC de carregamento', required_parts: ['Bateria'], avg_repair_time_hours: 2, avg_parts_cost: 35, difficulty: 'Médio', success_rate: 85 },
  { equipment_type: 'Tablet', brand: 'Apple', model: 'iPad', common_defect: 'Botão home falha', likely_cause: 'Botão desgastado ou cabo flex partido', required_parts: ['Botão home', 'Cabo flex'], avg_repair_time_hours: 1, avg_parts_cost: 20, difficulty: 'Difícil', success_rate: 80 },
  { equipment_type: 'Laptop', brand: 'Apple', model: 'MacBook', common_defect: 'Não liga', likely_cause: 'Bateria morta, MagSafe ou placa-mãe', required_parts: ['Bateria', 'Carregador MagSafe'], avg_repair_time_hours: 2, avg_parts_cost: 80, difficulty: 'Difícil', success_rate: 78 },
  { equipment_type: 'Laptop', brand: 'Apple', model: 'MacBook', common_defect: 'Teclado com derramamento', likely_cause: 'Corrosão por líquido nos contactos', required_parts: ['Teclado', 'Topcase'], avg_repair_time_hours: 3, avg_parts_cost: 120, difficulty: 'Difícil', success_rate: 70 },
  { equipment_type: 'Laptop', brand: 'Apple', model: 'MacBook', common_defect: 'Manchas no ecrã', likely_cause: 'Revestimento anti-reflexo degradado', required_parts: ['Ecrã LCD'], avg_repair_time_hours: 1.5, avg_parts_cost: 150, difficulty: 'Médio', success_rate: 95 },
  { equipment_type: 'Consola', brand: 'Sony', model: 'PlayStation 4/5', common_defect: 'HDMI falha', likely_cause: 'Porta HDMI dobrada ou IC HDMI', required_parts: ['Porta HDMI', 'IC HDMI'], avg_repair_time_hours: 2, avg_parts_cost: 15, difficulty: 'Difícil', success_rate: 82 },
  { equipment_type: 'Consola', brand: 'Sony', model: 'PlayStation 4/5', common_defect: 'Não liga', likely_cause: 'PSU defeituosa ou BLOD', required_parts: ['Fonte de alimentação'], avg_repair_time_hours: 2, avg_parts_cost: 40, difficulty: 'Difícil', success_rate: 72 },
  { equipment_type: 'Consola', brand: 'Sony', model: 'PlayStation 4', common_defect: 'Leitor de discos não funciona', likely_cause: 'Laser desgastado ou motor', required_parts: ['Leitor Blu-ray', 'Laser'], avg_repair_time_hours: 1.5, avg_parts_cost: 25, difficulty: 'Médio', success_rate: 88 },
  { equipment_type: 'Consola', brand: 'Nintendo', model: 'Switch', common_defect: 'Joy-Con drift', likely_cause: 'Desgaste do analógico', required_parts: ['Analógico 3D', 'Módulo Joy-Con'], avg_repair_time_hours: 0.5, avg_parts_cost: 5, difficulty: 'Fácil', success_rate: 95 },
  { equipment_type: 'Consola', brand: 'Nintendo', model: 'Switch', common_defect: 'Não carrega', likely_cause: 'Porta USB-C ou placa de carregamento', required_parts: ['Porta USB-C', 'Placa carregamento'], avg_repair_time_hours: 1, avg_parts_cost: 12, difficulty: 'Médio', success_rate: 85 },
  { equipment_type: 'Consola', brand: 'Nintendo', model: 'Switch', common_defect: 'Ecrã partido', likely_cause: 'Impacto físico', required_parts: ['Ecrã LCD', 'Digitalizador'], avg_repair_time_hours: 1.5, avg_parts_cost: 45, difficulty: 'Médio', success_rate: 97 },
  { equipment_type: 'Laptop', brand: 'Genérico', model: null, common_defect: 'Não liga', likely_cause: 'Bateria, adaptador ou placa', required_parts: ['Bateria', 'Adaptador'], avg_repair_time_hours: 1, avg_parts_cost: 30, difficulty: 'Médio', success_rate: 80 },
  { equipment_type: 'Laptop', brand: 'Genérico', model: null, common_defect: 'Teclado partido/molhado', likely_cause: 'Impacto ou derramamento', required_parts: ['Teclado'], avg_repair_time_hours: 1, avg_parts_cost: 25, difficulty: 'Fácil', success_rate: 92 },
  { equipment_type: 'Laptop', brand: 'Genérico', model: null, common_defect: 'Dobradiça partida', likely_cause: 'Desgaste mecânico', required_parts: ['Dobradiça esq.', 'Dobradiça dir.'], avg_repair_time_hours: 1.5, avg_parts_cost: 20, difficulty: 'Médio', success_rate: 90 },
]

async function seedDefects(userId: string) {
  const { count } = await supabase.from('defect_database').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  if ((count ?? 0) > 0) return
  await supabase.from('defect_database').insert(
    SEED_DEFECTS.map(d => ({ ...d, user_id: userId }))
  )
}

async function fetchDefects(): Promise<DefectEntry[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  await seedDefects(user.id)
  const { data, error } = await supabase.from('defect_database').select('*').order('equipment_type').order('brand')
  if (error) throw error
  return data ?? []
}

async function createDefect(d: Omit<DefectEntry, 'id' | 'user_id' | 'created_at'>) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('defect_database').insert({ ...d, user_id: user!.id }).select().single()
  if (error) throw error
  return data
}

async function deleteDefect(id: string) {
  const { error } = await supabase.from('defect_database').delete().eq('id', id)
  if (error) throw error
}

export async function autoUpdateDefectDatabase(project: Project): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !project.defect_description) return

  const equipmentType = project.equipment || 'Desconhecido'
  const defectText = project.defect_description

  // Look for existing matching entry
  const { data: existing } = await supabase
    .from('defect_database')
    .select('*')
    .eq('user_id', user.id)
    .ilike('equipment_type', equipmentType)
    .ilike('common_defect', defectText)
    .maybeSingle()

  const isSuccess = project.status === 'Vendido'

  if (existing) {
    // Update averages
    const newSuccessRate = existing.success_rate != null
      ? Math.round((existing.success_rate + (isSuccess ? 100 : 0)) / 2)
      : isSuccess ? 100 : 0
    const newPartsCost = existing.avg_parts_cost != null && project.parts_cost > 0
      ? Math.round(((existing.avg_parts_cost + project.parts_cost) / 2) * 100) / 100
      : existing.avg_parts_cost ?? (project.parts_cost > 0 ? project.parts_cost : null)

    await supabase.from('defect_database').update({
      success_rate: newSuccessRate,
      avg_parts_cost: newPartsCost,
    }).eq('id', existing.id)
  } else {
    // Create new auto entry
    const days = project.sold_at && project.received_at
      ? Math.max(1, Math.round((new Date(project.sold_at).getTime() - new Date(project.received_at).getTime()) / (1000 * 60 * 60)))
      : null

    await supabase.from('defect_database').insert({
      user_id: user.id,
      equipment_type: equipmentType,
      brand: project.brand,
      model: project.model,
      common_defect: defectText,
      likely_cause: project.diagnosis || null,
      required_parts: [],
      avg_repair_time_hours: days,
      avg_parts_cost: project.parts_cost > 0 ? project.parts_cost : null,
      difficulty: null,
      success_rate: isSuccess ? 100 : 0,
      auto_created: true,
      source_project_id: project.id,
    })
  }
}

export function useDefects() {
  return useQuery({ queryKey: ['defects'], queryFn: fetchDefects })
}

export function useCreateDefect() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: createDefect, onSuccess: () => qc.invalidateQueries({ queryKey: ['defects'] }) })
}

export function useDeleteDefect() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteDefect, onSuccess: () => qc.invalidateQueries({ queryKey: ['defects'] }) })
}
