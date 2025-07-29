const Group = require('../models/Group');
const Member = require('../models/Member');
const ICHRAClass = require('../models/ICHRAClass');
const QuoteResult = require('../models/QuoteResult');
const GeographicService = require('./GeographicService');
const PlanService = require('./PlanService');
const PricingService = require('./PricingService');
const ICHRAService = require('./ICHRAService');

class QuoteService {
  constructor() {
    // Cache results for performance
    this.quoteCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate comprehensive group quote
   * Orchestrates all calculations
   */
  async generateGroupQuote(groupId, filters = {}) {
    try {
      // Check cache first
      const cacheKey = `${groupId}_${JSON.stringify(filters)}`;
      if (this.quoteCache.has(cacheKey)) {
        const cached = this.quoteCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('Returning cached quote result');
          return cached.result;
        }
      }

      console.log('Generating group quote for:', groupId);

      // Fetch group and all members
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const members = await Member.getMembersByGroup(groupId);
      if (members.length === 0) {
        throw new Error('No active members found in group');
      }

      console.log(`Found ${members.length} members in group`);

      // First, calculate ICHRA affordability using Ideon API as required by THINGSTODO.md
      console.log('Calculating ICHRA affordability using Ideon API...');
      let ichraAffordabilityResults = null;
      try {
        ichraAffordabilityResults = await ICHRAService.calculateGroupAffordability(groupId);
        console.log('ICHRA affordability calculation completed:', ichraAffordabilityResults.summary);
      } catch (error) {
        console.warn('ICHRA affordability calculation failed, using fallback:', error.message);
        // Continue with quote generation even if ICHRA calculation fails
      }

      // Resolve counties for all members - skip members with invalid ZIP codes
      const memberCounties = await Promise.all(
        members.map(async (member) => {
          try {
            const countyResult = await GeographicService.resolveCountyFromZip(
              member.personalInfo.zipCode
            );
            
            return {
              memberId: member._id,
              member: member,
              county: countyResult.single ? countyResult.county : countyResult.counties[0]
            };
          } catch (error) {
            console.warn(`Skipping member ${member.personalInfo.firstName} ${member.personalInfo.lastName} due to invalid ZIP code ${member.personalInfo.zipCode}:`, error.message);
            return null; // Skip this member
          }
        })
      );

      // Filter out members with invalid ZIP codes
      const validMemberCounties = memberCounties.filter(mc => mc !== null);

      console.log(`Resolved counties for ${validMemberCounties.length} valid members (skipped ${memberCounties.length - validMemberCounties.length} with invalid ZIP codes)`);

      // Find available plans for each county
      const uniqueCounties = [...new Set(validMemberCounties.map(mc => mc.county.csvId))];
      const plansByCounty = await Promise.all(
        uniqueCounties.map(async (countyId) => {
          const plans = await PlanService.getPlansForCounty(countyId, filters);
          return {
            countyId: countyId,
            plans: plans.plans
          };
        })
      );

      console.log('Found available plans for all counties');

      // Calculate subsidized and non-subsidized premiums for each member
      const memberQuotes = await Promise.all(
        validMemberCounties.map(async (memberCounty) => {
          const member = memberCounty.member;
          const county = memberCounty.county;
          
          try {
            console.log(`Calculating plans for member ${member.fullName} in county ${county.name}`);

            // Prepare household information for subsidy calculation
            const household = {
              income: member.householdIncome || 50000, // Default if not provided
              size: member.familySize || 1
            };

            // Calculate both on-market (subsidized) and off-market plans
            const allPlansResult = await PricingService.calculateAllPlansForCounty(
              county.csvId,
              household,
              member.personalInfo.age,
              member.personalInfo.tobacco,
              county.ratingAreaId
            );

            // Combine on-market and off-market plans
            const allPlans = [
              ...(allPlansResult.onMarket.plans || []),
              ...(allPlansResult.offMarket.plans || [])
            ];

            if (allPlans.length === 0) {
              console.warn(`No plans available for member ${member.fullName} in county ${county.name}`);
              return null;
            }

            // Sort by subsidized premium (or full premium for off-market)
            allPlans.sort((a, b) => a.subsidizedPremium - b.subsidizedPremium);

            return {
              memberId: member._id,
              memberName: member.fullName,
              classId: member.classId,
              zipCode: member.personalInfo.zipCode,
              county: {
                csvId: county.csvId,
                name: county.name,
                ratingAreaId: county.ratingAreaId
              },
              familySize: member.familySize,
              householdIncome: household.income,
              subsidyEligibility: {
                isEligible: allPlansResult.combined.eligibleForSubsidy,
                subsidyInfo: allPlansResult.combined.subsidyInfo
              },
              previousPlan: {
                planName: member.previousContributions.planName,
                totalCost: member.getPreviousTotalCost(),
                employerContribution: member.previousContributions.employerContribution,
                memberContribution: member.previousContributions.memberContribution
              },
              planOptions: {
                onMarket: {
                  plans: allPlansResult.onMarket.plans || [],
                  totalPlans: allPlansResult.onMarket.totalPlans || 0,
                  summary: allPlansResult.onMarket.summary
                },
                offMarket: {
                  plans: allPlansResult.offMarket.plans || [],
                  totalPlans: allPlansResult.offMarket.totalPlans || 0,
                  summary: allPlansResult.offMarket.summary
                }
              },
              recommendedPlans: allPlans.slice(0, 10), // Top 10 best options
              bestPlan: allPlans[0] || null // Lowest cost option
            };
          } catch (error) {
            console.error(`Error calculating plans for member ${member.fullName}:`, error.message);
            return null;
          }
        })
      );

      // Filter out members without valid quotes
      const validMemberQuotes = memberQuotes.filter(mq => mq !== null);

      // Apply ICHRA contributions and calculate final member costs
      const memberQuotesWithContributions = await Promise.all(
        validMemberQuotes.map(async (memberQuote) => {
          const member = members.find(m => m._id.toString() === memberQuote.memberId.toString());
          const ichraClass = await ICHRAClass.findById(member.classId);
          
          if (ichraClass) {
            const contribution = ichraClass.getContributionForAge(member.personalInfo.age);
            
            // Apply ICHRA contributions to each plan (both on-market and off-market)
            memberQuote.recommendedPlans = memberQuote.recommendedPlans.map(plan => {
              // Use subsidized premium for on-market plans, full premium for off-market
              const effectivePremium = plan.subsidizedPremium || plan.fullPremium || plan.premium || 0;
              const memberCost = Math.max(0, effectivePremium - contribution.employee);
              
              // Calculate savings compared to previous plan
              const previousTotalCost = memberQuote.previousPlan.totalCost;
              const newTotalCost = effectivePremium;
              const monthlySavings = previousTotalCost - newTotalCost;
              const savingsPercentage = previousTotalCost > 0 ? (monthlySavings / previousTotalCost) * 100 : 0;

              return {
                ...plan,
                premium: effectivePremium, // Ensure premium field exists
                effectivePremium: effectivePremium, // Subsidized for on-market, full for off-market
                ichraContribution: contribution.employee,
                memberCost: memberCost,
                monthlySavings: monthlySavings,
                annualSavings: monthlySavings * 12,
                savingsPercentage: savingsPercentage,
                isPositiveSavings: monthlySavings > 0,
                costBreakdown: {
                  fullPremium: plan.fullPremium || effectivePremium,
                  subsidyAmount: plan.subsidy || 0,
                  subsidizedPremium: plan.subsidizedPremium || effectivePremium,
                  employerContribution: contribution.employee,
                  memberOutOfPocket: memberCost
                }
              };
            });

            // Apply contributions to plan options categories
            ['onMarket', 'offMarket'].forEach(marketType => {
              if (memberQuote.planOptions[marketType]?.plans) {
                memberQuote.planOptions[marketType].plans = memberQuote.planOptions[marketType].plans.map(plan => {
                  const effectivePremium = plan.subsidizedPremium || plan.fullPremium || plan.premium || 0;
                  const memberCost = Math.max(0, effectivePremium - contribution.employee);
                  const monthlySavings = memberQuote.previousPlan.totalCost - effectivePremium;

                  return {
                    ...plan,
                    premium: effectivePremium, // Ensure premium field exists
                    effectivePremium: effectivePremium,
                    ichraContribution: contribution.employee,
                    memberCost: memberCost,
                    monthlySavings: monthlySavings,
                    annualSavings: monthlySavings * 12,
                    savingsPercentage: memberQuote.previousPlan.totalCost > 0 ? 
                      (monthlySavings / memberQuote.previousPlan.totalCost) * 100 : 0,
                    isPositiveSavings: monthlySavings > 0
                  };
                });
              }
            });

            // Update best plan with ICHRA contribution applied
            if (memberQuote.bestPlan) {
              const effectivePremium = memberQuote.bestPlan.subsidizedPremium || memberQuote.bestPlan.fullPremium || memberQuote.bestPlan.premium || 0;
              const memberCost = Math.max(0, effectivePremium - contribution.employee);
              const monthlySavings = memberQuote.previousPlan.totalCost - effectivePremium;

              memberQuote.bestPlan = {
                ...memberQuote.bestPlan,
                premium: effectivePremium, // Ensure premium field exists
                effectivePremium: effectivePremium,
                ichraContribution: contribution.employee,
                memberCost: memberCost,
                monthlySavings: monthlySavings,
                annualSavings: monthlySavings * 12,
                savingsPercentage: memberQuote.previousPlan.totalCost > 0 ? 
                  (monthlySavings / memberQuote.previousPlan.totalCost) * 100 : 0,
                isPositiveSavings: monthlySavings > 0
              };
            }

            // Set member-level summary
            memberQuote.memberSummary = {
              ichraContribution: contribution.employee,
              bestPlanSavings: memberQuote.bestPlan?.monthlySavings || 0,
              bestPlanCost: memberQuote.bestPlan?.memberCost || 0,
              subsidyEligible: memberQuote.subsidyEligibility.isEligible,
              planOptionsCount: {
                onMarket: memberQuote.planOptions.onMarket.totalPlans,
                offMarket: memberQuote.planOptions.offMarket.totalPlans,
                total: memberQuote.planOptions.onMarket.totalPlans + memberQuote.planOptions.offMarket.totalPlans
              }
            };
          }

          return memberQuote;
        })
      );

      // Calculate employer costs (ICHRA contributions vs previous employer contributions)
      console.log('🔍 Calculating comparison summary...');
      console.log(`📊 Total members: ${members.length}`);
      
      const oldEmployerCost = members.reduce((sum, member) => {
        const contribution = member.previousContributions?.employerContribution || 0;
        console.log(`👤 Member ${member.fullName}: Previous employer contribution = $${contribution}`);
        return sum + contribution;
      }, 0);
      console.log(`💰 Total old employer cost: $${oldEmployerCost}`);
      
      const newEmployerCost = memberQuotesWithContributions.reduce((sum, mq) => {
        const contribution = mq.memberSummary?.ichraContribution || 0;
        console.log(`👤 Member ${mq.memberName}: ICHRA contribution = $${contribution}`);
        return sum + contribution;
      }, 0);
      console.log(`💰 Total new employer cost: $${newEmployerCost}`);

      // Calculate member cost comparison  
      const oldMemberCost = members.reduce((sum, member) => {
        const contribution = member.previousContributions?.memberContribution || 0;
        console.log(`👤 Member ${member.fullName}: Previous member contribution = $${contribution}`);
        return sum + contribution;
      }, 0);
      console.log(`💰 Total old member cost: $${oldMemberCost}`);
      
      const newMemberCost = memberQuotesWithContributions.reduce((sum, mq) => {
        const cost = mq.memberSummary?.bestPlanCost || 0;
        console.log(`👤 Member ${mq.memberName}: Best plan cost after ICHRA = $${cost}`);
        return sum + cost;
      }, 0);
      console.log(`💰 Total new member cost: $${newMemberCost}`);

      // Total cost comparison
      const oldTotalCost = oldEmployerCost + oldMemberCost;
      const newTotalCost = newEmployerCost + newMemberCost;

      const employerMonthlySavings = oldEmployerCost - newEmployerCost;
      const memberMonthlySavings = oldMemberCost - newMemberCost;
      const totalMonthlySavings = oldTotalCost - newTotalCost;
      
      console.log('📊 Savings calculations:');
      console.log(`💼 Employer monthly savings: $${employerMonthlySavings} (${oldEmployerCost > 0 ? ((employerMonthlySavings / oldEmployerCost) * 100).toFixed(1) : 0}%)`);
      console.log(`👥 Member monthly savings: $${memberMonthlySavings} (${oldMemberCost > 0 ? ((memberMonthlySavings / oldMemberCost) * 100).toFixed(1) : 0}%)`);
      console.log(`💰 Total monthly savings: $${totalMonthlySavings} (${oldTotalCost > 0 ? ((totalMonthlySavings / oldTotalCost) * 100).toFixed(1) : 0}%)`);

      // Calculate ICHRA compliance using Ideon API results if available
      let membersWithCompliantPlans;
      let complianceRate;
      
      console.log('🔍 ICHRA affordability results:', ichraAffordabilityResults ? 'Available' : 'Not available');
      if (ichraAffordabilityResults) {
        console.log('📊 ICHRA results structure:', {
          hasCalculationId: !!ichraAffordabilityResults.calculationId,
          hasSummary: !!ichraAffordabilityResults.summary,
          status: ichraAffordabilityResults.status,
          totalMembers: ichraAffordabilityResults.totalMembers
        });
      }
      
      if (ichraAffordabilityResults && ichraAffordabilityResults.summary) {
        // Use official Ideon API affordability results
        membersWithCompliantPlans = ichraAffordabilityResults.summary.affordableMembers || 0;
        complianceRate = ichraAffordabilityResults.summary.complianceRate / 100 || 0; // Convert percentage to decimal
        console.log('✅ Using ICHRA compliance from Ideon API:', { 
          compliant: membersWithCompliantPlans, 
          rate: complianceRate 
        });
      } else {
        // No fallback - require Ideon API ICHRA compliance data
        console.error('❌ ICHRA compliance data not available - Ideon API required');
        console.error('❌ Available data:', ichraAffordabilityResults);
        throw new Error('ICHRA compliance calculation failed - Ideon API data required');
      }

      // Calculate average premium across all plans
      let totalPremiums = 0;
      let premiumCount = 0;
      
      memberQuotesWithContributions.forEach(mq => {
        // Count premiums from all available plans
        [...(mq.planOptions?.onMarket?.plans || []), ...(mq.planOptions?.offMarket?.plans || [])].forEach(plan => {
          if (plan.premium > 0) {
            totalPremiums += plan.premium;
            premiumCount++;
          }
        });
      });

      const averagePremium = premiumCount > 0 ? totalPremiums / premiumCount : 0;

      // Calculate total unique plans
      const uniquePlans = new Set();
      memberQuotesWithContributions.forEach(mq => {
        [...(mq.planOptions?.onMarket?.plans || []), ...(mq.planOptions?.offMarket?.plans || [])].forEach(plan => {
          if (plan.planId) {
            uniquePlans.add(plan.planId);
          }
        });
      });

      // Generate comprehensive comparison summary
      const comparisonSummary = {
        employer: {
          oldMonthlyCost: oldEmployerCost,
          newMonthlyCost: newEmployerCost,
          monthlySavings: employerMonthlySavings,
          annualSavings: employerMonthlySavings * 12,
          savingsPercentage: oldEmployerCost > 0 ? (employerMonthlySavings / oldEmployerCost) * 100 : 0,
          totalEmployees: members.length
        },
        employees: {
          oldMonthlyCost: oldMemberCost,
          newMonthlyCost: newMemberCost,
          monthlySavings: memberMonthlySavings,
          annualSavings: memberMonthlySavings * 12,
          savingsPercentage: oldMemberCost > 0 ? (memberMonthlySavings / oldMemberCost) * 100 : 0,
          averageSavingsPerEmployee: members.length > 0 ? memberMonthlySavings / members.length : 0
        },
        overall: {
          oldTotalCost: oldTotalCost,
          newTotalCost: newTotalCost,
          monthlySavings: totalMonthlySavings,
          annualSavings: totalMonthlySavings * 12,
          savingsPercentage: oldTotalCost > 0 ? (totalMonthlySavings / oldTotalCost) * 100 : 0,
          complianceRate: complianceRate,
          complianceCount: membersWithCompliantPlans,
          employeesWithSavings: memberQuotesWithContributions.filter(mq => (mq.memberSummary?.bestPlanSavings || 0) > 0).length,
          employeesWithIncreases: memberQuotesWithContributions.filter(mq => (mq.memberSummary?.bestPlanSavings || 0) < 0).length
        },
        subsidyAnalysis: {
          membersEligibleForSubsidy: memberQuotesWithContributions.filter(mq => mq.subsidyEligibility?.isEligible).length,
          subsidyEligibleCount: memberQuotesWithContributions.filter(mq => mq.subsidyEligibility?.isEligible).length,
          totalMembers: memberQuotesWithContributions.length,
          subsidyEligibilityRate: memberQuotesWithContributions.length > 0 ? 
            (memberQuotesWithContributions.filter(mq => mq.subsidyEligibility?.isEligible).length / memberQuotesWithContributions.length) * 100 : 0,
          averageSubsidy: memberQuotesWithContributions
            .filter(mq => mq.subsidyEligibility?.isEligible && mq.subsidyEligibility.subsidyInfo)
            .reduce((sum, mq, _, arr) => sum + (mq.subsidyEligibility.subsidyInfo.monthlySubsidy || 0) / arr.length, 0)
        },
        planAnalysis: {
          totalPlans: uniquePlans.size,
          totalOnMarketPlans: memberQuotesWithContributions.reduce((sum, mq) => sum + (mq.planOptions?.onMarket?.totalPlans || 0), 0),
          totalOffMarketPlans: memberQuotesWithContributions.reduce((sum, mq) => sum + (mq.planOptions?.offMarket?.totalPlans || 0), 0),
          averagePlansPerMember: memberQuotesWithContributions.length > 0 ? 
            memberQuotesWithContributions.reduce((sum, mq) => sum + (mq.memberSummary?.planOptionsCount?.total || 0), 0) / memberQuotesWithContributions.length : 0,
          averagePremium: averagePremium,
          lowestPremium: premiumCount > 0 ? Math.min(...memberQuotesWithContributions.flatMap(mq => 
            [...(mq.planOptions?.onMarket?.plans || []), ...(mq.planOptions?.offMarket?.plans || [])]
              .filter(p => p.premium > 0)
              .map(p => p.premium)
          )) : 0,
          highestPremium: premiumCount > 0 ? Math.max(...memberQuotesWithContributions.flatMap(mq => 
            [...(mq.planOptions?.onMarket?.plans || []), ...(mq.planOptions?.offMarket?.plans || [])]
              .filter(p => p.premium > 0)
              .map(p => p.premium)
          )) : 0
        }
      };

      // Create quote result with proper employerSummary structure
      const quoteResult = new QuoteResult({
        groupId: groupId,
        generatedAt: new Date(),
        filters: filters,
        employerSummary: {
          oldTotalCost: comparisonSummary.employer.oldMonthlyCost,
          newTotalCost: comparisonSummary.employer.newMonthlyCost,
          monthlySavings: comparisonSummary.employer.monthlySavings,
          annualSavings: comparisonSummary.employer.annualSavings,
          savingsPercentage: comparisonSummary.employer.savingsPercentage,
          totalMembers: comparisonSummary.employer.totalEmployees,
          averageSavingsPerMember: comparisonSummary.employer.totalEmployees > 0 ? 
            comparisonSummary.employer.monthlySavings / comparisonSummary.employer.totalEmployees : 0
        },
        comparisonSummary: comparisonSummary, // Store full comparison for later retrieval
        memberQuotes: memberQuotesWithContributions,
        selectedPlans: this.aggregateSelectedPlans(memberQuotesWithContributions)
      });

      // Save to database
      await quoteResult.save();

      // Cache results for performance
      this.quoteCache.set(cacheKey, {
        result: quoteResult,
        timestamp: Date.now()
      });

      console.log('Quote generation completed');
      return quoteResult;
    } catch (error) {
      console.error('Error generating group quote:', error);
      throw error;
    }
  }

