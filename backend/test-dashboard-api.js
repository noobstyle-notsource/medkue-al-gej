const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
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
    // Step 1: Login
    console.log('\n1️⃣  Logging in...');
    const loginRes = await request('POST', '/api/auth/login', {
      identifier: 'test@test.com',
      password: 'password123'
    });
    console.log('Status:', loginRes.status);
    
    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.data);
      return;
    }
    
    const token = loginRes.data.token;
    console.log('✓ Token obtained:', token.substring(0, 20) + '...');
    
    // Step 2: Test dashboard
    console.log('\n2️⃣  Testing /api/dashboard/summary...');
    const dashboardRes = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/dashboard/summary',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    console.log('Status:', dashboardRes.status);
    console.log('Response:', JSON.stringify(dashboardRes.data, null, 2));
    
    if (dashboardRes.status === 500) {
      console.error('\n❌ Dashboard returned 500 error!');
    } else {
      console.log('\n✓ Dashboard working!');
    }
    
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
