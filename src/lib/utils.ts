import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Project } from './supabase'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcROI(p: Pick<Project, 'purchase_price' | 'parts_cost' | 'shipping_in' | 'shipping_out' | 'sale_price'>) {
  const cost = (p.purchase_price || 0) + (p.parts_cost || 0) + (p.shipping_in || 0) + (p.shipping_out || 0)
  const revenue = p.sale_price || 0
  const profit = revenue - cost
  const roi = cost > 0 ? (profit / cost) * 100 : 0
  return { cost, revenue, profit, roi }
}

export function fmtGBP(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
}

export function fmtDate(date: string | null) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
}

export const STATUS_COLORS: Record<string, string> = {
  'Recebido': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Em Diagnóstico': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Aguardando Peças': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Em Manutenção': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Pronto para Venda': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Vendido': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Cancelado': 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const STATUS_DOT: Record<string, string> = {
  'Recebido': 'bg-blue-400',
  'Em Diagnóstico': 'bg-yellow-400',
  'Aguardando Peças': 'bg-orange-400',
  'Em Manutenção': 'bg-purple-400',
  'Pronto para Venda': 'bg-green-400',
  'Vendido': 'bg-emerald-400',
  'Cancelado': 'bg-red-400',
}

export const ALL_STATUSES = [
  'Recebido', 'Em Diagnóstico', 'Aguardando Peças',
  'Em Manutenção', 'Pronto para Venda', 'Vendido', 'Cancelado',
] as const
