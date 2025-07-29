import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geographicService } from '../services/geographicService';

/**
 * Custom hook for geographic data management
 * Handles ZIP code resolution, county selection, and caching
 */
export const useGeographic = (initialZipCode = '') => {
  const queryClient = useQueryClient();
  
  // State management
  const [zipCode, setZipCode] = useState(initialZipCode);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [resolvedCounties, setResolvedCounties] = useState([]);
  const [showCountyModal, setShowCountyModal] = useState(false);
  const [zipValidationStatus, setZipValidationStatus] = useState('idle'); // idle, validating, valid, invalid, multiple

  // Cache for resolved ZIP codes (in-memory cache)
  const [zipCache, setZipCache] = useState(new Map());

  // Query for all counties (cached globally)
  const {
    data: allCounties,
    isLoading: isLoadingCounties,
    error: countiesError
  } = useQuery({
    queryKey: ['counties'],
    queryFn: () => geographicService.getCounties(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false
  });

  // ZIP code resolution mutation
  const zipResolutionMutation = useMutation({
    mutationFn: (zipCodeToResolve) => geographicService.resolveZip(zipCodeToResolve),
    onMutate: (zipCodeToResolve) => {
      setZipValidationStatus('validating');
    },
    onSuccess: (data, zipCodeToResolve) => {
      
      // Cache the result
      setZipCache(prev => new Map(prev).set(zipCodeToResolve, data));
      
      // Update resolved counties
      setResolvedCounties(data.counties || []);
      
      if (data.counties && data.counties.length === 1) {
        // Single county - auto-select
        setSelectedCounty(data.counties[0]);
        setZipValidationStatus('valid');
        setShowCountyModal(false);
      } else if (data.counties && data.counties.length > 1) {
        // Multiple counties - show selection modal
        setZipValidationStatus('multiple');
        setShowCountyModal(true);
        setSelectedCounty(null);
      } else {
        // No counties found
        setZipValidationStatus('invalid');
        setSelectedCounty(null);
        setResolvedCounties([]);
      }
    },
    onError: (error, zipCodeToResolve) => {
      setZipValidationStatus('invalid');
      setSelectedCounty(null);
      setResolvedCounties([]);
      
      // Don't cache failed results
      setZipCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(zipCodeToResolve);
        return newCache;
      });
    }
  });

  // Resolve ZIP code with caching
  const resolveZipCode = (zipCodeToResolve) => {
    if (!zipCodeToResolve || !geographicService.isValidMvpZip(zipCodeToResolve)) {
      setZipValidationStatus('invalid');
      setSelectedCounty(null);
      setResolvedCounties([]);
      return;
    }

    // Check cache first
    const cachedResult = zipCache.get(zipCodeToResolve);
    if (cachedResult) {
      setResolvedCounties(cachedResult.counties || []);
      
      if (cachedResult.counties && cachedResult.counties.length === 1) {
        setSelectedCounty(cachedResult.counties[0]);
        setZipValidationStatus('valid');
        setShowCountyModal(false);
      } else if (cachedResult.counties && cachedResult.counties.length > 1) {
        setZipValidationStatus('multiple');
        setShowCountyModal(true);
        setSelectedCounty(null);
      } else {
        setZipValidationStatus('invalid');
        setSelectedCounty(null);
      }
      return;
    }

    // Resolve from API
    zipResolutionMutation.mutate(zipCodeToResolve);
  };

  // Handle ZIP code changes with debouncing
  useEffect(() => {
    if (!zipCode) {
      setZipValidationStatus('idle');
      setSelectedCounty(null);
      setResolvedCounties([]);
      return;
    }

    // Debounce ZIP code resolution
    const timeoutId = setTimeout(() => {
      resolveZipCode(zipCode);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [zipCode]);

  // Handle county selection
  const handleCountySelection = (county) => {
    setSelectedCounty(county);
    setShowCountyModal(false);
    setZipValidationStatus('valid');
  };

  // Handle ZIP code input change
  const handleZipCodeChange = (newZipCode) => {
    const cleanZipCode = newZipCode.replace(/\D/g, '').slice(0, 5);
    setZipCode(cleanZipCode);
    
    // Reset selection when ZIP changes
    if (cleanZipCode !== zipCode) {
      setSelectedCounty(null);
      setResolvedCounties([]);
      setShowCountyModal(false);
    }
  };

  // Clear ZIP code and selection
  const clearZipCode = () => {
    setZipCode('');
    setSelectedCounty(null);
    setResolvedCounties([]);
    setShowCountyModal(false);
    setZipValidationStatus('idle');
  };

  // Get counties by state
  const getCountiesByState = (stateCode) => {
    if (!allCounties) return [];
    return allCounties.filter(county => county.stateCode === stateCode);
  };

  // Get rating area for selected county
  const getRatingAreaQuery = useQuery({
    queryKey: ['rating-area', selectedCounty?.id],
    queryFn: () => geographicService.getRatingArea(selectedCounty.id),
    enabled: !!selectedCounty?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false
  });

  // Validation helpers
  const validationHelpers = useMemo(() => ({
    isValidFormat: (zip) => geographicService.validateZipFormat(zip),
    isValidMvpZip: (zip) => geographicService.isValidMvpZip(zip),
    getValidationMessage: () => {
      switch (zipValidationStatus) {
        case 'validating':
          return 'Validating ZIP code...';
        case 'valid':
          return `✓ Valid ZIP code in ${selectedCounty?.name}, ${selectedCounty?.stateCode}`;
        case 'invalid':
          return '✗ Invalid ZIP code or not in service area';
        case 'multiple':
          return '⚠ ZIP code spans multiple counties - please select one';
        default:
          return 'Enter a 5-digit ZIP code';
      }
    },
    getValidationClass: () => {
      switch (zipValidationStatus) {
        case 'validating':
          return 'validating';
        case 'valid':
          return 'valid';
        case 'invalid':
          return 'invalid';
        case 'multiple':
          return 'multiple';
        default:
          return 'idle';
      }
    }
  }), [zipValidationStatus, selectedCounty]);

  // Geographic context data
  const geographicContext = useMemo(() => {
    if (!selectedCounty) return null;

    return {
      zipCode,
      county: selectedCounty,
      ratingArea: getRatingAreaQuery.data,
      isRatingAreaLoading: getRatingAreaQuery.isLoading,
      ratingAreaError: getRatingAreaQuery.error
    };
  }, [zipCode, selectedCounty, getRatingAreaQuery.data, getRatingAreaQuery.isLoading, getRatingAreaQuery.error]);

  // Cache statistics
  const cacheStats = useMemo(() => ({
    size: zipCache.size,
    hitRate: zipCache.size > 0 ? (zipCache.size / (zipCache.size + zipResolutionMutation.data ? 1 : 0)) * 100 : 0,
    entries: Array.from(zipCache.entries()).map(([zip, data]) => ({
      zip,
      counties: data.counties?.length || 0,
      timestamp: new Date().toISOString()
    }))
  }), [zipCache, zipResolutionMutation.data]);

  // Clear cache
  const clearCache = () => {
    setZipCache(new Map());
    queryClient.removeQueries(['counties']);
    queryClient.removeQueries(['rating-area']);
  };

  // Auto-resolve function for programmatic ZIP setting
  const setZipCodeAndResolve = (newZipCode) => {
    setZipCode(newZipCode);
    if (newZipCode && geographicService.isValidMvpZip(newZipCode)) {
      resolveZipCode(newZipCode);
    }
  };

  return {
    // Current state
    zipCode,
    selectedCounty,
    resolvedCounties,
    allCounties: allCounties || [],
    zipValidationStatus,
    showCountyModal,
    geographicContext,
    
    // Loading states
    isResolvingZip: zipResolutionMutation.isLoading,
    isLoadingCounties,
    isLoadingRatingArea: getRatingAreaQuery.isLoading,
    
    // Error states
    zipResolutionError: zipResolutionMutation.error,
    countiesError,
    ratingAreaError: getRatingAreaQuery.error,
    
    // Actions
    handleZipCodeChange,
    handleCountySelection,
    setZipCodeAndResolve,
    resolveZipCode,
    clearZipCode,
    setShowCountyModal,
    
    // Utilities
    getCountiesByState,
    validationHelpers,
    
    // Cache management
    cacheStats,
    clearCache,
    
    // Query methods
    refetchCounties: () => queryClient.invalidateQueries(['counties']),
    refetchRatingArea: () => {
      if (selectedCounty?.id) {
        queryClient.invalidateQueries(['rating-area', selectedCounty.id]);
      }
    }
  };
};

export default useGeographic; 