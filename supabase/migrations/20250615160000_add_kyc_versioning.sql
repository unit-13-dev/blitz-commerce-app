-- Add versioning support to vendor_kyc table
-- This allows vendors to resubmit KYC with corrected information while maintaining audit trail

-- Add versioning columns
ALTER TABLE public.vendor_kyc
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE public.vendor_kyc
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.vendor_kyc
ADD COLUMN IF NOT EXISTS previous_kyc_id UUID REFERENCES public.vendor_kyc(id);

-- Add submission count for tracking
ALTER TABLE public.vendor_kyc
ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 1;

-- Update existing records to ensure they are active
UPDATE public.vendor_kyc
SET is_active = true, version = 1, submission_count = 1
WHERE is_active IS NULL OR version IS NULL OR submission_count IS NULL;

-- Remove individual unique constraints that prevent resubmission
ALTER TABLE public.vendor_kyc
DROP CONSTRAINT IF EXISTS unique_gst_number;

ALTER TABLE public.vendor_kyc
DROP CONSTRAINT IF EXISTS unique_pan_number;

ALTER TABLE public.vendor_kyc
DROP CONSTRAINT IF EXISTS unique_tan_number;

ALTER TABLE public.vendor_kyc
DROP CONSTRAINT IF EXISTS unique_phone_number;

-- Add new constraints that only apply to active records using partial indexes
CREATE UNIQUE INDEX IF NOT EXISTS unique_gst_active 
ON public.vendor_kyc(gst_number) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS unique_pan_active 
ON public.vendor_kyc(pan_number) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS unique_tan_active 
ON public.vendor_kyc(tan_number) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS unique_phone_active 
ON public.vendor_kyc(phone_number) 
WHERE is_active = true;

-- Ensure vendor can only have one active KYC record
CREATE UNIQUE INDEX IF NOT EXISTS unique_vendor_active 
ON public.vendor_kyc(vendor_id) 
WHERE is_active = true;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_vendor_active 
ON public.vendor_kyc(vendor_id, is_active);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_version 
ON public.vendor_kyc(vendor_id, version);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_previous 
ON public.vendor_kyc(previous_kyc_id);

-- Add comments for documentation
COMMENT ON COLUMN public.vendor_kyc.version IS 'Version number of this KYC submission (1, 2, 3, etc.)';
COMMENT ON COLUMN public.vendor_kyc.is_active IS 'Whether this is the current active KYC record for the vendor';
COMMENT ON COLUMN public.vendor_kyc.previous_kyc_id IS 'Reference to the previous KYC submission (for audit trail)';
COMMENT ON COLUMN public.vendor_kyc.submission_count IS 'Total number of submissions made by this vendor';

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
  status TEXT,
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

-- Create a function to create a new KYC version
CREATE OR REPLACE FUNCTION create_kyc_version(
  vendor_uuid UUID,
  business_name_val TEXT,
  ho_address_val TEXT,
  warehouse_address_val TEXT,
  phone_number_val TEXT,
  gst_number_val TEXT,
  gst_url_val TEXT,
  pan_number_val TEXT,
  pan_url_val TEXT,
  tan_number_val TEXT,
  turnover_over_5cr_val BOOLEAN
)
RETURNS UUID AS $$
DECLARE
  current_version INTEGER;
  current_submission_count INTEGER;
  previous_kyc_id_val UUID;
  new_kyc_id UUID;
BEGIN
  -- Get current version and submission count
  SELECT COALESCE(MAX(version), 0), COALESCE(MAX(submission_count), 0)
  INTO current_version, current_submission_count
  FROM public.vendor_kyc
  WHERE vendor_id = vendor_uuid;
  
  -- Get the current active KYC ID (if exists)
  SELECT id INTO previous_kyc_id_val
  FROM public.vendor_kyc
  WHERE vendor_id = vendor_uuid AND is_active = true;
  
  -- Deactivate current active KYC (if exists)
  IF previous_kyc_id_val IS NOT NULL THEN
    UPDATE public.vendor_kyc
    SET is_active = false
    WHERE id = previous_kyc_id_val;
  END IF;
  
  -- Create new KYC version
  INSERT INTO public.vendor_kyc (
    vendor_id,
    business_name,
    ho_address,
    warehouse_address,
    phone_number,
    gst_number,
    gst_url,
    pan_number,
    pan_url,
    tan_number,
    turnover_over_5cr,
    version,
    is_active,
    previous_kyc_id,
    submission_count,
    status,
    submitted_at
  ) VALUES (
    vendor_uuid,
    business_name_val,
    ho_address_val,
    warehouse_address_val,
    phone_number_val,
    gst_number_val,
    gst_url_val,
    pan_number_val,
    pan_url_val,
    tan_number_val,
    turnover_over_5cr_val,
    current_version + 1,
    true,
    previous_kyc_id_val,
    current_submission_count + 1,
    'pending',
    NOW()
  ) RETURNING id INTO new_kyc_id;
  
  RETURN new_kyc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_kyc_version(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated; 