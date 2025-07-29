/**
 * Data Management Page
 * Upload and manage CSV data files for plans, pricing, and counties
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadIcon,
  CheckCircleIcon,
  ErrorIcon,
  InfoIcon,
  RefreshIcon,
  DatabaseIcon,
  FileIcon
} from '../../components/Icons/Icons';
import { uploadService } from '../../services/uploadService';
import Loading from '../../components/Loading/Loading';
import './DataManagement.css';

const DataManagement = () => {
  const queryClient = useQueryClient();
  const [uploadStatus, setUploadStatus] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  // Data types that can be uploaded
  const dataTypes = [
    {
      id: 'plans',
      name: 'Plans Data',
      description: 'Health insurance plan details and benefits',
      fileName: 'plans.csv',
      required: true,
      icon: <FileIcon />
    },
    {
      id: 'pricing',
      name: 'Pricing Data',
      description: 'Age-based premium pricing for all plans',
      fileName: 'pricings.csv',
      required: true,
      icon: <FileIcon />
    },
    {
      id: 'plan_counties',
      name: 'Plan Counties',
      description: 'County availability for each plan',
      fileName: 'plan_counties.csv',
      required: true,
      icon: <FileIcon />
    },
    {
      id: 'counties',
      name: 'Counties',
      description: 'County information with FIPS codes',
      fileName: 'counties.csv',
      required: true,
      icon: <FileIcon />
    },
    {
      id: 'zip_counties',
      name: 'ZIP to County Mapping',
      description: 'Maps ZIP codes to county IDs',
      fileName: 'zip_counties.csv',
      required: true,
      icon: <FileIcon />
    }
  ];

  // Fetch upload status - only refresh when needed
  const { data: statusData, isLoading: loadingStatus, refetch } = useQuery({
    queryKey: ['data-upload-status'],
    queryFn: () => uploadService.getDataStatus(),
    // Only refetch when uploading or on manual refresh
    refetchInterval: isUploading ? 3000 : false,
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    staleTime: 60000, // Consider data fresh for 60 seconds
    cacheTime: 300000 // Keep in cache for 5 minutes
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ dataType, file }) => uploadService.uploadDataFile(dataType, file),
    onMutate: () => {
      setIsUploading(true);
    },
    onSuccess: (data, variables) => {
      setUploadStatus(prev => ({
        ...prev,
        [variables.dataType]: { status: 'success', message: 'Upload successful' }
      }));
      // Refetch status after successful upload
      refetch();
      // Clear selected file
      setSelectedFiles(prev => ({
        ...prev,
        [variables.dataType]: null
      }));
    },
    onError: (error, variables) => {
      setUploadStatus(prev => ({
        ...prev,
        [variables.dataType]: { 
          status: 'error', 
          message: error.response?.data?.error || 'Upload failed' 
        }
      }));
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Handle file selection
  const handleFileSelect = (dataType, event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.csv')) {
        setUploadStatus(prev => ({
          ...prev,
          [dataType]: { status: 'error', message: 'Please select a CSV file' }
        }));
        return;
      }
      
      setSelectedFiles(prev => ({
        ...prev,
        [dataType]: file
      }));
      setUploadStatus(prev => ({
        ...prev,
        [dataType]: null
      }));
    }
  };

  // Handle file upload
  const handleUpload = (dataType) => {
    const file = selectedFiles[dataType];
    if (!file) return;

    setUploadStatus(prev => ({
      ...prev,
      [dataType]: { status: 'uploading', message: 'Uploading...' }
    }));

    uploadMutation.mutate({ dataType, file });
  };

  // Manual refresh function
  const refreshAllData = async () => {
    await refetch();
  };

  // Get status for a data type
  const getDataTypeStatus = (dataType) => {
    if (uploadStatus[dataType]) return uploadStatus[dataType];
    if (statusData?.data?.[dataType]) {
      return {
        status: statusData.data[dataType].status,
        message: statusData.data[dataType].recordCount 
          ? `${statusData.data[dataType].recordCount} records`
          : 'No data'
      };
    }
    return { status: 'pending', message: 'No data uploaded' };
  };

  return (
    <div className="data-management-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">Data Management</h1>
            <p className="page-subtitle">
              Upload and manage CSV data files for plans, pricing, and geographic information
            </p>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={refreshAllData}
            disabled={loadingStatus}
          >
            <RefreshIcon size={20} />
            Refresh Status
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions-card">
        <div className="instructions-header">
          <InfoIcon className="info-icon" />
          <h2>Upload Instructions</h2>
        </div>
        <div className="instructions-content">
          <p>
            Upload the required CSV files to enable plan search and quoting functionality. 
            All files must be in CSV format with the correct structure.
          </p>
          <ul>
            <li>Plans data should include plan details, benefits, and carrier information</li>
            <li>Pricing data should contain age-based premiums for each plan</li>
            <li>Geographic data maps plans to counties and ZIP codes</li>
          </ul>
        </div>
      </div>

      {/* Data Upload Cards */}
      <div className="data-cards-grid">
        {dataTypes.map((dataType) => {
          const status = getDataTypeStatus(dataType.id);
          const isUploading = status.status === 'uploading';
          const hasFile = selectedFiles[dataType.id];

          return (
            <div key={dataType.id} className="data-card">
              <div className="data-card-header">
                <div className="data-icon">
                  {dataType.icon}
                </div>
                <div className="data-info">
                  <h3>{dataType.name}</h3>
                  <p>{dataType.description}</p>
                </div>
                {dataType.required && (
                  <span className="required-badge">Required</span>
                )}
              </div>

              <div className="data-card-status">
                <div className={`status-indicator ${status.status}`}>
                  {status.status === 'success' && <CheckCircleIcon size={16} />}
                  {status.status === 'error' && <ErrorIcon size={16} />}
                  {status.status === 'uploading' && <div className="spinner-small" />}
                  {status.status === 'loaded' && <DatabaseIcon size={16} />}
                  <span>{status.message}</span>
                </div>
              </div>

              <div className="data-card-actions">
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id={`file-${dataType.id}`}
                    accept=".csv"
                    onChange={(e) => handleFileSelect(dataType.id, e)}
                    disabled={isUploading}
                  />
                  <label htmlFor={`file-${dataType.id}`} className="file-input-label">
                    <UploadIcon size={20} />
                    {hasFile ? selectedFiles[dataType.id].name : `Choose ${dataType.fileName}`}
                  </label>
                </div>

                {hasFile && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleUpload(dataType.id)}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                )}
              </div>

              {/* Last upload info */}
              {statusData?.data?.[dataType.id]?.lastUpload && (
                <div className="last-upload-info">
                  Last updated: {new Date(statusData.data[dataType.id].lastUpload).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      {statusData?.data && (
        <div className="summary-section">
          <h2>Data Summary</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-value">
                {statusData.data.plans?.recordCount || 0}
              </div>
              <div className="summary-label">Total Plans</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">
                {statusData.data.counties?.recordCount || 0}
              </div>
              <div className="summary-label">Counties</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">
                {statusData.data.pricing?.recordCount || 0}
              </div>
              <div className="summary-label">Pricing Records</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">
                {Object.values(statusData.data).filter(d => d.status === 'loaded').length}
              </div>
              <div className="summary-label">Data Sets Loaded</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loadingStatus && (
        <div className="loading-overlay">
          <Loading type="spinner" />
        </div>
      )}
    </div>
  );
};

export default DataManagement;