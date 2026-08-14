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

async function runVerification() {
  console.log("=== STARTING COMPREHENSIVE CARD SEGMENT PROGRAMME CHARGES VERIFICATION ===");

  // 1. Authenticate as Super Admin / Maker
  console.log("\n[STEP 1] Authenticating Maker User...");
  const authRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'password123' });

  if (authRes.status !== 200 || !authRes.data.access_token) {
    console.error("FAILED to authenticate maker:", authRes);
    return;
  }
  const token = authRes.data.access_token;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  console.log("Maker Authenticated successfully.");

  // 2. GET /config/card-segment-programme-charges (List)
  console.log("\n[STEP 2] Verifying GET /config/card-segment-programme-charges (Master List)...");
  const listRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/config/card-segment-programme-charges?status_filter=active',
    method: 'GET',
    headers
  });
  console.log(`Master List Status: ${listRes.status}`);
  console.log(`Total Active Records: ${listRes.data.total}`);
  console.log(`Items returned: ${listRes.data.items ? listRes.data.items.length : 0}`);
  if (listRes.data.items && listRes.data.items.length > 0) {
    const item = listRes.data.items[0];
    console.log("Sample Item Structure:", {
      id: item.id,
      segment: `${item.segment_name} (${item.segment_code})`,
      programme: `${item.card_programme_name} (${item.card_programme_code})`,
      charge_header: item.charge_name,
      processing_mode: item.processing_mode_code,
      priority: item.priority,
      active: item.active,
      has_pending_change: item.has_pending_change,
      pending_work_item_id: item.pending_work_item_id
    });
  }

  // 3. GET Lookups
  console.log("\n[STEP 3] Verifying Lookup Providers...");
  const spLookup = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/config/card-segment-programme-charges/segment-programmes/lookup',
    method: 'GET',
    headers
  });
  console.log(`Segment Programme Lookups Status: ${spLookup.status}, Count: ${Array.isArray(spLookup.data) ? spLookup.data.length : 0}`);

  const chLookup = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/config/card-segment-programme-charges/charge-headers/lookup',
    method: 'GET',
    headers
  });
  console.log(`Charge Header Lookups Status: ${chLookup.status}, Count: ${Array.isArray(chLookup.data) ? chLookup.data.length : 0}`);

  if (!spLookup.data.length || !chLookup.data.length) {
    console.error("Lookups missing seed data!");
    return;
  }

  const targetSPId = spLookup.data[0].id;
  const targetCHId = chLookup.data[0].id;

  // 4. CREATE → MAKER/CHECKER
  console.log("\n[STEP 4] Testing CREATE → Maker/Checker Workflow...");
  const createRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/config/card-segment-programme-charges',
    method: 'POST',
    headers
  }, {
    card_segment_programme_id: targetSPId,
    charge_header_id: targetCHId,
    processing_mode_code: 'RENEWAL',
    priority: 15
  });

  console.log(`Create Submission Status: ${createRes.status}`);
  console.log("Create Submission Response:", createRes.data);

  let workItemId = createRes.data.work_item_id;

  // 5. MAKER/CHECKER APPROVAL
  if (workItemId) {
    console.log(`\n[STEP 5] Authenticating Checker User...`);
    const checkerAuth = await request({
      hostname: '127.0.0.1',
      port: 8000,
      path: '/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'controlc', password: 'password123' });

    const checkerHeaders = {
      'Authorization': `Bearer ${checkerAuth.data.access_token}`,
      'Content-Type': 'application/json'
    };

    console.log(`Approving Work Item MC-${String(workItemId).padStart(8, '0')}...`);
    const approveRes = await request({
      hostname: '127.0.0.1',
      port: 8000,
      path: `/maker-checker/${workItemId}/approve`,
      method: 'POST',
      headers: checkerHeaders
    }, { remarks: "Approved during automated verification" });

    console.log(`Approval Status: ${approveRes.status}`);
    console.log("Approval Response:", approveRes.data);
  }

  // 6. DUPLICATE REJECTION VALIDATION
  console.log("\n[STEP 6] Testing Duplicate Mapping Rejection Validation...");
  const dupRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/config/card-segment-programme-charges',
    method: 'POST',
    headers
  }, {
    card_segment_programme_id: targetSPId,
    charge_header_id: targetCHId,
    processing_mode_code: 'RENEWAL',
    priority: 15
  });
  console.log(`Duplicate Submission Status: ${dupRes.status} (Expected 409)`);
  console.log("Duplicate Rejection Detail:", dupRes.data.detail);

  // 7. GET DETAIL
  console.log("\n[STEP 7] Verifying Detail View Endpoint...");
  const updatedList = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/config/card-segment-programme-charges?status_filter=active',
    method: 'GET',
    headers
  });
  const createdRecord = updatedList.data.items.find(i => i.card_segment_programme_id === targetSPId && i.processing_mode_code === 'RENEWAL');
  if (createdRecord) {
    console.log(`Created Record ID: ${createdRecord.id}`);
    const detailRes = await request({
      hostname: '127.0.0.1',
      port: 8000,
      path: `/config/card-segment-programme-charges/${createdRecord.id}`,
      method: 'GET',
      headers
    });
    console.log(`Detail Endpoint Status: ${detailRes.status}`);
    console.log("Detail Breakdown Entries Count:", detailRes.data.entries ? detailRes.data.entries.length : 0);
  }

  // 8. NO-CHANGE EDIT TEST
  if (createdRecord) {
    console.log("\n[STEP 8] Testing No-Change Edit Rejection...");
    const noChangeRes = await request({
      hostname: '127.0.0.1',
      port: 8000,
      path: `/config/card-segment-programme-charges/${createdRecord.id}`,
      method: 'PUT',
      headers
    }, {
      charge_header_id: createdRecord.charge_header_id,
      processing_mode_code: createdRecord.processing_mode_code,
      priority: createdRecord.priority
    });
    console.log(`No-Change PUT Status: ${noChangeRes.status} (Expected 200 with NO_CHANGE)`);
    console.log("No-Change Response:", noChangeRes.data);
  }

  // 9. DEACTIVATE / ACTIVATE WORKFLOW
  if (createdRecord) {
    console.log("\n[STEP 9] Testing DEACTIVATE Workflow...");
    const deactRes = await request({
      hostname: '127.0.0.1',
      port: 8000,
      path: `/config/card-segment-programme-charges/${createdRecord.id}/deactivate`,
      method: 'POST',
      headers
    });
    console.log(`Deactivate Submission Status: ${deactRes.status}`);
    console.log("Deactivate Submission Response:", deactRes.data);

    if (deactRes.data.work_item_id) {
      console.log(`Approving Deactivation Work Item MC-${String(deactRes.data.work_item_id).padStart(8, '0')}...`);
      const appDeact = await request({
        hostname: '127.0.0.1',
        port: 8000,
        path: `/maker-checker/${deactRes.data.work_item_id}/approve`,
        method: 'POST',
        headers
      }, { remarks: "Approve deactivation" });
      console.log(`Deactivation Approval Status: ${appDeact.status}`);
    }
  }

  console.log("\n=== COMPREHENSIVE VERIFICATION COMPLETE ===");
}

runVerification().catch(console.error);
