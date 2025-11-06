
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { Upload, FileCheck, AlertCircle, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface KYCFormProps {
  onClose?: () => void;
  existingData?: any;
  isInline?: boolean;
}

const KYCForm: React.FC<KYCFormProps> = ({ onClose, existingData, isInline = false }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    business_name: existingData?.business_name || '',
    ho_address: existingData?.ho_address || '',
    warehouse_address: existingData?.warehouse_address || '',
    phone_number: existingData?.phone_number || '',
    gst_number: existingData?.gst_number || '',
    pan_number: existingData?.pan_number || '',
    tan_number: existingData?.tan_number || '',
    turnover_over_5cr: existingData?.turnover_over_5cr || false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(!existingData || existingData.status === 'rejected');
  const [gstDocument, setGstDocument] = useState<File | null>(null);
  const [panDocument, setPanDocument] = useState<File | null>(null);
  const [gstPreview, setGstPreview] = useState<string | null>(existingData?.gst_url || null);
  const [panPreview, setPanPreview] = useState<string | null>(existingData?.pan_url || null);
  const [uploadErrors, setUploadErrors] = useState<{gst?: string; pan?: string}>({});
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // File validation function
  const validateFile = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    
    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }
    
    if (!allowedTypes.includes(file.type)) {
      return 'Only PNG, JPEG, and PDF files are allowed';
    }
    
    return null;
  };

  // Upload file to Supabase storage
  const uploadDocument = async (file: File, documentType: 'gst' | 'pan'): Promise<string> => {
    if (!profile?.id) throw new Error('User not authenticated');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}/${documentType}_${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(data.path);
    
    return publicUrl;
  };

  // Check for duplicate values (only against active records)
  const checkDuplicates = async () => {
    const errors: {[key: string]: string} = {};
    
    // Check GST number (only against active records)
    if (form.gst_number && form.gst_number !== existingData?.gst_number) {
      const { data: gstExists } = await supabase
        .from('vendor_kyc')
        .select('id')
        .eq('gst_number', form.gst_number)
        .eq('is_active', true)
        .neq('vendor_id', profile?.id)
        .single();
      
      if (gstExists) {
        errors.gst_number = 'GST number already exists with another vendor';
      }
    }
    
    // Check PAN number (only against active records)
    if (form.pan_number && form.pan_number !== existingData?.pan_number) {
      const { data: panExists } = await supabase
        .from('vendor_kyc')
        .select('id')
        .eq('pan_number', form.pan_number)
        .eq('is_active', true)
        .neq('vendor_id', profile?.id)
        .single();
      
      if (panExists) {
        errors.pan_number = 'PAN number already exists with another vendor';
      }
    }
    
    // Check TAN number (only against active records)
    if (form.tan_number && form.tan_number !== existingData?.tan_number) {
      const { data: tanExists } = await supabase
        .from('vendor_kyc')
        .select('id')
        .eq('tan_number', form.tan_number)
        .eq('is_active', true)
        .neq('vendor_id', profile?.id)
        .single();
      
      if (tanExists) {
        errors.tan_number = 'TAN number already exists with another vendor';
      }
    }
    
    // Check phone number (only against active records)
    if (form.phone_number && form.phone_number !== existingData?.phone_number) {
      const { data: phoneExists } = await supabase
        .from('vendor_kyc')
        .select('id')
        .eq('phone_number', form.phone_number)
        .eq('is_active', true)
        .neq('vendor_id', profile?.id)
        .single();
      
      if (phoneExists) {
        errors.phone_number = 'Phone number already exists with another vendor';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // GST document dropzone
  const onGstDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setUploadErrors(prev => ({ ...prev, gst: error }));
        return;
      }
      
      setUploadErrors(prev => ({ ...prev, gst: undefined }));
      setGstDocument(file);
      setGstPreview(URL.createObjectURL(file));
    }
  }, []);

  // PAN document dropzone
  const onPanDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setUploadErrors(prev => ({ ...prev, pan: error }));
        return;
      }
      
      setUploadErrors(prev => ({ ...prev, pan: undefined }));
      setPanDocument(file);
      setPanPreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps: getGstRootProps, getInputProps: getGstInputProps, isDragActive: isGstDragActive } = useDropzone({
    onDrop: onGstDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const { getRootProps: getPanRootProps, getInputProps: getPanInputProps, isDragActive: isPanDragActive } = useDropzone({
    onDrop: onPanDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const submitKYCMutation = useMutation({
    mutationFn: async (formData: typeof form) => {
      if (!profile?.id) throw new Error('User not authenticated');
      
      // Check for duplicates
      const isUnique = await checkDuplicates();
      if (!isUnique) {
        throw new Error('Duplicate values found. Please check the form.');
      }
      
      // Validate that both documents are provided for new submissions
      if (!existingData && (!gstDocument || !panDocument)) {
        throw new Error('Both GST and PAN documents are required');
      }
      
      // Upload documents if new files are selected
      let gstUrl = gstPreview;
      let panUrl = panPreview;
      
      if (gstDocument) {
        gstUrl = await uploadDocument(gstDocument, 'gst');
      }
      
      if (panDocument) {
        panUrl = await uploadDocument(panDocument, 'pan');
      }
      
      if (existingData) {
        // Resubmission: Create new version using the database function
        const { data: newKycId, error } = await supabase.rpc('create_kyc_version', {
          vendor_uuid: profile.id,
          business_name_val: formData.business_name,
          ho_address_val: formData.ho_address,
          warehouse_address_val: formData.warehouse_address,
          phone_number_val: formData.phone_number,
          gst_number_val: formData.gst_number,
          gst_url_val: gstUrl,
          pan_number_val: formData.pan_number,
          pan_url_val: panUrl,
          tan_number_val: formData.tan_number,
          turnover_over_5cr_val: formData.turnover_over_5cr
        });
        
        if (error) throw error;
      } else {
        // First submission: Insert new KYC data
        const { error } = await supabase
          .from('vendor_kyc')
          .insert({
            vendor_id: profile.id,
            ...formData,
            gst_url: gstUrl,
            pan_url: panUrl,
            version: 1,
            is_active: true,
            submission_count: 1,
            status: 'pending'
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc', profile?.id] });
      toast({
        title: existingData ? 'KYC Resubmitted' : 'KYC Submitted',
        description: existingData 
          ? 'Your KYC has been resubmitted for review. This is version ' + (existingData.version + 1) + ' of your submission.'
          : 'Your KYC verification request has been submitted for review.',
      });
      if (onClose) onClose();
      if (isInline) {
        setShowForm(false);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit KYC. Please try again.',
        variant: 'destructive',
      });
      console.error(error);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    submitKYCMutation.mutate(form);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setForm((prev) => ({ ...prev, turnover_over_5cr: checked }));
  };

  // If KYC is completed and we're in inline mode, show status
  if (existingData && existingData.status !== 'rejected' && isInline && !showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">KYC Verification Status</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowForm(true)}
          >
            Edit KYC
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              {existingData.status === 'approved' ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : existingData.status === 'pending' ? (
                <Clock className="w-8 h-8 text-blue-500" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-500" />
              )}
              <div>
                <h4 className="font-semibold">
                  {existingData.status === 'approved' ? 'Verified' : 
                   existingData.status === 'pending' ? 'Pending Approval' : 'Rejected'}
                </h4>
                <p className="text-sm text-gray-600">
                  Business Name: {existingData.business_name}
                </p>
              </div>
              <Badge variant={existingData.status === 'approved' ? 'default' : existingData.status === 'pending' ? 'secondary' : 'destructive'}>
                {existingData.status}
              </Badge>
            </div>
            
            {/* KYC Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <Label className="text-sm font-medium text-gray-600">Business Name</Label>
                <p className="font-semibold">{existingData.business_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Phone Number</Label>
                <p className="font-semibold">{existingData.phone_number}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">GST Number</Label>
                <p className="font-semibold">{existingData.gst_number}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">PAN Number</Label>
                <p className="font-semibold">{existingData.pan_number}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">TAN Number</Label>
                <p className="font-semibold">{existingData.tan_number}</p>
              </div>
                             <div>
                 <Label className="text-sm font-medium text-gray-600">Turnover &gt; ₹5 Cr</Label>
                 <p className="font-semibold">{existingData.turnover_over_5cr ? 'Yes' : 'No'}</p>
               </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-600">Head Office Address</Label>
                <p className="font-semibold">{existingData.ho_address}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-600">Warehouse Address</Label>
                <p className="font-semibold">{existingData.warehouse_address}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If KYC is rejected and form is visible (inline or modal), show rejection reason above the form
  const showRejectionReason = existingData?.status === 'rejected' && showForm;

  // If form is hidden and we're in inline mode, show button to show form
  if (!showForm && isInline) {
  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">KYC Verification Status</h3>
          <Button onClick={() => setShowForm(true)}>
            Complete KYC
          </Button>
        </div>
        
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-orange-400 mb-4" />
            <h4 className="font-semibold mb-2">KYC Not Completed</h4>
            <p className="text-gray-600 mb-4">Complete your KYC verification to start selling products</p>
            <Button onClick={() => setShowForm(true)}>Complete KYC</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Show rejection reason if applicable */}
      {showRejectionReason && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <AlertDescription>
            <span className="font-semibold">Your KYC was rejected.</span>
            <br />
            <span className="text-sm text-gray-700">Reason: {existingData.rejection_reason || "No reason provided."}</span>
            <br />
            <span className="text-sm text-gray-700">Please review and resubmit your KYC details.</span>
          </AlertDescription>
        </Alert>
      )}
      {/* Business Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
        
          <div>
            <Label htmlFor="business_name">Business Name *</Label>
            <Input 
              id="business_name"
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              placeholder="Your Business Name"
              required
            />
          </div>
          
          <div>
          <Label htmlFor="ho_address">Head Office Address *</Label>
          <Textarea 
            id="ho_address"
            name="ho_address"
            value={form.ho_address}
            onChange={handleChange}
            placeholder="Complete Head Office Address"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="warehouse_address">Warehouse Address *</Label>
            <Textarea 
            id="warehouse_address"
            name="warehouse_address"
            value={form.warehouse_address}
              onChange={handleChange}
            placeholder="Complete Warehouse Address"
              required
            />
          </div>
          
          <div>
          <Label htmlFor="phone_number">Business Phone Number *</Label>
          <Input 
            id="phone_number"
            name="phone_number"
            value={form.phone_number}
            onChange={handleChange}
            placeholder="10-digit phone number"
            pattern="[0-9]{10}"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter 10-digit phone number without country code
          </p>
          {validationErrors.phone_number && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.phone_number}</p>
          )}
        </div>
      </div>

      {/* Tax Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Tax Information</h3>
        
        <div>
          <Label htmlFor="gst_number">GST Number *</Label>
            <Input 
              id="gst_number"
              name="gst_number"
              value={form.gst_number}
              onChange={handleChange}
            placeholder="22AAAAA0000A1Z5"
            pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Format: 22AAAAA0000A1Z5 (15 characters)
          </p>
          {validationErrors.gst_number && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.gst_number}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="pan_number">PAN Number *</Label>
          <Input 
            id="pan_number"
            name="pan_number"
            value={form.pan_number}
            onChange={handleChange}
            placeholder="ABCDE1234F"
            pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
            required
            />
            <p className="text-sm text-gray-500 mt-1">
            Format: ABCDE1234F (10 characters)
            </p>
          {validationErrors.pan_number && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.pan_number}</p>
          )}
          </div>
          
          <div>
          <Label htmlFor="tan_number">TAN Number *</Label>
            <Input 
            id="tan_number"
            name="tan_number"
            value={form.tan_number}
              onChange={handleChange}
            placeholder="ABCD12345E"
            pattern="[A-Z]{4}[0-9]{5}[A-Z]{1}"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Format: ABCD12345E (10 characters)
          </p>
          {validationErrors.tan_number && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.tan_number}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="turnover_over_5cr"
            checked={form.turnover_over_5cr}
            onCheckedChange={handleSwitchChange}
          />
          <Label htmlFor="turnover_over_5cr">Annual Turnover exceeds ₹5 Crores</Label>
        </div>
      </div>

      {/* Document Uploads */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Document Uploads</h3>

        {/* GST Document Upload */}
        <div className="space-y-2">
          <Label>GST Document *</Label>
          <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
            <CardContent className="p-0">
              <div
                {...getGstRootProps()}
                className={`p-6 cursor-pointer transition-colors ${
                  isGstDragActive ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                }`}
              >
                <input {...getGstInputProps()} />
                <div className="text-center space-y-2">
                  {gstPreview ? (
                    <div className="space-y-2">
                      <FileCheck className="w-8 h-8 mx-auto text-green-500" />
                      <p className="text-sm font-medium text-green-600">
                        GST Document Uploaded
                      </p>
                      {gstDocument && (
                        <p className="text-xs text-gray-500">{gstDocument.name}</p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGstDocument(null);
                          setGstPreview(null);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Upload GST Document</p>
                        <p className="text-xs text-gray-500">
                          Drag & drop or click to browse
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          PNG, JPEG, PDF (max 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {uploadErrors.gst && (
            <div className="flex items-center gap-1 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {uploadErrors.gst}
            </div>
          )}
        </div>

        {/* PAN Document Upload */}
        <div className="space-y-2">
          <Label>PAN Document *</Label>
          <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
            <CardContent className="p-0">
              <div
                {...getPanRootProps()}
                className={`p-6 cursor-pointer transition-colors ${
                  isPanDragActive ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                }`}
              >
                <input {...getPanInputProps()} />
                <div className="text-center space-y-2">
                  {panPreview ? (
                    <div className="space-y-2">
                      <FileCheck className="w-8 h-8 mx-auto text-green-500" />
                      <p className="text-sm font-medium text-green-600">
                        PAN Document Uploaded
                      </p>
                      {panDocument && (
                        <p className="text-xs text-gray-500">{panDocument.name}</p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPanDocument(null);
                          setPanPreview(null);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Upload PAN Document</p>
                        <p className="text-xs text-gray-500">
                          Drag & drop or click to browse
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          PNG, JPEG, PDF (max 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {uploadErrors.pan && (
            <div className="flex items-center gap-1 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {uploadErrors.pan}
            </div>
          )}
        </div>
          </div>
          
      <div className="flex gap-2">
        {isInline && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
        )}
        {onClose && (
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
        )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : existingData ? 'Resubmit' : 'Submit'}
        </Button>
      </div>
    </form>
  );

  // If inline mode, return the form directly
  if (isInline) {
    return (
      <div className="space-y-4">
        {/* Show rejection reason if applicable (for inline mode and form hidden) */}
        {existingData?.status === 'rejected' && !showForm && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <AlertDescription>
              <span className="font-semibold">Your KYC was rejected.</span>
              <br />
              <span className="text-sm text-gray-700">Reason: {existingData.rejection_reason || "No reason provided."}</span>
              <br />
              <span className="text-sm text-gray-700">Please review and resubmit your KYC details.</span>
            </AlertDescription>
          </Alert>
        )}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">KYC Verification</h3>
          {existingData && existingData.status !== 'rejected' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          )}
        </div>
        {formContent}
      </div>
    );
  }

  // Modal mode (original behavior)
  return (
    <div className="w-full md:max-w-md max-h-screen overflow-y-auto">
      <div className="space-y-6 py-6">
        {/* Show rejection reason if applicable (for modal mode and form hidden) */}
        {existingData?.status === 'rejected' && !showForm && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <AlertDescription>
              <span className="font-semibold">Your KYC was rejected.</span>
              <br />
              <span className="text-sm text-gray-700">Reason: {existingData.rejection_reason || "No reason provided."}</span>
              <br />
              <span className="text-sm text-gray-700">Please review and resubmit your KYC details.</span>
            </AlertDescription>
          </Alert>
        )}
        <div>
          <h3 className="text-lg font-semibold">KYC Verification</h3>
          <p className="text-sm text-gray-600">
            Please provide your business details for verification.
          </p>
        </div>
        {formContent}
      </div>
    </div>
  );
};

export default KYCForm;
