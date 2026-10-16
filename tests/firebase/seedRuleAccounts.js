// Rules use current account records rather than trusting roles in old tokens.
exports.seedRuleAccounts = async env => env.withSecurityRulesDisabled(async context => {
    const profiles = {
        'admin@kings.edu.au': 'admin', 'teacher@kings.edu.au': 'teacher',
        'tutor@kings.edu.au': 'tutor', 'othertutor@kings.edu.au': 'tutor', 'coach@kings.edu.au': 'coach',
        'student@student.kings.edu.au': 'student', 'otherstudent@student.kings.edu.au': 'student',
    };
    await Promise.all(Object.entries(profiles).map(([email, defaultRole]) => context.firestore().collection('users').doc(email).set({ email, defaultRole, userRoles: [] })));
});
