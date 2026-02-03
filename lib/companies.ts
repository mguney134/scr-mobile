import { supabase } from './supabase';
import type { Company } from '../types/company';

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, created_at')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Company[];
}

export async function getCompanyByName(name: string): Promise<Company | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, created_at')
    .ilike('name', trimmed)
    .maybeSingle();
  if (error) throw error;
  return data as Company | null;
}

export async function createCompany(name: string): Promise<Company> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Company name is required');
  const existing = await getCompanyByName(trimmed);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('companies')
    .insert({ name: trimmed })
    .select('id, name, created_at')
    .single();
  if (error) throw error;
  return data as Company;
}

/** Get or create company by name. */
export async function getOrCreateCompany(name: string): Promise<Company | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = await getCompanyByName(trimmed);
  if (existing) return existing;
  return createCompany(trimmed);
}
