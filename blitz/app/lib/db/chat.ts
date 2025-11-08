import { getSupabaseAdmin } from '../supabase/admin';

export type ChatSessionRecord = {
  id: string;
  user_id: string;
  business_id: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRecord = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  intent: 'general_query' | 'cancellation' | 'order_query' | 'refund_query' | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function getOrCreateChatSession(
  userId: string,
  businessId: string
): Promise<ChatSessionRecord> {
  const supabase = getSupabaseAdmin();

  // Try to get the most recent session for this user
  const { data: existingSession, error: fetchError } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch chat session: ${fetchError.message}`);
  }

  if (existingSession) {
    // Update the session's updated_at timestamp
    const { data: updatedSession, error: updateError } = await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', existingSession.id)
      .select()
      .single();

    if (updateError || !updatedSession) {
      throw new Error(`Failed to update chat session: ${updateError?.message ?? 'unknown error'}`);
    }

    return updatedSession as ChatSessionRecord;
  }

  // Create a new session
  const { data: newSession, error: createError } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      business_id: businessId,
    })
    .select()
    .single();

  if (createError || !newSession) {
    throw new Error(`Failed to create chat session: ${createError?.message ?? 'unknown error'}`);
  }

  return newSession as ChatSessionRecord;
}

export async function saveChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  intent: 'general_query' | 'cancellation' | 'order_query' | 'refund_query' | null = null,
  metadata: Record<string, unknown> | null = null
): Promise<ChatMessageRecord> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      intent,
      metadata,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to save chat message: ${error?.message ?? 'unknown error'}`);
  }

  return data as ChatMessageRecord;
}

export async function getChatHistory(sessionId: string): Promise<ChatMessageRecord[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch chat history: ${error.message}`);
  }

  return (data ?? []) as ChatMessageRecord[];
}

