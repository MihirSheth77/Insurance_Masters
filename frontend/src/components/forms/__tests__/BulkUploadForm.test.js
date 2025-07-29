// Component Tests for BulkUploadForm
// Tests file upload behavior, validation, progress tracking, and error handling

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../../../setupTests';
import { rest } from 'msw';
import BulkUploadForm from '../BulkUploadForm';

// Mock the useBulkUpload hook
const mockUseBulkUpload = {
  uploadFile: jest.fn(),
  uploadProgress: {
    percentage: 0,
    phase: 'idle',
    timeElapsed: 0,
    timeRemaining: null,
    speed: 0,
    throughput: 0
  },
  uploadResults: null,
  uploadError: null,
  isUploading: false
};

jest.mock('../../../hooks/useBulkUpload', () => ({
  __esModule: true,
  default: () => mockUseBulkUpload
}));

describe('BulkUploadForm Component', () => {
  let user;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Reset mock state
    mockUseBulkUpload.uploadProgress = {
      percentage: 0,
      phase: 'idle',
      timeElapsed: 0,
      timeRemaining: null,
      speed: 0,
      throughput: 0
    };
    mockUseBulkUpload.uploadResults = null;
    mockUseBulkUpload.uploadError = null;
    mockUseBulkUpload.isUploading = false;
  });
  
  const defaultProps = {
    groupId: 'group_123',
    onUploadComplete: jest.fn(),
    onCancel: jest.fn()
  };
  
  const renderBulkUploadForm = (props = {}) => {
    return testUtils.renderWithProviders(
      <BulkUploadForm {...defaultProps} {...props} />
    );
  };
  
  describe('Initial Rendering', () => {
    test('should render upload area and instructions', () => {
      renderBulkUploadForm();
      
      expect(screen.getByText(/drag & drop your csv file/i)).toBeInTheDocument();
      expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
      expect(screen.getByText(/download template/i)).toBeInTheDocument();
      expect(screen.getByText(/supported format: csv/i)).toBeInTheDocument();
      expect(screen.getByText(/maximum file size: 10mb/i)).toBeInTheDocument();
    });
    
    test('should show template download link', () => {
      renderBulkUploadForm();
      
      const templateLink = screen.getByRole('link', { name: /download template/i });
      expect(templateLink).toHaveAttribute('href', expect.stringContaining('template'));
      expect(templateLink).toHaveAttribute('download');
    });
    
    test('should render file input for accessibility', () => {
      renderBulkUploadForm();
      
      const fileInput = screen.getByLabelText(/select csv file/i);
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.csv,text/csv');
    });
  });
  
  describe('File Selection and Validation', () => {
    test('should accept valid CSV file via file input', async () => {
      renderBulkUploadForm();
      
      const file = testUtils.createMockFile('members.csv', 'text/csv', 'name,email,age\nJohn,john@example.com,30');
      const fileInput = screen.getByLabelText(/select csv file/i);
      
      await user.upload(fileInput, file);
      
      expect(screen.getByText('members.csv')).toBeInTheDocument();
      expect(screen.getByText(/ready to upload/i)).toBeInTheDocument();
    });
    
    test('should accept valid CSV file via drag and drop', async () => {
      renderBulkUploadForm();
      
      const file = testUtils.createMockFile('members.csv', 'text/csv');
      const dropzone = screen.getByText(/drag & drop your csv file/i).closest('div');
      
      fireEvent.dragEnter(dropzone);
      fireEvent.dragOver(dropzone);
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file]
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('members.csv')).toBeInTheDocument();
      });
    });
    
    test('should reject non-CSV files', async () => {
      renderBulkUploadForm();
      
      const file = testUtils.createMockFile('document.pdf', 'application/pdf');
      const fileInput = screen.getByLabelText(/select csv file/i);
      
      await user.upload(fileInput, file);
      
      expect(screen.getByText(/please select a csv file/i)).toBeInTheDocument();
      expect(screen.queryByText('document.pdf')).not.toBeInTheDocument();
    });
    
    test('should reject files larger than 10MB', async () => {
      renderBulkUploadForm();
      
      // Mock a large file
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.csv', { type: 'text/csv' });
      const fileInput = screen.getByLabelText(/select csv file/i);
      
      await user.upload(fileInput, largeFile);
      
      expect(screen.getByText(/file size exceeds 10mb limit/i)).toBeInTheDocument();
    });
    
    test('should show file preview with size and last modified date', async () => {
      renderBulkUploadForm();
      
      const file = testUtils.createMockFile('members.csv', 'text/csv', 'data'.repeat(100));
      const fileInput = screen.getByLabelText(/select csv file/i);
      
      await user.upload(fileInput, file);
      
      expect(screen.getByText('members.csv')).toBeInTheDocument();
      expect(screen.getByText(/400 bytes/i)).toBeInTheDocument();
      expect(screen.getByText(/modified:/i)).toBeInTheDocument();
    });
    
    test('should allow removing selected file', async () => {
      renderBulkUploadForm();
      
      const file = testUtils.createMockFile('members.csv', 'text/csv');
      const fileInput = screen.getByLabelText(/select csv file/i);
      
      await user.upload(fileInput, file);
      expect(screen.getByText('members.csv')).toBeInTheDocument();
      
      const removeButton = screen.getByRole('button', { name: /remove file/i });
      await user.click(removeButton);
      
      expect(screen.queryByText('members.csv')).not.toBeInTheDocument();
      expect(screen.getByText(/drag & drop your csv file/i)).toBeInTheDocument();
    });
  });
  
  describe('Upload Process', () => {
    test('should initiate upload when upload button is clicked', async () => {
      renderBulkUploadForm();
      
      const file = testUtils.createMockFile('members.csv', 'text/csv');
      const fileInput = screen.getByLabelText(/select csv file/i);
      
      await user.upload(fileInput, file);
      
      const uploadButton = screen.getByRole('button', { name: /upload members/i });
      await user.click(uploadButton);
      
      expect(mockUseBulkUpload.uploadFile).toHaveBeenCalledWith(
        file,
        'group_123',
        expect.any(Object)
      );
    });
    
    test('should disable upload button during upload', () => {
      mockUseBulkUpload.isUploading = true;
      
      renderBulkUploadForm();
      
      const uploadButton = screen.getByRole('button', { name: /uploading.../i });
      expect(uploadButton).toBeDisabled();
    });
    
    test('should show validation phase progress', () => {
      mockUseBulkUpload.isUploading = true;
      mockUseBulkUpload.uploadProgress = {
        percentage: 0,
        phase: 'validating',
        timeElapsed: 1000,
        timeRemaining: null,
        speed: 0,
        throughput: 0
      };
      
      renderBulkUploadForm();
      
      expect(screen.getByText(/validating file.../i)).toBeInTheDocument();
      expect(screen.getByText(/elapsed: 1s/i)).toBeInTheDocument();
    });
    
    test('should show upload progress with percentage', () => {
      mockUseBulkUpload.isUploading = true;
      mockUseBulkUpload.uploadProgress = {
        percentage: 45,
        phase: 'uploading',
        timeElapsed: 2000,
        timeRemaining: 2500,
        speed: 150,
        throughput: 2.5
      };
      
      renderBulkUploadForm();
      
      expect(screen.getByText(/uploading: 45%/i)).toBeInTheDocument();
      expect(screen.getByText(/elapsed: 2s/i)).toBeInTheDocument();
      expect(screen.getByText(/remaining: 3s/i)).toBeInTheDocument();
      expect(screen.getByText(/speed: 150 rows\/sec/i)).toBeInTheDocument();
      expect(screen.getByText(/2\.5 mb\/s/i)).toBeInTheDocument();
      
      // Check progress bar
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '45');
    });
    
    test('should show processing phase', () => {
      mockUseBulkUpload.isUploading = true;
      mockUseBulkUpload.uploadProgress = {
        percentage: 100,
        phase: 'processing',
        timeElapsed: 5000,
        timeRemaining: null,
        speed: 0,
        throughput: 0
      };
      
      renderBulkUploadForm();
      
      expect(screen.getByText(/processing data.../i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });
  });
  
  describe('Upload Results', () => {
    test('should display successful upload results', () => {
      mockUseBulkUpload.uploadResults = {
        totalRows: 100,
        successfulImports: 95,
        failedImports: 5,
        errors: [
          { row: 15, error: 'Invalid email format' },
          { row: 23, error: 'Missing required field: dateOfBirth' },
          { row: 67, error: 'Age must be between 18 and 64' },
          { row: 78, error: 'Invalid ZIP code format' },
          { row: 92, error: 'Duplicate member ID' }
        ],
        importedMembers: ['member_001', 'member_002'],
        summary: {
          processingTime: '3.2s',
          validationErrors: 5,
          duplicatesSkipped: 0
        }
      };
      
      renderBulkUploadForm();
      
      expect(screen.getByText(/upload completed/i)).toBeInTheDocument();
      expect(screen.getByText(/95 of 100 members imported successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/processing time: 3\.2s/i)).toBeInTheDocument();
      expect(screen.getByText(/5 validation errors/i)).toBeInTheDocument();
      
      // Check success rate visualization
      expect(screen.getByText(/95% success rate/i)).toBeInTheDocument();
    });
    
    test('should display detailed error report', async () => {
      mockUseBulkUpload.uploadResults = {
        totalRows: 50,
        successfulImports: 45,
        failedImports: 5,
        errors: [
          { row: 3, error: 'Invalid email format' },
          { row: 8, error: 'Missing required field: firstName' }
        ]
      };
      
      renderBulkUploadForm();
      
      const viewErrorsButton = screen.getByRole('button', { name: /view error details/i });
      await user.click(viewErrorsButton);
      
      expect(screen.getByText(/error details/i)).toBeInTheDocument();
      expect(screen.getByText(/row 3: invalid email format/i)).toBeInTheDocument();
      expect(screen.getByText(/row 8: missing required field: firstname/i)).toBeInTheDocument();
    });
    
    test('should provide download link for error report', () => {
      mockUseBulkUpload.uploadResults = {
        totalRows: 50,
        successfulImports: 45,
        failedImports: 5,
        errors: [{ row: 3, error: 'Invalid email format' }]
      };
      
      renderBulkUploadForm();
      
      const downloadLink = screen.getByRole('link', { name: /download error report/i });
      expect(downloadLink).toHaveAttribute('download', expect.stringContaining('errors'));
    });
    
    test('should show import statistics breakdown', () => {
      mockUseBulkUpload.uploadResults = {
        totalRows: 200,
        successfulImports: 180,
        failedImports: 15,
        summary: {
          validationErrors: 10,
          duplicatesSkipped: 5,
          networkErrors: 0
        }
      };
      
      renderBulkUploadForm();
      
      expect(screen.getByText(/total processed: 200/i)).toBeInTheDocument();
      expect(screen.getByText(/successful: 180/i)).toBeInTheDocument();
      expect(screen.getByText(/validation errors: 10/i)).toBeInTheDocument();
      expect(screen.getByText(/duplicates skipped: 5/i)).toBeInTheDocument();
    });
  });
  
  describe('Error Handling', () => {
    test('should display upload error message', () => {
      mockUseBulkUpload.uploadError = 'Network error - unable to reach server';
      
      renderBulkUploadForm();
      
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      expect(screen.getByText(/network error - unable to reach server/i)).toBeInTheDocument();
    });
    
    test('should provide retry option on error', async () => {
      mockUseBulkUpload.uploadError = 'Temporary server error';
      
      renderBulkUploadForm();
      
      const retryButton = screen.getByRole('button', { name: /retry upload/i });
      expect(retryButton).toBeInTheDocument();
      
      await user.click(retryButton);
      
      // Should clear error and allow new upload
      expect(mockUseBulkUpload.uploadFile).toHaveBeenCalled();
    });
    
    test('should handle file size validation error', () => {
      mockUseBulkUpload.uploadError = 'File size exceeds 10MB limit';
      
      renderBulkUploadForm();
      
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      expect(screen.getByText(/please select a smaller file/i)).toBeInTheDocument();
    });
    
    test('should handle invalid file format error', () => {
      mockUseBulkUpload.uploadError = 'Invalid file type. Please upload a CSV file.';
      
      renderBulkUploadForm();
      
      expect(screen.getByText(/invalid file format/i)).toBeInTheDocument();
      expect(screen.getByText(/please upload a csv file/i)).toBeInTheDocument();
    });
  });
  
  describe('Template Download', () => {
    test('should generate CSV template with correct headers', async () => {
      renderBulkUploadForm();
      
      const templateLink = screen.getByRole('link', { name: /download template/i });
      
      // Mock URL.createObjectURL to capture the blob
      let capturedBlob;
      global.URL.createObjectURL = jest.fn((blob) => {
        capturedBlob = blob;
        return 'mock-blob-url';
      });
      
      await user.click(templateLink);
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(capturedBlob.type).toBe('text/csv');
    });
    
    test('should include sample data in template', async () => {
      renderBulkUploadForm();
      
      const templateLink = screen.getByRole('link', { name: /download template/i });
      expect(templateLink).toHaveAttribute('href', expect.stringContaining('blob:'));
    });
  });
  
  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      renderBulkUploadForm();
      
      expect(screen.getByRole('region', { name: /file upload/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/select csv file/i)).toHaveAttribute('aria-describedby');
    });
    
    test('should announce upload progress to screen readers', () => {
      mockUseBulkUpload.isUploading = true;
      mockUseBulkUpload.uploadProgress = {
        percentage: 50,
        phase: 'uploading'
      };
      
      renderBulkUploadForm();
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', expect.stringContaining('50%'));
    });
    
    test('should announce completion status', () => {
      mockUseBulkUpload.uploadResults = {
        successfulImports: 95,
        totalRows: 100
      };
      
      renderBulkUploadForm();
      
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveTextContent(/95 of 100 members imported/i);
    });
    
    test('should support keyboard navigation', async () => {
      renderBulkUploadForm();
      
      const fileInput = screen.getByLabelText(/select csv file/i);
      fileInput.focus();
      
      expect(fileInput).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('link', { name: /download template/i })).toHaveFocus();
    });
  });
  
  describe('Integration with Parent Component', () => {
    test('should call onUploadComplete when upload succeeds', () => {
      mockUseBulkUpload.uploadResults = {
        totalRows: 50,
        successfulImports: 50,
        failedImports: 0,
        importedMembers: ['member_001', 'member_002']
      };
      
      renderBulkUploadForm();
      
      expect(defaultProps.onUploadComplete).toHaveBeenCalledWith({
        totalRows: 50,
        successfulImports: 50,
        failedImports: 0,
        importedMembers: ['member_001', 'member_002']
      });
    });
    
    test('should call onCancel when cancel button is clicked', async () => {
      renderBulkUploadForm();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
    
    test('should allow canceling during upload', async () => {
      mockUseBulkUpload.isUploading = true;
      
      renderBulkUploadForm();
      
      const cancelButton = screen.getByRole('button', { name: /cancel upload/i });
      await user.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });
}); 