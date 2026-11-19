import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const AVATAR_BUCKET = 'needcart-avatars';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) {
      return json({ error: 'unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'server_misconfigured' }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      db: { schema: 'needcart' },
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: 'unauthorized' }, 401);
    }

    const body = (await request.json().catch(() => ({}))) as {
      delete_owned_groups?: boolean;
    };
    const deleteOwnedGroups = body.delete_owned_groups === true;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: 'needcart' },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: ownedGroups, error: ownedError } = await admin
      .from('groups')
      .select('id, name')
      .eq('owner_id', user.id);

    if (ownedError) {
      throw ownedError;
    }

    if (ownedGroups && ownedGroups.length > 0 && !deleteOwnedGroups) {
      return json(
        {
          error: 'owned_groups',
          groups: ownedGroups,
        },
        409,
      );
    }

    if (ownedGroups && ownedGroups.length > 0) {
      const { error: groupError } = await admin
        .from('groups')
        .delete()
        .in(
          'id',
          ownedGroups.map((group) => group.id),
        );

      if (groupError) {
        throw groupError;
      }
    }

    const { data: avatarFiles } = await admin.storage
      .from(AVATAR_BUCKET)
      .list(user.id);

    if (avatarFiles && avatarFiles.length > 0) {
      await admin.storage
        .from(AVATAR_BUCKET)
        .remove(avatarFiles.map((file) => `${user.id}/${file.name}`));
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw deleteError;
    }

    return json({ ok: true });
  } catch (error) {
    console.error('needcart-delete-account failed', error);
    return json({ error: 'delete_failed' }, 500);
  }
});
