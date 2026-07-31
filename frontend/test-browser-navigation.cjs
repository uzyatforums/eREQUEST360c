const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runSelectionTests() {
  console.log('=====================================================');
  console.log('  STARTING DATAGRID ROW SELECTION BROWSER VERIFICATION');
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
    const initialUrl = page.url();

    // Verify initial toolbar state ("No items selected")
    const toolbarText1 = await page.innerText('body');
    const pass1 = toolbarText1.includes('No items selected');
    await page.screenshot({ path: path.join(screenshotDir, 'selection_01_none.png') });
    results.push({
      criterion: '1. Initial Selection State (No items selected)',
      expected: 'No items selected',
      actual: pass1 ? 'No items selected' : 'Missing initial toolbar state',
      pass: pass1,
    });

    // 2. Individual Row Selection
    console.log('Step 2: Selecting first row checkbox...');
    const firstCheckbox = await page.$('tbody tr:first-child input[type="checkbox"]');
    await firstCheckbox.click();
    await page.waitForTimeout(500);

    const toolbarText2 = await page.innerText('body');
    const pass2 = toolbarText2.includes('1 item selected') && page.url() === initialUrl;
    await page.screenshot({ path: path.join(screenshotDir, 'selection_02_single.png') });
    results.push({
      criterion: '2. Individual Row Selection & Event Isolation',
      expected: '1 item selected without navigation',
      actual: pass2 ? '1 item selected (URL unchanged)' : 'Failed single selection',
      pass: pass2,
    });

    // 3. Select All Header Checkbox
    console.log('Step 3: Clicking Select All header checkbox...');
    const headerCheckbox = await page.$('thead input[type="checkbox"]');
    await headerCheckbox.click();
    await page.waitForTimeout(500);

    const toolbarText3 = await page.innerText('body');
    const rowCount = (await page.$$('tbody tr')).length;
    const pass3 = toolbarText3.includes(`${rowCount} items selected`);
    await page.screenshot({ path: path.join(screenshotDir, 'selection_03_all.png') });
    results.push({
      criterion: '3. Select All Header Checkbox',
      expected: `${rowCount} items selected`,
      actual: pass3 ? `${rowCount} items selected` : toolbarText3.slice(0, 100),
      pass: pass3,
    });

    // 4. Indeterminate Checkbox State
    console.log('Step 4: Unchecking one row to trigger indeterminate state...');
    await firstCheckbox.click();
    await page.waitForTimeout(500);

    const isIndeterminate = await page.$eval('thead input[type="checkbox"]', (el) => el.indeterminate);
    const toolbarText4 = await page.innerText('body');
    const pass4 = isIndeterminate && toolbarText4.includes(`${rowCount - 1} items selected`);
    await page.screenshot({ path: path.join(screenshotDir, 'selection_04_indeterminate.png') });
    results.push({
      criterion: '4. Indeterminate Header Checkbox State',
      expected: `indeterminate = true, ${rowCount - 1} items selected`,
      actual: pass4 ? 'Header checkbox indeterminate = true' : `indeterminate = ${isIndeterminate}`,
      pass: pass4,
    });

    // 5. Clear Selection Button
    console.log('Step 5: Clicking Clear Selection button...');
    await page.click('button:has-text("Clear Selection")');
    await page.waitForTimeout(500);

    const toolbarText5 = await page.innerText('body');
    const pass5 = toolbarText5.includes('No items selected');
    await page.screenshot({ path: path.join(screenshotDir, 'selection_05_cleared.png') });
    results.push({
      criterion: '5. Clear Selection Button',
      expected: 'No items selected',
      actual: pass5 ? 'Selection cleared' : 'Clear selection failed',
      pass: pass5,
    });

    // 6. Disabled Bulk Actions with Tooltip
    console.log('Step 6: Verifying Disabled Bulk Actions button & tooltip...');
    const bulkButtonDisabled = await page.$eval('button:has-text("Bulk Actions")', (btn) => btn.disabled);
    await page.hover('div:has(> button:has-text("Bulk Actions"))');
    await page.waitForTimeout(500);
    const tooltipText = await page.innerText('body');
    const pass6 = bulkButtonDisabled && tooltipText.includes('Bulk actions will be enabled in a future release.');
    await page.screenshot({ path: path.join(screenshotDir, 'selection_06_bulk_tooltip.png') });
    results.push({
      criterion: '6. Disabled Bulk Actions Button & Tooltip',
      expected: 'Button disabled with release tooltip',
      actual: pass6 ? 'Button disabled with tooltip displayed' : 'Tooltip missing or button enabled',
      pass: pass6,
    });

  } catch (err) {
    console.error('Selection Test Error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n=====================================================');
  console.log('    DATAGRID SELECTION BROWSER TEST RESULTS TABLE    ');
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

runSelectionTests();
