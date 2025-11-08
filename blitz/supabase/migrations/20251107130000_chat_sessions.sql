-- Chat sessions table for storing conversation context
create table if not exists public.chat_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    business_id uuid not null references public.businesses(id) on delete cascade,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_sessions_user_id_idx on public.chat_sessions (user_id);
create index if not exists chat_sessions_business_id_idx on public.chat_sessions (business_id);

-- Chat messages table for storing individual messages in conversations
create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.chat_sessions(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    intent text check (intent in ('general_query', 'cancellation', 'order_query', 'refund_query')),
    metadata jsonb,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_messages_session_id_idx on public.chat_messages (session_id);
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at);

-- Trigger to keep updated_at in sync for chat_sessions
create trigger chat_sessions_set_updated_at
before update on public.chat_sessions
for each row
execute function public.set_updated_at();

