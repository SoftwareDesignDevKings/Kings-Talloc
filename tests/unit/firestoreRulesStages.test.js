const { createHash } = require('node:crypto');
const { selectRulesStage, loadRulesRelease } = require('../../scripts/selectFirestoreRules.cjs');
test('an unset migration acknowledgement selects only the additive compatibility stage', () => {
    expect(selectRulesStage()).toBe('compatibility'); expect(selectRulesStage('')).toBe('compatibility');
    expect(selectRulesStage('server-writes-v1')).toBe('strict');
    for (const value of ['true', 'server-writes-v0', 'typo']) expect(() => selectRulesStage(value)).toThrow('Invalid');
});
test('removing only the notification block recovers the exact pre-PR143 production source', () => {
    const release = loadRulesRelease('compatibility');
    expect(createHash('sha256').update(release.allowedPreviousSources[0]).digest('hex')).toBe('820f15509fef1dba6d53595b7fbf0572a6885dcfbaaf0e7a3e45182a4f2d7aeb');
    expect(release.source).not.toBe(release.allowedPreviousSources[0]);
    expect(loadRulesRelease('strict').allowedPreviousSources).toBeUndefined();
    expect(() => loadRulesRelease('unknown')).toThrow('Unknown');
});