  /**
   * Aggregate selected plans for summary
   */
  aggregateSelectedPlans(memberQuotes) {
    const planSummary = new Map();

    memberQuotes.forEach(mq => {
      const selectedPlan = mq.recommendedPlans.find(p => p.planId === mq.selectedPlanId);
      if (selectedPlan) {
        const key = selectedPlan.planId;
        if (planSummary.has(key)) {
          const existing = planSummary.get(key);
          existing.memberCount++;
          existing.totalPremium += selectedPlan.premium;
          existing.totalEmployerContribution += selectedPlan.employerContribution;
          existing.totalMemberContribution += selectedPlan.memberContribution;
        } else {
          planSummary.set(key, {
            planId: selectedPlan.planId,
            planName: selectedPlan.planName,
            carrier: selectedPlan.carrier,
            metalLevel: selectedPlan.metalLevel,
            memberCount: 1,
            totalPremium: selectedPlan.premium,
            totalEmployerContribution: selectedPlan.employerContribution,
            totalMemberContribution: selectedPlan.memberContribution,
            averagePremium: selectedPlan.premium
          });
        }
      }
    });

    // Calculate averages
    return Array.from(planSummary.values()).map(plan => ({
      ...plan,
      averagePremium: plan.totalPremium / plan.memberCount
    }));
  }

