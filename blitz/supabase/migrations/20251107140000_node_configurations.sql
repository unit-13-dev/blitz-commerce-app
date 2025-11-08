-- Migration: Node Configurations Table
-- This separates node configurations from react_flow_state
-- react_flow_state will only store basic node info (position, id, type)
-- All node configurations (API keys, settings) are stored here

-- Create node_configurations table
create table if not exists public.node_configurations (
    id uuid primary key default gen_random_uuid(),
    workflow_id uuid not null references public.workflows(id) on delete cascade,
    node_id text not null, -- Reference to node.id in react_flow_state
    node_type text not null check (node_type in ('genai-intent', 'router', 'module', 'response')),
    config_data jsonb not null, -- Configuration data (encrypted API keys stored as encrypted strings)
    is_configured boolean not null default false,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique(workflow_id, node_id)
);

-- Create indexes for performance
create index if not exists node_configurations_workflow_id_idx on public.node_configurations (workflow_id);
create index if not exists node_configurations_node_type_idx on public.node_configurations (node_type);
create index if not exists node_configurations_configured_idx on public.node_configurations (is_configured) where is_configured = true;
create index if not exists node_configurations_workflow_node_idx on public.node_configurations (workflow_id, node_id);

-- Add trigger for updated_at
create trigger node_configurations_set_updated_at
before update on public.node_configurations
for each row
execute function public.set_updated_at();

-- Add function to check if workflow has configured GenAI node
create or replace function public.workflow_has_configured_genai(workflow_uuid uuid)
returns boolean as $$
begin
    return exists (
        select 1
        from public.node_configurations
        where workflow_id = workflow_uuid
        and node_type = 'genai-intent'
        and is_configured = true
    );
end;
$$ language plpgsql;

-- Add comment for documentation
comment on table public.node_configurations is 'Stores node configurations separately from react_flow_state. react_flow_state contains only basic node info (position, id, type), while this table stores all configuration data including encrypted API keys.';
comment on column public.node_configurations.config_data is 'JSONB containing node configuration. For GenAI nodes, API keys are stored encrypted in the format: { "genAIConfig": { "apiKey": "encrypted_string", "model": "pplx-sonar-pro", ... } }';
comment on column public.node_configurations.is_configured is 'Whether the node is fully configured and ready to use';

