import { supabaseServer, supabaseAdmin, supabaseClient } from '../config/database';

export class UserRepository {
  static async findBindingByPublicId(publicId: string) {
    const { data, error } = await supabaseServer
      .from('user_bindings')
      .select('*')
      .ilike('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error('UserRepository.findBindingByPublicId error:', error);
    }
    return data;
  }

  static async findProfileByPublicId(publicId: string) {
    const { data, error } = await supabaseServer
      .from('profiles')
      .select('*')
      .ilike('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error('UserRepository.findProfileByPublicId error:', error);
    }
    return data;
  }

  static async findBindingOrProfileById(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let bQuery = supabaseServer.from('user_bindings').select('*');
    if (isUuid) {
      bQuery = bQuery.or(`id.eq.${id},auth_user_id.eq.${id}`);
    } else {
      bQuery = bQuery.eq('public_id', id);
    }
    const { data: binding } = await bQuery.maybeSingle();

    let pQuery = supabaseServer.from('profiles').select('*');
    if (isUuid) {
      pQuery = pQuery.eq('id', id);
    } else {
      pQuery = pQuery.eq('public_id', id);
    }
    const { data: profile } = await pQuery.maybeSingle();

    return { binding, profile };
  }

  static async createUserWithAdminAuth(params: {
    email: string;
    password: string;
    metadata: Record<string, any>;
  }) {
    return await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: params.metadata,
    });
  }

  static async upsertBinding(payload: Record<string, any>) {
    return await supabaseServer
      .from('user_bindings')
      .upsert(payload, { onConflict: 'public_id' })
      .select()
      .single();
  }

  static async upsertProfile(payload: Record<string, any>) {
    return await supabaseServer
      .from('profiles')
      .upsert(payload)
      .select()
      .maybeSingle();
  }

  static async updateProfile(authUserId: string, updates: Record<string, any>) {
    return await supabaseServer
      .from('profiles')
      .update(updates)
      .eq('id', authUserId);
  }

  static async updateBinding(publicId: string, updates: Record<string, any>) {
    return await supabaseServer
      .from('user_bindings')
      .update(updates)
      .eq('public_id', publicId)
      .select()
      .maybeSingle();
  }

  static async insertBinding(data: Record<string, any>) {
    return await supabaseServer
      .from('user_bindings')
      .insert(data)
      .select()
      .single();
  }

  static async deleteBindingByPublicId(publicId: string) {
    return await supabaseServer
      .from('user_bindings')
      .delete()
      .eq('public_id', publicId);
  }

  static async findAllStudents() {
    const { data: bindings } = await supabaseClient
      .from('user_bindings')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    return { bindings: bindings || [], profiles: profiles || [] };
  }

  static async findAllTeachers() {
    const { data: bindings } = await supabaseClient
      .from('user_bindings')
      .select('*')
      .in('role', ['teacher', 'admin'])
      .order('created_at', { ascending: true });

    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('*')
      .in('role', ['teacher', 'admin'])
      .order('created_at', { ascending: true });

    return { bindings: bindings || [], profiles: profiles || [] };
  }
}
