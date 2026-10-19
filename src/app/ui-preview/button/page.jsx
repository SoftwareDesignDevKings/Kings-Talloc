import { notFound } from 'next/navigation';

export const metadata = { title: 'Button preview | Kings-Talloc' };

export default async function ButtonPreviewPage() {
    // The compatibility trial is available only on the local development app.
    if (process.env.NODE_ENV !== 'development') notFound();

    const { default: ButtonTrial } = await import('./ButtonTrial');
    return <ButtonTrial />;
}
