import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { quoteService } from '../services/quoteService';

/**
 * Custom hook for comprehensive quote management
 * Handles quote generation, real-time recalculation, filter state, and export functionality
 */
export const useQuotes = (groupId = null, memberData = [], classData = []) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Core state
  const [currentQuote, setCurrentQuote] = useState(null);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [quoteHistory, setQuoteHistory] = useState([]);
  
  // Filter state - initialized from URL
  const initializeFiltersFromURL = useCallback(() => {
    const metalLevels = searchParams.get('metalLevels');
    const carriers = searchParams.get('carriers');
    const planTypes = searchParams.get('planTypes');
    const market = searchParams.get('market');
    const premiumMin = searchParams.get('premiumMin');
    const premiumMax = searchParams.get('premiumMax');
    const deductibleMin = searchParams.get('deductibleMin');
    const deductibleMax = searchParams.get('deductibleMax');
    const networkSize = searchParams.get('networkSize');
    const hsaEligible = searchParams.get('hsaEligible');
    const prescription = searchParams.get('prescription');
    const showICHRACompliant = searchParams.get('showICHRACompliant');
    
    return {
      metalLevels: metalLevels ? metalLevels.split(',') : [],
      carriers: carriers ? carriers.split(',') : [],
      planTypes: planTypes ? planTypes.split(',') : [],
      market: market || 'all',
      premiumRange: {
        min: premiumMin ? parseInt(premiumMin) : 0,
        max: premiumMax ? parseInt(premiumMax) : 10000
      },
      deductibleRange: {
        min: deductibleMin ? parseInt(deductibleMin) : 0,
        max: deductibleMax ? parseInt(deductibleMax) : 15000
      },
      networkSize: networkSize || 'any',
      hsaEligible: hsaEligible ? hsaEligible === 'true' : null,
      prescription: prescription ? prescription === 'true' : null,
      showICHRACompliant: showICHRACompliant !== 'false'
    };
  }, [searchParams]);

  const [filters, setFilters] = useState(initializeFiltersFromURL);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Export state
  const [exportStatus, setExportStatus] = useState({
    isExporting: false,
    progress: 0,
    format: null,
    error: null
  });

  // Query for current quote data
  const {
    data: quoteData,
    isLoading: isLoadingQuote,
    error: quoteError,
    refetch: refetchQuote
  } = useQuery({
    queryKey: ['quote-results', currentQuote?.id],
    queryFn: () => quoteService.getQuoteResults(currentQuote?.id, {
      includeDetails: true
    }),
    enabled: !!currentQuote?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log('Quote data loaded successfully:', data);
    }
  });

  // Query for quote history
  const {
    data: historyData,
    isLoading: isLoadingHistory
  } = useQuery({
    queryKey: ['quote-history', groupId],
    queryFn: () => quoteService.getQuoteHistory(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: (data) => {
      setQuoteHistory(data.quotes || []);
    }
  });

  // Real-time cost recalculation based on filters
  const recalculatedCosts = useMemo(() => {
    if (!quoteData?.plans || !memberData.length || !classData.length) {
      return {
        totalEmployerCost: 0,
        totalEmployeeCost: 0,
        totalSavings: 0,
        avgSavingsPerEmployee: 0,
        employeesWithSavings: 0,
        employeesWithIncreases: 0,
        bestPlanOptions: [],
        worstPlanOptions: [],
        carrierStats: {},
        metalLevelStats: {},
        complianceRate: 0,
        employeeCostAnalysis: []
      };
    }

    const startTime = performance.now();

    // Filter plans based on current filters
    const filteredPlans = quoteData.plans.filter(plan => {
      // Apply all filter logic here (same as useRealTimeFiltering)
      if (filters.metalLevels.length > 0 && !filters.metalLevels.includes(plan.metalLevel)) return false;
      if (filters.carriers.length > 0 && !filters.carriers.includes(plan.carrierId || plan.issuer?.id)) return false;
      if (filters.planTypes.length > 0 && !filters.planTypes.includes(plan.planType)) return false;
      if (filters.market === 'on-market' && !plan.isOnMarket) return false;
      if (filters.market === 'off-market' && plan.isOnMarket) return false;
      
      const monthlyPremium = plan.monthlyPremium || 0;
      if (monthlyPremium < filters.premiumRange.min || monthlyPremium > filters.premiumRange.max) return false;
      
      const annualDeductible = plan.annualDeductible || 0;
      if (annualDeductible < filters.deductibleRange.min || annualDeductible > filters.deductibleRange.max) return false;
      
      if (filters.networkSize !== 'any' && plan.networkSize?.toLowerCase() !== filters.networkSize) return false;
      if (filters.hsaEligible !== null && plan.hsaEligible !== filters.hsaEligible) return false;
      if (filters.prescription !== null && plan.prescriptionCoverage !== filters.prescription) return false;
      if (filters.showICHRACompliant && !plan.ichraCompliant) return false;
      
      return true;
    });

    // Calculate costs for each employee
    let totalEmployerCost = 0;
    let totalEmployeeCost = 0;
    let totalOldCost = 0;
    const employeeCostAnalysis = [];

    memberData.forEach(member => {
      const memberClass = classData.find(cls => cls.id === member.classId) || {};
      
      // Get ICHRA contribution
      let ichraContribution = memberClass.employeeContribution || 0;
      if (memberClass.ageBasedContributions?.length > 0) {
        const memberAge = member.age || 30;
        const ageRange = memberClass.ageBasedContributions.find(range => 
          memberAge >= range.minAge && memberAge <= range.maxAge
        );
        if (ageRange) {
          ichraContribution = ageRange.employeeContribution || 0;
        }
      }

      // Previous costs
      const oldEmployerContribution = member.previousContributions?.employerContribution || 0;
      const oldEmployeeContribution = member.previousContributions?.memberContribution || 0;
      const oldTotalCost = oldEmployerContribution + oldEmployeeContribution;

      // Find best plan for this employee from filtered plans
      const availablePlans = filteredPlans.filter(plan => true); // Simplified area filtering
      
      if (availablePlans.length > 0) {
        const bestPlan = availablePlans.reduce((best, current) => {
          const bestOutOfPocket = Math.max(0, (best.monthlyPremium || 0) - ichraContribution);
          const currentOutOfPocket = Math.max(0, (current.monthlyPremium || 0) - ichraContribution);
          return currentOutOfPocket < bestOutOfPocket ? current : best;
        });

        const newEmployeeCost = Math.max(0, (bestPlan.monthlyPremium || 0) - ichraContribution);
        const newTotalCost = ichraContribution + newEmployeeCost;
        const savings = oldTotalCost - newTotalCost;

        totalEmployerCost += ichraContribution;
        totalEmployeeCost += newEmployeeCost;
        totalOldCost += oldTotalCost;

        employeeCostAnalysis.push({
          memberId: member.id,
          memberName: member.name || `${member.firstName} ${member.lastName}`,
          oldCost: oldTotalCost,
          newCost: newTotalCost,
          savings,
          bestPlan,
          ichraContribution,
          employeeOutOfPocket: newEmployeeCost,
          complianceStatus: newEmployeeCost <= (oldEmployeeContribution * 1.095) // 9.5% affordability rule
        });
      }
    });

    const totalSavings = totalOldCost - (totalEmployerCost + totalEmployeeCost);
    const avgSavingsPerEmployee = memberData.length > 0 ? totalSavings / memberData.length : 0;
    const employeesWithSavings = employeeCostAnalysis.filter(emp => emp.savings > 0).length;
    const employeesWithIncreases = employeeCostAnalysis.filter(emp => emp.savings < 0).length;
    const complianceRate = employeeCostAnalysis.length > 0 ? 
      employeeCostAnalysis.filter(emp => emp.complianceStatus).length / employeeCostAnalysis.length : 0;

    // Calculate statistics
    const carrierStats = {};
    const metalLevelStats = {};

    filteredPlans.forEach(plan => {
      const carrierId = plan.carrierId || plan.issuer?.id || 'unknown';
      const carrierName = plan.issuer?.name || plan.carrierName || 'Unknown Carrier';
      
      if (!carrierStats[carrierId]) {
        carrierStats[carrierId] = {
          name: carrierName,
          planCount: 0,
          avgPremium: 0,
          totalPremium: 0
        };
      }
      
      carrierStats[carrierId].planCount++;
      carrierStats[carrierId].totalPremium += plan.monthlyPremium || 0;
      carrierStats[carrierId].avgPremium = carrierStats[carrierId].totalPremium / carrierStats[carrierId].planCount;

      const metalLevel = plan.metalLevel || 'Unknown';
      if (!metalLevelStats[metalLevel]) {
        metalLevelStats[metalLevel] = { planCount: 0, avgPremium: 0, totalPremium: 0 };
      }
      
      metalLevelStats[metalLevel].planCount++;
      metalLevelStats[metalLevel].totalPremium += plan.monthlyPremium || 0;
      metalLevelStats[metalLevel].avgPremium = metalLevelStats[metalLevel].totalPremium / metalLevelStats[metalLevel].planCount;
    });

    const endTime = performance.now();

    return {
      totalEmployerCost,
      totalEmployeeCost,
      totalSavings,
      avgSavingsPerEmployee,
      employeesWithSavings,
      employeesWithIncreases,
      complianceRate,
      carrierStats,
      metalLevelStats,
      employeeCostAnalysis,
      filteredPlanCount: filteredPlans.length,
      totalPlanCount: quoteData.plans.length
    };
  }, [quoteData, memberData, classData, filters]);

  // Update URL when filters change
  useEffect(() => {
    const updateURL = () => {
      const newParams = new URLSearchParams();
      
      if (filters.metalLevels.length > 0) newParams.set('metalLevels', filters.metalLevels.join(','));
      if (filters.carriers.length > 0) newParams.set('carriers', filters.carriers.join(','));
      if (filters.planTypes.length > 0) newParams.set('planTypes', filters.planTypes.join(','));
      if (filters.market !== 'all') newParams.set('market', filters.market);
      if (filters.premiumRange.min !== 0) newParams.set('premiumMin', filters.premiumRange.min.toString());
      if (filters.premiumRange.max !== 10000) newParams.set('premiumMax', filters.premiumRange.max.toString());
      if (filters.deductibleRange.min !== 0) newParams.set('deductibleMin', filters.deductibleRange.min.toString());
      if (filters.deductibleRange.max !== 15000) newParams.set('deductibleMax', filters.deductibleRange.max.toString());
      if (filters.networkSize !== 'any') newParams.set('networkSize', filters.networkSize);
      if (filters.hsaEligible !== null) newParams.set('hsaEligible', filters.hsaEligible.toString());
      if (filters.prescription !== null) newParams.set('prescription', filters.prescription.toString());
      if (!filters.showICHRACompliant) newParams.set('showICHRACompliant', 'false');
      
      setSearchParams(newParams, { replace: true });
    };

    const timeoutId = setTimeout(updateURL, 300);
    return () => clearTimeout(timeoutId);
  }, [filters, setSearchParams]);

  // Quote generation mutation
  const generateQuoteMutation = useMutation({
    mutationFn: async (options = {}) => {
      setIsGeneratingQuote(true);
      
      return quoteService.generateQuote(groupId, {
        ...options,
        filters: filters,
        includeAllPlans: true
      });
    },
    onSuccess: (data) => {
      console.log('Quote generated successfully:', data);
      const newQuote = {
        id: data.quoteId,
        groupId: data.groupId,
        createdAt: new Date().toISOString(),
        version: 1
      };
      setCurrentQuote(newQuote);
      setIsGeneratingQuote(false);
      
      // Invalidate and refetch related queries
      queryClient.invalidateQueries(['quote-results']);
      queryClient.invalidateQueries(['quote-history', groupId]);
      
      // Add to history
      setQuoteHistory(prev => [newQuote, ...prev.slice(0, 9)]); // Keep last 10
    },
    onError: (error) => {
      console.error('Error generating quote:', error);
      setIsGeneratingQuote(false);
    }
  });

  // Export quote mutation
  const exportQuoteMutation = useMutation({
    mutationFn: async (exportOptions) => {
      setExportStatus(prev => ({ ...prev, isExporting: true, progress: 0, error: null, format: exportOptions.format }));
      
      return quoteService.exportQuote(groupId, currentQuote?.id, {
        ...exportOptions,
        filters,
        includeFilteredData: true,
        memberData,
        classData,
        costAnalysis: recalculatedCosts
      });
    },
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
      
      setExportStatus({
        isExporting: false,
        progress: 100,
        format: null,
        error: null
      });
    },
    onError: (error) => {
      setExportStatus(prev => ({
        ...prev,
        isExporting: false,
        error: error.message
      }));
    }
  });

  // Quote update mutation (for filter changes that need server sync)
  const updateQuoteMutation = useMutation({
    mutationFn: (updateData) => quoteService.updateQuote(currentQuote?.id, updateData),
    onSuccess: (data) => {
      setCurrentQuote(data.quote);
    }
  });

  // Filter management
  const updateFilters = useCallback((newFilters) => {
    setIsRecalculating(true);
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    setTimeout(() => setIsRecalculating(false), 200); // Visual feedback
  }, []);

  const clearFilters = useCallback(() => {
    setIsRecalculating(true);
    setFilters({
      metalLevels: [],
      carriers: [],
      planTypes: [],
      market: 'all',
      premiumRange: { min: 0, max: 10000 },
      deductibleRange: { min: 0, max: 15000 },
      networkSize: 'any',
      hsaEligible: null,
      prescription: null,
      showICHRACompliant: true
    });
    
    setTimeout(() => setIsRecalculating(false), 200);
  }, []);

  // Quote management
  const loadQuote = useCallback((quoteId) => {
    const quote = quoteHistory.find(q => q.id === quoteId);
    if (quote) {
      setCurrentQuote(quote);
    }
  }, [quoteHistory]);

  const deleteQuote = useMutation({
    mutationFn: (quoteId) => quoteService.deleteQuote(quoteId),
    onSuccess: (_, quoteId) => {
      setQuoteHistory(prev => prev.filter(q => q.id !== quoteId));
      if (currentQuote?.id === quoteId) {
        setCurrentQuote(null);
      }
      queryClient.invalidateQueries(['quote-history', groupId]);
    }
  });

  // Enhanced quote data with recalculated costs
  const enhancedQuoteData = useMemo(() => {
    if (!quoteData) return null;

    return {
      ...quoteData,
      summary: {
        ...quoteData.summary,
        ...recalculatedCosts
      },
      recalculatedCosts,
      filters,
      metadata: {
        generatedAt: currentQuote?.createdAt,
        lastModified: new Date().toISOString(),
        version: currentQuote?.version || 1,
        memberCount: memberData.length,
        classCount: classData.length
      }
    };
  }, [quoteData, recalculatedCosts, filters, currentQuote, memberData, classData]);

  // Filter statistics
  const filterStats = useMemo(() => {
    const activeFilterCount = 
      filters.metalLevels.length +
      filters.carriers.length +
      filters.planTypes.length +
      (filters.market !== 'all' ? 1 : 0) +
      (filters.premiumRange.min !== 0 || filters.premiumRange.max !== 10000 ? 1 : 0) +
      (filters.deductibleRange.min !== 0 || filters.deductibleRange.max !== 15000 ? 1 : 0) +
      (filters.networkSize !== 'any' ? 1 : 0) +
      (filters.hsaEligible !== null ? 1 : 0) +
      (filters.prescription !== null ? 1 : 0) +
      (!filters.showICHRACompliant ? 1 : 0);

    return {
      activeFilterCount,
      isFiltered: activeFilterCount > 0,
      filteredPlanCount: recalculatedCosts.filteredPlanCount || 0,
      totalPlanCount: recalculatedCosts.totalPlanCount || 0,
      filterPercentage: recalculatedCosts.totalPlanCount > 0 ? 
        (recalculatedCosts.filteredPlanCount / recalculatedCosts.totalPlanCount) * 100 : 0
    };
  }, [filters, recalculatedCosts]);

  return {
    // Current state
    currentQuote,
    quoteData: enhancedQuoteData,
    quoteHistory,
    filters,
    recalculatedCosts,
    filterStats,
    exportStatus,
    
    // Loading states
    isLoadingQuote,
    isLoadingHistory,
    isGeneratingQuote,
    isRecalculating,
    isUpdatingQuote: updateQuoteMutation.isLoading,
    isExporting: exportStatus.isExporting,
    isDeletingQuote: deleteQuote.isLoading,
    
    // Error states
    quoteError,
    generationError: generateQuoteMutation.error,
    exportError: exportStatus.error,
    updateError: updateQuoteMutation.error,
    deleteError: deleteQuote.error,
    
    // Actions
    generateQuote: generateQuoteMutation.mutate,
    exportQuote: exportQuoteMutation.mutate,
    updateQuote: updateQuoteMutation.mutate,
    deleteQuote: deleteQuote.mutate,
    loadQuote,
    
    // Filter management
    updateFilters,
    clearFilters,
    
    // Quote management
    setCurrentQuote,
    refetchQuote,
    refetchHistory: () => queryClient.invalidateQueries(['quote-history', groupId]),
    
    // Utilities
    hasQuote: !!currentQuote,
    canExport: !!currentQuote && !exportStatus.isExporting,
    getQuoteById: (quoteId) => quoteHistory.find(q => q.id === quoteId),
    getLatestQuote: () => quoteHistory[0] || null,
    
    // Enhanced data access
    getFilteredPlans: () => enhancedQuoteData?.plans?.filter(plan => {
      // Apply current filters
      if (filters.metalLevels.length > 0 && !filters.metalLevels.includes(plan.metalLevel)) return false;
      if (filters.carriers.length > 0 && !filters.carriers.includes(plan.carrierId || plan.issuer?.id)) return false;
      // ... other filter logic
      return true;
    }) || [],
    
    getEmployeeCostAnalysis: () => recalculatedCosts.employeeCostAnalysis || [],
    getCarrierStats: () => recalculatedCosts.carrierStats || {},
    getMetalLevelStats: () => recalculatedCosts.metalLevelStats || {}
  };
};

export default useQuotes; 