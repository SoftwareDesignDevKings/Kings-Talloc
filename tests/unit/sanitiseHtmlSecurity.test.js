/** @jest-environment node */
const { execFileSync } = require('child_process');
const sanitise = html => execFileSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '-e', 'import("./src/lib/security/sanitiseHtml.js").then(({sanitiseHtml}) => process.stdout.write(sanitiseHtml(process.argv[1])));', html], { encoding: 'utf8', cwd: process.cwd() });
test.each([
    '<xmp><script>alert(1)</script></xmp>',
    '<textarea/></textarea/><img src=x onerror=alert(1)>',
    '<a href="javascript:alert(1)">link</a>',
    '<svg><animate attributeName="href" values="javascript:alert(1)"></animate></svg>',
])('patched sanitizer rejects active content in %s', html => {
    expect(sanitise(html)).not.toMatch(/<(script|iframe|object|embed|svg)\b|\bonerror\s*=|href="javascript:/i);
});
test('normal formatted session descriptions retain safe formatting', () => {
    expect(sanitise('<p>Study <strong>algebra</strong> and <a href="https://kings.edu.au">resources</a>.</p>')).toContain('<strong>algebra</strong>');
});
