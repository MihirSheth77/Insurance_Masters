#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

// API Key from your configuration
const API_KEY = process.env.IDEON_API_KEY || '02fad0e034b3334be1900bd3128a105c';

// Base API endpoint (confirmed from official docs)
const BASE_URL = 'https://api.ideonapi.com';

// Headers
const headers = {
  'Vericred-Api-Key': API_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Accept-Version': 'v6' // Default API version
};

async function testEndpoint(name, url, endpoint) {
  console.log(`\n🔍 Testing ${name}: ${url}${endpoint}`);
  
  try {
    const response = await axios.get(`${url}${endpoint}`, {
      headers,
      timeout: 10000
    });
    
    console.log(`✅ Success! Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    return true;
  } catch (error) {
    if (error.response) {
      console.log(`❌ Error: ${error.response.status} ${error.response.statusText}`);
      console.log('📦 Error Response:', JSON.stringify(error.response.data, null, 2));
      
      // 401 means auth is working but key is invalid
      // 404 means endpoint doesn't exist
      // 405 means method not allowed (but API is reachable)
      return error.response.status !== 404;
    } else if (error.request) {
      console.log('❌ No response received - network error or wrong URL');
      return false;
    } else {
      console.log('❌ Error:', error.message);
      return false;
    }
  }
}

async function testIdeonAPIs() {
  console.log('🚀 Testing Ideon API Integration');
  console.log('🔑 Using API Key:', API_KEY.substring(0, 8) + '...');
  console.log('=' .repeat(50));
  
  // Test different endpoints
  const tests = [
    // Basic connectivity
    { name: 'Networks Search', base: BASE_URL, endpoint: '/networks?search_term=Anthem' },
    { name: 'Plans List', base: BASE_URL, endpoint: '/plans' },
    { name: 'Carriers List', base: BASE_URL, endpoint: '/carriers' },
    
    // Group operations (may not be available in all trial accounts)
    { name: 'Groups List', base: BASE_URL, endpoint: '/groups' },
    
    // ICHRA endpoint
    { name: 'ICHRA Affordability', base: BASE_URL, endpoint: '/ichra_affordability' },
    
    // Additional endpoints to test
    { name: 'Service Areas', base: BASE_URL, endpoint: '/service_areas' },
    { name: 'Counties', base: BASE_URL, endpoint: '/counties' }
  ];
  
  console.log('\n📋 Running endpoint tests...\n');
  
  const results = [];
  for (const test of tests) {
    const success = await testEndpoint(test.name, test.base, test.endpoint);
    results.push({ ...test, success });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Summary:');
  console.log('=' .repeat(50));
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.base}${result.endpoint}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Success Rate: ${successCount}/${results.length} endpoints accessible`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (results.some(r => !r.success && r.name.includes('Health'))) {
    console.log('- Health endpoints may not be available in trial API');
  }
  if (results.filter(r => !r.success).length > results.length / 2) {
    console.log('- Check if your API key is valid and active');
    console.log('- Verify you have access to the trial API');
  }
  
  console.log('\n📚 Documentation: https://developers.ideonapi.com/');
  console.log('📧 Support: sales@ideonapi.com');
}

// Run the test
testIdeonAPIs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});