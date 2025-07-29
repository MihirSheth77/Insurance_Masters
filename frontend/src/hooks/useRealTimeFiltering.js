import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook for real-time filtering with client-side performance
 * Stores all plans in memory and applies filters instantly
 */
export const useRealTimeFiltering = (allPlans = [], memberData = [], classData = []) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL or defaults
  const initializeFiltersFromURL = () => {
    // const urlFilters = {}; // eslint-disable-line no-unused-vars
    
    // Parse URL parameters
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
      showICHRACompliant: showICHRACompliant !== 'false' // Default to true
    };
  };

  const [filters, setFilters] = useState(initializeFiltersFromURL);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // Update URL when filters change
  useEffect(() => {
    const updateURL = () => {
      const newParams = new URLSearchParams();
      
      // Only add non-default values to URL
      if (filters.metalLevels.length > 0) {
        newParams.set('metalLevels', filters.metalLevels.join(','));
      }
      if (filters.carriers.length > 0) {
        newParams.set('carriers', filters.carriers.join(','));
      }
      if (filters.planTypes.length > 0) {
        newParams.set('planTypes', filters.planTypes.join(','));
      }
      if (filters.market !== 'all') {
        newParams.set('market', filters.market);
      }
      if (filters.premiumRange.min !== 0) {
        newParams.set('premiumMin', filters.premiumRange.min.toString());
      }
      if (filters.premiumRange.max !== 10000) {
        newParams.set('premiumMax', filters.premiumRange.max.toString());
      }
      if (filters.deductibleRange.min !== 0) {
        newParams.set('deductibleMin', filters.deductibleRange.min.toString());
      }
      if (filters.deductibleRange.max !== 15000) {
        newParams.set('deductibleMax', filters.deductibleRange.max.toString());
      }
      if (filters.networkSize !== 'any') {
        newParams.set('networkSize', filters.networkSize);
      }
      if (filters.hsaEligible !== null) {
        newParams.set('hsaEligible', filters.hsaEligible.toString());
      }
      if (filters.prescription !== null) {
        newParams.set('prescription', filters.prescription.toString());
      }
      if (!filters.showICHRACompliant) {
        newParams.set('showICHRACompliant', 'false');
      }
      
      setSearchParams(newParams, { replace: true });
    };

    // Debounce URL updates to avoid excessive history entries
    const timeoutId = setTimeout(updateURL, 300);
    return () => clearTimeout(timeoutId);
  }, [filters, setSearchParams]);

  // Client-side filtering logic - highly optimized
  const filteredPlans = useMemo(() => {
    if (!allPlans || allPlans.length === 0) return [];

    const startTime = performance.now();

    const filtered = allPlans.filter(plan => {
      // Metal Level filter
      if (filters.metalLevels.length > 0 && !filters.metalLevels.includes(plan.metalLevel)) {
        return false;
      }

      // Carrier filter
      if (filters.carriers.length > 0 && !filters.carriers.includes(plan.carrierId || plan.issuer?.id)) {
        return false;
      }

      // Plan Type filter
      if (filters.planTypes.length > 0 && !filters.planTypes.includes(plan.planType)) {
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

    const endTime = performance.now();

    return filtered;
  }, [allPlans, filters]);

  // Recalculate costs immediately when filters change
  const recalculatedCosts = useMemo(() => {
    if (!filteredPlans.length || !memberData.length || !classData.length) {
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
        metalLevelStats: {}
      };
    }

    const startTime = performance.now();

    let totalEmployerCost = 0;
    let totalEmployeeCost = 0;
    let totalOldCost = 0;
    const employeeCostAnalysis = [];

    // Calculate costs for each employee with filtered plans
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
      const availablePlans = filteredPlans.filter(plan => {
        // Filter plans available in member's area (simplified)
        return true;
      });

      if (availablePlans.length > 0) {
        // Sort by value (premium - ICHRA contribution)
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
          bestPlan: bestPlan,
          ichraContribution,
          employeeOutOfPocket: newEmployeeCost
        });
      }
    });

    const totalSavings = totalOldCost - (totalEmployerCost + totalEmployeeCost);
    const avgSavingsPerEmployee = memberData.length > 0 ? totalSavings / memberData.length : 0;
    const employeesWithSavings = employeeCostAnalysis.filter(emp => emp.savings > 0).length;
    const employeesWithIncreases = employeeCostAnalysis.filter(emp => emp.savings < 0).length;

    // Get best and worst plan options
    const bestPlanOptions = employeeCostAnalysis
      .filter(emp => emp.savings > 0)
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 5);

    const worstPlanOptions = employeeCostAnalysis
      .filter(emp => emp.savings < 0)
      .sort((a, b) => a.savings - b.savings)
      .slice(0, 5);

    // Calculate carrier and metal level statistics
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
          minPremium: Infinity,
          maxPremium: 0,
          totalPremium: 0
        };
      }
      
      carrierStats[carrierId].planCount++;
      carrierStats[carrierId].totalPremium += plan.monthlyPremium || 0;
      carrierStats[carrierId].minPremium = Math.min(carrierStats[carrierId].minPremium, plan.monthlyPremium || 0);
      carrierStats[carrierId].maxPremium = Math.max(carrierStats[carrierId].maxPremium, plan.monthlyPremium || 0);
      carrierStats[carrierId].avgPremium = carrierStats[carrierId].totalPremium / carrierStats[carrierId].planCount;

      const metalLevel = plan.metalLevel || 'Unknown';
      if (!metalLevelStats[metalLevel]) {
        metalLevelStats[metalLevel] = {
          planCount: 0,
          avgPremium: 0,
          totalPremium: 0
        };
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
      bestPlanOptions,
      worstPlanOptions,
      carrierStats,
      metalLevelStats,
      employeeCostAnalysis
    };
  }, [filteredPlans, memberData, classData]);

  // Filter change handler with immediate recalculation
  const handleFilterChange = (newFilters) => {
    setIsApplyingFilters(true);
    
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      return updated;
    });
    
    // Reset applying state after brief delay for visual feedback
    setTimeout(() => setIsApplyingFilters(false), 100);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setIsApplyingFilters(true);
    
    const defaultFilters = {
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
    };
    
    setFilters(defaultFilters);
    setTimeout(() => setIsApplyingFilters(false), 100);
  };

  // Get filter statistics
  const filterStats = useMemo(() => {
    const totalPlans = allPlans.length;
    const filteredCount = filteredPlans.length;
    const filterPercentage = totalPlans > 0 ? (filteredCount / totalPlans) * 100 : 0;
    
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
      totalPlans,
      filteredCount,
      filterPercentage,
      activeFilterCount,
      isFiltered: activeFilterCount > 0
    };
  }, [allPlans.length, filteredPlans.length, filters]);

  return {
    // Current state
    filters,
    filteredPlans,
    recalculatedCosts,
    filterStats,
    isApplyingFilters,
    
    // Actions
    handleFilterChange,
    clearAllFilters,
    
    // Utilities
    setFilters: handleFilterChange // Alias for consistency
  };
};

export default useRealTimeFiltering; 