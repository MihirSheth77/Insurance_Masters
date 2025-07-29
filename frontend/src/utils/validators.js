// Form validation utilities
export const validateGroupBasicInfo = (data) => {
  const errors = {};

  // Group name validation
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Group name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Group name must be at least 2 characters';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Group name must be less than 100 characters';
  }

  // Effective date validation
  if (!data.effectiveDate) {
    errors.effectiveDate = 'Effective date is required';
  } else {
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = data.effectiveDate.split('-').map(Number);
    const effectiveDate = new Date(year, month - 1, day); // month is 0-indexed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (effectiveDate < today) {
      errors.effectiveDate = 'Effective date cannot be in the past';
    }
    
    // Must be first day of month
    if (effectiveDate.getDate() !== 1) {
      errors.effectiveDate = 'ICHRA effective date must be the first day of a month';
    }
  }

  // Employee count validation
  if (!data.employeeCount) {
    errors.employeeCount = 'Number of employees is required';
  } else {
    const count = parseInt(data.employeeCount);
    if (isNaN(count) || count < 1) {
      errors.employeeCount = 'Must be at least 1 employee';
    } else if (count > 10000) {
      errors.employeeCount = 'Maximum 10,000 employees supported';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateGroupAddress = (data) => {
  const errors = {};

  // Street address validation
  if (!data.streetAddress || data.streetAddress.trim().length === 0) {
    errors.streetAddress = 'Street address is required';
  } else if (data.streetAddress.trim().length < 5) {
    errors.streetAddress = 'Please enter a complete street address';
  }

  // City validation
  if (!data.city || data.city.trim().length === 0) {
    errors.city = 'City is required';
  } else if (data.city.trim().length < 2) {
    errors.city = 'Please enter a valid city name';
  }

  // State validation
  if (!data.state || data.state.trim().length === 0) {
    errors.state = 'State is required';
  } else if (data.state.length !== 2) {
    errors.state = 'Please select a valid state';
  }

  // ZIP code validation (5-digit ZIP codes)
  if (!data.zipCode) {
    errors.zipCode = 'ZIP code is required';
  } else {
    const zipNum = parseInt(data.zipCode);
    if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
      errors.zipCode = 'ZIP code must be a valid 5-digit ZIP code';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateICHRAClass = (data) => {
  const errors = {};

  // Class name validation
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Class name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Class name must be at least 2 characters';
  }

  // Class type validation
  const validTypes = ['full-time', 'part-time', 'seasonal', 'salaried', 'hourly', 'other'];
  if (!data.type) {
    errors.type = 'Class type is required';
  } else if (!validTypes.includes(data.type)) {
    errors.type = 'Please select a valid class type';
  }

  // Employee contribution validation
  if (data.employeeContribution === undefined || data.employeeContribution === '') {
    errors.employeeContribution = 'Employee contribution is required';
  } else {
    const contribution = parseFloat(data.employeeContribution);
    if (isNaN(contribution) || contribution < 0) {
      errors.employeeContribution = 'Employee contribution must be a positive number';
    } else if (contribution > 10000) {
      errors.employeeContribution = 'Employee contribution cannot exceed $10,000/month';
    }
  }

  // Dependent contribution validation
  if (data.dependentContribution === undefined || data.dependentContribution === '') {
    errors.dependentContribution = 'Dependent contribution is required';
  } else {
    const contribution = parseFloat(data.dependentContribution);
    if (isNaN(contribution) || contribution < 0) {
      errors.dependentContribution = 'Dependent contribution must be a positive number';
    } else if (contribution > 10000) {
      errors.dependentContribution = 'Dependent contribution cannot exceed $10,000/month';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateMember = (data) => {
  const errors = {};

  // Handle nested structure (personalInfo, previousContributions, etc.)
  const personalInfo = data.personalInfo || {};
  const previousContributions = data.previousContributions || {};

  // Personal info validation
  if (!personalInfo.firstName || personalInfo.firstName.trim().length === 0) {
    errors.firstName = 'First name is required';
  }

  if (!personalInfo.lastName || personalInfo.lastName.trim().length === 0) {
    errors.lastName = 'Last name is required';
  }

  if (!personalInfo.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const dob = new Date(personalInfo.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    
    if (age < 0 || age > 120) {
      errors.dateOfBirth = 'Please enter a valid date of birth';
    }
  }

  // ZIP code validation
  if (!personalInfo.zipCode) {
    errors.zipCode = 'ZIP code is required';
  } else {
    const zipNum = parseInt(personalInfo.zipCode);
    if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
      errors.zipCode = 'ZIP code must be a valid 5-digit ZIP code';
    }
  }


  
  // Household income validation
  if (!personalInfo.householdIncome && personalInfo.householdIncome !== 0) {
    errors.householdIncome = 'Household income is required';
  } else {
    const income = parseFloat(personalInfo.householdIncome);
    if (isNaN(income) || income < 0) {
      errors.householdIncome = 'Household income must be a positive number';
    } else if (income > 999999) {
      errors.householdIncome = 'Household income cannot exceed $999,999';
    }
  }

  // Family size validation
  if (!personalInfo.familySize) {
    errors.familySize = 'Family size is required';
  } else {
    const size = parseInt(personalInfo.familySize);
    if (isNaN(size) || size < 1 || size > 8) {
      errors.familySize = 'Family size must be between 1 and 8';
    }
  }

  // Class assignment validation
  if (!data.classId) {
    errors.classId = 'Please assign member to an ICHRA class';
  }

  // Previous contributions validation
  if (!previousContributions.employerContribution && previousContributions.employerContribution !== 0) {
    errors.employerContribution = 'Previous employer contribution is required';
  } else {
    const contribution = parseFloat(previousContributions.employerContribution);
    if (isNaN(contribution) || contribution < 0) {
      errors.employerContribution = 'Must be a positive number';
    }
  }

  if (!previousContributions.memberContribution && previousContributions.memberContribution !== 0) {
    errors.memberContribution = 'Previous member contribution is required';
  } else {
    const contribution = parseFloat(previousContributions.memberContribution);
    if (isNaN(contribution) || contribution < 0) {
      errors.memberContribution = 'Must be a positive number';
    }
  }

  if (!previousContributions.planName || previousContributions.planName.trim().length === 0) {
    errors.planName = 'Previous plan name is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return phoneRegex.test(phone);
};

export const validateZipCode = (zipCode) => {
  const zipNum = parseInt(zipCode);
  return !isNaN(zipNum) && zipNum >= 10000 && zipNum <= 99999;
};

export const validateSSN = (ssn) => {
  const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
  return ssnRegex.test(ssn);
};

export const validateAge = (dateOfBirth) => {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear() - 
    (today.getMonth() < dob.getMonth() || 
     (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate()) ? 1 : 0);
  
  return {
    age,
    isValid: age >= 0 && age <= 120
  };
}; 