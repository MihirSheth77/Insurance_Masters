import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { memberService } from '../services/memberService';

/**
 * Custom hook for bulk file upload with progress tracking, error handling, and result processing
 * Handles CSV uploads, validation, progress tracking, and detailed result analysis
 */
export const useBulkUpload = (groupId) => {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef(null);
  
  // Upload state
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    phase: 'idle', // idle, validating, uploading, processing, completed, error
    fileName: null,
    fileSize: 0,
    totalRows: 0,
    processedRows: 0,
    successCount: 0,
    errorCount: 0,
    warningCount: 0,
    startTime: null,
    estimatedTimeRemaining: null
  });

  // Upload results
  const [uploadResults, setUploadResults] = useState({
    summary: null,
    successfulMembers: [],
    failedMembers: [],
    warnings: [],
    errors: [],
    validationErrors: [],
    duplicates: [],
    statistics: null
  });

  // File validation state
  const [fileValidation, setFileValidation] = useState({
    isValid: false,
    errors: [],
    warnings: [],
    previewData: [],
    columnMapping: {},
    totalRows: 0,
    estimatedProcessingTime: 0
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async ({ file, options = {} }) => {
      // Create AbortController for cancellation
      abortControllerRef.current = new AbortController();
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(options));
      
      setUploadState(prev => ({
        ...prev,
        isUploading: true,
        phase: 'uploading',
        fileName: file.name,
        fileSize: file.size,
        startTime: new Date(),
        progress: 0
      }));


      return memberService.bulkUpload(groupId, formData, {
        signal: abortControllerRef.current.signal,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          const currentTime = new Date();
          const elapsedTime = currentTime - uploadState.startTime;
          const estimatedTotal = elapsedTime / (progress / 100);
          const estimatedTimeRemaining = estimatedTotal - elapsedTime;

          setUploadState(prev => ({
            ...prev,
            progress,
            estimatedTimeRemaining: estimatedTimeRemaining > 0 ? estimatedTimeRemaining : null,
            phase: progress < 100 ? 'uploading' : 'processing'
          }));

        }
      });
    },
    onSuccess: (data) => {
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        phase: 'completed',
        progress: 100,
        successCount: data.successCount || 0,
        errorCount: data.errorCount || 0,
        warningCount: data.warningCount || 0,
        totalRows: data.totalProcessed || 0,
        processedRows: data.totalProcessed || 0
      }));

      setUploadResults({
        summary: data.summary || {},
        successfulMembers: data.successfulMembers || [],
        failedMembers: data.failedMembers || [],
        warnings: data.warnings || [],
        errors: data.errors || [],
        validationErrors: data.validationErrors || [],
        duplicates: data.duplicates || [],
        statistics: calculateUploadStatistics(data)
      });

      // Invalidate member queries to refresh data
      queryClient.invalidateQueries(['members', groupId]);
      queryClient.invalidateQueries(['member-statistics', groupId]);
    },
    onError: (error) => {
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        phase: 'error',
        progress: 0
      }));

      // Parse error details
      const errorDetails = parseUploadError(error);
      setUploadResults(prev => ({
        ...prev,
        errors: [errorDetails]
      }));
    }
  });

  // File validation function
  const validateFile = useCallback(async (file) => {
    
    setFileValidation({
      isValid: false,
      errors: [],
      warnings: [],
      previewData: [],
      columnMapping: {},
      totalRows: 0,
      estimatedProcessingTime: 0
    });

    const errors = [];
    const warnings = [];

    // File type validation
    if (!file.name.toLowerCase().endsWith('.csv')) {
      errors.push({
        type: 'file_type',
        message: 'Only CSV files are supported',
        code: 'INVALID_FILE_TYPE'
      });
    }

    // File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push({
        type: 'file_size',
        message: `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds the 10MB limit`,
        code: 'FILE_TOO_LARGE'
      });
    }

    if (file.size === 0) {
      errors.push({
        type: 'file_size',
        message: 'File is empty',
        code: 'EMPTY_FILE'
      });
    }

    // If basic validation fails, return early
    if (errors.length > 0) {
      setFileValidation({
        isValid: false,
        errors,
        warnings,
        previewData: [],
        columnMapping: {},
        totalRows: 0,
        estimatedProcessingTime: 0
      });
      return { isValid: false, errors, warnings };
    }

    try {
      // Parse CSV for content validation
      const csvContent = await readFileAsText(file);
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        errors.push({
          type: 'content',
          message: 'CSV file must contain at least a header row and one data row',
          code: 'INSUFFICIENT_DATA'
        });
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const requiredColumns = ['firstName', 'lastName', 'email', 'dateOfBirth', 'zipCode'];
      const missingColumns = requiredColumns.filter(col => 
        !headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
      );

      if (missingColumns.length > 0) {
        errors.push({
          type: 'columns',
          message: `Missing required columns: ${missingColumns.join(', ')}`,
          code: 'MISSING_COLUMNS',
          details: { missingColumns, foundColumns: headers }
        });
      }

      // Generate preview data (first 5 rows)
      const previewData = lines.slice(0, 6).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      // Column mapping for user review
      const columnMapping = {};
      headers.forEach(header => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Auto-map common column variations
        if (normalizedHeader.includes('firstname') || normalizedHeader.includes('fname')) {
          columnMapping[header] = 'firstName';
        } else if (normalizedHeader.includes('lastname') || normalizedHeader.includes('lname')) {
          columnMapping[header] = 'lastName';
        } else if (normalizedHeader.includes('email')) {
          columnMapping[header] = 'email';
        } else if (normalizedHeader.includes('dob') || normalizedHeader.includes('dateofbirth')) {
          columnMapping[header] = 'dateOfBirth';
        } else if (normalizedHeader.includes('zip') || normalizedHeader.includes('zipcode')) {
          columnMapping[header] = 'zipCode';
        } else if (normalizedHeader.includes('tobacco') || normalizedHeader.includes('smoker')) {
          columnMapping[header] = 'tobaccoUser';
        } else if (normalizedHeader.includes('class')) {
          columnMapping[header] = 'className';
        } else if (normalizedHeader.includes('employer') && normalizedHeader.includes('contribution')) {
          columnMapping[header] = 'previousEmployerContribution';
        } else if (normalizedHeader.includes('member') && normalizedHeader.includes('contribution')) {
          columnMapping[header] = 'previousMemberContribution';
        } else if (normalizedHeader.includes('plan') && normalizedHeader.includes('name')) {
          columnMapping[header] = 'previousPlanName';
        }
      });

      // Estimate processing time (rough calculation)
      const totalRows = lines.length - 1; // Exclude header
      const estimatedProcessingTime = Math.max(totalRows * 0.1, 2); // Min 2 seconds

      // Warnings for large files
      if (totalRows > 1000) {
        warnings.push({
          type: 'performance',
          message: `Large file with ${totalRows} rows may take ${Math.ceil(estimatedProcessingTime / 60)} minutes to process`,
          code: 'LARGE_FILE'
        });
      }

      if (totalRows > 100 && !headers.some(h => h.toLowerCase().includes('class'))) {
        warnings.push({
          type: 'data_quality',
          message: 'No employee class column found. Members will be assigned to the default class.',
          code: 'MISSING_CLASS_COLUMN'
        });
      }

      const validationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        previewData,
        columnMapping,
        totalRows,
        estimatedProcessingTime
      };

      setFileValidation(validationResult);
      return validationResult;

    } catch (parseError) {
      const error = {
        type: 'parsing',
        message: 'Failed to parse CSV file. Please check the file format.',
        code: 'PARSE_ERROR',
        details: parseError.message
      };
      
      setFileValidation({
        isValid: false,
        errors: [error],
        warnings,
        previewData: [],
        columnMapping: {},
        totalRows: 0,
        estimatedProcessingTime: 0
      });
      
      return { isValid: false, errors: [error], warnings };
    }
  }, []);

  // Start upload
  const startUpload = useCallback((file, options = {}) => {
    if (!file) {
      return;
    }

    // Reset previous results
    setUploadResults({
      summary: null,
      successfulMembers: [],
      failedMembers: [],
      warnings: [],
      errors: [],
      validationErrors: [],
      duplicates: [],
      statistics: null
    });

    bulkUploadMutation.mutate({ file, options });
  }, [bulkUploadMutation]);

  // Cancel upload
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      phase: 'idle',
      progress: 0
    }));
  }, []);

  // Reset upload state
  const resetUpload = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      phase: 'idle',
      fileName: null,
      fileSize: 0,
      totalRows: 0,
      processedRows: 0,
      successCount: 0,
      errorCount: 0,
      warningCount: 0,
      startTime: null,
      estimatedTimeRemaining: null
    });

    setUploadResults({
      summary: null,
      successfulMembers: [],
      failedMembers: [],
      warnings: [],
      errors: [],
      validationErrors: [],
      duplicates: [],
      statistics: null
    });

    setFileValidation({
      isValid: false,
      errors: [],
      warnings: [],
      previewData: [],
      columnMapping: {},
      totalRows: 0,
      estimatedProcessingTime: 0
    });
  }, []);

  // Retry failed uploads
  const retryFailedUploads = useCallback(() => {
    if (uploadResults.failedMembers.length > 0) {
      // Convert failed members back to CSV format and retry
      const failedData = uploadResults.failedMembers.map(member => member.data);
      const csvContent = convertToCSV(failedData);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const retryFile = new File([blob], `retry_${uploadState.fileName}`, { type: 'text/csv' });
      
      startUpload(retryFile, { isRetry: true });
    }
  }, [uploadResults.failedMembers, uploadState.fileName, startUpload]);

  // Download functions
  const downloadTemplate = useCallback(() => {
    const templateData = [
      ['firstName', 'lastName', 'email', 'dateOfBirth', 'zipCode', 'tobaccoUser', 'className', 'previousEmployerContribution', 'previousMemberContribution', 'previousPlanName'],
      ['John', 'Doe', 'john.doe@example.com', '1985-06-15', '12345', 'false', 'Full-time Employees', '450', '150', 'Blue Cross Silver Plan'],
      ['Jane', 'Smith', 'jane.smith@example.com', '1990-03-22', '12346', 'false', 'Full-time Employees', '450', '150', 'Aetna Gold Plan'],
      ['Bob', 'Johnson', 'bob.johnson@example.com', '1978-11-08', '12347', 'true', 'Part-time Employees', '300', '200', 'Cigna Bronze Plan']
    ];
    
    const csvContent = convertToCSV(templateData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'member_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  }, []);

  const downloadErrorReport = useCallback(() => {
    if (uploadResults.failedMembers.length === 0) return;
    
    const errorData = [
      ['Row', 'Error', 'Data', 'Suggestion'],
      ...uploadResults.failedMembers.map((member, index) => [
        member.row || index + 1,
        member.error || 'Unknown error',
        JSON.stringify(member.data),
        member.suggestion || 'Please review and correct the data'
      ])
    ];
    
    const csvContent = convertToCSV(errorData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  }, [uploadResults.failedMembers]);

  // Progress calculations
  const progressInfo = {
    percentage: uploadState.progress,
    phase: uploadState.phase,
    isComplete: uploadState.phase === 'completed',
    hasErrors: uploadState.errorCount > 0,
    hasWarnings: uploadState.warningCount > 0,
    timeElapsed: uploadState.startTime ? new Date() - uploadState.startTime : 0,
    timeRemaining: uploadState.estimatedTimeRemaining,
    speed: calculateUploadSpeed(uploadState),
    throughput: calculateThroughput(uploadState)
  };

  return {
    // State
    uploadState,
    uploadResults,
    fileValidation,
    progressInfo,
    
    // Loading states
    isUploading: uploadState.isUploading,
    isValidating: fileValidation.isValidating,
    
    // Error states
    uploadError: bulkUploadMutation.error,
    hasValidationErrors: fileValidation.errors.length > 0,
    hasUploadErrors: uploadResults.errors.length > 0,
    
    // Actions
    validateFile,
    startUpload,
    cancelUpload,
    resetUpload,
    retryFailedUploads,
    
    // Download actions
    downloadTemplate,
    downloadErrorReport,
    
    // Utilities
    canUpload: fileValidation.isValid && !uploadState.isUploading,
    canRetry: uploadResults.failedMembers.length > 0 && !uploadState.isUploading,
    canDownloadErrors: uploadResults.failedMembers.length > 0,
    
    // Statistics
    getSuccessRate: () => {
      const total = uploadState.successCount + uploadState.errorCount;
      return total > 0 ? (uploadState.successCount / total) * 100 : 0;
    },
    
    getProcessingSpeed: () => calculateUploadSpeed(uploadState),
    
    getUploadSummary: () => ({
      total: uploadState.totalRows,
      successful: uploadState.successCount,
      failed: uploadState.errorCount,
      warnings: uploadState.warningCount,
      successRate: uploadState.totalRows > 0 ? (uploadState.successCount / uploadState.totalRows) * 100 : 0,
      duration: uploadState.startTime ? new Date() - uploadState.startTime : 0
    })
  };
};

// Utility functions
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function convertToCSV(data) {
  return data.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

function parseUploadError(error) {
  if (error.response?.data) {
    return {
      type: 'api_error',
      message: error.response.data.message || 'Upload failed',
      code: error.response.data.code || 'UPLOAD_ERROR',
      details: error.response.data.details || null,
      status: error.response.status
    };
  }
  
  if (error.code === 'ECONNABORTED') {
    return {
      type: 'timeout',
      message: 'Upload timed out. Please try again with a smaller file.',
      code: 'TIMEOUT_ERROR'
    };
  }
  
  return {
    type: 'network_error',
    message: error.message || 'Network error occurred',
    code: 'NETWORK_ERROR'
  };
}

function calculateUploadStatistics(data) {
  const total = (data.successCount || 0) + (data.errorCount || 0);
  
  return {
    totalProcessed: total,
    successCount: data.successCount || 0,
    errorCount: data.errorCount || 0,
    warningCount: data.warningCount || 0,
    successRate: total > 0 ? ((data.successCount || 0) / total) * 100 : 0,
    errorRate: total > 0 ? ((data.errorCount || 0) / total) * 100 : 0,
    duplicateCount: data.duplicates?.length || 0,
    validationErrorCount: data.validationErrors?.length || 0
  };
}

function calculateUploadSpeed(uploadState) {
  if (!uploadState.startTime || uploadState.processedRows === 0) return 0;
  
  const elapsedSeconds = (new Date() - uploadState.startTime) / 1000;
  return uploadState.processedRows / elapsedSeconds; // rows per second
}

function calculateThroughput(uploadState) {
  if (!uploadState.startTime || uploadState.fileSize === 0) return 0;
  
  const elapsedSeconds = (new Date() - uploadState.startTime) / 1000;
  const bytesPerSecond = (uploadState.fileSize * uploadState.progress / 100) / elapsedSeconds;
  return bytesPerSecond / 1024 / 1024; // MB per second
}

export default useBulkUpload; 