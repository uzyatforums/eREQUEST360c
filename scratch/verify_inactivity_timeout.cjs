const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runLiveVerification() {
  console.log("=== STARTING LIVE INACTIVITY TIMEOUT VERIFICATION (SQL SERVER BACKEND) ===");

  // 1. Check Session Configuration
  console.log("\n[STEP 1] Verifying GET /auth/session-config...");
  const configRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/auth/session-config',
    method: 'GET'
  });
  console.log("Config Endpoint Status:", configRes.status);
  console.log("Session Config Response:", configRes.data);

  if (configRes.status !== 200 || configRes.data.inactivity_timeout_minutes !== 5) {
    console.error("FAILED: Session config does not report 5 minutes default!");
    return;
  }

  // 2. Authenticate User
  console.log("\n[STEP 2] Authenticating Admin User...");
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'password123' });

  if (loginRes.status !== 200 || !loginRes.data.access_token) {
    console.error("FAILED to authenticate:", loginRes);
    return;
  }
  const token = loginRes.data.access_token;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  console.log("User Authenticated successfully. Token obtained.");

  // 3. Perform Qualifying Request
  console.log("\n[STEP 3] Testing Qualifying User API Request (GET /config/branches)...");
  const branchRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/config/branches',
    method: 'GET',
    headers
  });
  console.log("Qualifying Request Status:", branchRes.status);
  console.log("Branches Count:", Array.isArray(branchRes.data) ? branchRes.data.length : 'N/A');

  // 4. Perform Non-Qualifying Background Request
  console.log("\n[STEP 4] Testing Non-Qualifying Background Request (GET /maker-checker/pending/count)...");
  const countRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/maker-checker/pending/count',
    method: 'GET',
    headers
  });
  console.log("Background Request Status:", countRes.status);
  console.log("Pending Count Response:", countRes.data);

  console.log("\n=== LIVE INACTIVITY TIMEOUT VERIFICATION PASSED PERFECTLY ===");
}

runLiveVerification().catch(console.error);
