import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planService } from '../services/planService';

/**
 * Custom hook for plan management and search
 * Handles plan search with filters, benchmark calculations, and plan details
 */
export const usePlans = (countyId = null, initialFilters = {}) => {
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState({
    metalLevels: [],
    planTypes: [],
    carriers: [],
    market: 'all',
    premiumRange: { min: 0, max: 10000 },
    deductibleRange: { min: 0, max: 15000 },
    networkSize: 'any',
    hsaEligible: null,
    prescription: null,
    showICHRACompliant: true,
    ...initialFilters
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({
    field: 'monthlyPremium',
    direction: 'asc'
  });
  const [selectedPlanIds, setSelectedPlanIds] = useState(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Query for all plans in county
  const {
    data: allPlansData,
    isLoading: isLoadingPlans,
    error: plansError,
    refetch: refetchPlans
  } = useQuery({
    queryKey: ['plans', countyId],
    queryFn: () => planService.getPlansForCounty(countyId, {
      includeAll: true,
      limit: 10000 // Get all plans for client-side filtering
    }),
    enabled: !!countyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
    }
  });

  const allPlans = allPlansData?.plans || [];

  // Client-side filtering and sorting
  const filteredAndSortedPlans = useMemo(() => {
    if (!allPlans.length) return [];

    const startTime = performance.now();

    // Apply search term filter
    let filtered = allPlans;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(plan => 
        plan.name?.toLowerCase().includes(searchLower) ||
        plan.issuer?.name?.toLowerCase().includes(searchLower) ||
        plan.planType?.toLowerCase().includes(searchLower) ||
        plan.metalLevel?.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    filtered = filtered.filter(plan => {
      // Metal Level filter
      if (filters.metalLevels.length > 0 && !filters.metalLevels.includes(plan.metalLevel)) {
        return false;
      }

      // Plan Type filter
      if (filters.planTypes.length > 0 && !filters.planTypes.includes(plan.planType)) {
        return false;
      }

      // Carrier filter
      if (filters.carriers.length > 0 && !filters.carriers.includes(plan.carrierId || plan.issuer?.id)) {
        return false;
      }

      // Market filter
      if (filters.market === 'on-market' && !plan.isOnMarket) {
        return false;
      }
      if (filters.market === 'off-market' && plan.isOnMarket) {
        return false;
      }

      // Premium range filter
      const monthlyPremium = plan.monthlyPremium || 0;
      if (monthlyPremium < filters.premiumRange.min || monthlyPremium > filters.premiumRange.max) {
        return false;
      }

      // Deductible range filter
      const annualDeductible = plan.annualDeductible || 0;
      if (annualDeductible < filters.deductibleRange.min || annualDeductible > filters.deductibleRange.max) {
        return false;
      }

      // Network size filter
      if (filters.networkSize !== 'any') {
        const networkSize = plan.networkSize?.toLowerCase();
        if (networkSize !== filters.networkSize) {
          return false;
        }
      }

      // HSA eligibility filter
      if (filters.hsaEligible !== null && plan.hsaEligible !== filters.hsaEligible) {
        return false;
      }

      // Prescription coverage filter
      if (filters.prescription !== null && plan.prescriptionCoverage !== filters.prescription) {
        return false;
      }

      // ICHRA compliance filter
      if (filters.showICHRACompliant && !plan.ichraCompliant) {
        return false;
      }

      return true;
    });

    // Apply sorting
    if (sortConfig.field) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.field];
        const bValue = b[sortConfig.field];
        
        if (typeof aValue === 'string') {
          const comparison = aValue.localeCompare(bValue || '');
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
        
        const comparison = (aValue || 0) - (bValue || 0);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    const endTime = performance.now();

    return filtered;
  }, [allPlans, filters, searchTerm, sortConfig]);

  // Paginated results
  const paginatedPlans = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedPlans.slice(startIndex, endIndex);
  }, [filteredAndSortedPlans, currentPage, pageSize]);

  // Pagination info
  const paginationInfo = useMemo(() => ({
    currentPage,
    pageSize,
    totalItems: filteredAndSortedPlans.length,
    totalPages: Math.ceil(filteredAndSortedPlans.length / pageSize),
    startIndex: (currentPage - 1) * pageSize + 1,
    endIndex: Math.min(currentPage * pageSize, filteredAndSortedPlans.length),
    hasNextPage: currentPage < Math.ceil(filteredAndSortedPlans.length / pageSize),
    hasPreviousPage: currentPage > 1
  }), [filteredAndSortedPlans.length, currentPage, pageSize]);

  // Query for benchmark plans (Silver plans for subsidy calculations)
  const {
    data: benchmarkPlans,
    isLoading: isLoadingBenchmark,
    error: benchmarkError
  } = useQuery({
    queryKey: ['benchmark-plans', countyId],
    queryFn: () => planService.getBenchmarkSilverPlans(countyId),
    enabled: !!countyId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false
  });

  // Calculate second lowest cost silver plan (for subsidy calculations)
  const secondLowestCostSilverPlan = useMemo(() => {
    if (!benchmarkPlans?.plans) return null;
    
    const silverPlans = benchmarkPlans.plans
      .filter(plan => plan.metalLevel === 'silver')
      .sort((a, b) => (a.monthlyPremium || 0) - (b.monthlyPremium || 0));
    
    return silverPlans[1] || silverPlans[0] || null;
  }, [benchmarkPlans]);

  // Plan details query function
  const fetchPlanDetails = (planId) => {
    return queryClient.fetchQuery({
      queryKey: ['plan-details', planId],
      queryFn: () => planService.getPlanDetails(planId),
      staleTime: 20 * 60 * 1000 // 20 minutes
    });
  };

  // Plan comparison mutation
  const comparePlansMutation = useMutation({
    mutationFn: (planIds) => planService.comparePlans(planIds),
    onSuccess: (data) => {
    },
    onError: (error) => {
    }
  });

  // Filter management
  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      metalLevels: [],
      planTypes: [],
      carriers: [],
      market: 'all',
      premiumRange: { min: 0, max: 10000 },
      deductibleRange: { min: 0, max: 15000 },
      networkSize: 'any',
      hsaEligible: null,
      prescription: null,
      showICHRACompliant: true
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Search management
  const updateSearchTerm = (term) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when search changes
  };

  // Sort management
  const updateSort = (field, direction = null) => {
    setSortConfig(prev => ({
      field,
      direction: direction || (prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc')
    }));
  };

  // Plan selection management
  const selectPlan = (planId) => {
    setSelectedPlanIds(prev => new Set(prev).add(planId));
  };

  const deselectPlan = (planId) => {
    setSelectedPlanIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(planId);
      return newSet;
    });
  };

  const togglePlanSelection = (planId) => {
    if (selectedPlanIds.has(planId)) {
      deselectPlan(planId);
    } else {
      selectPlan(planId);
    }
  };

  const selectAllPlans = (planIds) => {
    setSelectedPlanIds(new Set([...selectedPlanIds, ...planIds]));
  };

  const deselectAllPlans = () => {
    setSelectedPlanIds(new Set());
  };

  const getSelectedPlans = () => {
    return allPlans.filter(plan => selectedPlanIds.has(plan.id));
  };

  // Pagination management
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, paginationInfo.totalPages)));
  };

  const goToNextPage = () => {
    if (paginationInfo.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (paginationInfo.hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const changePageSize = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Filter statistics
  const filterStats = useMemo(() => {
    const totalPlans = allPlans.length;
    const filteredCount = filteredAndSortedPlans.length;
    const filterPercentage = totalPlans > 0 ? (filteredCount / totalPlans) * 100 : 0;
    
    const activeFilterCount = 
      filters.metalLevels.length +
      filters.planTypes.length +
      filters.carriers.length +
      (filters.market !== 'all' ? 1 : 0) +
      (filters.premiumRange.min !== 0 || filters.premiumRange.max !== 10000 ? 1 : 0) +
      (filters.deductibleRange.min !== 0 || filters.deductibleRange.max !== 15000 ? 1 : 0) +
      (filters.networkSize !== 'any' ? 1 : 0) +
      (filters.hsaEligible !== null ? 1 : 0) +
      (filters.prescription !== null ? 1 : 0) +
      (!filters.showICHRACompliant ? 1 : 0) +
      (searchTerm ? 1 : 0);

    return {
      totalPlans,
      filteredCount,
      filterPercentage,
      activeFilterCount,
      isFiltered: activeFilterCount > 0,
      searchTerm: searchTerm || null
    };
  }, [allPlans.length, filteredAndSortedPlans.length, filters, searchTerm]);

  // Plan statistics
  const planStatistics = useMemo(() => {
    if (!filteredAndSortedPlans.length) return null;

    const premiums = filteredAndSortedPlans.map(plan => plan.monthlyPremium || 0).filter(p => p > 0);
    const deductibles = filteredAndSortedPlans.map(plan => plan.annualDeductible || 0);
    
    const metalLevelCounts = filteredAndSortedPlans.reduce((acc, plan) => {
      const level = plan.metalLevel || 'unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    const carrierCounts = filteredAndSortedPlans.reduce((acc, plan) => {
      const carrier = plan.issuer?.name || plan.carrierName || 'Unknown';
      acc[carrier] = (acc[carrier] || 0) + 1;
      return acc;
    }, {});

    return {
      count: filteredAndSortedPlans.length,
      premiumStats: {
        min: Math.min(...premiums) || 0,
        max: Math.max(...premiums) || 0,
        avg: premiums.length > 0 ? premiums.reduce((sum, p) => sum + p, 0) / premiums.length : 0
      },
      deductibleStats: {
        min: Math.min(...deductibles) || 0,
        max: Math.max(...deductibles) || 0,
        avg: deductibles.length > 0 ? deductibles.reduce((sum, d) => sum + d, 0) / deductibles.length : 0
      },
      metalLevelDistribution: metalLevelCounts,
      carrierDistribution: carrierCounts
    };
  }, [filteredAndSortedPlans]);

  return {
    // Data
    allPlans,
    filteredPlans: filteredAndSortedPlans,
    paginatedPlans,
    benchmarkPlans: benchmarkPlans?.plans || [],
    secondLowestCostSilverPlan,
    selectedPlans: getSelectedPlans(),
    
    // State
    filters,
    searchTerm,
    sortConfig,
    selectedPlanIds,
    currentPage,
    pageSize,
    
    // Loading states
    isLoadingPlans,
    isLoadingBenchmark,
    isComparingPlans: comparePlansMutation.isLoading,
    
    // Error states
    plansError,
    benchmarkError,
    comparisonError: comparePlansMutation.error,
    
    // Statistics
    paginationInfo,
    filterStats,
    planStatistics,
    
    // Filter actions
    updateFilters,
    clearFilters,
    updateSearchTerm,
    updateSort,
    
    // Selection actions
    selectPlan,
    deselectPlan,
    togglePlanSelection,
    selectAllPlans,
    deselectAllPlans,
    
    // Pagination actions
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    
    // Async actions
    fetchPlanDetails,
    comparePlans: comparePlansMutation.mutate,
    comparisonResult: comparePlansMutation.data,
    
    // Refresh actions
    refetchPlans,
    refetchBenchmark: () => queryClient.invalidateQueries(['benchmark-plans', countyId]),
    
    // Utility functions
    getPlanById: (planId) => allPlans.find(plan => plan.id === planId),
    isPlanSelected: (planId) => selectedPlanIds.has(planId),
    getAvailableFilters: () => ({
      metalLevels: [...new Set(allPlans.map(plan => plan.metalLevel).filter(Boolean))],
      planTypes: [...new Set(allPlans.map(plan => plan.planType).filter(Boolean))],
      carriers: [...new Set(allPlans.map(plan => plan.issuer?.name || plan.carrierName).filter(Boolean))],
      networkSizes: [...new Set(allPlans.map(plan => plan.networkSize).filter(Boolean))],
      premiumRange: {
        min: Math.min(...allPlans.map(plan => plan.monthlyPremium || 0).filter(p => p > 0)) || 0,
        max: Math.max(...allPlans.map(plan => plan.monthlyPremium || 0)) || 10000
      },
      deductibleRange: {
        min: Math.min(...allPlans.map(plan => plan.annualDeductible || 0)) || 0,
        max: Math.max(...allPlans.map(plan => plan.annualDeductible || 0)) || 15000
      }
    })
  };
};

export default usePlans; 