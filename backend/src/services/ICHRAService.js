const IdeonAPIService = require('./IdeonAPIService');
const ICHRAClass = require('../models/ICHRAClass');
const Member = require('../models/Member');
const Group = require('../models/Group');
const ICHRAAffordabilityResult = require('../models/ICHRAAffordabilityResult');

class ICHRAService {
  /**
   * Calculate Group ICHRA Affordability using Official Ideon API
   * Uses the Group ICHRA Affordability endpoints as required by thingstodo.md
   * Stores results in MongoDB as specified
   */
  async calculateGroupAffordability(groupId, options = {}) {
    try {
      // Get group and all members
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const members = await Member.find({ groupId, status: 'active' }).populate('classId');
      if (members.length === 0) {
        throw new Error('No members found in group');
      }

      console.log(`Creating Group ICHRA affordability calculation for ${members.length} members`);

      // Prepare affordability calculation data for all members
      const affordabilityData = {
        effectiveDate: group.effectiveDate,
        safeHarborType: options.safeHarborType || 'RATE_OF_PAY',
        members: members.map(member => {
          const memberClass = member.classId;
          return {
            memberId: member._id,
            ideonMemberId: member.ideonMemberId,
            householdIncome: options.householdIncome?.[member._id.toString()] || 
                           member.personalInfo?.householdIncome ||
                           this.estimateHouseholdIncome(member, memberClass),
            householdSize: this.calculateFamilySize(member),
            contributionAmount: memberClass?.monthlyContribution || 400,
            zipCode: member.personalInfo?.zipCode,
            dateOfBirth: member.personalInfo?.dateOfBirth,
            age: this.calculateAge(member.personalInfo?.dateOfBirth),
            fipsCode: member.fipsCode || '41065' // Oregon county
          };
        })
      };

      // Create Group ICHRA Affordability calculation via Ideon API
      const calculationResult = await IdeonAPIService.createGroupICHRAAffordability(
        group.ideonGroupId, 
        affordabilityData
      );

      // Create MongoDB record to store the calculation with proper defaults
      const affordabilityResult = new ICHRAAffordabilityResult({
        calculationId: calculationResult.id,
        groupId: groupId,
        effectiveDate: affordabilityData.effectiveDate,
        safeHarborType: 'RATE_OF_PAY', // Default safe harbor type
        status: calculationResult.status === 'pending' ? 'pending' : 'completed',
        memberResults: affordabilityData.members.map(member => {
          return {
            memberId: member.memberId,
            ideonMemberId: member.ideonMemberId || `temp_${member.memberId}`,
            // Set required defaults - will be updated when API results come back
            isAffordable: false, // Default to false until calculated
            benchmarkPremium: 0,
            minimumContribution: 0,
            maximumEmployeeCost: 0,
            actualContribution: member.contributionAmount || 400,
            affordabilityThreshold: 0.0902, // 2025 threshold (9.02%)
            complianceStatus: 'warning', // Use warning instead of pending
            householdIncome: member.householdIncome || 50000,
            householdSize: member.householdSize || 1,
            zipCode: member.zipCode || '97001', // Use a default ZIP
            age: member.age || 30 // Use calculated age or default
          };
        }),
        summary: {
          totalMembers: members.length,
          affordableMembers: 0,
          nonAffordableMembers: members.length // Assume non-affordable initially
        },
        apiMetadata: {
          calculationUrl: calculationResult.calculation_url || '',
          apiVersion: 'v6'
        }
      });

      try {
        const savedResult = await affordabilityResult.save();
        console.log('✅ MongoDB record saved successfully:', savedResult._id);
      } catch (mongoError) {
        console.error('❌ MongoDB save error:', mongoError.message);
        if (mongoError.errors) {
          Object.keys(mongoError.errors).forEach(field => {
            console.error(`  - ${field}: ${mongoError.errors[field].message}`);
          });
        }
        throw mongoError;
      }

      console.log('Group ICHRA affordability calculation created:', calculationResult.id);
      console.log('📊 Calculation status:', calculationResult.status);

      // If calculation is completed immediately, retrieve and store results
      if (calculationResult.status === 'complete') {
        try {
          const retrievedResult = await this.retrieveAndStoreResults(calculationResult.id);
          console.log('✅ ICHRA results retrieved immediately:', retrievedResult._id);
        } catch (error) {
          console.error('❌ Failed to retrieve ICHRA results immediately:', error.message);
          // Continue anyway - results can be retrieved later
        }
      } else if (calculationResult.status === 'pending') {
        // For pending calculations, wait for results synchronously if needed for quote generation
        if (options.waitForResults !== false) {
          console.log('⏳ Waiting for ICHRA calculation to complete...');
          await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
          
          try {
            const retrievedResult = await this.retrieveAndStoreResults(calculationResult.id);
            console.log('✅ ICHRA results retrieved synchronously:', retrievedResult._id);
            
            // Return the complete results for immediate use
            return {
              calculationId: calculationResult.id,
              groupId: groupId,
              status: 'completed',
              totalMembers: members.length,
              message: 'Group ICHRA affordability calculation completed',
              summary: retrievedResult.summary,
              memberResults: retrievedResult.memberResults
            };
          } catch (error) {
            console.error('❌ Failed to retrieve ICHRA results synchronously:', error.message);
            // Still start background polling as fallback
            setTimeout(async () => {
              try {
                await this.retrieveAndStoreResults(calculationResult.id);
                console.log('✅ ICHRA results retrieved via background polling');
              } catch (bgError) {
                console.error('❌ Background polling also failed:', bgError.message);
              }
            }, 5000);
          }
        } else {
          // Async polling for non-critical calls
          setTimeout(async () => {
            try {
              const retrievedResult = await this.retrieveAndStoreResults(calculationResult.id);
              console.log('✅ Pending ICHRA results retrieved:', retrievedResult._id);
            } catch (error) {
              console.error('❌ Failed to retrieve pending ICHRA results:', error.message);
            }
          }, 5000); // Poll after 5 seconds
        }
      }

      return {
        calculationId: calculationResult.id,
        groupId: groupId,
        status: calculationResult.status,
        totalMembers: members.length,
        message: 'Group ICHRA affordability calculation initiated successfully'
      };

    } catch (error) {
      console.error('Error calculating group ICHRA affordability:', error.message);
      
      // Handle specific API errors
      if (error.message.includes('ICHRA') && error.code === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('ICHRA affordability calculation limit reached (10 per trial period)');
      }
      
      throw new Error(`Group ICHRA affordability calculation failed: ${error.message}`);
    }
  }

