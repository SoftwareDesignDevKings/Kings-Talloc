import { test, expect } from '@playwright/test';
import sharp from 'sharp';

test('card outlines stay visible at clipped page edges on desktop and mobile @teacherAdmin @tutorAdmin', async ({ page }) => {
    test.setTimeout(90000);
    for (const width of [1003, 390]) {
        await page.setViewportSize({ width, height: 958 });
        for (const path of ['/dashboard', '/userRoles', '/classes', '/tutorHours', '/admin/canvas']) {
            await page.goto(path);
            const cards = page.locator('[data-untitled-card]');
            await expect(cards.first()).toBeVisible();
            await page.evaluate(() => document.fonts.ready);
            await page.evaluate(() => Promise.all(document.getAnimations()
                .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
                .map(animation => animation.finished.catch(() => {}))));
            for (const [index, card] of (await cards.all()).entries()) {
                await card.evaluate(el => el.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
                await expect(card).toHaveCSS('opacity', '1');
                const box = await card.boundingBox();
                const { data, info } = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
                const isVisibleStroke = (x, y) => {
                    // Sample the antialiased one-pixel edge without depending on its exact theme colour.
                    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                        const px = Math.round(x) + dx, py = Math.round(y) + dy;
                        if (px < 0 || py < 0 || px >= info.width || py >= info.height) continue;
                        const offset = (py * info.width + px) * info.channels;
                        if (data[offset] < 253 && data[offset + 1] < 253 && data[offset + 2] < 253) return true;
                    }
                    return false;
                };
                const edges = [
                    ['top', box.x + box.width / 2, box.y],
                    ['bottom', box.x + box.width / 2, box.y + box.height - 1],
                    ['left', box.x, box.y + box.height / 2],
                    ['right', box.x + box.width - 1, box.y + box.height / 2],
                ];
                for (const [edge, x, y] of edges) {
                    expect(isVisibleStroke(x, y), `${path} at ${width}px, card ${index}: ${edge} outline is clipped`).toBe(true);
                }
            }
        }
    }
});
