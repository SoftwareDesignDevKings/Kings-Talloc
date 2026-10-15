const URL = 'https://talloc.kings.edu.au/version.json';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForSchedulingRelease({ commit, fetchImpl = fetch, now = Date.now, pause = sleep, timeoutMs = 10 * 60_000, refreshGraceMs = 5 * 60_000 } = {}) {
    if (!/^[a-f0-9]{40}$/.test(commit || '')) throw new Error('Expected a full Git commit SHA.');
    const deadline = now() + timeoutMs;
    while (now() < deadline) {
        let version;
        try {
            const response = await fetchImpl(`${URL}?commit=${commit}&check=${now()}`, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
            if (response.ok) version = await response.json();
        } catch { /* Deployment can be temporarily unavailable; fail closed at timeout. */ }
        if (version?.gitCommit === commit && version.schedulingApiVersion >= 1) {
            // Give the existing five-minute VersionGuard a full interval to refresh open tabs.
            await pause(refreshGraceMs);
            const finalResponse = await fetchImpl(`${URL}?commit=${commit}&check=${now()}`, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
            const finalVersion = finalResponse.ok ? await finalResponse.json() : null;
            if (finalVersion?.gitCommit !== commit || !(finalVersion.schedulingApiVersion >= 1)) throw new Error('Production changed during the refresh interval. Firestore rules were not deployed.');
            console.log('The tested scheduling app is live; Firestore rules may now deploy.');
            return;
        }
        await pause(Math.min(15_000, Math.max(0, deadline - now())));
    }
    throw new Error('Production has not published this tested scheduling build. Firestore rules were not deployed.');
}
if (require.main === module) waitForSchedulingRelease({ commit: process.env.EXPECTED_COMMIT }).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { waitForSchedulingRelease };
