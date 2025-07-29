/**
 * Calculations Utility Module
 * Provides common calculation functions for insurance quoting
 */

/**
 * Calculate age from date of birth
 * @param {Date|string} dateOfBirth - Date of birth
 * @param {Date} referenceDate - Reference date for age calculation (defaults to today)
 * @returns {number} Age in years
 */
const calculateAge = (dateOfBirth, referenceDate = new Date()) => {
  const birth = new Date(dateOfBirth);
  const ref = new Date(referenceDate);
  
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Calculate ICHRA contribution based on age and class settings
 * @param {Object} memberClass - ICHRA class object with contribution settings
 * @param {number} age - Member age
 * @param {string} contributionType - 'employee' or 'dependent'
 * @returns {number} Monthly contribution amount
 */
const calculateICHRAContribution = (memberClass, age, contributionType = 'employee') => {
  // Check for age-based contributions
  if (memberClass.ageBasedContributions && memberClass.ageBasedContributions.length > 0) {
    const ageBand = memberClass.ageBasedContributions.find(
      band => age >= band.minAge && age <= band.maxAge
    );
    
    if (ageBand) {
      return contributionType === 'employee' 
        ? ageBand.employeeContribution 
        : ageBand.dependentContribution;
    }
  }
  
  // Default to standard contributions
  return contributionType === 'employee' 
    ? memberClass.employeeContribution 
    : memberClass.dependentContribution;
};

/**
 * Calculate Federal Poverty Level (FPL) percentage
 * @param {number} householdIncome - Annual household income
 * @param {number} householdSize - Number of people in household
 * @param {number} year - Year for FPL calculation (defaults to 2025)
 * @returns {number} FPL percentage
 */
const calculateFPLPercentage = (householdIncome, householdSize, year = 2025) => {
  // FPL amounts for 2025 (48 contiguous states and DC)
  const fplAmounts = {
    2025: {
      1: 15060,
      2: 20440,
      3: 25820,
      4: 31200,
      5: 36580,
      6: 41960,
      7: 47340,
      8: 52720,
      additionalPerson: 5380
    }
  };
  
  const fplData = fplAmounts[year] || fplAmounts[2025];
  let fplAmount;
  
  if (householdSize <= 8) {
    fplAmount = fplData[householdSize];
  } else {
    // For households > 8, add $5,380 per additional person
    fplAmount = fplData[8] + (householdSize - 8) * fplData.additionalPerson;
  }
  
  return (householdIncome / fplAmount) * 100;
};

/**
 * Calculate ACA applicable percentage based on FPL
 * @param {number} fplPercentage - Federal Poverty Level percentage
 * @returns {number} Applicable percentage for premium contribution
 */
const calculateApplicablePercentage = (fplPercentage) => {
  // 2025 ACA applicable percentages
  if (fplPercentage <= 150) return 0;
  if (fplPercentage <= 200) return 2.0;
  if (fplPercentage <= 250) return 4.0;
  if (fplPercentage <= 300) return 6.0;
  if (fplPercentage <= 400) return 8.5;
  
  // No subsidy above 400% FPL
  return 100;
};

/**
 * Calculate monthly premium subsidy
 * @param {number} benchmarkPremium - Second lowest Silver plan premium
 * @param {number} householdIncome - Annual household income
 * @param {number} householdSize - Number of people in household
 * @returns {Object} Subsidy calculation results
 */
const calculatePremiumSubsidy = (benchmarkPremium, householdIncome, householdSize) => {
  const fplPercentage = calculateFPLPercentage(householdIncome, householdSize);
  const applicablePercentage = calculateApplicablePercentage(fplPercentage);
  
  // No subsidy if above 400% FPL
  if (applicablePercentage === 100) {
    return {
      monthlySubsidy: 0,
      annualSubsidy: 0,
      fplPercentage,
      applicablePercentage,
      expectedContribution: householdIncome / 12,
      isEligible: false
    };
  }
  
  // Calculate expected monthly contribution
  const expectedMonthlyContribution = (householdIncome * (applicablePercentage / 100)) / 12;
  
  // Calculate subsidy (cannot be negative)
  const monthlySubsidy = Math.max(0, benchmarkPremium - expectedMonthlyContribution);
  
  return {
    monthlySubsidy,
    annualSubsidy: monthlySubsidy * 12,
    fplPercentage,
    applicablePercentage,
    expectedContribution: expectedMonthlyContribution,
    isEligible: monthlySubsidy > 0
  };
};

/**
 * Calculate effective premium after subsidy
 * @param {number} basePremium - Plan's base premium
 * @param {number} monthlySubsidy - Monthly subsidy amount
 * @returns {number} Effective premium (minimum $0)
 */
const calculateEffectivePremium = (basePremium, monthlySubsidy) => {
  return Math.max(0, basePremium - monthlySubsidy);
};

/**
 * Calculate member out-of-pocket cost
 * @param {number} planPremium - Monthly plan premium
 * @param {number} employerContribution - Monthly employer contribution
 * @returns {number} Member's monthly cost
 */
const calculateMemberCost = (planPremium, employerContribution) => {
  return Math.max(0, planPremium - employerContribution);
};

/**
 * Calculate savings comparison
 * @param {number} oldCost - Previous monthly cost
 * @param {number} newCost - New monthly cost
 * @returns {Object} Savings analysis
 */
const calculateSavings = (oldCost, newCost) => {
  const monthlySavings = oldCost - newCost;
  const annualSavings = monthlySavings * 12;
  const savingsPercentage = oldCost > 0 ? (monthlySavings / oldCost) * 100 : 0;
  
  return {
    monthlySavings,
    annualSavings,
    savingsPercentage,
    isPositiveSavings: monthlySavings > 0
  };
};

/**
 * Calculate employer total costs
 * @param {Array} members - Array of member objects with contribution data
 * @param {Object} classes - Map of class IDs to class objects
 * @returns {Object} Employer cost summary
 */
const calculateEmployerCosts = (members, classes) => {
  let totalMonthlyContribution = 0;
  let totalEmployees = 0;
  let totalDependents = 0;
  
  members.forEach(member => {
    const memberClass = classes[member.classId];
    if (!memberClass) return;
    
    const age = calculateAge(member.dateOfBirth);
    const employeeContribution = calculateICHRAContribution(memberClass, age, 'employee');
    
    totalMonthlyContribution += employeeContribution;
    totalEmployees++;
    
    // Add dependent contributions
    if (member.dependents && member.dependents.length > 0) {
      const dependentContribution = calculateICHRAContribution(memberClass, age, 'dependent');
      totalMonthlyContribution += dependentContribution * member.dependents.length;
      totalDependents += member.dependents.length;
    }
  });
  
  return {
    totalMonthlyContribution,
    totalAnnualContribution: totalMonthlyContribution * 12,
    totalEmployees,
    totalDependents,
    totalCoveredLives: totalEmployees + totalDependents,
    averageContributionPerEmployee: totalEmployees > 0 
      ? totalMonthlyContribution / totalEmployees 
      : 0
  };
};

/**
 * Calculate aggregate quote statistics
 * @param {Array} memberQuotes - Array of individual member quote results
 * @returns {Object} Aggregate statistics
 */
const calculateQuoteStatistics = (memberQuotes) => {
  const stats = {
    totalMembers: memberQuotes.length,
    averagePremium: 0,
    averageSavings: 0,
    membersWithSavings: 0,
    membersWithIncrease: 0,
    totalMonthlySavings: 0,
    totalAnnualSavings: 0,
    lowestPremium: Infinity,
    highestPremium: 0
  };
  
  memberQuotes.forEach(quote => {
    if (quote.selectedPlan) {
      const premium = quote.selectedPlan.premium;
      const savings = quote.savings?.monthlySavings || 0;
      
      stats.averagePremium += premium;
      stats.averageSavings += savings;
      stats.totalMonthlySavings += savings;
      
      if (savings > 0) stats.membersWithSavings++;
      if (savings < 0) stats.membersWithIncrease++;
      
      if (premium < stats.lowestPremium) stats.lowestPremium = premium;
      if (premium > stats.highestPremium) stats.highestPremium = premium;
    }
  });
  
  if (stats.totalMembers > 0) {
    stats.averagePremium /= stats.totalMembers;
    stats.averageSavings /= stats.totalMembers;
  }
  
  stats.totalAnnualSavings = stats.totalMonthlySavings * 12;
  stats.savingsRate = stats.totalMembers > 0 
    ? (stats.membersWithSavings / stats.totalMembers) * 100 
    : 0;
  
  return stats;
};

module.exports = {
  calculateAge,
  calculateICHRAContribution,
  calculateFPLPercentage,
  calculateApplicablePercentage,
  calculatePremiumSubsidy,
  calculateEffectivePremium,
  calculateMemberCost,
  calculateSavings,
  calculateEmployerCosts,
  calculateQuoteStatistics
};