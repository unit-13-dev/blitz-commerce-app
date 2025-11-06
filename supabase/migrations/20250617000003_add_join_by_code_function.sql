-- Create function to join private group by access code
CREATE OR REPLACE FUNCTION join_private_group_by_code(
  access_code_param TEXT,
  user_uuid UUID
)
RETURNS JSON AS $$
DECLARE
  group_record RECORD;
  result JSON;
BEGIN
  -- Find the group with the given access code
  SELECT * INTO group_record 
  FROM public.groups 
  WHERE access_code = access_code_param AND is_private = true;
  
  -- Check if group exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid access code'
    );
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_record.id AND user_id = user_uuid
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You are already a member of this group'
    );
  END IF;
  
  -- Check if group is full
  IF (
    SELECT COUNT(*) FROM public.group_members WHERE group_id = group_record.id
  ) >= group_record.member_limit THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Group is full'
    );
  END IF;
  
  -- Add user to group
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (group_record.id, user_uuid);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined the group',
    'group_id', group_record.id,
    'group_name', group_record.name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to join group: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 