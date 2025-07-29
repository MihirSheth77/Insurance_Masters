import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGroup } from '../../context/GroupContext';
import { useQuote } from '../../context/QuoteContext';

// Custom hooks
// import useRealTimeFiltering from '../../hooks/useRealTimeFiltering';

// Components
import QuoteSummary from './QuoteSummary';
import EmployerComparison from './EmployerComparison';
import EmployeeComparisons from './EmployeeComparisons';
import PlanFilters from './PlanFilters';
import PlanResults from './PlanResults';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

// Services
import { quoteService } from '../../services/quoteService';
// import { planService } from '../../services/planService';
import { classService } from '../../services/classService';
import { memberService } from '../../services/memberService';

// Styles
import './QuoteResultsPage.css';

const QuoteResultsPage = ({ workflowData, onComplete, onChange, isWorkflowMode }) => {
  const { state: groupState, actions: groupActions } = useGroup();
  const { state: quoteState, actions: quoteActions } = useQuote();
  // Check for group from sessionStorage (from GroupDetail page)
  const sessionGroupId = sessionStorage.getItem('selectedGroupId');
  const sessionGroupName = sessionStorage.getItem('selectedGroupName');
  
  const currentGroup = useMemo(() => {
    return workflowData?.group || groupState.currentGroup || 
      (sessionGroupId && sessionGroupName ? { id: sessionGroupId, name: sessionGroupName } : null);
  }, [workflowData?.group, groupState.currentGroup, sessionGroupId, sessionGroupName]);
  const currentQuote = workflowData?.quote || quoteState.currentQuote;
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedPlans, setSelectedPlans] = useState([]);
  // const [comparisonMode, setComparisonMode] = useState('employer');
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid, table, comparison
  const [hasTriggeredAutoGenerate, setHasTriggeredAutoGenerate] = useState(false);

  // Sorting and pagination
  const [sortConfig, setSortConfig] = useState({
    field: 'totalCost',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Real-time filtering state - now server-side with new API
  const [filters, setFilters] = useState({
    metalLevels: [],
    planTypes: [],
    carriers: [],
    market: 'all',
    premiumRange: { min: 0, max: 10000 },
    deductibleRange: { min: 0, max: 15000 },
    networkSize: null,
    hsaEligible: null,
    prescription: null,
    showICHRACompliant: false
  });
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // Get the correct group ID
  const groupId = currentGroup?.id || currentGroup?.groupId || currentGroup?._id;

  // Function to trigger quote generation
  const triggerQuoteGeneration = useCallback(() => {
    if (groupId) {
      console.log('🚀 Triggering quote generation for group:', groupId);
      console.log('📊 Group details:', currentGroup);
      // We'll call the mutation directly in the effect
      quoteService.generateQuote(groupId, { filters })
        .then((data) => {
          console.log('✅ Quote generation successful:', data);
          const newQuote = { id: data.quoteId, groupId: data.groupId };
          quoteActions.setCurrentQuote(newQuote);
          console.log('💾 Quote saved to context:', newQuote);
          if (onChange) onChange();
          if (isWorkflowMode && onComplete) {
            onComplete(newQuote);
          }
        })
        .catch((error) => {
          console.error('❌ Error generating quote:', error);
          alert(`Error generating quote: ${error.message}`);
        });
    }
  }, [groupId, filters, quoteActions, onChange, isWorkflowMode, onComplete, currentGroup]);

  // Auto-generate quote if we have group but no quote (from GroupDetail navigation)
  useEffect(() => {
    if (currentGroup && !currentQuote && sessionGroupId && !hasTriggeredAutoGenerate) {
      console.log('Auto-generating quote for group from GroupDetail:', currentGroup);
      setHasTriggeredAutoGenerate(true);
      // Clean up session storage
      sessionStorage.removeItem('selectedGroupId');
      sessionStorage.removeItem('selectedGroupName');
      // Auto-generate quote
      triggerQuoteGeneration();
    } else if (!currentGroup) {
      console.warn('No current group available');
    } else {
      console.log('Current group data:', currentGroup);
      console.log('Group ID being used:', groupId);
    }
  }, [currentGroup, currentQuote, sessionGroupId, groupId, hasTriggeredAutoGenerate, triggerQuoteGeneration]);

  // Clear invalid group data if groupId is invalid
  useEffect(() => {
    if (groupId && (groupId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(groupId))) {
      console.warn('Invalid group ID detected, clearing data:', groupId);
      localStorage.removeItem('workflowData');
      groupActions.clearCurrentGroup();
    }
  }, [groupId, groupActions]);

  // Query for comprehensive quote summary using new API
  const {
    data: quoteData,
    isLoading: isLoadingQuote,
    error: quoteError,
    refetch: refetchQuote
  } = useQuery({
    queryKey: ['quote-summary', currentQuote?.id, filters],
    queryFn: () => quoteService.getQuoteSummary(currentQuote?.id, {
      carrier: filters.carriers?.length > 0 ? filters.carriers : undefined,
      metalLevel: filters.metalLevels?.length > 0 ? filters.metalLevels : undefined,
      market: filters.market || 'all',
      includeEmployeeDetails: true
    }),
    enabled: !!currentQuote?.id,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Query for group classes data
  const {
    data: classData,
    isLoading: isLoadingClasses
  } = useQuery({
    queryKey: ['classes', groupId],
    queryFn: () => classService.getClasses(groupId),
    enabled: !!groupId,
    refetchOnWindowFocus: false
  });

  // Query for group members data
  const {
    data: memberData,
    isLoading: isLoadingMembers
  } = useQuery({
    queryKey: ['members', groupId],
    queryFn: () => memberService.getMembers(groupId, {
      includeInactive: false,
      page: 1,
      limit: 100 // Backend maximum limit is 100
    }),
    enabled: !!groupId,
    refetchOnWindowFocus: false
  });

  // Handle real-time filter changes
  const handleFilterChange = async (newFilters) => {
    setIsApplyingFilters(true);
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    try {
      // Apply filters via new API endpoint
      await quoteService.updateQuoteFilters(currentQuote?.id, { ...filters, ...newFilters });
      // Trigger refetch of comprehensive data
      refetchQuote();
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setIsApplyingFilters(false);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    const clearedFilters = {
      metalLevels: [],
      planTypes: [],
      carriers: [],
      market: 'all',
      premiumRange: { min: 0, max: 10000 },
      deductibleRange: { min: 0, max: 15000 },
      networkSize: null,
      hsaEligible: null,
      prescription: null,
      showICHRACompliant: false
    };
    setFilters(clearedFilters);
    handleFilterChange(clearedFilters);
  };

  // Query for plan comparison data
  // const {
  //   data: comparisonData,
  //   isLoading: isLoadingComparison
  // } = useQuery({
  //   queryKey: ['plan-comparison', selectedPlans],
  //   queryFn: () => planService.comparePlans(selectedPlans),
  //   enabled: selectedPlans.length > 1,
  //   refetchOnWindowFocus: false
  // });

  // Generate new quote mutation
  const generateQuoteMutation = useMutation({
    mutationFn: () => quoteService.generateQuote(groupId, { filters }),
    onSuccess: (data) => {
      console.log('Quote generation successful:', data);
      const newQuote = { id: data.quoteId, groupId: data.groupId };
      quoteActions.setCurrentQuote(newQuote);
      queryClient.invalidateQueries(['quote-summary']);
      refetchQuote();
      if (onChange) onChange();
      if (isWorkflowMode && onComplete) {
        onComplete(newQuote);
      }
    },
    onError: (error) => {
      console.error('Error generating quote:', error);
    }
  });

  // Export quote mutation
  const exportQuoteMutation = useMutation({
    mutationFn: (exportOptions) => quoteService.exportQuote(currentQuote?.id, exportOptions),
    onSuccess: (data) => {
      // Handle file download
      const blob = new Blob([data.fileContent], { type: data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    },
    onError: (error) => {
      console.error('Error exporting quote:', error);
    }
  });

  // Handle sort changes
  const handleSortChange = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  // Handle plan selection
  const handlePlanSelection = (planId, isSelected) => {
    if (isSelected) {
      setSelectedPlans(prev => [...prev, planId]);
    } else {
      setSelectedPlans(prev => prev.filter(id => id !== planId));
    }
  };

  // Handle bulk plan selection
  const handleBulkPlanSelection = (planIds, selectAll) => {
    if (selectAll) {
      setSelectedPlans(prev => [...new Set([...prev, ...planIds])]);
    } else {
      setSelectedPlans(prev => prev.filter(id => !planIds.includes(id)));
    }
  };

  // Handle generate new quote
  const handleGenerateQuote = () => {
    generateQuoteMutation.mutate();
  };

  // Handle export quote
  const handleExportQuote = (exportOptions) => {
    exportQuoteMutation.mutate(exportOptions);
  };

  // Process comprehensive quote data from new API
  const summaryStats = {
    estimatedSavings: quoteData?.employeeSummary?.savings?.totalAnnualSavings || 0,
    totalMembers: quoteData?.employerComparison?.totalEmployees || 0,
    complianceRate: quoteData?.overallAnalysis?.complianceRate || 0,
    availablePlans: quoteData?.planAnalysis?.totalPlans || 0,
    totalAvailablePlans: quoteData?.planAnalysis?.totalPlans || 0,
    averageSavingsPerMember: quoteData?.employeeSummary?.savings?.averageSavingsPerEmployee || 0,
    employeesWithSavings: quoteData?.overallAnalysis?.employeesWithSavings || 0,
    employeesWithIncreases: quoteData?.overallAnalysis?.employeesWithIncreases || 0,
    // Additional data from comprehensive summary
    employerMonthlySavings: quoteData?.employerComparison?.savings?.monthlySavings || 0,
    employerAnnualSavings: quoteData?.employerComparison?.savings?.annualSavings || 0,
    subsidyEligibleCount: quoteData?.subsidyAnalysis?.subsidyEligibleCount || 0
  };

  // Filter stats for display
  const filterStats = {
    isFiltered: filters.metalLevels?.length > 0 || filters.carriers?.length > 0 || filters.market !== 'all',
    activeFilterCount: (filters.metalLevels?.length || 0) + (filters.carriers?.length || 0) + (filters.market !== 'all' ? 1 : 0),
    totalPlans: quoteData?.planAnalysis?.totalPlans || 0,
    filteredCount: quoteData?.planAnalysis?.filteredPlans || 0,
    filterPercentage: ((quoteData?.planAnalysis?.filteredPlans || 0) / Math.max(quoteData?.planAnalysis?.totalPlans || 1, 1)) * 100
  };

  if (!currentGroup) {
    return (
      <div className="quote-results-page">
        <div className="no-group-message">
          <h2>Select Group for Quote Generation</h2>
          <p>Choose a group to generate quotes with ICHRA affordability calculations.</p>
          <div className="selection-actions">
            <Button 
              variant="primary"
              onClick={() => window.location.href = '/groups'}
            >
              📋 Select Existing Group
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/workflow/group-setup'}
            >
              ➕ Create New Group
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if groupId is valid MongoDB ObjectId
  if (!groupId || groupId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(groupId)) {
    return (
      <div className="quote-results-page">
        <div className="no-group-message">
          <h2>Invalid Group Selected</h2>
          <p>The selected group has an invalid ID: {groupId}</p>
          <p>Please go back and select a valid group.</p>
          <Button 
            variant="primary"
            onClick={() => {
              localStorage.removeItem('workflowData');
              window.location.href = '/members';
            }}
          >
            Select Different Group
          </Button>
        </div>
      </div>
    );
  }

  // In workflow mode, show generate quote button if no quote exists
  if (isWorkflowMode && !currentQuote) {
    return (
      <div className="quote-results-page">
        <div className="generate-quote-container">
          <div className="generate-quote-icon">📊</div>
          <h2>Ready to Generate Quotes</h2>
          <p>
            You have {workflowData?.members?.length || 0} members in {workflowData?.classes?.length || 0} classes.
            Click below to generate quotes with ICHRA affordability calculations.
          </p>
          <Button
            variant="primary"
            size="large"
            onClick={() => {
              console.log('Generating quote for group:', groupId);
              generateQuoteMutation.mutate();
            }}
            loading={generateQuoteMutation.isPending}
            disabled={generateQuoteMutation.isPending}
          >
            {generateQuoteMutation.isPending ? 'Generating...' : 'Generate Quotes'}
          </Button>
        </div>
      </div>
    );
  }

  // Show error state if quote summary fails
  if (quoteError && currentQuote) {
    return (
      <div className="quote-results-page">
        <div className="page-header">
          <div className="header-content">
            <h1>Quote Generated Successfully</h1>
            <p className="header-subtitle">
              {currentGroup?.name || 'Unknown Group'} • Quote ID: {currentQuote.id}
            </p>
          </div>
        </div>
        
        <div className="quote-success-message" style={{
          padding: '40px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '40px auto',
          backgroundColor: '#f0f9ff',
          borderRadius: '8px',
          border: '2px solid #0ea5e9'
        }}>
          <div className="success-icon" style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2>Quote has been generated!</h2>
          <p>Quote ID: <strong>{currentQuote.id}</strong></p>
          <p>Group: <strong>{currentGroup?.name}</strong></p>
          <p style={{ color: '#64748b', marginTop: '20px' }}>
            Note: There was an issue loading the detailed quote results. 
            This is a known issue with test data. In production, you would see full plan comparisons here.
          </p>
          
          <div className="actions" style={{ marginTop: '30px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button 
              variant="primary"
              onClick={() => {
                console.log('Quote generated successfully:', currentQuote);
                alert(`Quote ${currentQuote.id} generated successfully!`);
              }}
            >
              View Quote Details (Demo)
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/groups'}
            >
              Back to Groups
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-results-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Quote Results</h1>
          <p className="header-subtitle">
            {currentGroup?.name || 'Unknown Group'} • {summaryStats.totalMembers} employees
          </p>
          
          {/* Real-time filter status */}
          {filterStats.isFiltered && (
            <div className="filter-status">
              <span className="filter-indicator">
                🔍 {filterStats.activeFilterCount} active filters • 
                Showing {filterStats.filteredCount} of {filterStats.totalPlans} plans
                {isApplyingFilters && <span className="applying">⚡ Updating...</span>}
              </span>
            </div>
          )}
        </div>
        
        <div className="header-actions">
          <Button
            variant="outline"
            onClick={handleGenerateQuote}
            loading={generateQuoteMutation.isLoading}
            disabled={isLoadingQuote}
          >
            🔄 Regenerate Quote
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowExportModal(true)}
            disabled={!quoteData || !quoteData.employeeDetails?.length}
          >
            📊 Export Results
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="quote-navigation">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            📊 Summary
          </button>
          <button
            className={`tab-button ${activeTab === 'employer' ? 'active' : ''}`}
            onClick={() => setActiveTab('employer')}
          >
            🏢 Employer View
          </button>
          <button
            className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            👥 Employee View
          </button>
          <button
            className={`tab-button ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            📋 Plan Details
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="quote-content">
        {/* Sidebar with Real-Time Filters */}
        <div className="quote-sidebar">
          <PlanFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearAllFilters}
            availableCarriers={quoteData?.availableFilters?.carriers || []}
            isLoading={isLoadingQuote || isApplyingFilters}
            filterStats={filterStats}
          />
        </div>

        {/* Main Content Area */}
        <div className="quote-main">
          {isLoadingQuote ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <h3>Loading Quote Results</h3>
              <p>Analyzing plans and calculating ICHRA affordability for your group...</p>
            </div>
          ) : quoteError ? (
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <h3>Failed to Load Quote Results</h3>
              <p>{quoteError.message || 'An unexpected error occurred while loading your quote results.'}</p>
              <Button
                variant="primary"
                onClick={refetchQuote}
                style={{ marginTop: '1rem' }}
              >
                🔄 Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Tab Content */}
              {activeTab === 'summary' && (
                <QuoteSummary
                  summary={summaryStats}
                  quoteData={quoteData}
                  groupData={currentGroup}
                  isLoading={isLoadingQuote || isApplyingFilters}
                />
              )}

              {activeTab === 'employer' && (
                <EmployerComparison
                  quoteData={quoteData}
                  groupData={currentGroup}
                  classData={classData?.classes || []}
                  memberData={memberData?.members || []}
                  isLoading={isLoadingQuote || isLoadingClasses || isLoadingMembers || isApplyingFilters}
                />
              )}

              {activeTab === 'employees' && (
                <EmployeeComparisons
                  quoteData={quoteData}
                  groupData={currentGroup}
                  classData={classData?.classes || []}
                  memberData={memberData?.members || []}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  isLoading={isLoadingQuote || isLoadingClasses || isLoadingMembers || isApplyingFilters}
                />
              )}

              {activeTab === 'plans' && (
                <PlanResults
                  plans={quoteData?.planAnalysis?.plans || []}
                  originalPlans={quoteData?.planAnalysis?.allPlans || []}
                  selectedPlans={selectedPlans}
                  onPlanSelection={handlePlanSelection}
                  onBulkSelection={handleBulkPlanSelection}
                  sortConfig={sortConfig}
                  onSortChange={handleSortChange}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  isLoading={isApplyingFilters}
                  filterStats={filterStats}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <Modal
          title="Export Quote Results"
          onClose={() => setShowExportModal(false)}
          size="medium"
        >
          <div className="export-options">
            <h3>Export Options</h3>
            <div className="export-formats">
              <label>
                <input type="radio" name="format" value="pdf" defaultChecked />
                PDF Report
              </label>
              <label>
                <input type="radio" name="format" value="excel" />
                Excel Spreadsheet
              </label>
              <label>
                <input type="radio" name="format" value="csv" />
                CSV Data
              </label>
            </div>
            
            <h3>Include Content</h3>
            <div className="export-content">
              <label>
                <input type="checkbox" defaultChecked />
                Summary Statistics
              </label>
              <label>
                <input type="checkbox" defaultChecked />
                Employer Comparison
              </label>
              <label>
                <input type="checkbox" defaultChecked />
                Employee Analysis
              </label>
              <label>
                <input type="checkbox" defaultChecked />
                Plan Details
              </label>
              <label>
                <input type="checkbox" />
                Applied Filters
              </label>
            </div>
            
            <div className="export-actions">
              <Button
                variant="outline"
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExportQuote}
                loading={exportQuoteMutation.isLoading}
              >
                Export
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default QuoteResultsPage; 