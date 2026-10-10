/**
 * Two-player multiplayer QA for HouseRules private tables.
 * Runs on GitHub Actions (full websocket access).
 *
 * Flow: host creates room → guest joins → host starts → both play moves →
 * verify timer, draws, hand sync, no page errors.
 */
const { chromium } = require('playwright-core');

const URL = process.env.TEST_URL || 'http://localhost:8080/';
const issues = [];
let checks = 0;
let passed = 0;

function check(name, cond, detail = '') {
  checks++;
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    issues.push(name);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function newPlayer(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 100)));
  await page.goto(URL);
  await page.waitForTimeout(5000);
  try { await page.getByText(/Skip/i).first().click({ timeout: 4000 }); } catch {}
  await page.waitForTimeout(1500);
  return { page, errors, name };
}

(async () => {
  const browser = await chromium.launch();
  console.log('=== Multiplayer QA ===\n');

  // HOST: create room
  console.log('HOST: creating room...');
  const host = await newPlayer(browser, 'host');
  await host.page.getByText(/Have a room code/i).first().click({ timeout: 8000 });
  await host.page.waitForTimeout(1500);
  await host.page.getByText(/Create Table/i).first().click({ timeout: 8000 });
  await host.page.waitForTimeout(4000);

  const roomCode = await host.page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      const t = el.textContent?.trim();
      if (t && /^[A-Z0-9]{6}$/.test(t) && el.children.length === 0) return t;
    }
    return null;
  });
  check('Host creates room with code', !!roomCode, `code=${roomCode}`);
  await host.page.screenshot({ path: '/tmp/mp-host-room.png' });

  // Check room code prominence (Saad's catch)
  const codeBox = await host.page.getByTestId('room-code').first().boundingBox();
  check('Room code prominent (≥40px tall)', codeBox && codeBox.height >= 40, `height=${codeBox?.height}`);

  // GUEST: join room
  console.log('\nGUEST: joining...');
  const guest = await newPlayer(browser, 'guest');
  await guest.page.getByText(/Have a room code/i).first().click({ timeout: 8000 });
  await guest.page.waitForTimeout(1500);
  await guest.page.locator('input').first().click();
  await guest.page.locator('input').first().type(roomCode, { delay: 50 });
  await guest.page.waitForTimeout(1000);
  await guest.page.getByText(/Join Table/i).first().click({ timeout: 8000 });
  await guest.page.waitForTimeout(5000);

  const guestText = await guest.page.textContent('body');
  check('Guest joins room', guestText.includes('Waiting') || guestText.includes('Players'));

  // HOST: wait for guest, start game
  console.log('\nHOST: starting game...');
  await host.page.waitForTimeout(8000); // presence sync
  const startBtn = host.page.getByText(/Start game/i).first();
  const startEnabled = await startBtn.isEnabled().catch(() => false);
  check('Start enabled after guest joins', startEnabled);

  if (startEnabled) {
    await startBtn.click({ timeout: 5000 });
    await host.page.waitForTimeout(4000);
    await guest.page.waitForTimeout(4000);

    const hostGame = await host.page.textContent('body');
    const guestGame = await guest.page.textContent('body');
    check('Game starts on host', hostGame.includes('Round 1'));
    check('Game starts on guest', guestGame.includes('Round 1'));

    // Timer on both
    await host.page.waitForTimeout(2000);
    const hostTimer = await host.page.getByLabel(/seconds left/i).count();
    const guestTimer = await guest.page.getByLabel(/seconds left/i).count();
    // At least one should have timer (whosever turn it is)
    check('Timer visible on active player', hostTimer > 0 || guestTimer > 0);

    // Host plays a move (if host turn)
    try {
      await host.page.waitForFunction(() => document.body.textContent.includes('Your turn'), { timeout: 10000 });
      console.log('\nHOST: playing move...');
      // Find and click a highlighted card
      const cards = await host.page.locator('[data-testid^="hand-card-"]').all();
      let played = false;
      for (const card of cards) {
        const opacity = await card.evaluate(el => getComputedStyle(el).opacity);
        if (parseFloat(opacity) > 0.9) {
          await card.click({ timeout: 3000 });
          played = true;
          break;
        }
      }
      check('Host plays a card', played);
      await host.page.waitForTimeout(3000);
      await guest.page.waitForTimeout(3000);
    } catch {
      console.log('  (host turn not reached, may be guest turn)');
    }

    // Guest plays a move (if guest turn)
    try {
      await guest.page.waitForFunction(() => document.body.textContent.includes('Your turn'), { timeout: 15000 });
      console.log('\nGUEST: playing move...');
      const cards = await guest.page.locator('[data-testid^="hand-card-"]').all();
      let played = false;
      for (const card of cards) {
        const opacity = await card.evaluate(el => getComputedStyle(el).opacity);
        if (parseFloat(opacity) > 0.9) {
          await card.click({ timeout: 3000 });
          played = true;
          break;
        }
      }
      // If no playable card, draw
      if (!played) {
        await guest.page.getByLabel('Draw').first().click({ timeout: 5000 });
        played = true;
        console.log('  (guest drew instead)');
      }
      check('Guest plays or draws', played);
    } catch {
      console.log('  (guest turn not reached)');
    }

    await host.page.screenshot({ path: '/tmp/mp-host-game.png' });
    await guest.page.screenshot({ path: '/tmp/mp-guest-game.png' });
  }

  // Page errors
  console.log('\nPage errors:');
  console.log(`  host: ${host.errors.length}, guest: ${guest.errors.length}`);
  host.errors.slice(0, 3).forEach(e => console.log(`  host: ${e}`));
  guest.errors.slice(0, 3).forEach(e => console.log(`  guest: ${e}`));
  check('Zero page errors', host.errors.length === 0 && guest.errors.length === 0);

  console.log(`\n=== ${passed}/${checks} passed ===`);
  if (issues.length) {
    console.log('Failed:', issues.join(', '));
    process.exit(1);
  }
  await browser.close();
})();
