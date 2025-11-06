-- Add unique constraints for GST number, PAN, and TAN fields
-- This ensures no duplicate tax identification numbers across vendors

-- First, ensure GST number is NOT NULL and has valid format
ALTER TABLE public.vendor_kyc 
ALTER COLUMN gst_number SET NOT NULL;

-- Add unique constraint for GST number
ALTER TABLE public.vendor_kyc 
ADD CONSTRAINT unique_gst_number UNIQUE (gst_number);

-- Add unique constraint for PAN number
ALTER TABLE public.vendor_kyc 
ADD CONSTRAINT unique_pan_number UNIQUE (pan_number);

-- Add unique constraint for TAN number
ALTER TABLE public.vendor_kyc 
ADD CONSTRAINT unique_tan_number UNIQUE (tan_number);

-- Add unique constraint for phone number (business phone should be unique)
ALTER TABLE public.vendor_kyc 
ADD CONSTRAINT unique_phone_number UNIQUE (phone_number);

-- Add indexes for better query performance on unique fields
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_gst_number_unique 
ON public.vendor_kyc(gst_number);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_pan_number_unique 
ON public.vendor_kyc(pan_number);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_tan_number_unique 
ON public.vendor_kyc(tan_number);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_phone_number_unique 
ON public.vendor_kyc(phone_number);

-- Update comments to reflect uniqueness
COMMENT ON COLUMN public.vendor_kyc.gst_number IS 'GST (Goods and Services Tax) Number - 15 character alphanumeric, UNIQUE';
COMMENT ON COLUMN public.vendor_kyc.pan_number IS 'PAN (Permanent Account Number) - 10 character alphanumeric, UNIQUE';
COMMENT ON COLUMN public.vendor_kyc.tan_number IS 'TAN (Tax Deduction Account Number) - 10 character alphanumeric, UNIQUE';
COMMENT ON COLUMN public.vendor_kyc.phone_number IS 'Business phone number - 10 digits, UNIQUE'; 