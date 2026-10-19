const { readFileSync, appendFileSync } = require('node:fs');
const { join } = require('node:path');

function selectRulesStage(acknowledgement) {
    if (acknowledgement === 'server-writes-v1') return 'strict';
    if (acknowledgement === undefined || acknowledgement === '') return 'compatibility';
    throw new Error('Invalid scheduling client migration acknowledgement. Firestore rules were not deployed.');
}

function loadRulesRelease(stage) {
    if (stage === 'strict') return { source: readFileSync(join(__dirname, '../firebase/firestore.rules'), 'utf8') };
    if (stage !== 'compatibility') throw new Error('Unknown Firestore rules stage.');
    const source = readFileSync(join(__dirname, '../firebase/firestore.compat.rules'), 'utf8');
    const begin = '\n    // BEGIN COMPATIBLE BOOKING NOTIFICATIONS\n';
    const end = '    // END COMPATIBLE BOOKING NOTIFICATIONS\n';
    const start = source.indexOf(begin), finish = source.indexOf(end);
    if (start < 0 || finish <= start || source.indexOf(begin, start + 1) !== -1 || source.indexOf(end, finish + 1) !== -1) {
        throw new Error('Invalid compatibility rules boundaries.');
    }
    // This stage may only add the notice block to the exact legacy rules. It
    // cannot replace strict rules or overwrite a production rules hotfix.
    const legacySource = source.slice(0, start) + source.slice(finish + end.length);
    return { source, allowedPreviousSources: [legacySource] };
}

if (require.main === module) {
    try {
        const stage = selectRulesStage(process.env.SCHEDULING_CLIENT_MIGRATION_ACK);
        loadRulesRelease(stage);
        console.log(`Selected ${stage} Firestore rules.`);
        if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `stage=${stage}\n`);
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { selectRulesStage, loadRulesRelease };
