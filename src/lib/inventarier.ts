import { supabase } from './supabase'

export interface InventarieItem {
  id: string
  lopnr: number
  kategori: string
  benamning: string
  tillverkare_modell: string
  serienr: string
  antal: number
  skick: string
  placering: string
  updated_at: string | null
}

export async function listInventarier(): Promise<InventarieItem[]> {
  const { data, error } = await supabase
    .from('inventarier')
    .select('id, lopnr, kategori, benamning, tillverkare_modell, serienr, antal, skick, placering, updated_at')
    .order('lopnr', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as InventarieItem[]
}

export interface CreateInventarieInput {
  kategori: string
  benamning: string
  tillverkare_modell: string
  serienr: string
  antal: number
  skick: string
  placering: string
}

export async function createInventarie(input: CreateInventarieInput, userId: string): Promise<InventarieItem> {
  const { data, error } = await supabase
    .from('inventarier')
    .insert({ ...input, updated_by_user_id: userId, updated_at: new Date().toISOString() })
    .select('id, lopnr, kategori, benamning, tillverkare_modell, serienr, antal, skick, placering, updated_at')
    .single()
  if (error) throw new Error(error.message)
  return data as InventarieItem
}

export async function updateInventarieFields(
  id: string,
  patch: { benamning: string; tillverkare_modell: string; serienr: string; antal: number; skick: string; placering: string },
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('inventarier')
    .update({ ...patch, updated_by_user_id: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
