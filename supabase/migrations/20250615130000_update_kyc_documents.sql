-- Update KYC document structure
-- Convert documents_url array to separate gst_url and aadhar_url fields

-- First, add the new aadhar_url column
ALTER TABLE public.vendor_kyc 
ADD COLUMN IF NOT EXISTS aadhar_url TEXT;

-- Add a temporary column to store converted gst_url
ALTER TABLE public.vendor_kyc 
ADD COLUMN IF NOT EXISTS gst_url_temp TEXT;

-- Convert existing documents_url array to single gst_url value
-- If documents_url has values, take the first one as gst_url
UPDATE public.vendor_kyc 
SET gst_url_temp = CASE 
  WHEN documents_url IS NOT NULL AND array_length(documents_url, 1) > 0 
  THEN documents_url[1]
  ELSE 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&auto=format'
END;

-- Add placeholder URLs for existing entries that don't have documents
UPDATE public.vendor_kyc 
SET aadhar_url = 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=600&fit=crop&auto=format'
WHERE aadhar_url IS NULL;

-- Now drop the old documents_url column
ALTER TABLE public.vendor_kyc 
DROP COLUMN IF EXISTS documents_url;

-- Rename gst_url_temp to gst_url
ALTER TABLE public.vendor_kyc 
RENAME COLUMN gst_url_temp TO gst_url;

-- Make both fields NOT NULL now that they have values
ALTER TABLE public.vendor_kyc 
ALTER COLUMN gst_url SET NOT NULL;

ALTER TABLE public.vendor_kyc 
ALTER COLUMN aadhar_url SET NOT NULL;

-- Create KYC documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)  -- Private bucket for security
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for KYC documents
-- Only vendors can upload their own KYC documents
CREATE POLICY "Vendors can upload their own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Only vendors can view their own KYC documents, and admins can view all
CREATE POLICY "Vendors can view own KYC documents, admins can view all"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Only vendors can update their own KYC documents
CREATE POLICY "Vendors can update their own KYC documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Only vendors can delete their own KYC documents
CREATE POLICY "Vendors can delete their own KYC documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add constraints for file validation (handled in app, but documented here)
COMMENT ON COLUMN public.vendor_kyc.gst_url IS 'GST document image URL (PNG, JPEG, PDF max 5MB)';
COMMENT ON COLUMN public.vendor_kyc.aadhar_url IS 'Aadhaar document image URL (PNG, JPEG, PDF max 5MB)';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_vendor_status 
ON public.vendor_kyc(vendor_id, status);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_status 
ON public.vendor_kyc(status);

-- Update any existing placeholder data to use consistent placeholder images
UPDATE public.vendor_kyc 
SET 
  gst_url = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&auto=format',
  aadhar_url = 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=600&fit=crop&auto=format'
WHERE gst_url IS NULL OR aadhar_url IS NULL; 