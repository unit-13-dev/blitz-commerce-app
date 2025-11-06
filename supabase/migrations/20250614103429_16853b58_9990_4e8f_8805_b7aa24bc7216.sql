
-- First, let's check what policies currently exist and only add what's missing
-- We'll use conditional creation to avoid conflicts

-- Ensure RLS is enabled (this is safe to run multiple times)
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

-- Only create policies if they don't already exist
DO $$
BEGIN
    -- Check and create "Users can view their own join requests" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_join_requests' 
        AND policyname = 'Users can view their own join requests'
    ) THEN
        CREATE POLICY "Users can view their own join requests" 
        ON public.group_join_requests 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    -- Check and create "Users can create their own join requests" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_join_requests' 
        AND policyname = 'Users can create their own join requests'
    ) THEN
        CREATE POLICY "Users can create their own join requests" 
        ON public.group_join_requests 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Check and create "Users can update their own join requests" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_join_requests' 
        AND policyname = 'Users can update their own join requests'
    ) THEN
        CREATE POLICY "Users can update their own join requests" 
        ON public.group_join_requests 
        FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;

    -- Check and create "Users can delete their own join requests" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_join_requests' 
        AND policyname = 'Users can delete their own join requests'
    ) THEN
        CREATE POLICY "Users can delete their own join requests" 
        ON public.group_join_requests 
        FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;

    -- Check and create "Group creators can view requests for their groups" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_join_requests' 
        AND policyname = 'Group creators can view requests for their groups'
    ) THEN
        CREATE POLICY "Group creators can view requests for their groups" 
        ON public.group_join_requests 
        FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM public.groups 
                WHERE groups.id = group_join_requests.group_id 
                AND groups.creator_id = auth.uid()
            )
        );
    END IF;

    -- Check and create "Group creators can update requests for their groups" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_join_requests' 
        AND policyname = 'Group creators can update requests for their groups'
    ) THEN
        CREATE POLICY "Group creators can update requests for their groups" 
        ON public.group_join_requests 
        FOR UPDATE 
        USING (
            EXISTS (
                SELECT 1 FROM public.groups 
                WHERE groups.id = group_join_requests.group_id 
                AND groups.creator_id = auth.uid()
            )
        );
    END IF;

END $$;
