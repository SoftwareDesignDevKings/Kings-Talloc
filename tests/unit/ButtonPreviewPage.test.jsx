import { render, screen } from '@testing-library/react';
import ButtonPreviewPage from '@/app/ui-preview/button/page';
import { notFound } from 'next/navigation';

jest.mock('next/navigation', () => ({ notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }) }));
jest.mock('@/app/ui-preview/button/ButtonTrial', () => ({ __esModule: true, default: () => <div>Button trial</div> }));

const originalEnvironment = process.env.NODE_ENV;
afterEach(() => {
    process.env.NODE_ENV = originalEnvironment;
    jest.clearAllMocks();
});

test.each(['production', 'test'])('does not expose the button trial in %s', async (environment) => {
    process.env.NODE_ENV = environment;
    await expect(ButtonPreviewPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
});

test('makes the isolated trial available in development', async () => {
    process.env.NODE_ENV = 'development';
    render(await ButtonPreviewPage());
    expect(screen.getByText('Button trial')).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
});
