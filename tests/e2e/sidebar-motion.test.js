import { test, expect } from '@playwright/test';

test('sidebar motion keeps icons and footer rows steady, supports reversal and reduced motion @teacherAdmin', async ({ page }) => {
    await page.goto('/calendar');
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByRole('button', { name: 'Collapse sidebar', exact: true })).toBeVisible();
    const sample = async label => page.evaluate(async label => {
        const sidebar = document.querySelector('[data-untitled-sidebar]');
        const button = sidebar.querySelector(`button[aria-label="${label}"]`);
        const read = () => ({
            width: sidebar.getBoundingClientRect().width,
            icons: [...sidebar.querySelectorAll('nav a > svg, button[aria-label="Log out"] > svg')].map(el => el.getBoundingClientRect().x),
            footerHeight: sidebar.querySelector('button[aria-label="Log out"]').getBoundingClientRect().height,
        });
        const frames = [read()]; button.click();
        const start = performance.now();
        await new Promise(resolve => {
            const tick = () => { frames.push(read()); if (performance.now() - start < 400) requestAnimationFrame(tick); else resolve(); };
            requestAnimationFrame(tick);
        });
        return frames;
    }, label);
    for (const label of ['Collapse sidebar', 'Expand sidebar']) {
        const frames = await sample(label);
        expect(frames.some(frame => frame.width > 81 && frame.width < 255)).toBe(true);
        for (let i = 0; i < frames[0].icons.length; i++) {
            const positions = frames.map(frame => frame.icons[i]);
            expect(Math.max(...positions) - Math.min(...positions), JSON.stringify({label, icon: i, positions})).toBeLessThan(1);
        }
        expect(new Set(frames.map(frame => frame.footerHeight)).size).toBe(1);
        expect(frames.at(-1).width).toBeCloseTo(label.startsWith('Collapse') ? 80 : 256, 0);
    }
    await sidebar.getByRole('button', { name: 'Collapse sidebar', exact: true }).focus();
    await page.keyboard.press('Space'); await page.waitForTimeout(70); await page.keyboard.press('Space');
    await expect(sidebar.getByRole('button', { name: 'Collapse sidebar', exact: true })).toBeVisible();
    await expect.poll(() => sidebar.evaluate(el => el.getBoundingClientRect().width)).toBe(256);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await sidebar.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    await expect.poll(() => sidebar.evaluate(el => el.getBoundingClientRect().width)).toBe(80);
    expect(await sidebar.evaluate(el => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.001);
});
