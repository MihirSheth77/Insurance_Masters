// E2E Test: Complete Workflow from Group Setup to Quote Generation
// Tests the entire user journey through the Insurance Masters application

describe('Complete Workflow: Group to Quote', () => {
  beforeEach(() => {
    // Reset database state and seed minimal test data
    cy.task('db:reset');
    cy.task('db:seed', {
      counties: [
        { countyId: 'TRAVIS_TX', countyName: 'Travis', stateAbbreviation: 'TX', stateName: 'Texas' }
      ],
      plans: [
        {
          planId: 'PLAN_001',
          planName: 'Silver Essential HMO',
          issuerId: 'ISSUER_001',
          issuerName: 'Texas Health Insurance',
          metalLevel: 'Silver',
          planType: 'HMO',
          monthlyPremium: 350.00
        },
        {
          planId: 'PLAN_002',
          planName: 'Gold Premium PPO',
          issuerId: 'ISSUER_002',
          issuerName: 'Premium Health Plans',
          metalLevel: 'Gold',
          planType: 'PPO',
          monthlyPremium: 475.00
        }
      ]
    });
    
    // Visit application homepage
    cy.visit('/');
  });
  
  describe('Step 1: Group Setup', () => {
    it('should complete group setup with valid information', () => {
      // Navigate to group setup
      cy.contains('Create New Group').click();
      cy.url().should('include', '/group-setup');
      
      // Verify we're on the Basic Info step
      cy.contains('Group Information').should('be.visible');
      cy.get('[data-cy=progress-indicator]').should('contain', 'Step 1 of 3');
      
      // Fill out basic information
      cy.get('[data-cy=group-name]').type('Cypress Test Company');
      cy.get('[data-cy=street-address]').type('123 Test Street');
      cy.get('[data-cy=city]').type('Austin');
      cy.get('[data-cy=state]').select('TX');
      
      // Test ZIP code resolution
      cy.get('[data-cy=zip-code]').type('78701');
      
      // Wait for ZIP resolution
      cy.contains('Resolving ZIP code...').should('be.visible');
      cy.contains('County: Travis, TX', { timeout: 10000 }).should('be.visible');
      
      // Set effective date
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];
      cy.get('[data-cy=effective-date]').type(futureDateString);
      
      // Continue to next step
      cy.get('[data-cy=continue-button]').click();
      
      // Verify we moved to step 2
      cy.contains('Summary').should('be.visible');
      cy.get('[data-cy=progress-indicator]').should('contain', 'Step 2 of 3');
      
      // Review information
      cy.contains('Cypress Test Company').should('be.visible');
      cy.contains('123 Test Street').should('be.visible');
      cy.contains('Austin, TX 78701').should('be.visible');
      cy.contains('Travis County').should('be.visible');
      
      // Complete group creation
      cy.get('[data-cy=create-group-button]').click();
      
      // Wait for group creation and navigation
      cy.url({ timeout: 15000 }).should('include', '/group/');
      cy.contains('Group created successfully').should('be.visible');
    });
    
    it('should handle multi-county ZIP codes', () => {
      cy.visit('/group-setup');
      
      // Mock a multi-county ZIP response
      cy.intercept('POST', '/api/geographic/resolve-zip', {
        success: true,
        data: {
          zipCode: '12345',
          isMultiCounty: true,
          primaryCounty: { countyId: 'COUNTY_A', countyName: 'County A', stateAbbreviation: 'TX' },
          allCounties: [
            { countyId: 'COUNTY_A', countyName: 'County A', stateAbbreviation: 'TX' },
            { countyId: 'COUNTY_B', countyName: 'County B', stateAbbreviation: 'TX' },
            { countyId: 'COUNTY_C', countyName: 'County C', stateAbbreviation: 'TX' }
          ]
        }
      }).as('resolveMultiCountyZip');
      
      // Fill basic info
      cy.get('[data-cy=group-name]').type('Multi County Test');
      cy.get('[data-cy=street-address]').type('456 Multi Street');
      cy.get('[data-cy=city]').type('Border City');
      cy.get('[data-cy=state]').select('TX');
      
      // Enter multi-county ZIP
      cy.get('[data-cy=zip-code]').type('12345');
      cy.wait('@resolveMultiCountyZip');
      
      // Verify modal opens
      cy.contains('Multiple Counties Found').should('be.visible');
      cy.contains('County A, TX').should('be.visible');
      cy.contains('County B, TX').should('be.visible');
      cy.contains('County C, TX').should('be.visible');
      
      // Select a county
      cy.contains('County B, TX').click();
      
      // Verify selection
      cy.contains('County: County B, TX').should('be.visible');
      cy.get('[data-cy=multi-county-modal]').should('not.exist');
    });
  });
  
  describe('Step 2: ICHRA Class Management', () => {
    beforeEach(() => {
      // Create a group first
      cy.task('createTestGroup').then((group) => {
        cy.wrap(group._id).as('groupId');
        cy.visit(`/group/${group._id}/classes`);
      });
    });
    
    it('should create and manage ICHRA classes', function() {
      // Verify we're on class management page
      cy.contains('ICHRA Class Management').should('be.visible');
      cy.contains('No classes created yet').should('be.visible');
      
      // Create first class
      cy.get('[data-cy=create-class-button]').click();
      
      // Fill class information
      cy.get('[data-cy=class-name]').type('Full-time Employees');
      cy.get('[data-cy=class-description]').type('All full-time employees working 30+ hours per week');
      cy.get('[data-cy=monthly-contribution]').type('400');
      
      // Save class
      cy.get('[data-cy=save-class-button]').click();
      
      // Verify class was created
      cy.contains('Class created successfully').should('be.visible');
      cy.contains('Full-time Employees').should('be.visible');
      cy.contains('$400.00 / month').should('be.visible');
      
      // Create second class
      cy.get('[data-cy=create-class-button]').click();
      cy.get('[data-cy=class-name]').type('Part-time Employees');
      cy.get('[data-cy=class-description]').type('Employees working less than 30 hours per week');
      cy.get('[data-cy=monthly-contribution]').type('250');
      cy.get('[data-cy=save-class-button]').click();
      
      // Verify both classes exist
      cy.contains('Full-time Employees').should('be.visible');
      cy.contains('Part-time Employees').should('be.visible');
      
      // Test age-based sub-class creation
      cy.get('[data-cy=class-row]').first().find('[data-cy=manage-subclasses]').click();
      
      // Create age-based sub-class
      cy.contains('Age-Based Sub-Classes').should('be.visible');
      cy.get('[data-cy=add-subclass-button]').click();
      
      cy.get('[data-cy=subclass-name]').type('Senior Employees');
      cy.get('[data-cy=min-age]').type('50');
      cy.get('[data-cy=max-age]').type('64');
      cy.get('[data-cy=subclass-contribution]').type('500');
      
      cy.get('[data-cy=save-subclass-button]').click();
      
      // Verify sub-class creation
      cy.contains('Senior Employees (50-64 years)').should('be.visible');
      cy.contains('$500.00 / month').should('be.visible');
    });
    
    it('should validate class contribution amounts', function() {
      cy.get('[data-cy=create-class-button]').click();
      
      // Test negative contribution
      cy.get('[data-cy=class-name]').type('Invalid Class');
      cy.get('[data-cy=monthly-contribution]').type('-100');
      cy.get('[data-cy=save-class-button]').click();
      
      cy.contains('Contribution must be a positive amount').should('be.visible');
      
      // Test too high contribution
      cy.get('[data-cy=monthly-contribution]').clear().type('5000');
      cy.get('[data-cy=save-class-button]').click();
      
      cy.contains('Contribution cannot exceed $2000 per month').should('be.visible');
    });
  });
  
  describe('Step 3: Member Management', () => {
    beforeEach(() => {
      cy.task('createTestGroupWithClass').then((data) => {
        cy.wrap(data.group._id).as('groupId');
        cy.wrap(data.class._id).as('classId');
        cy.visit(`/group/${data.group._id}/members`);
      });
    });
    
    it('should add individual members manually', function() {
      // Verify member management page
      cy.contains('Member Management').should('be.visible');
      cy.contains('No members added yet').should('be.visible');
      
      // Add first member
      cy.get('[data-cy=add-member-button]').click();
      
      // Fill member information
      cy.get('[data-cy=first-name]').type('John');
      cy.get('[data-cy=last-name]').type('Doe');
      cy.get('[data-cy=date-of-birth]').type('1990-05-15');
      cy.get('[data-cy=zip-code]').type('78701');
      cy.get('[data-cy=tobacco-use]').check();
      
      // Select class
      cy.get('[data-cy=class-select]').select('Full-time Employees');
      
      // Fill previous contributions (required)
      cy.get('[data-cy=previous-employer-contribution]').type('450');
      cy.get('[data-cy=previous-member-contribution]').type('125');
      cy.get('[data-cy=previous-plan-name]').type('Blue Cross Silver Plan');
      
      // Save member
      cy.get('[data-cy=save-member-button]').click();
      
      // Verify member was added
      cy.contains('Member added successfully').should('be.visible');
      cy.contains('John Doe').should('be.visible');
      cy.contains('Age: 34').should('be.visible'); // Calculated age
      cy.contains('Tobacco User').should('be.visible');
      cy.contains('Previous: $450 employer + $125 member').should('be.visible');
      
      // Add member with dependents
      cy.get('[data-cy=add-member-button]').click();
      cy.get('[data-cy=first-name]').type('Jane');
      cy.get('[data-cy=last-name]').type('Smith');
      cy.get('[data-cy=date-of-birth]').type('1985-08-20');
      cy.get('[data-cy=zip-code]').type('78701');
      cy.get('[data-cy=class-select]').select('Full-time Employees');
      
      // Add dependent
      cy.get('[data-cy=add-dependent-button]').click();
      cy.get('[data-cy=dependent-name]').type('Child Smith');
      cy.get('[data-cy=dependent-dob]').type('2015-03-10');
      cy.get('[data-cy=dependent-relationship]').select('Child');
      
      // Previous contributions
      cy.get('[data-cy=previous-employer-contribution]').type('600');
      cy.get('[data-cy=previous-member-contribution]').type('200');
      cy.get('[data-cy=previous-plan-name]').type('Family Health Plan');
      
      cy.get('[data-cy=save-member-button]').click();
      
      // Verify family member
      cy.contains('Jane Smith').should('be.visible');
      cy.contains('1 dependent').should('be.visible');
    });
    
    it('should handle bulk member upload', function() {
      // Test CSV upload
      cy.get('[data-cy=bulk-upload-button]').click();
      
      // Verify upload interface
      cy.contains('Bulk Member Upload').should('be.visible');
      cy.contains('Download Template').should('be.visible');
      
      // Download template first
      cy.get('[data-cy=download-template]').click();
      
      // Create and upload test CSV
      const csvContent = `firstName,lastName,dateOfBirth,zipCode,tobaccoUse,className,previousEmployerContribution,previousMemberContribution,previousPlanName
John,Doe,1990-01-01,78701,false,Full-time Employees,400,150,Previous Plan 1
Jane,Smith,1985-05-15,78701,false,Full-time Employees,400,150,Previous Plan 2
Bob,Johnson,1992-12-10,78701,true,Full-time Employees,400,150,Previous Plan 3`;
      
      const fileName = 'test-members.csv';
      cy.get('[data-cy=file-input]').selectFile({
        contents: csvContent,
        fileName: fileName,
        mimeType: 'text/csv'
      });
      
      // Verify file selection
      cy.contains(fileName).should('be.visible');
      cy.contains('3 rows detected').should('be.visible');
      
      // Upload file
      cy.get('[data-cy=upload-button]').click();
      
      // Wait for upload progress
      cy.contains('Uploading:', { timeout: 10000 }).should('be.visible');
      cy.get('[data-cy=progress-bar]').should('be.visible');
      
      // Wait for completion
      cy.contains('Upload Completed', { timeout: 15000 }).should('be.visible');
      cy.contains('3 of 3 members imported successfully').should('be.visible');
      
      // Close upload modal
      cy.get('[data-cy=close-upload-button]').click();
      
      // Verify members were imported
      cy.contains('John Doe').should('be.visible');
      cy.contains('Jane Smith').should('be.visible');
      cy.contains('Bob Johnson').should('be.visible');
    });
    
    it('should handle upload errors gracefully', function() {
      cy.get('[data-cy=bulk-upload-button]').click();
      
      // Upload CSV with errors
      const csvWithErrors = `firstName,lastName,dateOfBirth,zipCode,tobaccoUse,className,previousEmployerContribution,previousMemberContribution,previousPlanName
John,Doe,invalid-date,78701,false,Full-time Employees,400,150,Previous Plan
,Smith,1985-05-15,78701,false,Full-time Employees,400,150,Previous Plan
Bob,Johnson,1992-12-10,INVALID,true,Invalid Class,400,150,Previous Plan`;
      
      cy.get('[data-cy=file-input]').selectFile({
        contents: csvWithErrors,
        fileName: 'members-with-errors.csv',
        mimeType: 'text/csv'
      });
      
      cy.get('[data-cy=upload-button]').click();
      
      // Wait for processing
      cy.contains('Upload Completed', { timeout: 15000 }).should('be.visible');
      cy.contains('0 of 3 members imported successfully').should('be.visible');
      cy.contains('3 errors found').should('be.visible');
      
      // View error details
      cy.get('[data-cy=view-errors-button]').click();
      cy.contains('Row 1: Invalid date format').should('be.visible');
      cy.contains('Row 2: Missing required field: firstName').should('be.visible');
      cy.contains('Row 3: Invalid ZIP code').should('be.visible');
      
      // Download error report
      cy.get('[data-cy=download-errors-button]').should('be.visible');
    });
  });
  
  describe('Step 4: Quote Generation and Results', () => {
    beforeEach(() => {
      cy.task('createCompleteTestGroup').then((data) => {
        cy.wrap(data.group._id).as('groupId');
        cy.visit(`/group/${data.group._id}/quote`);
      });
    });
    
    it('should generate and display quote results', function() {
      // Verify quote page setup
      cy.contains('Generate ICHRA Quote').should('be.visible');
      cy.contains('5 members ready for quote').should('be.visible');
      
      // Start quote generation
      cy.get('[data-cy=generate-quote-button]').click();
      
      // Wait for quote processing
      cy.contains('Generating quote...', { timeout: 5000 }).should('be.visible');
      cy.get('[data-cy=quote-progress]').should('be.visible');
      
      // Wait for results
      cy.url({ timeout: 30000 }).should('include', '/quote-results');
      cy.contains('Quote Results', { timeout: 10000 }).should('be.visible');
      
      // Verify summary statistics
      cy.get('[data-cy=summary-stats]').should('be.visible');
      cy.contains('Total Employees: 5').should('be.visible');
      cy.contains('Monthly Savings:').should('be.visible');
      cy.contains('Annual Savings:').should('be.visible');
      
      // Verify employer comparison
      cy.get('[data-cy=employer-comparison]').should('be.visible');
      cy.contains('Old Total Cost').should('be.visible');
      cy.contains('New ICHRA Cost').should('be.visible');
      cy.get('[data-cy=savings-chart]').should('be.visible');
      
      // Verify employee comparisons
      cy.get('[data-cy=employee-comparisons]').should('be.visible');
      cy.contains('Individual Employee Analysis').should('be.visible');
      
      // Check that all employees are listed
      cy.get('[data-cy=employee-row]').should('have.length', 5);
      
      // Verify plan results table
      cy.get('[data-cy=plan-results]').should('be.visible');
      cy.contains('Available Plans').should('be.visible');
      cy.get('[data-cy=plan-row]').should('have.length.greaterThan', 0);
    });
    
    it('should apply filters and update results in real-time', function() {
      // Wait for initial quote generation
      cy.visit(`/group/${this.groupId}/quote-results`);
      cy.contains('Quote Results', { timeout: 15000 }).should('be.visible');
      
      // Verify initial plan count
      cy.get('[data-cy=plan-count]').should('contain', 'plans available');
      
      // Apply metal level filter
      cy.get('[data-cy=filter-sidebar]').should('be.visible');
      cy.get('[data-cy=metal-level-silver]').check();
      
      // Verify filter is applied and results update
      cy.contains('Filters applied', { timeout: 5000 }).should('be.visible');
      cy.get('[data-cy=plan-row]').should('have.length.greaterThan', 0);
      
      // Apply carrier filter
      cy.get('[data-cy=carrier-filter]').click();
      cy.get('[data-cy=carrier-texas-health]').check();
      cy.get('[data-cy=apply-filters]').click();
      
      // Verify filtered results
      cy.contains('Texas Health Insurance').should('be.visible');
      
      // Apply plan type filter
      cy.get('[data-cy=plan-type-hmo]').check();
      
      // Clear all filters
      cy.get('[data-cy=clear-all-filters]').click();
      cy.contains('All filters cleared').should('be.visible');
      
      // Verify all plans are shown again
      cy.get('[data-cy=plan-row]').should('have.length.greaterThan', 2);
    });
    
    it('should allow detailed employee analysis', function() {
      cy.visit(`/group/${this.groupId}/quote-results`);
      cy.contains('Quote Results', { timeout: 15000 }).should('be.visible');
      
      // Click on first employee for details
      cy.get('[data-cy=employee-row]').first().click();
      
      // Verify expanded details
      cy.contains('Plan Options for').should('be.visible');
      cy.contains('Old Out-of-Pocket:').should('be.visible');
      cy.contains('ICHRA Contribution:').should('be.visible');
      cy.contains('Top 3 Recommended Plans').should('be.visible');
      
      // Check plan recommendations
      cy.get('[data-cy=recommended-plan]').should('have.length', 3);
      cy.get('[data-cy=plan-savings]').should('be.visible');
      
      // Test plan comparison
      cy.get('[data-cy=compare-plans]').click();
      cy.contains('Plan Comparison').should('be.visible');
      cy.get('[data-cy=comparison-table]').should('be.visible');
    });
    
    it('should handle quote export functionality', function() {
      cy.visit(`/group/${this.groupId}/quote-results`);
      cy.contains('Quote Results', { timeout: 15000 }).should('be.visible');
      
      // Test PDF export
      cy.get('[data-cy=export-menu]').click();
      cy.get('[data-cy=export-pdf]').click();
      
      cy.contains('Generating PDF...').should('be.visible');
      cy.contains('PDF downloaded successfully', { timeout: 10000 }).should('be.visible');
      
      // Test Excel export
      cy.get('[data-cy=export-menu]').click();
      cy.get('[data-cy=export-excel]').click();
      
      cy.contains('Excel file downloaded').should('be.visible');
      
      // Test email sharing
      cy.get('[data-cy=export-menu]').click();
      cy.get('[data-cy=share-email]').click();
      
      cy.get('[data-cy=email-modal]').should('be.visible');
      cy.get('[data-cy=recipient-email]').type('client@example.com');
      cy.get('[data-cy=email-message]').type('Please review the attached ICHRA quote.');
      cy.get('[data-cy=send-email]').click();
      
      cy.contains('Quote sent successfully').should('be.visible');
    });
  });
  
  describe('Cross-Browser and Mobile Testing', () => {
    it('should work on mobile viewport', () => {
      cy.viewport('iphone-x');
      
      // Test mobile navigation
      cy.visit('/');
      cy.get('[data-cy=mobile-menu-button]').click();
      cy.contains('Create New Group').should('be.visible');
      
      // Test responsive forms
      cy.contains('Create New Group').click();
      cy.get('[data-cy=group-name]').should('be.visible');
      
      // Verify mobile-optimized inputs
      cy.get('[data-cy=zip-code]').should('have.attr', 'inputmode', 'numeric');
    });
    
    it('should work on tablet viewport', () => {
      cy.viewport('ipad-2');
      
      cy.visit('/');
      cy.contains('Create New Group').click();
      
      // Test tablet layout
      cy.get('[data-cy=form-container]').should('be.visible');
      cy.get('[data-cy=progress-indicator]').should('be.visible');
    });
  });
  
  describe('Error Scenarios and Edge Cases', () => {
    it('should handle network failures gracefully', () => {
      // Simulate network failure
      cy.intercept('POST', '/api/groups', { forceNetworkError: true }).as('networkFailure');
      
      cy.visit('/group-setup');
      
      // Fill form
      cy.get('[data-cy=group-name]').type('Network Test Group');
      cy.get('[data-cy=street-address]').type('123 Network St');
      cy.get('[data-cy=city]').type('Austin');
      cy.get('[data-cy=state]').select('TX');
      cy.get('[data-cy=zip-code]').type('78701');
      
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      cy.get('[data-cy=effective-date]').type(futureDate.toISOString().split('T')[0]);
      
      cy.get('[data-cy=continue-button]').click();
      cy.get('[data-cy=create-group-button]').click();
      
      cy.wait('@networkFailure');
      
      // Verify error handling
      cy.contains('Network error').should('be.visible');
      cy.contains('Please check your connection and try again').should('be.visible');
      cy.get('[data-cy=retry-button]').should('be.visible');
    });
    
    it('should handle session timeout', () => {
      // Mock session timeout
      cy.intercept('GET', '/api/groups/*', { statusCode: 401 }).as('sessionTimeout');
      
      cy.task('createTestGroup').then((group) => {
        cy.visit(`/group/${group._id}`);
        cy.wait('@sessionTimeout');
        
        // Should redirect to login or show session expired message
        cy.contains('Session expired').should('be.visible');
      });
    });
    
    it('should validate data integrity throughout workflow', () => {
      // Complete full workflow and verify data consistency
      cy.task('createCompleteTestGroup').then((data) => {
        cy.visit(`/group/${data.group._id}`);
        
        // Verify group data
        cy.contains(data.group.groupName).should('be.visible');
        cy.contains(data.group.address.zipCode).should('be.visible');
        
        // Navigate to classes and verify
        cy.get('[data-cy=nav-classes]').click();
        cy.contains(data.class.className).should('be.visible');
        cy.contains(`$${data.class.monthlyContribution}`).should('be.visible');
        
        // Navigate to members and verify
        cy.get('[data-cy=nav-members]').click();
        cy.get('[data-cy=member-row]').should('have.length', data.members.length);
        
        // Generate quote and verify data consistency
        cy.get('[data-cy=nav-quote]').click();
        cy.get('[data-cy=generate-quote-button]').click();
        
        cy.url({ timeout: 30000 }).should('include', '/quote-results');
        
        // Verify all member data is preserved in quote
        cy.contains(`Total Employees: ${data.members.length}`).should('be.visible');
      });
    });
  });
}); 