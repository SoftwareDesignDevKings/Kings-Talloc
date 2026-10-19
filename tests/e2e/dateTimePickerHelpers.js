import { expect } from '@playwright/test';

export const fillEventDateTime = async (page, name, value, fieldLabel = 'Event') => {
    const field = page.getByRole('group', { name: new RegExp(`^${fieldLabel} ${name} time`) });
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/).slice(1);
    for (const [part, text] of [['year', parts[0]], ['month', parts[1]], ['day', parts[2]], ['hour', parts[3]], ['minute', parts[4]]]) {
        const segment = field.getByRole('spinbutton', { name: new RegExp(`^${part}`) });
        await segment.click();
        await segment.pressSequentially(String(Number(text)));
    }
    await expect(page.locator(`[data-date-time-field="${name}"] input[name="${name}"]`)).toHaveValue(`${value}:00`);
};
