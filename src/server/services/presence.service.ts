import { supabaseServer } from '../config/database';
import { AppError } from '../middleware/apiErrors';

function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export class PresenceService {
  static async updatePresence(publicId: string, status: string = 'online') {
    if (!publicId) {
      throw new AppError('publicId is required', 400);
    }

    const isIdUuid = isUuid(publicId);

    let query = supabaseServer.from('user_bindings').select('id, metadata');
    if (isIdUuid) {
      query = query.or(`id.eq.${publicId},auth_user_id.eq.${publicId}`);
    } else {
      query = query.eq('public_id', publicId);
    }
    const { data: binding } = await query.maybeSingle();

    if (!binding) {
      return { success: false, message: 'User binding not found', notFound: true };
    }

    const existingMetadata =
      binding.metadata && typeof binding.metadata === 'object' ? binding.metadata : {};
    const now = new Date();
    const lastSeenAt = now.toISOString();

    const updatedMetadata = {
      ...existingMetadata,
      last_seen_at: lastSeenAt,
      is_online: status === 'online',
    };

    await supabaseServer
      .from('user_bindings')
      .update({
        metadata: updatedMetadata,
        updated_at: now.toISOString(),
      })
      .eq('id', binding.id);

    return { success: true, status, lastSeenAt };
  }

  static async getPresence(publicId: string) {
    if (!publicId) {
      throw new AppError('id is required', 400);
    }

    const isIdUuid = isUuid(publicId);
    let query = supabaseServer.from('user_bindings').select('id, public_id, metadata, updated_at, created_at');
    if (isIdUuid) {
      query = query.or(`id.eq.${publicId},auth_user_id.eq.${publicId}`);
    } else {
      query = query.eq('public_id', publicId);
    }
    const { data: binding } = await query.maybeSingle();

    if (!binding) {
      return { isOnline: false, lastSeenAt: null };
    }

    const lastSeenAt = binding.metadata?.last_seen_at || binding.updated_at || binding.created_at || null;
    const isOnline = Boolean(
      binding.metadata?.is_online && lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 90_000
    );

    return {
      success: true,
      publicId: binding.public_id,
      isOnline,
      lastSeenAt: lastSeenAt || null,
      updatedAt: binding.updated_at,
    };
  }
}
