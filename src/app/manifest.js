// Web app manifest - lets staff and students install Talloc to their phone home screen.
// Served by Next at /manifest.webmanifest and linked from every page automatically.
export default function manifest() {
    return {
        id: '/',
        name: 'Kings-Talloc',
        short_name: 'Talloc',
        description: 'TKS Computing Studies - Tutor Allocation App',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffffff',
        theme_color: '#1A4D6F',
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
