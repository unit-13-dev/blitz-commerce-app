"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  X, Upload, Download, FileSpreadsheet, AlertCircle, 
  CheckCircle, Package, Info
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api-client";

interface ImportProductsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductRow {
  "Product Name": string;
  "Description": string;
  "Price": number;
  "Stock": number;
  "Category": string;
  "Image URL": string;
}

interface ImportError {
  row: number;
  field: string;
  value: any;
  reason: string;
}

const ImportProductsModal = ({ onClose, onSuccess }: ImportProductsModalProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<{
    successful: number;
    failed: ImportError[];
    total: number;
  } | null>(null);

  // Generate demo Excel file
  const generateDemoFile = () => {
    const demoData = [
      {
        "Product Name": "Wireless Bluetooth Headphones",
        "Description": "High-quality wireless headphones with noise cancellation and 20-hour battery life",
        "Price": 2999.99,
        "Stock": 50,
        "Category": "Electronics",
        "Image URL": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"
      },
      {
        "Product Name": "Organic Cotton T-Shirt",
        "Description": "Comfortable 100% organic cotton t-shirt available in multiple colors",
        "Price": 899.00,
        "Stock": 100,
        "Category": "Clothing",
        "Image URL": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"
      },
      {
        "Product Name": "Stainless Steel Water Bottle",
        "Description": "Eco-friendly insulated water bottle that keeps drinks cold for 24 hours",
        "Price": 1499.50,
        "Stock": 75,
        "Category": "Home & Kitchen",
        "Image URL": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500"
      },
      {
        "Product Name": "Yoga Meditation Mat",
        "Description": "Premium non-slip yoga mat perfect for meditation and exercise",
        "Price": 1299.00,
        "Stock": 30,
        "Category": "Sports & Fitness",
        "Image URL": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(demoData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 25 }, // Product Name
      { width: 50 }, // Description
      { width: 10 }, // Price
      { width: 8 },  // Stock
      { width: 15 }, // Category
      { width: 40 }  // Image URL
    ];

    XLSX.writeFile(workbook, "product-import-template.xlsx");
    
    toast({ title: "Demo file downloaded!", description: "Check your downloads folder" });
  };

  // Validate product row
  const validateProductRow = (row: any, index: number): ImportError[] => {
    const errors: ImportError[] = [];

    // Required fields validation
    if (!row["Product Name"] || typeof row["Product Name"] !== 'string' || row["Product Name"].trim().length < 3) {
      errors.push({
        row: index + 2, // +2 because Excel is 1-indexed and we have headers
        field: "Product Name",
        value: row["Product Name"],
        reason: "Product name is required and must be at least 3 characters"
      });
    }

    if (!row["Description"] || typeof row["Description"] !== 'string' || row["Description"].trim().length < 10) {
      errors.push({
        row: index + 2,
        field: "Description",
        value: row["Description"],
        reason: "Description is required and must be at least 10 characters"
      });
    }

    // Price validation
    const price = parseFloat(row["Price"]);
    if (isNaN(price) || price <= 0 || price > 1000000) {
      errors.push({
        row: index + 2,
        field: "Price",
        value: row["Price"],
        reason: "Price must be a number between 0.01 and 1,000,000"
      });
    }

    // Stock validation
    const stock = parseInt(row["Stock"]);
    if (isNaN(stock) || stock < 0 || stock > 10000) {
      errors.push({
        row: index + 2,
        field: "Stock",
        value: row["Stock"],
        reason: "Stock must be a number between 0 and 10,000"
      });
    }

    // Category validation
    if (!row["Category"] || typeof row["Category"] !== 'string' || row["Category"].trim().length === 0) {
      errors.push({
        row: index + 2,
        field: "Category",
        value: row["Category"],
        reason: "Category is required"
      });
    }

    // Image URL validation (optional but if provided, should be valid)
    if (row["Image URL"] && typeof row["Image URL"] === 'string' && row["Image URL"].trim() !== '') {
      try {
        new URL(row["Image URL"]);
      } catch {
        errors.push({
          row: index + 2,
          field: "Image URL",
          value: row["Image URL"],
          reason: "Image URL must be a valid URL or left empty"
        });
      }
    }

    return errors;
  };

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get('/products/categories');
      return data?.categories || [];
    },
  });

  const findCategoryId = (categoryName: string): string | null => {
    const match = categories.find(
      (category: any) => category.name.toLowerCase() === categoryName.toLowerCase()
    );
    return match?.id ?? null;
  };

  const processImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to import.",
        variant: "destructive"
      });
      return;
    }

    if (!profile) {
      toast({
        title: "Authentication required",
        description: "Please log in to import products.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setImportResults(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: ProductRow[] = XLSX.utils.sheet_to_json(worksheet);

      // Check row limit
      if (jsonData.length > 500) {
        toast({
          title: "Too many products",
          description: `Maximum 500 products allowed. Found ${jsonData.length} products.`,
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      const results = {
        successful: 0,
        failed: [] as ImportError[],
        total: jsonData.length,
      };

      for (let index = 0; index < jsonData.length; index++) {
        const row = jsonData[index];
        const errors = validateProductRow(row, index);

        if (errors.length > 0) {
          results.failed.push(...errors);
          continue;
        }

        const categoryId = findCategoryId(row["Category"]);

        if (!categoryId) {
          results.failed.push({
            row: index + 2,
            field: 'Category',
            value: row['Category'],
            reason: 'Category not recognised. Please create the category first.',
          });
          continue;
        }

        try {
          await apiClient.post('/products', {
            name: row["Product Name"].trim(),
            description: row["Description"].trim(),
            price: parseFloat(String(row["Price"])),
            stockQuantity: parseInt(String(row["Stock"]), 10),
            isActive: true,
            categories: [categoryId],
            images: row["Image URL"]
              ? [
                  {
                    url: row["Image URL"],
                    isPrimary: true,
                  },
                ]
              : [],
          });

          results.successful += 1;
        } catch (error: any) {
          console.error("Import error for row", index + 2, error);
          results.failed.push({
            row: index + 2,
            field: "Product Name", // Assuming the error is related to product creation
            value: row["Product Name"],
            reason: error.message || "Failed to import product",
          });
        }
      }

      setImportResults(results);
      if (results.successful > 0) {
        onSuccess(); // Refresh the products list
      }

    } catch (error: any) {
      toast({
        title: "Error processing file",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      setImportResults(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive"
        });
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        toast({
          title: "Invalid file type",
          description: "Please upload an Excel file (.xlsx or .xls)",
          variant: "destructive"
        });
      }
    }
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="bg-white shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-400 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6" />
                  <CardTitle className="text-xl font-bold">Import Products</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Instructions */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Upload an Excel file (.xlsx) with your products. Maximum 500 products per import.
                  Download the template below to see the required format.
                </AlertDescription>
              </Alert>

              {/* Demo File Download */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Download Template</p>
                    <p className="text-sm text-gray-600">
                      Excel template with sample data and required columns
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={generateDemoFile}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
              </div>

              {/* File Upload Area */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
                  isDragActive
                    ? 'border-pink-400 bg-pink-50'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-pink-300 hover:bg-pink-50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-pink-600" />
                  </div>
                  
                  {file ? (
                    <div>
                      <p className="text-lg font-medium text-green-700">
                        {file.name}
                      </p>
                      <p className="text-sm text-green-600">
                        File ready for import ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        {isDragActive ? 'Drop your Excel file here' : 'Drag & drop your Excel file here'}
                      </p>
                      <p className="text-sm text-gray-500">
                        or click to browse files (.xlsx, .xls - max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Import Results */}
              {importResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{importResults.total}</div>
                      <div className="text-sm text-gray-600">Total Rows</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{importResults.successful}</div>
                      <div className="text-sm text-gray-600">Imported</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{importResults.failed.length}</div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </Card>
                  </div>

                  {importResults.failed.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Failed Rows:
                      </h4>
                      <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-200 rounded p-4">
                        {importResults.failed.map((error, index) => (
                          <div key={index} className="text-sm text-red-700 mb-1">
                            <strong>Row {error.row}:</strong> {error.field} - {error.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResults.successful > 0 && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        Successfully imported {importResults.successful} products!
                      </AlertDescription>
                    </Alert>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Close
                </Button>
                {file && !importResults && (
                  <Button
                    onClick={processImport}
                    disabled={isProcessing}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import Products
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ImportProductsModal; 