  /**
   * Apply filters to existing quote results for real-time updates
   * Efficiently recalculates comparisons without full regeneration
   */
  async applyFiltersToQuote(quoteId, filters) {
    try {
      console.log('🔍 Looking for quote:', quoteId);
      const quoteResult = await QuoteResult.findById(quoteId);
      if (!quoteResult) {
        throw new Error('Quote not found');
      }

      console.log('📊 Quote found, memberQuotes count:', quoteResult.memberQuotes?.length);
      console.log('🎯 Applying filters to quote:', filters);
      
      // Debug the structure of memberQuotes
      if (quoteResult.memberQuotes?.length > 0) {
        const sampleQuote = quoteResult.memberQuotes[0];
        console.log('🔍 Sample memberQuote structure:', {
          hasPreviousPlan: !!sampleQuote.previousPlan,
          previousPlanData: sampleQuote.previousPlan,
          memberName: sampleQuote.memberName,
          memberSummary: sampleQuote.memberSummary,
          recommendedPlans: sampleQuote.recommendedPlans?.length || 0,
          // Check if ICHRA contribution is stored elsewhere
          hasRecommendedPlans: !!sampleQuote.recommendedPlans,
          firstPlanICHRA: sampleQuote.recommendedPlans?.[0]?.ichraContribution
        });
      }

      // Filter member quotes based on plan selection criteria
      const filteredMemberQuotes = (quoteResult.memberQuotes || [])
        .filter(memberQuote => memberQuote != null)
        .map((memberQuote) => {
          // Now that we store all data, we can directly use planOptions
          const planOptions = memberQuote.planOptions || { onMarket: { plans: [] }, offMarket: { plans: [] } };
          
          const filteredPlanOptions = {
            onMarket: {
              plans: this.filterPlans(planOptions.onMarket?.plans || [], filters),
              totalPlans: 0,
              summary: planOptions.onMarket?.summary || {}
            },
            offMarket: {
              plans: this.filterPlans(planOptions.offMarket?.plans || [], filters),
              totalPlans: 0,
              summary: planOptions.offMarket?.summary || {}
            }
          };

        // Update total counts
        filteredPlanOptions.onMarket.totalPlans = filteredPlanOptions.onMarket.plans.length;
        filteredPlanOptions.offMarket.totalPlans = filteredPlanOptions.offMarket.plans.length;

        // Filter recommended plans
        const filteredRecommendedPlans = this.filterPlans(memberQuote.recommendedPlans || [], filters);

        // Find new best plan from filtered results
        const allFilteredPlans = [...filteredPlanOptions.onMarket.plans, ...filteredPlanOptions.offMarket.plans];
        
        // Debug filtered plans
        console.log(`🔍 Filtered plans for ${memberQuote.memberName}:`, {
          totalFiltered: allFilteredPlans.length,
          firstPlan: allFilteredPlans[0] ? {
            name: allFilteredPlans[0].planName,
            memberCost: allFilteredPlans[0].memberCost,
            premium: allFilteredPlans[0].premium
          } : null
        });
        
        // Sort by member cost (out of pocket after ICHRA)
        allFilteredPlans.sort((a, b) => {
          const costA = a.memberCost !== undefined ? a.memberCost : 999999;
          const costB = b.memberCost !== undefined ? b.memberCost : 999999;
          return costA - costB;
        });
        
        const newBestPlan = allFilteredPlans[0] || null;
        console.log(`🏆 Best plan for ${memberQuote.memberName}:`, newBestPlan ? {
          name: newBestPlan.planName,
          memberCost: newBestPlan.memberCost,
          premium: newBestPlan.premium
        } : 'No plan found');

        // Update member summary with filtered data
        const updatedMemberSummary = {
          ...memberQuote.memberSummary,
          bestPlanSavings: newBestPlan?.monthlySavings || 0,
          bestPlanCost: newBestPlan?.memberCost || 0,
          planOptionsCount: {
            onMarket: filteredPlanOptions.onMarket.totalPlans,
            offMarket: filteredPlanOptions.offMarket.totalPlans,
            total: filteredPlanOptions.onMarket.totalPlans + filteredPlanOptions.offMarket.totalPlans
          }
        };

        return {
          ...memberQuote,
          planOptions: filteredPlanOptions,
          recommendedPlans: filteredRecommendedPlans.slice(0, 10), // Top 10 filtered
          bestPlan: newBestPlan,
          memberSummary: updatedMemberSummary,
          subsidyEligibility: memberQuote.subsidyEligibility || { isEligible: false }
        };
      });

      // Recalculate comparison summary with filtered data
      // Make sure previousPlan data is available in memberQuotes
      const memberQuotesWithPreviousPlan = quoteResult.memberQuotes.map(mq => ({
        ...mq.toObject ? mq.toObject() : mq,
        previousPlan: mq.previousPlan || {
          planName: mq.previousPlan?.planName || '',
          totalCost: mq.previousPlan?.totalCost || 0,
          employerContribution: mq.previousPlan?.employerContribution || 0,
          memberContribution: mq.previousPlan?.memberContribution || 0
        }
      }));
      
      const updatedComparisonSummary = await this.calculateFilteredComparison(
        memberQuotesWithPreviousPlan, // Original for old costs with previousPlan data
        filteredMemberQuotes, // Filtered for new costs
        quoteResult // Pass quoteResult for groupId access
      );

      return {
        quoteId: quoteId,
        groupId: quoteResult.groupId,
        appliedFilters: filters,
        memberQuotes: filteredMemberQuotes,
        comparisonSummary: updatedComparisonSummary,
        generatedAt: quoteResult.generatedAt,
        filteredAt: new Date()
      };
    } catch (error) {
      console.error('Error applying filters to quote:', error);
      throw error;
    }
  }

