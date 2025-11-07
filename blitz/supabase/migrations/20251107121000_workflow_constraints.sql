-- Remove any duplicate workflows per business, keeping the earliest record
with duplicates as (
  select id
  from (
    select id,
           row_number() over (partition by business_id order by created_at) as rn
    from public.workflows
  ) ranked
  where rn > 1
)
delete from public.workflows
where id in (select id from duplicates);

-- Ensure only one workflow per business
alter table public.workflows
add constraint workflows_business_unique unique (business_id);
