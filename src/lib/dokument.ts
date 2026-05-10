import { supabase } from './supabase'

export type DokumentKategori = 'lonespec' | 'dokument'

export interface PersonalDokument {
  id: string
  personal_id: string
  kategori: DokumentKategori
  filnamn: string
  mime_type: string
  storlek: number
  storage_path: string
  skapad_at: string
}

export async function listDokument(
  personalId: string,
  kategori: DokumentKategori,
): Promise<PersonalDokument[]> {
  const { data, error } = await supabase
    .from('personal_dokument')
    .select('*')
    .eq('personal_id', personalId)
    .eq('kategori', kategori)
    .order('skapad_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PersonalDokument[]
}

export async function getDokumentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('personal-dokument')
    .createSignedUrl(storagePath, 60)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
