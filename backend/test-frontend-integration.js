/**
 * Frontend Integration Test
 * Tests the complete login -> dashboard flow
 */

const http = require('http');

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  try {
    console.log('🧪 Frontend Integration Test\n');
    
    // Step 1: Login
    console.log('Step 1️⃣ : Login with test user...');
    const loginRes = await request('POST', '/api/auth/login', {
      identifier: 'test@test.com',
      password: 'password123'
    });
    
    if (loginRes.status !== 200) {
      console.error('❌ Login failed:', loginRes.data);
      return;
    }
    
    const token = loginRes.data.token;
    console.log('✅ Login successful');
    console.log('   Token:', token.substring(0, 30) + '...\n');
    
    // Step 2: Get current user
    console.log('Step 2️⃣ : Get current user (/api/auth/me)...');
    const meRes = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${token}`
    });
    
    if (meRes.status !== 200) {
      console.error('❌ Get user failed:', meRes.data);
      return;
    }
    
    const user = meRes.data;
    console.log('✅ User fetched');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   TenantId: ${user.tenantId}\n`);
    
    // Step 3: Get dashboard summary
    console.log('Step 3️⃣ : Get dashboard summary...');
    const dashboardRes = await request('GET', '/api/dashboard/summary', null, {
      'Authorization': `Bearer ${token}`
    });
    
    if (dashboardRes.status !== 200) {
      console.error('❌ Dashboard failed:', dashboardRes.data);
      return;
    }
    
    const dashboard = dashboardRes.data;
    console.log('✅ Dashboard loaded');
    console.log(`   Won Amount: $${dashboard.wonAmount?.toLocaleString() || 0}`);
    console.log(`   Conversion Rate: ${dashboard.conversionRate}%`);
    console.log(`   Total Deals: ${dashboard.totalDeals}`);
    console.log(`   Won Count: ${dashboard.wonCount}`);
    console.log(`   Total Contacts: ${dashboard.totalContacts}`);
    console.log(`   Upcoming Deals: ${dashboard.upcomingDeals?.length || 0}\n`);
    
    // Step 4: Get all deals
    console.log('Step 4️⃣ : Get deals list...');
    const dealsRes = await request('GET', '/api/deals', null, {
      'Authorization': `Bearer ${token}`
    });
    
    if (dealsRes.status !== 200) {
      console.error('❌ Deals fetch failed:', dealsRes.data);
      return;
    }
    
    const deals = dealsRes.data;
    console.log('✅ Deals fetched');
    console.log(`   Total deals: ${deals.length || 0}`);
    if (deals.length > 0) {
      console.log(`   First deal: ${deals[0].title} (${deals[0].stage})\n`);
    }
    
    // Step 5: Get contacts
    console.log('Step 5️⃣ : Get contacts list...');
    const contactsRes = await request('GET', '/api/companies', null, {
      'Authorization': `Bearer ${token}`
    });
    
    if (contactsRes.status !== 200) {
      console.error('❌ Contacts fetch failed:', contactsRes.data);
      return;
    }
    
    const contacts = contactsRes.data;
    console.log('✅ Contacts fetched');
    console.log(`   Total contacts: ${contacts.length || 0}\n`);
    
    console.log('✅✅✅ All tests passed! Dashboard is ready for frontend.\n');
    
  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

test();
