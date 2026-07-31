const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runBrowserTests() {
  console.log('=====================================================');
  console.log('   STARTING AUTOMATED BROWSER VERIFICATION SUITE    ');
  console.log('=====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];

  try {
    // Step 1: Login & Default Route
    console.log('Step 1: Navigating to http://localhost:5173/');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);

    if (page.url().includes('/login') || (await page.$('input[name="username"]'))) {
      console.log('Authenticating with username: admin, password: password123...');
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1500);
    }

    const url1 = page.url();
    const pass1 = url1 === 'http://localhost:5173/card-programmes';
    await page.screenshot({ path: path.join(screenshotDir, '01_list.png') });
    results.push({
      criterion: '1. Default Route after login (/card-programmes)',
      expected: 'http://localhost:5173/card-programmes',
      actual: url1,
      pass: pass1,
    });

    // Step 2: Navigate to Details
    console.log('Step 2: Clicking card programme row...');
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    await page.click('tbody tr:first-child');
    await page.waitForTimeout(1500);
    const url2 = page.url();
    const body2 = await page.innerText('body');
    const hasDetailsContent = body2.toLowerCase().includes('child entity') || body2.toLowerCase().includes('parent attribute') || body2.toLowerCase().includes('edit programme');
    const pass2 = url2.startsWith('http://localhost:5173/card-programmes/') && url2 !== 'http://localhost:5173/card-programmes' && hasDetailsContent;
    await page.screenshot({ path: path.join(screenshotDir, '02_details.png') });
    results.push({
      criterion: '2. Details Page Navigation (/card-programmes/:id)',
      expected: 'http://localhost:5173/card-programmes/:id',
      actual: url2,
      pass: pass2,
    });

    // Step 3: Navigate to Charges Workspace
    console.log('Step 3: Clicking Charges workspace card...');
    await page.click('h3:has-text("Charges & Posting")');
    await page.waitForTimeout(1500);
    const url3 = page.url();
    const body3 = await page.innerText('body');
    const pass3 = url3.endsWith('/charges') && body3.includes('Charges');
    await page.screenshot({ path: path.join(screenshotDir, '03_charges.png') });
    results.push({
      criterion: '3. Charges Child Workspace Navigation',
      expected: 'http://localhost:5173/card-programmes/:id/charges',
      actual: url3,
      pass: pass3,
    });

    // Step 4: Browser Back (twice)
    console.log('Step 4: Testing Browser Back button...');
    await page.goBack();
    await page.waitForTimeout(1000);
    const back1 = page.url();

    await page.goBack();
    await page.waitForTimeout(1000);
    const back2 = page.url();

    const pass4 = back1 === url2 && back2 === 'http://localhost:5173/card-programmes';
    await page.screenshot({ path: path.join(screenshotDir, '04_back_to_list.png') });
    results.push({
      criterion: '4. Browser Back Button Traversal',
      expected: `${url2} -> http://localhost:5173/card-programmes`,
      actual: `${back1} -> ${back2}`,
      pass: pass4,
    });

    // Step 5: Browser Forward (twice)
    console.log('Step 5: Testing Browser Forward button...');
    await page.goForward();
    await page.waitForTimeout(1000);
    const fwd1 = page.url();

    await page.goForward();
    await page.waitForTimeout(1000);
    const fwd2 = page.url();

    const pass5 = fwd1 === url2 && fwd2 === url3;
    await page.screenshot({ path: path.join(screenshotDir, '05_forward_to_charges.png') });
    results.push({
      criterion: '5. Browser Forward Button Traversal',
      expected: `${url2} -> ${url3}`,
      actual: `${fwd1} -> ${fwd2}`,
      pass: pass5,
    });

    // Step 6: Page Refresh
    console.log('Step 6: Refreshing page at /charges...');
    await page.reload();
    await page.waitForTimeout(1500);
    const refreshUrl = page.url();
    const refreshBody = await page.innerText('body');
    const pass6 = refreshUrl === url3 && refreshBody.includes('Charges');
    await page.screenshot({ path: path.join(screenshotDir, '06_refresh.png') });
    results.push({
      criterion: '6. Page Refresh State Persistence',
      expected: url3,
      actual: refreshUrl,
      pass: pass6,
    });

    // Step 7: Deep Link to Segments
    console.log('Step 7: Deep Link -> /card-programmes/1/segments');
    await page.goto('http://localhost:5173/card-programmes/1/segments');
    await page.waitForTimeout(1500);
    const segUrl = page.url();
    const segBody = await page.innerText('body');
    const pass7 = segUrl === 'http://localhost:5173/card-programmes/1/segments' && segBody.includes('Customer Segment');
    await page.screenshot({ path: path.join(screenshotDir, '07_deeplink_segments.png') });
    results.push({
      criterion: '7. Deep Link to /card-programmes/1/segments',
      expected: 'http://localhost:5173/card-programmes/1/segments',
      actual: segUrl,
      pass: pass7,
    });

    // Step 8: Deep Link to New Programme (No drawer)
    console.log('Step 8: Deep Link -> /card-programmes/new');
    await page.goto('http://localhost:5173/card-programmes/new');
    await page.waitForTimeout(1500);
    const newUrl = page.url();
    const newBody = await page.innerText('body');
    const pass8 = newUrl === 'http://localhost:5173/card-programmes/new' && newBody.includes('New Card Programme');
    await page.screenshot({ path: path.join(screenshotDir, '08_deeplink_new.png') });
    results.push({
      criterion: '8. Dedicated New Programme Full-Page Route',
      expected: 'http://localhost:5173/card-programmes/new',
      actual: newUrl,
      pass: pass8,
    });

    // Step 9: Deep Link to Edit Programme
    console.log('Step 9: Deep Link -> /card-programmes/1/edit');
    await page.goto('http://localhost:5173/card-programmes/1/edit');
    await page.waitForTimeout(1500);
    const editUrl = page.url();
    const editBody = await page.innerText('body');
    const pass9 = editUrl === 'http://localhost:5173/card-programmes/1/edit' && editBody.includes('Edit Card Programme');
    await page.screenshot({ path: path.join(screenshotDir, '09_deeplink_edit.png') });
    results.push({
      criterion: '9. Dedicated Edit Programme Full-Page Route',
      expected: 'http://localhost:5173/card-programmes/1/edit',
      actual: editUrl,
      pass: pass9,
    });

    // Step 10: Deep Link to References & Audit
    console.log('Step 10: Deep Link -> References & Audit');
    await page.goto('http://localhost:5173/card-programmes/1/references');
    await page.waitForTimeout(1000);
    const refUrl = page.url();

    await page.goto('http://localhost:5173/card-programmes/1/audit');
    await page.waitForTimeout(1000);
    const auditUrl = page.url();

    const pass10 = refUrl === 'http://localhost:5173/card-programmes/1/references' && auditUrl === 'http://localhost:5173/card-programmes/1/audit';
    await page.screenshot({ path: path.join(screenshotDir, '10_deeplink_audit.png') });
    results.push({
      criterion: '10. Deep Link to References & Audit Workspaces',
      expected: 'http://localhost:5173/card-programmes/1/references & /audit',
      actual: `${refUrl} | ${auditUrl}`,
      pass: pass10,
    });

    // Step 11: No /config/ in Frontend URLs
    console.log('Step 11: Checking URL Hygiene...');
    const hasConfigUrl = results.some(r => r.actual.includes('/config/card-programmes'));
    results.push({
      criterion: '11. No Frontend URL Uses /config/',
      expected: 'No /config/ prefix in frontend routes',
      actual: hasConfigUrl ? 'Found /config/ in routes' : 'Clean /card-programmes routes',
      pass: !hasConfigUrl,
    });

  } catch (err) {
    console.error('Browser Test Error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n=====================================================');
  console.log('         LIVE BROWSER TEST RESULTS TABLE            ');
  console.log('=====================================================');
  let totalPass = 0;
  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    if (r.pass) totalPass++;
    console.log(`[${status.padStart(4)}] ${r.criterion}`);
    console.log(`       Actual: ${r.actual}\n`);
  }
  console.log('=====================================================');
  console.log(`FINAL RESULT: ${totalPass}/${results.length} CRITERIA PASSED`);
  console.log('=====================================================\n');
}

runBrowserTests();
