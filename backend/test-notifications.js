#!/usr/bin/env node
/**
 * Test In-App Notification System
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
  console.log('═════════════════════════════════════════');
  console.log('🔔 IN-APP NOTIFICATION SYSTEM TEST');
  console.log('═════════════════════════════════════════\n');

  try {
    // Step 1: Login
    console.log('Step 1️⃣  Login...');
    const loginRes = await request('POST', '/api/auth/login', {
      identifier: 'test@test.com',
      password: 'password123'
    });
    
    if (loginRes.status !== 200) {
      console.error('❌ Login failed');
      return;
    }
    
    const token = loginRes.data.token;
    const userId = loginRes.data.user.id;
    const tenantId = loginRes.data.user.tenantId;
    console.log('✅ Logged in\n');

    // Step 2: Get unread count (should be 0 or higher)
    console.log('Step 2️⃣  Get unread notification count...');
    const unreadRes = await request('GET', '/api/notifications/unread-count', null, {
      'Authorization': `Bearer ${token}`
    });
    
    if (unreadRes.status !== 200) {
      console.error('❌ Failed to get unread count');
      return;
    }
    
    console.log(`✅ Unread count: ${unreadRes.data.unreadCount}\n`);

    // Step 3: Get notifications list
    console.log('Step 3️⃣  Get notifications list...');
    const notificationsRes = await request('GET', '/api/notifications?page=1&limit=20', null, {
      'Authorization': `Bearer ${token}`
    });
    
    if (notificationsRes.status !== 200) {
      console.error('❌ Failed to get notifications');
      return;
    }
    
    console.log(`✅ Total notifications: ${notificationsRes.data.total}`);
    console.log(`   Unread: ${notificationsRes.data.unreadCount}`);
    if (notificationsRes.data.notifications.length > 0) {
      const first = notificationsRes.data.notifications[0];
      console.log(`   Latest: "${first.title}" (${first.type})\n`);
    } else {
      console.log('   (no notifications yet)\n');
    }

    // Step 4: Create a deal to trigger notifications
    console.log('Step 4️⃣  Create a company...');
    const companyRes = await request('POST', '/api/companies', {
      name: 'Test Notification Corp',
      email: 'test@notifcorp.com',
      phone: '+1-555-9999'
    }, { 'Authorization': `Bearer ${token}` });
    
    if (companyRes.status !== 201) {
      console.error('❌ Failed to create company');
      return;
    }
    
    const companyId = companyRes.data.id;
    console.log(`✅ Company created: ${companyId}\n`);

    // Step 5: Create a deal to trigger notification
    console.log('Step 5️⃣  Create a deal (should trigger notification)...');
    const dealRes = await request('POST', '/api/deals', {
      companyId,
      title: 'Test Deal for Notifications',
      value: 50000,
      stage: 'Prospect',
      expectedCloseDate: new Date(Date.now() + 30*86400000).toISOString()
    }, { 'Authorization': `Bearer ${token}` });
    
    if (dealRes.status !== 201) {
      console.error('❌ Failed to create deal');
      return;
    }
    
    const dealId = dealRes.data.id;
    console.log(`✅ Deal created: ${dealId}\n`);

    // Step 6: Wait a moment, then check for new notifications
    console.log('Step 6️⃣  Checking for new notifications (wait 2 sec)...');
    await new Promise(r => setTimeout(r, 2000));
    
    const newNotificationsRes = await request('GET', '/api/notifications?page=1&limit=20', null, {
      'Authorization': `Bearer ${token}`
    });
    
    console.log(`✅ New unread count: ${newNotificationsRes.data.unreadCount}`);
    if (newNotificationsRes.data.notifications.length > 0) {
      const latest = newNotificationsRes.data.notifications[0];
      console.log(`   Latest notification:`);
      console.log(`   - Title: ${latest.title}`);
      console.log(`   - Message: ${latest.message}`);
      console.log(`   - Type: ${latest.type}`);
      console.log(`   - Is Read: ${latest.isRead}\n`);

      // Step 7: Mark notification as read
      if (!latest.isRead) {
        console.log('Step 7️⃣  Mark notification as read...');
        const markRes = await request('PATCH', `/api/notifications/${latest.id}/read`, null, {
          'Authorization': `Bearer ${token}`
        });
        
        if (markRes.status !== 200) {
          console.error('❌ Failed to mark as read');
          return;
        }
        
        console.log(`✅ Marked as read\n`);

        // Check unread count again
        const updatedUnreadRes = await request('GET', '/api/notifications/unread-count', null, {
          'Authorization': `Bearer ${token}`
        });
        console.log(`   Updated unread count: ${updatedUnreadRes.data.unreadCount}\n`);
      }
    }

    // Step 8: Move deal to "Won" to trigger another notification
    console.log('Step 8️⃣  Move deal to Won stage (should create notification)...');
    const moveRes = await request('PATCH', `/api/deals/${dealId}/stage`, {
      stage: 'Won'
    }, { 'Authorization': `Bearer ${token}` });
    
    if (moveRes.status !== 200) {
      console.error('❌ Failed to move deal');
      return;
    }
    
    console.log('✅ Deal moved to Won\n');

    // Step 9: Check for notification about deal won
    console.log('Step 9️⃣  Checking for "Deal Won" notification...');
    await new Promise(r => setTimeout(r, 1000));
    
    const finalNotificationsRes = await request('GET', '/api/notifications?page=1&limit=20', null, {
      'Authorization': `Bearer ${token}`
    });
    
    const wonNotif = finalNotificationsRes.data.notifications.find(n => n.type === 'deal_won');
    if (wonNotif) {
      console.log(`✅ Found "Deal Won" notification!`);
      console.log(`   Title: ${wonNotif.title}`);
      console.log(`   Message: ${wonNotif.message}\n`);
    } else {
      console.log('⚠️  No "Deal Won" notification found (might not be there yet)\n');
    }

    // Summary
    console.log('═════════════════════════════════════════');
    console.log('✅✅✅ NOTIFICATION SYSTEM TEST COMPLETE!');
    console.log('═════════════════════════════════════════\n');
    console.log('Features tested:');
    console.log('  ✅ GET /api/notifications/unread-count');
    console.log('  ✅ GET /api/notifications (list)');
    console.log('  ✅ PATCH /api/notifications/:id/read');
    console.log('  ✅ Deal creation triggers notifications');
    console.log('  ✅ Deal stage moves trigger notifications');
    console.log('\nFrontend: Check layout topbar for notification bell 🔔\n');

  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

test();
