// Script to add test data for development
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const Group = require('../src/models/Group');
const ICHRAClass = require('../src/models/ICHRAClass');
const Member = require('../src/models/Member');

async function addTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insurance-masters');
    console.log('✅ Connected to MongoDB');

    // Create a test group
    const testGroup = await Group.create({
      name: 'Acme Corporation',
      address: {
        street: '123 Main St',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201'
      },
      contact: {
        name: 'John Smith',
        email: 'john@acmecorp.com',
        phone: '503-555-1234'
      },
      effectiveDate: new Date('2024-01-01'),
      employeeCount: 5
    });
    console.log('✅ Created test group:', testGroup.name);

    // Create ICHRA classes
    const fullTimeClass = await ICHRAClass.create({
      groupId: testGroup._id,
      className: 'Full-Time Employees',
      description: 'All full-time employees working 30+ hours',
      contributionType: 'fixed',
      baseContribution: {
        employee: 500,
        spouse: 300,
        children: 200,
        family: 1200
      },
      minimumEssentialCoverage: true,
      affordabilityThreshold: 9.12
    });
    console.log('✅ Created ICHRA class:', fullTimeClass.className);

    // Create test members with varying previous contributions
    const testMembers = [
      {
        groupId: testGroup._id,
        ideonMemberId: 'TEST001',
        classId: fullTimeClass._id,
        personalInfo: {
          firstName: 'Alice',
          lastName: 'Johnson',
          dateOfBirth: new Date('1985-03-15'),
          age: 39,
          zipCode: '97201',
          tobacco: false,
          householdIncome: 65000,
          familySize: 1
        },
        previousContributions: {
          employerContribution: 450,
          memberContribution: 150,
          planName: 'Blue Cross Gold PPO',
          planType: 'PPO',
          metalLevel: 'Gold',
          carrier: 'Blue Cross'
        }
      },
      {
        groupId: testGroup._id,
        ideonMemberId: 'TEST002',
        classId: fullTimeClass._id,
        personalInfo: {
          firstName: 'Bob',
          lastName: 'Smith',
          dateOfBirth: new Date('1978-07-22'),
          age: 46,
          zipCode: '97202',
          tobacco: false,
          householdIncome: 85000,
          familySize: 3
        },
        previousContributions: {
          employerContribution: 600,
          memberContribution: 300,
          planName: 'Kaiser Silver HMO',
          planType: 'HMO',
          metalLevel: 'Silver',
          carrier: 'Kaiser'
        }
      },
      {
        groupId: testGroup._id,
        ideonMemberId: 'TEST003',
        classId: fullTimeClass._id,
        personalInfo: {
          firstName: 'Carol',
          lastName: 'Davis',
          dateOfBirth: new Date('1990-11-10'),
          age: 34,
          zipCode: '97201',
          tobacco: false,
          householdIncome: 55000,
          familySize: 2
        },
        previousContributions: {
          employerContribution: 400,
          memberContribution: 200,
          planName: 'Providence Bronze HSA',
          planType: 'HDHP',
          metalLevel: 'Bronze',
          carrier: 'Providence'
        }
      },
      {
        groupId: testGroup._id,
        ideonMemberId: 'TEST004',
        classId: fullTimeClass._id,
        personalInfo: {
          firstName: 'David',
          lastName: 'Wilson',
          dateOfBirth: new Date('1988-02-28'),
          age: 36,
          zipCode: '97203',
          tobacco: true,
          householdIncome: 72000,
          familySize: 1
        },
        previousContributions: {
          employerContribution: 500,
          memberContribution: 250,
          planName: 'Regence Silver PPO',
          planType: 'PPO',
          metalLevel: 'Silver',
          carrier: 'Regence'
        }
      },
      {
        groupId: testGroup._id,
        ideonMemberId: 'TEST005',
        classId: fullTimeClass._id,
        personalInfo: {
          firstName: 'Emma',
          lastName: 'Brown',
          dateOfBirth: new Date('1995-09-05'),
          age: 29,
          zipCode: '97204',
          tobacco: false,
          householdIncome: 48000,
          familySize: 1
        },
        previousContributions: {
          employerContribution: 350,
          memberContribution: 100,
          planName: 'Moda Bronze EPO',
          planType: 'EPO',
          metalLevel: 'Bronze',
          carrier: 'Moda'
        }
      }
    ];

    for (const memberData of testMembers) {
      const member = await Member.create(memberData);
      console.log(`✅ Created member: ${member.personalInfo.firstName} ${member.personalInfo.lastName}`);
    }

    console.log('\n📊 Test data summary:');
    console.log(`- Group: ${testGroup.name}`);
    console.log(`- ICHRA Class: ${fullTimeClass.className} ($${fullTimeClass.baseContribution.employee}/month)`);
    console.log(`- Members: ${testMembers.length}`);
    console.log(`- Total old employer cost: $${testMembers.reduce((sum, m) => sum + m.previousContributions.employerContribution, 0)}/month`);
    console.log(`- Total old member cost: $${testMembers.reduce((sum, m) => sum + m.previousContributions.memberContribution, 0)}/month`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Test data added successfully');
    console.log(`Group ID: ${testGroup._id}`);
    console.log('You can now generate quotes for this group!');
  } catch (error) {
    console.error('❌ Error adding test data:', error);
    process.exit(1);
  }
}

addTestData();