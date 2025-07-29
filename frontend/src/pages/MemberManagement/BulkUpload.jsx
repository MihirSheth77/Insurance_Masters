import React, { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

// Components
import Button from '../../components/common/Button';
import ProgressBar from '../../components/common/ProgressBar';
import ErrorMessage from '../../components/common/ErrorMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Services
import { memberService } from '../../services/memberService';

// Styles
import './BulkUpload.css';

const BulkUpload = ({ groupId, classes, onClose, onComplete }) => {
  const fileInputRef = useRef(null);
  
  // State management
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: (formData) => memberService.bulkUpload(groupId, formData, {
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      }
    }),
    onSuccess: (data) => {
      setUploadResults(data);
      setUploadProgress(100);
      if (data.summary?.successful > 0) {
        onComplete();
      }
    },
    onError: (error) => {
      setValidationErrors([{ error: error.message || 'Upload failed' }]);
      setUploadProgress(0);
    }
  });

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  // Validate and set selected file
  const handleFileSelection = (file) => {
    setValidationErrors([]);
    setUploadResults(null);
    setUploadProgress(0);

    // File type validation
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setValidationErrors([{ error: 'Please select a CSV file' }]);
      return;
    }

    // File size validation (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setValidationErrors([{ error: 'File size must be less than 10MB' }]);
      return;
    }

    setSelectedFile(file);
  };

  // Handle upload
  const handleUpload = () => {
    if (!selectedFile) {
      setValidationErrors([{ error: 'Please select a file first' }]);
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', selectedFile);
    
    // Add default class if available
    const defaultClass = classes.find(cls => cls.type === 'full-time') || classes[0];
    if (defaultClass) {
      const classId = defaultClass.classId || defaultClass.id || defaultClass._id;
      console.log('Using default class:', { defaultClass, classId });
      formData.append('defaultClassId', classId);
    }

    setUploadProgress(0);
    setValidationErrors([]);
    bulkUploadMutation.mutate(formData);
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headers = [
      'firstName',
      'lastName', 
      'dateOfBirth',
      'zipCode',
      'tobacco',
      'householdIncome',
      'familySize',
      'employerContribution',
      'memberContribution',
      'planName',
      'planType',
      'metalLevel',
      'carrier',
      'dependents'
    ];

    const sampleRow = [
      'John',
      'Doe',
      '1985-06-15',
      '97204',
      'false',
      '60000',
      '2',
      '500.00',
      '150.00',
      'Previous Health Plan',
      'PPO',
      'Gold',
      'Blue Cross',
      '[]'
    ];

    const csvContent = [
      headers.join(','),
      sampleRow.join(','),
      // Add a few more example rows
      [
        'Jane',
        'Smith',
        '1990-03-22',
        '97210',
        'false',
        '75000',
        '3',
        '600.00',
        '175.00',
        'Employee Health Plan',
        'HMO',
        'Silver',
        'Aetna',
        '[{"firstName":"Child","lastName":"Smith","dateOfBirth":"2015-08-10","relationship":"child"}]'
      ].join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'member_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Reset upload
  const resetUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadResults(null);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bulk-upload">
      {/* Instructions */}
      <div className="upload-instructions">
        <h3>Bulk Member Upload</h3>
        <p>Upload a CSV file to add multiple members at once. Make sure your file follows the required format.</p>
        
        <div className="template-section">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            disabled={bulkUploadMutation.isPending}
          >
            📥 Download CSV Template
          </Button>
          <span className="template-note">Use this template to ensure proper formatting</span>
        </div>
      </div>

      {/* Required Fields Info */}
      <div className="required-fields">
        <h4>Required Fields:</h4>
        <div className="fields-grid">
          <div className="field-item">
            <strong>First Name:</strong> Employee's first name
          </div>
          <div className="field-item">
            <strong>Last Name:</strong> Employee's last name
          </div>
          <div className="field-item">
            <strong>Date of Birth:</strong> Format: YYYY-MM-DD
          </div>
          <div className="field-item">
            <strong>ZIP Code:</strong> Must be a valid 5-digit US ZIP code
          </div>
          <div className="field-item">
            <strong>Tobacco Use:</strong> Enter true or false
          </div>
          <div className="field-item">
            <strong>Household Income:</strong> Annual gross household income (e.g., 60000)
          </div>
          <div className="field-item">
            <strong>Family Size:</strong> Number of people in household (1-8)
          </div>
          <div className="field-item">
            <strong>Employer Contribution:</strong> Previous employer contribution amount
          </div>
          <div className="field-item">
            <strong>Member Contribution:</strong> Previous member contribution amount
          </div>
          <div className="field-item">
            <strong>Plan Name:</strong> Previous health plan name
          </div>
        </div>
        <div className="optional-fields">
          <p><strong>Optional Fields:</strong> Plan type, metal level, insurance carrier, class ID, dependents information</p>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'file-selected' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={bulkUploadMutation.isPending}
        />
        
        {selectedFile ? (
          <div className="file-selected-info">
            <div className="file-icon">📄</div>
            <div className="file-details">
              <div className="file-name">{selectedFile.name}</div>
              <div className="file-size">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <Button
              variant="outline"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                resetUpload();
              }}
              disabled={bulkUploadMutation.isPending}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              <h4>Drop your CSV file here or click to browse</h4>
              <p>Supports CSV files up to 10MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="validation-errors">
          {validationErrors.map((error, index) => (
            <ErrorMessage key={index} message={error.error} />
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {(bulkUploadMutation.isPending || uploadProgress > 0) && (
        <div className="upload-progress">
          <div className="progress-header">
            <h4>Uploading Members...</h4>
            <span>{uploadProgress}%</span>
          </div>
          <ProgressBar
            percentage={uploadProgress}
            showLabel={false}
            animated={bulkUploadMutation.isPending}
          />
          {bulkUploadMutation.isPending && (
            <div className="progress-details">
              <LoadingSpinner size="small" />
              <span>Processing CSV file and creating members...</span>
            </div>
          )}
        </div>
      )}

      {/* Upload Results */}
      {uploadResults && (
        <div className="upload-results">
          <div className="results-header">
            <h4>Upload Complete</h4>
          </div>

          {/* Summary Statistics */}
          <div className="results-summary">
            <div className="summary-cards">
              <div className="summary-card success">
                <div className="card-value">{uploadResults.summary?.successful || 0}</div>
                <div className="card-label">Successfully Added</div>
              </div>
              <div className="summary-card error">
                <div className="card-value">{uploadResults.summary?.failed || 0}</div>
                <div className="card-label">Failed</div>
              </div>
              <div className="summary-card total">
                <div className="card-value">{uploadResults.summary?.totalProcessed || 0}</div>
                <div className="card-label">Total Processed</div>
              </div>
            </div>
          </div>

          {/* Successful Members */}
          {uploadResults.successfulMembers?.length > 0 && (
            <div className="successful-members">
              <h5>✅ Successfully Added Members:</h5>
              <div className="members-list">
                {uploadResults.successfulMembers.slice(0, 10).map((member, index) => (
                  <div key={index} className="member-item success">
                    <span className="row-number">Row {member.row}</span>
                    <span className="member-id">{member.memberId}</span>
                  </div>
                ))}
                {uploadResults.successfulMembers.length > 10 && (
                  <div className="more-members">
                    +{uploadResults.successfulMembers.length - 10} more members added successfully
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Report */}
          {uploadResults.errors?.length > 0 && (
            <div className="error-report">
              <h5>❌ Errors Report:</h5>
              <div className="errors-list">
                {uploadResults.errors.map((error, index) => (
                  <div key={index} className="error-item">
                    <div className="error-header">
                      <span className="row-number">Row {error.row}</span>
                      <span className="error-type">
                        {error.error.includes('validation') ? 'Validation Error' : 'Processing Error'}
                      </span>
                    </div>
                    <div className="error-message">{error.error}</div>
                    {error.data && (
                      <div className="error-data">
                        <strong>Data:</strong> {JSON.stringify(error.data, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {uploadResults.summary?.validationErrors > 0 && (
                <div className="error-summary">
                  <p>
                    <strong>Tip:</strong> Fix the validation errors above and re-upload the corrected rows.
                    Common issues include invalid ZIP codes (must be valid 5-digit US ZIP codes), invalid dates, or missing required fields.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="upload-actions">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={bulkUploadMutation.isPending}
        >
          {uploadResults ? 'Close' : 'Cancel'}
        </Button>
        
        {selectedFile && !uploadResults && (
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={bulkUploadMutation.isPending}
            loading={bulkUploadMutation.isPending}
          >
            Upload Members
          </Button>
        )}
        
        {uploadResults && (
          <Button
            variant="outline"
            onClick={resetUpload}
          >
            Upload Another File
          </Button>
        )}
      </div>
    </div>
  );
};

export default BulkUpload; 