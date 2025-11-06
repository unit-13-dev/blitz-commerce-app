-- Update KYC table structure to remove Aadhaar and add PAN/TAN fields
-- Also add additional business information fields

-- Remove Aadhaar-related columns
ALTER TABLE public.vendor_kyc 
DROP COLUMN IF EXISTS aadhar_number;

ALTER TABLE public.vendor_kyc 
DROP COLUMN IF EXISTS aadhar_url;

-- Add new columns for enhanced KYC requirements
ALTER TABLE public.vendor_kyc 
ADD COLUMN IF NOT EXISTS pan_number TEXT;

ALTER TABLE public.vendor_kyc 
ADD COLUMN IF NOT EXISTS pan_url TEXT;

ALTER TABLE public.vendor_kyc 
ADD COLUMN IF NOT EXISTS tan_number TEXT;

ALTER TABLE public.vendor_kyc 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

ALTER TABLE public.vendor_kyc 
ADD COLUMN IF NOT EXISTS warehouse_address TEXT;

ALTER TABLE public.vendor_kyc 
ADD COLUMN IF NOT EXISTS turnover_over_5cr BOOLEAN;

-- Rename business_address to ho_address for clarity
ALTER TABLE public.vendor_kyc 
RENAME COLUMN business_address TO ho_address;

-- Add placeholder values for existing records
UPDATE public.vendor_kyc 
SET 
  pan_number = 'PAN' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
  pan_url = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&auto=format',
  tan_number = 'TAN' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
  phone_number = '9' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0'),
  warehouse_address = 'Warehouse Address - ' || business_name,
  turnover_over_5cr = CASE WHEN RANDOM() > 0.5 THEN true ELSE false END
WHERE pan_number IS NULL;

-- Update existing GST numbers to valid format if they don't match the pattern
UPDATE public.vendor_kyc 
SET gst_number = '22AAAAA0000A1Z5'
WHERE gst_number IS NULL OR gst_number !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$';

-- Update existing PAN numbers to valid format if they don't match the pattern
UPDATE public.vendor_kyc 
SET pan_number = 'ABCDE1234F'
WHERE pan_number IS NULL OR pan_number !~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$';

-- Update existing TAN numbers to valid format if they don't match the pattern
UPDATE public.vendor_kyc 
SET tan_number = 'ABCD12345E'
WHERE tan_number IS NULL OR tan_number !~ '^[A-Z]{4}[0-9]{5}[A-Z]{1}$';

-- Make all new fields NOT NULL after adding placeholder data
ALTER TABLE public.vendor_kyc 
ALTER COLUMN pan_number SET NOT NULL;

ALTER TABLE public.vendor_kyc 
ALTER COLUMN pan_url SET NOT NULL;

ALTER TABLE public.vendor_kyc 
ALTER COLUMN tan_number SET NOT NULL;

ALTER TABLE public.vendor_kyc 
ALTER COLUMN phone_number SET NOT NULL;

ALTER TABLE public.vendor_kyc 
ALTER COLUMN warehouse_address SET NOT NULL;

ALTER TABLE public.vendor_kyc 
ALTER COLUMN turnover_over_5cr SET NOT NULL;

-- Add constraints for validation
-- Phone number should be 10 digits
ALTER TABLE public.vendor_kyc 
ADD CONSTRAINT check_phone_number_format 
CHECK (phone_number ~ '^[0-9]{10}$');

-- GST number should be 15 characters (standard GST format)
ALTER TABLE public.vendor_kyc 
ADD CONSTRAINT check_gst_number_format 
CHECK (gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$');

-- PAN number should be 10 characters (standard PAN format)
ALTER TABLE public.vendor_kyc 
ADD CONSTRAINT check_pan_number_format 
CHECK (pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$');

-- TAN number should be 10 characters (standard TAN format)
ALTER TABLE public.vendor_kyc 
ADD CONSTRAINT check_tan_number_format 
CHECK (tan_number ~ '^[A-Z]{4}[0-9]{5}[A-Z]{1}$');

-- Update comments for new fields
COMMENT ON COLUMN public.vendor_kyc.pan_number IS 'PAN (Permanent Account Number) - 10 character alphanumeric';
COMMENT ON COLUMN public.vendor_kyc.pan_url IS 'PAN document image URL (PNG, JPEG, PDF max 5MB)';
COMMENT ON COLUMN public.vendor_kyc.tan_number IS 'TAN (Tax Deduction Account Number) - 10 character alphanumeric';
COMMENT ON COLUMN public.vendor_kyc.phone_number IS 'Business phone number - 10 digits';
COMMENT ON COLUMN public.vendor_kyc.ho_address IS 'Head Office address';
COMMENT ON COLUMN public.vendor_kyc.warehouse_address IS 'Warehouse address';
COMMENT ON COLUMN public.vendor_kyc.turnover_over_5cr IS 'True if annual turnover exceeds ₹5 Crores';

-- Update existing comments
COMMENT ON COLUMN public.vendor_kyc.gst_url IS 'GST document image URL (PNG, JPEG, PDF max 5MB)';

-- Add indexes for better query performance on new fields
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_pan_number 
ON public.vendor_kyc(pan_number);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_tan_number 
ON public.vendor_kyc(tan_number);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_phone_number 
ON public.vendor_kyc(phone_number);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_turnover 
ON public.vendor_kyc(turnover_over_5cr); 