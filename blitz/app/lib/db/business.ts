import { User } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../supabase/admin';

export type BusinessRecord = {
  id: string;
  name: string;
  created_at: string;
};

export type UserRecord = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  business_id: string;
  created_at: string;
};

type UserWithBusiness = UserRecord & {
  business: BusinessRecord | null;
};

type SupabaseUserResponse = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  business_id: string;
  created_at: string;
  business: BusinessRecord | BusinessRecord[] | null;
};

async function fetchUserWithBusiness(clerkUserId: string): Promise<UserWithBusiness | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select(
        `id, clerk_user_id, email, first_name, last_name, business_id, created_at,
         business:businesses(id, name, created_at)`
      )
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (error) {
      console.error('[fetchUserWithBusiness] Supabase error:', error);
      throw new Error(`Failed to load user profile: ${error.message || 'Unknown database error'}`);
    }

    if (!data) {
      return null;
    }

    const typedData = data as SupabaseUserResponse;
    const rawBusiness = typedData.business;
    const normalizedBusiness = Array.isArray(rawBusiness) ? rawBusiness[0] ?? null : rawBusiness;

    const userRecord: UserRecord = {
      id: typedData.id,
      clerk_user_id: typedData.clerk_user_id,
      email: typedData.email,
      first_name: typedData.first_name,
      last_name: typedData.last_name,
      business_id: typedData.business_id,
      created_at: typedData.created_at,
    };

    return {
      ...userRecord,
      business: normalizedBusiness,
    };
  } catch (error) {
    // Handle network/connection errors
    if (error instanceof Error) {
      // Check if it's a network error
      if (
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('network') ||
        error.cause instanceof Error
      ) {
        console.error('[fetchUserWithBusiness] Network error - Check Supabase connection:', error);
        throw new Error(
          `Failed to connect to database. Please check your Supabase configuration. ` +
            `Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set correctly in your environment variables. ` +
            `Original error: ${error.message}`
        );
      }
      // Re-throw other errors as-is (they're already properly formatted)
      throw error;
    }
    throw new Error(`Failed to load user profile: ${String(error)}`);
  }
}

function derivePlaceholderBusinessName(user: User): string {
  const first = user.firstName ?? 'New';
  const lastInitial = user.lastName ? `${user.lastName.charAt(0)}.` : '';
  return `${first} ${lastInitial} Business`.trim();
}

export async function ensureBusinessForUser(user: User): Promise<{ user: UserRecord; business: BusinessRecord }> {
  try {
    const email = user.emailAddresses[0]?.emailAddress ?? null;
    const firstName = user.firstName ?? null;
    const lastName = user.lastName ?? null;

    const existing = await fetchUserWithBusiness(user.id);

    if (existing && existing.business) {
      const { business, ...userRecord } = existing;
      return { user: userRecord as UserRecord, business };
    }

    const businessPayload = {
      name: derivePlaceholderBusinessName(user),
    };

    const supabase = getSupabaseAdmin();
    const { data: insertedBusiness, error: businessError } = await supabase
      .from('businesses')
      .insert(businessPayload)
      .select()
      .single();

    if (businessError || !insertedBusiness) {
      console.error('[ensureBusinessForUser] Failed to create business:', businessError);
      throw new Error(
        `Failed to create business: ${businessError?.message ?? 'unknown error'}. ` +
          `Please check your Supabase connection and permissions.`
      );
    }

    const userPayload = {
      clerk_user_id: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      business_id: insertedBusiness.id,
    };

    const { data: upsertedUser, error: userError } = await supabase
      .from('users')
      .upsert(userPayload, { onConflict: 'clerk_user_id' })
      .select()
      .single();

    if (userError || !upsertedUser) {
      console.error('[ensureBusinessForUser] Failed to upsert user:', userError);
      throw new Error(
        `Failed to upsert user: ${userError?.message ?? 'unknown error'}. ` +
          `Please check your Supabase connection and permissions.`
      );
    }

    return {
      user: upsertedUser as UserRecord,
      business: insertedBusiness as BusinessRecord,
    };
  } catch (error) {
    // Re-throw with better context if it's already an Error
    if (error instanceof Error) {
      // Check for network errors
      if (
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('Failed to connect')
      ) {
        throw error; // Already has good error message from fetchUserWithBusiness
      }
      throw error;
    }
    throw new Error(`Failed to ensure business for user: ${String(error)}`);
  }
}

export async function getBusinessForUser(clerkUserId: string): Promise<BusinessRecord | null> {
  const record = await fetchUserWithBusiness(clerkUserId);
  return record?.business ?? null;
}

export async function updateBusinessName(clerkUserId: string, name: string): Promise<BusinessRecord> {
  const record = await fetchUserWithBusiness(clerkUserId);

  if (!record?.business) {
    throw new Error('Business not found for user');
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('businesses')
    .update({ name })
    .eq('id', record.business.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update business: ${error?.message ?? 'unknown error'}`);
  }

  return data as BusinessRecord;
}
