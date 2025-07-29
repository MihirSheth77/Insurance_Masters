/**
 * Utility functions for formatting data in the quote components
 */

/**
 * Format currency values
 */
export const formatCurrency = (amount) => {
  // Don't default to 0 - show actual value or indicate missing data
  if (amount === null || amount === undefined) {
    console.warn('formatCurrency received null/undefined:', amount);
    return '$--';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Format currency with decimals
 */
export const formatCurrencyDetailed = (amount) => {
  if (amount === null || amount === undefined) {
    console.warn('formatCurrencyDetailed received null/undefined:', amount);
    return '$--.--';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format percentage values
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) {
    console.warn('formatPercentage received null/undefined:', value);
    return '--%';
  }
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format large numbers with commas
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined) {
    console.warn('formatNumber received null/undefined:', value);
    return '--';
  }
  return new Intl.NumberFormat('en-US').format(value);
};

/**
 * Format dates
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

/**
 * Format date with time
 */
export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get savings indicator class
 */
export const getSavingsClass = (amount) => {
  if (amount > 0) return 'positive-savings';
  if (amount < 0) return 'negative-savings';
  return 'neutral-savings';
};

/**
 * Format metal level with description
 */
export const formatMetalLevel = (level) => {
  if (!level) return 'Unknown';
  
  // For table display, just return the level name
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
};

/**
 * Get metal level with description (for detailed views)
 */
export const getMetalLevelWithDescription = (level) => {
  const descriptions = {
    'Bronze': '~60% coverage',
    'Silver': '~70% coverage',
    'Gold': '~80% coverage',
    'Platinum': '~90% coverage',
    'Catastrophic': 'Minimal coverage'
  };
  
  return {
    level,
    description: descriptions[level] || ''
  };
};

/**
 * Format market type
 */
export const formatMarketType = (market) => {
  const types = {
    'all': 'All Markets',
    'on-market': 'On-Market (with subsidies)',
    'off-market': 'Off-Market (no subsidies)'
  };
  
  return types[market] || market;
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (oldValue, newValue) => {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
};

/**
 * Format savings with proper sign
 */
export const formatSavingsWithSign = (amount) => {
  if (amount === null || amount === undefined) {
    return formatCurrency(amount); // Will return $--
  }
  const formatted = formatCurrency(Math.abs(amount));
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
};

/**
 * Get plan type description
 */
export const getPlanTypeDescription = (planType) => {
  const descriptions = {
    'HMO': 'Health Maintenance Organization',
    'PPO': 'Preferred Provider Organization',
    'EPO': 'Exclusive Provider Organization',
    'POS': 'Point of Service'
  };
  
  return descriptions[planType] || planType;
};

/**
 * Format employee impact summary
 */
export const formatEmployeeImpact = (employees) => {
  const total = employees.length;
  const withSavings = employees.filter(emp => emp.monthlySavings > 0).length;
  const withCosts = employees.filter(emp => emp.monthlySavings < 0).length;
  const neutral = total - withSavings - withCosts;
  
  return {
    total,
    withSavings,
    withCosts,
    neutral,
    savingsRate: total > 0 ? (withSavings / total) * 100 : 0,
    costRate: total > 0 ? (withCosts / total) * 100 : 0
  };
};

/**
 * Format filter summary
 */
export const formatFilterSummary = (filters) => {
  const parts = [];
  
  if (filters.carrier && filters.carrier.length > 0) {
    parts.push(`${filters.carrier.length} carrier${filters.carrier.length > 1 ? 's' : ''}`);
  }
  
  if (filters.metalLevel && filters.metalLevel.length > 0) {
    parts.push(`${filters.metalLevel.length} metal level${filters.metalLevel.length > 1 ? 's' : ''}`);
  }
  
  if (filters.market && filters.market !== 'all') {
    parts.push(formatMarketType(filters.market));
  }
  
  return parts.length > 0 ? parts.join(', ') : 'No filters applied';
};

/**
 * Format status or type with proper capitalization
 */
export const formatStatus = (status) => {
  if (!status) return '';
  
  // Handle common class types
  const statusMap = {
    'full-time': 'Full-Time',
    'part-time': 'Part-Time',
    'contractor': 'Contractor',
    'temporary': 'Temporary',
    'seasonal': 'Seasonal',
    'active': 'Active',
    'inactive': 'Inactive',
    'pending': 'Pending',
    'suspended': 'Suspended'
  };
  
  return statusMap[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

/**
 * Format full name from first and last name
 */
export const formatName = (firstName, lastName) => {
  if (!firstName && !lastName) return 'Unknown';
  if (!firstName) return lastName.trim();
  if (!lastName) return firstName.trim();
  return `${firstName.trim()} ${lastName.trim()}`;
};

/**
 * Format age with proper suffix
 */
export const formatAge = (age) => {
  if (age === null || age === undefined || isNaN(age)) return 'Unknown';
  const ageNum = parseInt(age);
  if (ageNum === 0) return '<1 year';
  if (ageNum === 1) return '1 year';
  return `${ageNum} years`;
};

const formatters = {
  formatCurrency,
  formatCurrencyDetailed,
  formatPercentage,
  formatNumber,
  formatDate,
  formatDateTime,
  getSavingsClass,
  formatMetalLevel,
  formatMarketType,
  calculatePercentageChange,
  formatSavingsWithSign,
  getPlanTypeDescription,
  formatEmployeeImpact,
  formatFilterSummary,
  formatStatus,
  formatName,
  formatAge
};

export default formatters;