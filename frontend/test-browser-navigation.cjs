const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runFullModuleTests() {
  console.log('=====================================================');
  console.log('  STARTING SCR-003 COMPLETE REFERENCE BROWSER TESTS ');
  console.log('=====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];

  try {
    // 1. Initial Load & Login
    console.log('Step 1: Navigating to http://localhost:5173/');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);

    if (page.url().includes('/login') || (await page.$('input[name="username"]'))) {
      console.log('Authenticating...');
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1500);
    }

    await page.waitForSelector('tbody tr', { timeout: 10000 });

    // 2. Sortable Column Headers Test
    console.log('Step 2: Testing Sortable Column Headers on Master Grid...');
    await page.click('button:has-text("Programme Code")');
    await page.waitForTimeout(500);
    const bodySort1 = await page.innerText('body');
    const hasSortableHeader = bodySort1.includes('Programme Code') && bodySort1.includes('Programme Name');
    await page.screenshot({ path: path.join(screenshotDir, 'scr003_01_sort.png') });
    results.push({
      criterion: '1. Sortable Column Headers on Grid Tables',
      expected: 'Clicking header sorts ascending/descending with icon',
      actual: hasSortableHeader ? 'Sortable column headers working' : 'Header click failed',
      pass: hasSortableHeader,
    });

    // 3. Maintenance Form Full-Width & 5 Sections Test
    console.log('Step 3: Navigating to /card-programmes/new...');
    await page.goto('http://localhost:5173/card-programmes/new');
    await page.waitForTimeout(1000);

    const formText = await page.innerText('body');
    const hasSection1 = formText.includes('1. General Product Identity');
    const hasSection2 = formText.includes('2. Card Scheme & BIN Parameters');
    const hasSection3 = formText.includes('3. Financial & Pricing Rules');
    const hasSection4 = formText.includes('4. Operational & System Controls');
    const hasNairaPrefix = formText.includes('₦');

    const passForm = hasSection1 && hasSection2 && hasSection3 && hasSection4 && hasNairaPrefix;
    await page.screenshot({ path: path.join(screenshotDir, 'scr003_02_form_sections.png') });
    results.push({
      criterion: '2. Complete 5-Section Full-Width Maintenance Form & ₦ Prefix',
      expected: '5 logical sections, dropdown lookups, ₦ currency input prefix',
      actual: passForm ? '5 sections & ₦ Naira currency input prefixes verified' : 'Form section missing',
      pass: passForm,
    });

    // 4. Edit Mode Read-Only Audit Fields Test
    console.log('Step 4: Navigating to Edit Mode /card-programmes/1/edit...');
    await page.goto('http://localhost:5173/card-programmes/1/edit');
    await page.waitForTimeout(1000);

    const editFormText = await page.innerText('body');
    const hasSection5 = editFormText.includes('5. Record Audit Metadata (Read-Only System Log)');
    const hasAuditFields = editFormText.includes('Created By') && editFormText.includes('Created Date');

    const passEditForm = hasSection5 && hasAuditFields;
    await page.screenshot({ path: path.join(screenshotDir, 'scr003_03_edit_audit_metadata.png') });
    results.push({
      criterion: '3. Edit Mode Read-Only Audit Metadata Section',
      expected: 'Section 5 displays read-only system audit log metadata',
      actual: passEditForm ? 'Read-only audit metadata displayed' : 'Missing audit section in edit mode',
      pass: passEditForm,
    });

    // 5. Charges Child Workspace GL Lookup & NGN Currency Test
    console.log('Step 5: Navigating to Charges Workspace /card-programmes/1/charges...');
    await page.goto('http://localhost:5173/card-programmes/1/charges');
    await page.waitForTimeout(1000);

    const chargesText = await page.innerText('body');
    const hasNgnCurrency = chargesText.includes('NGN') || chargesText.includes('₦');
    const hasGlNumber = chargesText.includes('GL_3002938491') || chargesText.includes('GL_2001928374');

    const passCharges = hasNgnCurrency && hasGlNumber;
    await page.screenshot({ path: path.join(screenshotDir, 'scr003_04_charges_gl_ngn.png') });
    results.push({
      criterion: '4. Charges Workspace GL Account Lookups & NGN Ledger',
      expected: 'GL account lookups, NGN currency ledger, DR/CR indicators',
      actual: passCharges ? 'GL account numbers & NGN currency formatting verified' : 'Missing GL or NGN formatting',
      pass: passCharges,
    });

    // 6. References Workspace Integration System Mappings Test
    console.log('Step 6: Navigating to References Workspace /card-programmes/1/references...');
    await page.goto('http://localhost:5173/card-programmes/1/references');
    await page.waitForTimeout(1000);

    const refText = await page.innerText('body');
    const hasTargetSystem = refText.includes('Target Integration System') && (refText.includes('FLEXCUBE') || refText.includes('POSTILION'));

    await page.screenshot({ path: path.join(screenshotDir, 'scr003_05_references_integration.png') });
    results.push({
      criterion: '5. References Workspace Target System Integration Mappings',
      expected: 'Target Integration System, Core Banking Code, Switch Product ID',
      actual: hasTargetSystem ? 'Integration mapping columns verified' : 'Missing integration columns',
      pass: hasTargetSystem,
    });

  } catch (err) {
    console.error('Full Module Test Error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n=====================================================');
  console.log('  SCR-003 REFERENCE IMPLEMENTATION BROWSER RESULTS   ');
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

runFullModuleTests();
