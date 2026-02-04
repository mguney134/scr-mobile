import { supabase } from './supabase';

export interface EnsurePublicUserOptions {
  skin_type?: string | null;
  skin_concerns?: string[];
}

/**
 * routines.user_id → public.users(id) olduğu için,
 * rutin oluşturmadan önce kullanıcının public.users'da kaydı olmalı.
 * Önce satırı oluşturur/günceller, sonra skin_type / skin_concerns varsa ayrı update yapar.
 */
export async function ensurePublicUser(
  userId: string,
  email: string,
  options?: EnsurePublicUserOptions
) {
  try {
    const { error: upsertError } = await supabase
      .from('users')
      .upsert(
        { id: userId, email, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    if (upsertError) {
      console.warn('ensurePublicUser upsert:', upsertError.message, upsertError);
      return;
    }

    const hasProfile =
      options?.skin_type !== undefined || options?.skin_concerns !== undefined;
    if (!hasProfile) return;

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (options?.skin_type !== undefined) updatePayload.skin_type = options.skin_type;
    if (options?.skin_concerns !== undefined)
      updatePayload.skin_concerns = Array.isArray(options.skin_concerns) ? options.skin_concerns : [];

    const { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId);
    if (updateError) {
      console.warn('ensurePublicUser profile update:', updateError.message, updateError);
    }
  } catch (e) {
    console.warn('ensurePublicUser exception:', e);
  }
}

export interface UserSkinProfile {
  skin_type: string | null;
  skin_concerns: string[];
}

/** Mevcut kullanıcının public.users kaydından skin_type ve skin_concerns okur. */
export async function getCurrentUserSkinProfile(userId: string): Promise<UserSkinProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('skin_type, skin_concerns')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    skin_type: data.skin_type ?? null,
    skin_concerns: Array.isArray(data.skin_concerns) ? data.skin_concerns : [],
  };
}

/** Mevcut kullanıcının skin_type ve skin_concerns alanlarını günceller. */
export async function updateUserSkinProfile(
  userId: string,
  options: { skin_type?: string | null; skin_concerns?: string[] }
): Promise<{ error: Error | null }> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (options.skin_type !== undefined) payload.skin_type = options.skin_type;
  if (options.skin_concerns !== undefined)
    payload.skin_concerns = Array.isArray(options.skin_concerns) ? options.skin_concerns : [];
  const { error } = await supabase.from('users').update(payload).eq('id', userId);
  return { error: error ?? null };
}