  /**
   * Retrieve and store ICHRA affordability results from Ideon API
   */
  async retrieveAndStoreResults(calculationId) {
    try {
      // Get the calculation results from Ideon API
      const ideonResults = await IdeonAPIService.getGroupICHRAAffordability(calculationId);
      
      // Get member-specific results
      const memberResults = await IdeonAPIService.getGroupICHRAAffordabilityMembers(calculationId);

      // Find our stored calculation record
      const storedResult = await ICHRAAffordabilityResult.findByCalculationId(calculationId);
      if (!storedResult) {
        throw new Error('Stored calculation result not found');
      }

      // Update with actual results from Ideon API
      console.log('📊 Ideon API results:', {
        status: ideonResults.status,
        hasMembers: !!memberResults.members,
        memberCount: memberResults.members?.length
      });
      
      const updatedResult = await storedResult.updateFromIdeonAPI({
        ...ideonResults,
        members: memberResults.members
      });

      console.log('✅ ICHRA affordability results retrieved and stored:', calculationId);
      console.log('📊 Updated result status:', updatedResult.status);
      console.log('📊 Updated member results count:', updatedResult.memberResults?.length);

      return storedResult;

    } catch (error) {
      console.error('Error retrieving ICHRA affordability results:', error.message);
      throw error;
    }
  }

  /**
   * Get stored ICHRA affordability results for a group
   */
  async getGroupAffordabilityResults(groupId) {
    try {
      const results = await ICHRAAffordabilityResult.findByGroup(groupId);
      return results;
    } catch (error) {
      console.error('Error getting group affordability results:', error.message);
      throw error;
    }
  }

  /**
   * Get latest ICHRA affordability results for a group
   */
  async getLatestGroupAffordabilityResults(groupId) {
    try {
      console.log('🔍 ICHRAService: Looking for results with groupId:', groupId, 'type:', typeof groupId);
      const result = await ICHRAAffordabilityResult.getLatestForGroup(groupId);
      console.log('📊 ICHRAService: Found result:', !!result);
      if (result) {
        console.log('📊 ICHRAService: Result has summary:', !!result.summary);
        console.log('📊 ICHRAService: Summary data:', result.summary);
      }
      return result;
    } catch (error) {
      console.error('Error getting latest group affordability results:', error.message);
      throw error;
    }
  }