  /**
   * Filter plans based on criteria (Carrier, Metal Level, Market)
   */
  filterPlans(plans, filters) {
    if (!plans || plans.length === 0) return [];

    return plans.filter(plan => {
      // Filter by carrier
      if (filters.carrier && filters.carrier.length > 0) {
        if (!filters.carrier.includes(plan.carrier)) {
          return false;
        }
      }

      // Filter by metal level
      if (filters.metalLevel && filters.metalLevel.length > 0) {
        if (!filters.metalLevel.includes(plan.metalLevel)) {
          return false;
        }
      }

      // Filter by market type
      if (filters.market && filters.market !== 'all') {
        if (filters.market === 'on-market' && !plan.isSubsidized) {
          return false;
        }
        if (filters.market === 'off-market' && plan.isSubsidized) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate comparison summary for filtered results
   */
  async calculateFilteredComparison(originalMemberQuotes, filteredMemberQuotes, quoteResult) {
    console.log('🔍 calculateFilteredComparison called');
    console.log('📊 Original quotes count:', originalMemberQuotes?.length);
    console.log('📊 Filtered quotes count:', filteredMemberQuotes?.length);
    
    // Filter out null/invalid memberQuotes - don't require memberSummary since it might not exist in stored quotes
    const validOriginalQuotes = (originalMemberQuotes || []).filter(mq => mq && mq.previousPlan);
    
    console.log('📊 Valid original quotes:', validOriginalQuotes.length);
    if (validOriginalQuotes.length > 0) {
      console.log('🔍 Sample original quote data:', {
        hasPreviousPlan: !!validOriginalQuotes[0].previousPlan,
        previousPlanData: validOriginalQuotes[0].previousPlan
      });
    }
    
    // Calculate old costs from previous contributions (not ICHRA)
    const oldEmployerCost = validOriginalQuotes.reduce((sum, mq) => {
      // Use previous employer contribution, not ICHRA contribution
      const contribution = mq.previousPlan?.employerContribution || 0;
      console.log(`👤 Member ${mq.memberName}: Previous employer contribution from previousPlan = $${contribution}`);
      return sum + contribution;
    }, 0);
    
    const oldMemberCost = validOriginalQuotes.reduce((sum, mq) => {
      const contribution = mq.previousPlan?.memberContribution || 0;
      console.log(`👤 Member ${mq.memberName}: Previous member contribution from previousPlan = $${contribution}`);
      return sum + contribution;
    }, 0);

    // Calculate new costs with filtered plans
    const newEmployerCost = filteredMemberQuotes.reduce((sum, mq) => {
      // Try to get ICHRA contribution from various possible locations
      const ichraContribution = mq.memberSummary?.ichraContribution || 
                               mq.contributions?.employee || 
                               mq.ichraContribution || 0;
      console.log(`👤 Member ${mq.memberName}: ICHRA contribution = $${ichraContribution}`);
      return sum + ichraContribution;
    }, 0);

    const newMemberCost = filteredMemberQuotes.reduce((sum, mq) => {
      return sum + (mq.memberSummary?.bestPlanCost || 0);
    }, 0);

    // Calculate savings
    const employerMonthlySavings = oldEmployerCost - newEmployerCost;
    const memberMonthlySavings = oldMemberCost - newMemberCost;
    const totalMonthlySavings = (oldEmployerCost + oldMemberCost) - (newEmployerCost + newMemberCost);

    // Calculate ICHRA compliance
    // Try to get the latest ICHRA affordability results from Ideon API
    let membersWithCompliantPlans;
    let complianceRate;
    
    try {
      // Get groupId from the quote result
      const groupId = quoteResult.groupId;
      console.log('🔍 Looking for ICHRA results for group:', groupId);
      console.log('[DEBUG] QuoteService - Starting ICHRA lookup for filtered results');
      
      const latestICHRAResults = await ICHRAService.getLatestGroupAffordabilityResults(groupId);
      console.log('📊 Found ICHRA results:', latestICHRAResults ? 'Yes' : 'No');
      
      if (latestICHRAResults) {
        console.log('📊 ICHRA data found - checking structure...');
        console.log('📊 Has summary:', !!latestICHRAResults.summary);
        console.log('📊 Summary data:', latestICHRAResults.summary);
        console.log('📊 Virtual complianceRate:', latestICHRAResults.complianceRate);
        
        // Use ICHRA data if we have summary information
        if (latestICHRAResults.summary && latestICHRAResults.summary.totalMembers > 0) {
          membersWithCompliantPlans = latestICHRAResults.summary.affordableMembers || 0;
          complianceRate = (latestICHRAResults.complianceRate || 0) / 100; // Use virtual property, convert to decimal
          console.log('✅ Using stored ICHRA compliance from Ideon API for filtered results:', {
            affordableMembers: membersWithCompliantPlans,
            complianceRate: complianceRate,
            compliancePercentage: latestICHRAResults.complianceRate
          });
        } else {
          console.log('❌ ICHRA data found but no valid summary');
          throw new Error('ICHRA data incomplete - no valid summary');
        }
      } else {
        console.log('❌ No ICHRA summary data found');
        throw new Error('No ICHRA results available');
      }
    } catch (error) {
      // No fallback - require Ideon API ICHRA compliance data
      console.error('❌ ICHRA compliance data not available for filtered results - Ideon API required');
      console.error('❌ Error details:', error.message);
      throw new Error('ICHRA compliance calculation failed for filtered results - Ideon API data required');
    }

    // Calculate average premium across all filtered plans
    let totalPremiums = 0;
    let premiumCount = 0;
    
    filteredMemberQuotes.forEach(mq => {
      // Count premiums from all available plans
      [...(mq.planOptions?.onMarket?.plans || []), ...(mq.planOptions?.offMarket?.plans || [])].forEach(plan => {
        if (plan.premium > 0) {
          totalPremiums += plan.premium;
          premiumCount++;
        }
      });
    });

    const averagePremium = premiumCount > 0 ? totalPremiums / premiumCount : 0;

    // Calculate total unique plans
    const uniquePlans = new Set();
    filteredMemberQuotes.forEach(mq => {
      [...(mq.planOptions?.onMarket?.plans || []), ...(mq.planOptions?.offMarket?.plans || [])].forEach(plan => {
        if (plan.planId) {
          uniquePlans.add(plan.planId);
        }
      });
    });

    return {
      employer: {
        oldMonthlyCost: oldEmployerCost,
        newMonthlyCost: newEmployerCost,
        monthlySavings: employerMonthlySavings,
        annualSavings: employerMonthlySavings * 12,
        savingsPercentage: oldEmployerCost > 0 ? (employerMonthlySavings / oldEmployerCost) * 100 : 0,
        totalEmployees: filteredMemberQuotes.length
      },
      employees: {
        oldMonthlyCost: oldMemberCost,
        newMonthlyCost: newMemberCost,
        monthlySavings: memberMonthlySavings,
        annualSavings: memberMonthlySavings * 12,
        savingsPercentage: oldMemberCost > 0 ? (memberMonthlySavings / oldMemberCost) * 100 : 0,
        averageSavingsPerEmployee: filteredMemberQuotes.length > 0 ? memberMonthlySavings / filteredMemberQuotes.length : 0
      },
      overall: {
        oldTotalCost: oldEmployerCost + oldMemberCost,
        newTotalCost: newEmployerCost + newMemberCost,
        monthlySavings: totalMonthlySavings,
        annualSavings: totalMonthlySavings * 12,
        savingsPercentage: (oldEmployerCost + oldMemberCost) > 0 ? (totalMonthlySavings / (oldEmployerCost + oldMemberCost)) * 100 : 0,
        complianceRate: complianceRate,
        complianceCount: membersWithCompliantPlans,
        employeesWithSavings: filteredMemberQuotes.filter(mq => (mq.memberSummary?.bestPlanSavings || 0) > 0).length,
        employeesWithIncreases: filteredMemberQuotes.filter(mq => (mq.memberSummary?.bestPlanSavings || 0) < 0).length
      },
      subsidyAnalysis: {
        membersEligibleForSubsidy: filteredMemberQuotes.filter(mq => mq.subsidyEligibility?.isEligible).length,
        subsidyEligibleCount: filteredMemberQuotes.filter(mq => mq.subsidyEligibility?.isEligible).length,
        totalMembers: filteredMemberQuotes.length,
        subsidyEligibilityRate: filteredMemberQuotes.length > 0 ? 
          (filteredMemberQuotes.filter(mq => mq.subsidyEligibility?.isEligible).length / filteredMemberQuotes.length) * 100 : 0,
        averageSubsidy: 0 // TODO: Calculate from subsidy amounts
      },
      planAnalysis: {
        totalPlans: uniquePlans.size,
        totalOnMarketPlans: filteredMemberQuotes.reduce((sum, mq) => sum + (mq.planOptions?.onMarket?.totalPlans || 0), 0),
        totalOffMarketPlans: filteredMemberQuotes.reduce((sum, mq) => sum + (mq.planOptions?.offMarket?.totalPlans || 0), 0),
        averagePlansPerMember: filteredMemberQuotes.length > 0 ? 
          filteredMemberQuotes.reduce((sum, mq) => sum + (mq.memberSummary?.planOptionsCount?.total || 0), 0) / filteredMemberQuotes.length : 0,
        averagePremium: averagePremium,
        lowestPremium: premiumCount > 0 ? Math.min(...filteredMemberQuotes.flatMap(mq => 
          [...(mq.planOptions?.onMarket?.plans || []), ...(mq.planOptions?.offMarket?.plans || [])]
            .filter(p => p.premium > 0)
            .map(p => p.premium)
        )) : 0,
        highestPremium: premiumCount > 0 ? Math.max(...filteredMemberQuotes.flatMap(mq => 
          [...(mq.planOptions?.onMarket?.plans || []), ...(mq.planOptions?.offMarket?.plans || [])]
            .filter(p => p.premium > 0)
            .map(p => p.premium)
        )) : 0
      }
    };
  }

  /**
   * Handle real-time filter updates
   */
  async updateQuoteFilters(groupId, newFilters) {
    // Invalidate cache for this group
    const keysToDelete = [];
    for (const [key] of this.quoteCache) {
      if (key.startsWith(groupId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.quoteCache.delete(key));

    // Generate new quote with updated filters
    return await this.generateGroupQuote(groupId, newFilters);
  }

  /**
   * Get individual employee comparison details
   */
  async getEmployeeComparison(quoteId, memberId, filters = {}) {
    try {
      const quoteResult = await QuoteResult.findById(quoteId);
      if (!quoteResult) {
        throw new Error('Quote not found');
      }

      const memberQuote = quoteResult.memberQuotes.find(mq => mq.memberId.toString() === memberId);
      if (!memberQuote) {
        throw new Error('Member not found in quote');
      }

      // Apply filters to member's plans - check if planOptions exists
      const filteredOnMarketPlans = this.filterPlans(memberQuote.planOptions?.onMarket?.plans || [], filters);
      const filteredOffMarketPlans = this.filterPlans(memberQuote.planOptions?.offMarket?.plans || [], filters);
      const allFilteredPlans = [...filteredOnMarketPlans, ...filteredOffMarketPlans];

      // Sort by member cost (lowest first)
      allFilteredPlans.sort((a, b) => a.memberCost - b.memberCost);

      return {
        memberId: memberId,
        memberName: memberQuote.memberName,
        classId: memberQuote.classId,
        previousPlan: memberQuote.previousPlan,
        subsidyEligibility: memberQuote.subsidyEligibility,
        filteredPlanOptions: {
          onMarket: filteredOnMarketPlans,
          offMarket: filteredOffMarketPlans,
          all: allFilteredPlans
        },
        comparison: {
          oldOutOfPocketCost: memberQuote.previousPlan.memberContribution,
          newOutOfPocketCost: allFilteredPlans[0]?.memberCost || 0,
          monthlySavings: memberQuote.previousPlan.memberContribution - (allFilteredPlans[0]?.memberCost || 0),
          annualSavings: (memberQuote.previousPlan.memberContribution - (allFilteredPlans[0]?.memberCost || 0)) * 12,
          savingsPercentage: memberQuote.previousPlan.memberContribution > 0 ? 
            ((memberQuote.previousPlan.memberContribution - (allFilteredPlans[0]?.memberCost || 0)) / memberQuote.previousPlan.memberContribution) * 100 : 0,
          bestPlan: allFilteredPlans[0] || null,
          totalPlanOptions: allFilteredPlans.length
        },
        appliedFilters: filters
      };
    } catch (error) {
      console.error('Error getting employee comparison:', error);
      throw error;
    }
  }

  /**
   * Get quote result by ID
   */
  async getQuoteResult(quoteId) {
    try {
      const quoteResult = await QuoteResult.findById(quoteId);
      if (!quoteResult) {
        return null;
      }
      return quoteResult;
    } catch (error) {
      console.error('Error getting quote result:', error);
      throw error;
    }
  }

  /**
   * Export quote in various formats
   */
  async exportQuote(quoteId, options = {}) {
    try {
      const quoteResult = await QuoteResult.findById(quoteId).populate('groupId');
      if (!quoteResult) {
        throw new Error('Quote not found');
      }

      const { format = 'csv', includeDetails = true } = options;
      
      // For now, return CSV format data
      // You can extend this to support Excel, PDF, etc.
      if (format === 'csv') {
        let csvContent = 'Member Name,Class,Previous Cost,New Cost,Monthly Savings,Annual Savings\n';
        
        if (quoteResult.memberQuotes && includeDetails) {
          quoteResult.memberQuotes.forEach(memberQuote => {
            const previousCost = memberQuote.previousPlan?.totalCost || 0;
            const newCost = memberQuote.bestPlan?.memberCost || 0;
            const monthlySavings = memberQuote.bestPlan?.monthlySavings || 0;
            const annualSavings = monthlySavings * 12;
            
            csvContent += `"${memberQuote.memberName}","${memberQuote.classId}","${previousCost}","${newCost}","${monthlySavings}","${annualSavings}"\n`;
          });
        }

        return {
          success: true,
          data: csvContent,
          filename: `quote_${quoteId}.csv`,
          mimeType: 'text/csv'
        };
      }

      // For other formats, return JSON for now
      return {
        success: true,
        data: JSON.stringify(quoteResult, null, 2),
        filename: `quote_${quoteId}.json`,
        mimeType: 'application/json'
      };
    } catch (error) {
      console.error('Error exporting quote:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear quote cache
   */
  clearCache() {
    this.quoteCache.clear();
  }
}

module.exports = new QuoteService(); 