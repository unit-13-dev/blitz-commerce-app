-- Fix the get_active_kyc function to use the correct status type
DROP FUNCTION IF EXISTS get_active_kyc(UUID);

-- Create a function to get the latest active KYC for a vendor
CREATE OR REPLACE FUNCTION get_active_kyc(vendor_uuid UUID)
RETURNS TABLE (
  id UUID,
  vendor_id UUID,
  business_name TEXT,
  ho_address TEXT,
  warehouse_address TEXT,
  phone_number TEXT,
  gst_number TEXT,
  gst_url TEXT,
  pan_number TEXT,
  pan_url TEXT,
  tan_number TEXT,
  turnover_over_5cr BOOLEAN,
  status kyc_status,
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  version INTEGER,
  is_active BOOLEAN,
  previous_kyc_id UUID,
  submission_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vk.id,
    vk.vendor_id,
    vk.business_name,
    vk.ho_address,
    vk.warehouse_address,
    vk.phone_number,
    vk.gst_number,
    vk.gst_url,
    vk.pan_number,
    vk.pan_url,
    vk.tan_number,
    vk.turnover_over_5cr,
    vk.status,
    vk.rejection_reason,
    vk.submitted_at,
    vk.reviewed_at,
    vk.reviewed_by,
    vk.version,
    vk.is_active,
    vk.previous_kyc_id,
    vk.submission_count
  FROM public.vendor_kyc vk
  WHERE vk.vendor_id = vendor_uuid 
    AND vk.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_kyc(UUID) TO authenticated; 