  /**
   * Calculate individual member affordability (legacy method for compatibility)
   */
  async calculateAffordability(groupId, memberId, options = {}) {
    try {
      // Get the latest affordability results for the group
      const latestResult = await this.getLatestGroupAffordabilityResults(groupId);
      
      if (latestResult && latestResult.memberResults) {
        // Find the specific member's result
        const memberResult = latestResult.memberResults.find(mr => 
          mr.memberId.toString() === memberId.toString()
        );
        
        if (memberResult) {
          return {
            isAffordable: memberResult.isAffordable || false,
            benchmarkPremium: memberResult.benchmarkPremium || 0,
            minimumContribution: memberResult.minimumContribution || 0,
            maximumEmployeeCost: memberResult.maximumEmployeeCost || 0,
            actualContribution: memberResult.actualContribution || 0,
            complianceStatus: memberResult.complianceStatus || 'unknown',
            calculatedAt: latestResult.createdAt
          };
        }
      }
      
      // If no stored results, return default values (avoid infinite recursion)
      console.warn(`No ICHRA affordability results found for member ${memberId} in group ${groupId}`);
      return {
        isAffordable: false,
        benchmarkPremium: 0,
        minimumContribution: 0,
        maximumEmployeeCost: 0,
        actualContribution: 0,
        complianceStatus: 'not_calculated',
        calculatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error getting individual member affordability:', error.message);
      // Return safe defaults instead of throwing to avoid breaking the flow
      return {
        isAffordable: false,
        benchmarkPremium: 0,
        minimumContribution: 0,
        maximumEmployeeCost: 0,
        actualContribution: 0,
        complianceStatus: 'error',
        calculatedAt: new Date()
      };
    }
  }

  /**
   * Calculate minimum contribution required for ICHRA affordability
   */
  async calculateMinimumContribution(groupId, memberId, options = {}) {
    const calculationOptions = {
      ...options,
      calculationType: 'minimum_contribution'
    };

    const result = await this.calculateAffordability(groupId, memberId, calculationOptions);
    
    return {
      minimumContribution: result.minimumContribution,
      currentContribution: result.currentContribution,
      adjustmentNeeded: result.minimumContribution - result.currentContribution,
      isCurrentlyAffordable: result.isAffordable,
      safeHarborAmount: result.safeHarborAmount,
      recommendations: result.recommendations
    };
  }

  /**
   * Bulk calculate affordability for all members in a group (legacy method)
   * This method is deprecated - use the main calculateGroupAffordability method instead
   */
  async calculateBulkGroupAffordability(groupId, options = {}) {
    // Redirect to the main method to avoid duplication
    return await this.calculateGroupAffordability(groupId, options);
  }

  /**
   * Helper: Calculate member's age
   */
  calculateAge(dateOfBirth) {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Helper: Calculate family size for ICHRA affordability
   */
  calculateFamilySize(member) {
    const dependents = member.dependents ? member.dependents.length : 0;
    return 1 + dependents; // Member + dependents
  }

  /**
   * Helper: Estimate household income (placeholder - would be provided by employer)
   */
  estimateHouseholdIncome(member, memberClass) {
    // This is a placeholder - actual income would be provided by the employer
    // For ICHRA affordability, income is needed to determine affordability thresholds
    
    // Basic estimation based on class (this should be replaced with actual data)
    const baseIncome = {
      'Full-time': 50000,
      'Part-time': 25000,
      'Executive': 100000,
      'Seasonal': 20000
    };

    // Handle case where memberClass or className might be undefined
    const className = (memberClass?.className || memberClass?.name || '').toLowerCase();
    
    if (className) {
      for (const [key, income] of Object.entries(baseIncome)) {
        if (className.includes(key.toLowerCase())) {
          return income;
        }
      }
    }

    return 45000; // Default estimate
  }

  /**
   * Helper: Determine coverage type based on family size
   */
  determineCoverageType(member) {
    const familySize = this.calculateFamilySize(member);
    
    if (familySize === 1) return 'self_only';
    if (familySize === 2) return 'self_plus_one';
    return 'self_plus_family';
  }

  /**
   * Helper: Determine compliance status
   */
  determineComplianceStatus(affordabilityResult) {
    if (affordabilityResult.is_affordable) {
      return 'compliant';
    }
    
    const shortfall = affordabilityResult.minimum_contribution - affordabilityResult.current_contribution;
    
    if (shortfall <= 50) return 'minor_adjustment_needed';
    if (shortfall <= 150) return 'moderate_adjustment_needed';
    return 'major_adjustment_needed';
  }

  /**
   * Helper: Generate recommendations based on affordability results
   */
  generateRecommendations(affordabilityResult, memberClass) {
    const recommendations = [];

    if (!affordabilityResult.is_affordable) {
      const shortfall = affordabilityResult.minimum_contribution - memberClass.monthlyContribution;
      
      recommendations.push({
        type: 'contribution_increase',
        message: `Increase monthly contribution by $${shortfall.toFixed(2)} to meet affordability requirements`,
        priority: 'high',
        suggestedAmount: affordabilityResult.minimum_contribution
      });
    }

    if (affordabilityResult.safe_harbor_amount && 
        memberClass.monthlyContribution < affordabilityResult.safe_harbor_amount) {
      recommendations.push({
        type: 'safe_harbor',
        message: `Consider safe harbor contribution of $${affordabilityResult.safe_harbor_amount} for simplified compliance`,
        priority: 'medium',
        suggestedAmount: affordabilityResult.safe_harbor_amount
      });
    }

    if (memberClass.monthlyContribution > affordabilityResult.maximum_contribution) {
      recommendations.push({
        type: 'contribution_optimization',
        message: `Current contribution exceeds maximum needed - consider reducing to $${affordabilityResult.maximum_contribution}`,
        priority: 'low',
        suggestedAmount: affordabilityResult.maximum_contribution
      });
    }

    return recommendations;
  }

  /**
   * Helper: Update class-level affordability statistics
   */
  async updateClassAffordabilityStats(classId, affordabilityResult) {
    try {
      const existingStats = await ICHRAClass.findById(classId).select('affordabilityStats');
      const currentStats = existingStats?.affordabilityStats || {
        totalCalculations: 0,
        affordableMembers: 0,
        totalContributionAdjustments: 0,
        averageMinimumContribution: 0,
        lastUpdated: new Date()
      };

      // Update statistics
      currentStats.totalCalculations += 1;
      if (affordabilityResult.isAffordable) {
        currentStats.affordableMembers += 1;
      }
      
      if (affordabilityResult.minimumContribution > affordabilityResult.currentContribution) {
        currentStats.totalContributionAdjustments += 1;
      }

      // Recalculate average minimum contribution
      const totalMinimum = (currentStats.averageMinimumContribution * (currentStats.totalCalculations - 1)) + 
                          affordabilityResult.minimumContribution;
      currentStats.averageMinimumContribution = totalMinimum / currentStats.totalCalculations;
      currentStats.lastUpdated = new Date();

      await ICHRAClass.findByIdAndUpdate(
        classId,
        { $set: { affordabilityStats: currentStats } }
      );

    } catch (error) {
      console.error('Error updating class affordability stats:', error.message);
      // Don't throw - this is not critical to the main calculation
    }
  }

  /**
   * Helper: Generate group-level affordability summary
   */
  generateGroupAffordabilitySummary(results, errors) {
    const totalMembers = results.length + errors.length;
    const affordableMembers = results.filter(r => r.result.isAffordable).length;
    const nonAffordableMembers = results.filter(r => !r.result.isAffordable).length;

    const contributionAdjustments = results.filter(r => 
      r.result.minimumContribution > r.result.currentContribution
    );

    const averageMinimumContribution = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.result.minimumContribution, 0) / results.length : 0;

    return {
      totalMembers,
      successfulCalculations: results.length,
      failedCalculations: errors.length,
      affordableMembers,
      nonAffordableMembers,
      complianceRate: totalMembers > 0 ? (affordableMembers / totalMembers) * 100 : 0,
      contributionAdjustmentsNeeded: contributionAdjustments.length,
      averageMinimumContribution: Math.round(averageMinimumContribution * 100) / 100,
      calculatedAt: new Date()
    };
  }
}

module.exports = new ICHRAService(); 