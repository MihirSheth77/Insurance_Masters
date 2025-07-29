const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
const Plan = require('../../src/models/Plan');

// Helper functions
function parseNumberOrNull(value) {
  if (!value || value === '' || value === 'null' || value === 'undefined') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function parseDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

function validateUrl(url) {
  if (!url || url === '' || url === 'null') return null;
  return url.startsWith('http') ? url : null;
}

function mapPlanMarket(planMarketValue) {
  if (!planMarketValue) return 'individual_market';
  
  switch (planMarketValue.toLowerCase()) {
    case 'both_markets':
      return 'both_markets';
    case 'on_market':
    case 'individual_market':
      return 'individual_market';
    case 'off_market':
    case 'small_group_market':
      return 'small_group_market';
    default:
      console.warn(`Unknown plan_market value: ${planMarketValue}, defaulting to individual_market`);
      return 'individual_market';
  }
}

function updateDateToCurrentYearIfExpired(date) {
  if (!date) return null;
  const now = new Date();
  if (date < now) {
    const currentYear = now.getFullYear();
    date.setFullYear(currentYear);
  }
  return date;
}

async function importPlans() {
  try {
    console.log('Starting plans import...');
    
    // Clear existing data
    await Plan.deleteMany({});
    console.log('Cleared existing plan data');
    
    const csvFile = path.join(__dirname, '../../../plans.csv');
    const results = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          // Map CSV fields to Plan model structure
          const planData = {
            // Core Fields (required by model)
            planId: row.id,
            carrierName: row.carrier_name,
            displayName: row.display_name,
            name: row.name,
            level: row.level,
            onMarket: row.on_market === 'true',
            offMarket: row.off_market === 'true',
            serviceAreaId: row.service_area_id,
            planType: row.plan_type,
            hiossuerIdcId: row.hios_issuer_id,
            // For development: Update dates to current year if expired
            effectiveDate: updateDateToCurrentYearIfExpired(parseDate(row.effective_date)),
            expirationDate: updateDateToCurrentYearIfExpired(parseDate(row.expiration_date)),

            // Deductibles Object
            deductibles: {
              individualMedical: row.individual_medical_deductible || null,
              familyMedical: row.family_medical_deductible || null,
              individualDrug: row.individual_drug_deductible || null,
              familyDrug: row.family_drug_deductible || null,
              embeddedDeductible: row.embedded_deductible || null
            },

            // Max Out of Pocket Object
            maxOutOfPocket: {
              individualMedical: row.individual_medical_moop || null,
              familyMedical: row.family_medical_moop || null,
              individualDrug: row.individual_drug_moop || null,
              familyDrug: row.family_drug_moop || null
            },

            // Benefits Object
            benefits: {
              primaryCarePhysician: row.primary_care_physician || null,
              specialist: row.specialist || null,
              emergencyRoom: row.emergency_room || null,
              urgentCare: row.urgent_care || null,
              inpatientFacility: row.inpatient_facility || null,
              outpatientFacility: row.outpatient_facility || null,
              inpatientPhysician: row.inpatient_physician || null,
              outpatientPhysician: row.outpatient_physician || null,
              ambulance: row.ambulance || null,
              diagnosticTest: row.diagnostic_test || null,
              imaging: row.imaging || null,
              preventativeCare: row.preventative_care || null,
              rehabilitationServices: row.rehabilitation_services || null,
              skilledNursing: row.skilled_nursing || null,
              durableMedicalEquipment: row.durable_medical_equipment || null,
              homeHealthCare: row.home_health_care || null,
              hospiceService: row.hospice_service || null,
              inpatientMentalHealth: row.inpatient_mental_health || null,
              outpatientMentalHealth: row.outpatient_mental_health || null,
              inpatientSubstance: row.inpatient_substance || null,
              outpatientSubstance: row.outpatient_substance || null,
              prenatalPostnatalCare: row.prenatal_postnatal_care || null,
              inpatientBirth: row.inpatient_birth || null,
              adultDental: row.adult_dental || null,
              childDental: row.child_dental || null,
              childEyewear: row.child_eyewear || null,
              childEyeExam: row.child_eye_exam || null,
              habilitationServices: row.habilitation_services || null
            },

            // Prescription Drugs Object
            prescriptionDrugs: {
              genericDrugs: row.generic_drugs || null,
              preferredBrandDrugs: row.preferred_brand_drugs || null,
              nonPreferredBrandDrugs: row.non_preferred_brand_drugs || null,
              specialtyDrugs: row.specialty_drugs || null
            },

            // URLs and Additional Info
            urls: {
              benefitsSummaryUrl: validateUrl(row.benefits_summary_url),
              drugFormularyUrl: validateUrl(row.drug_formulary_url),
              summaryOfBenefitsUrl: validateUrl(row.summary_of_benefits_url),
              networkProviderDirectoryUrl: validateUrl(row.network_provider_directory_url),
              logoUrl: validateUrl(row.logo_url),
              buyLink: validateUrl(row.buy_link)
            },

            // Additional Fields
            hsaEligible: row.hsa_eligible === 'true',
            actuarialValue: parseNumberOrNull(row.actuarial_value),
            coinsurance: parseNumberOrNull(row.coinsurance),
                         customerServicePhoneNumber: row.customer_service_phone_number || null,
             networkName: row.network_name || null,
             planMarket: mapPlanMarket(row.plan_market),
            
            // Quality Ratings
            qualityRatings: {
              overall: parseNumberOrNull(row.cms_quality_ratings_overall),
              medicalCare: parseNumberOrNull(row.cms_quality_ratings_medical_care),
              memberExperience: parseNumberOrNull(row.cms_quality_ratings_member_experience),
              planAdministration: parseNumberOrNull(row.cms_quality_ratings_plan_administration)
            }
          };
          
          // Skip rows with missing required fields
          if (!planData.planId || !planData.carrierName || !planData.displayName || 
              !planData.name || !planData.level || !planData.serviceAreaId || 
              !planData.planType || !planData.hiossuerIdcId || 
              !planData.effectiveDate || !planData.expirationDate) {
            console.log(`Skipping plan with missing required fields: ${planData.planId}`);
            return;
          }
          
          results.push(planData);
        })
        .on('end', async () => {
          try {
            // Insert all plans
            await Plan.insertMany(results);
            
            const count = await Plan.countDocuments();
            console.log(`Plans import completed. Total records: ${count}`);
            resolve(count);
          } catch (error) {
            console.error('Error inserting plans:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('Error reading CSV file:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
}

module.exports = importPlans; 