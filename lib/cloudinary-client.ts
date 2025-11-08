/**
 * Client-side Cloudinary upload utility
 * Uploads files through the server-side API endpoint for security
 */

/**
 * Upload file to Cloudinary via server-side API
 * This approach is more secure as it doesn't expose API keys or require upload presets
 */
export async function uploadToCloudinary(
  file: File,
  folder?: string
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }

    const response = await fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `Upload failed with status ${response.status}` 
      }));
      // ApiResponseHandler returns { success: false, message: "...", error: "..." }
      const errorMessage = errorData.message || errorData.error || `Failed to upload file: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (!result.data?.url) {
      throw new Error('Upload succeeded but no URL was returned');
    }
    
    return result.data.url;
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to upload file: ${error?.message || 'Unknown error'}`);
  }
}

