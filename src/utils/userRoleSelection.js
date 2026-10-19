export const ROLE_OPTIONS = ['student', 'tutor', 'coach', 'teacher', 'admin'].map(value => ({
    value, label: value[0].toUpperCase() + value.slice(1),
}));

// The saved schema still distinguishes the default view from additional access.
const EXTRA_ROLES = {
    student: [], teacher: ['admin'], admin: ['teacher'],
    tutor: ['coach', 'admin'], coach: ['tutor', 'admin'],
};

export function updateRoleSelection(role, userRoles, selected) {
    let values = [...new Set(selected)].filter(value => Object.hasOwn(EXTRA_ROLES, value));
    const previous = new Set([role, ...userRoles]);
    const added = values.find(value => !previous.has(value));
    if (added === 'student') values = ['student'];
    else if (added) {
        values = values.filter(value => value !== 'student');
        if (added === 'teacher') values = values.filter(value => !['tutor', 'coach'].includes(value));
        if (['tutor', 'coach'].includes(added)) values = values.filter(value => value !== 'teacher');
    }

    // Preserve the main role and its view whenever the remaining combination permits it.
    const keepDefault = values.includes(role) && values.every(value => value === role || EXTRA_ROLES[role]?.includes(value));
    const nextRole = keepDefault ? role : values.find(value => value !== 'admin') || values[0] || '';
    return { role: nextRole, userRoles: values.filter(value => EXTRA_ROLES[nextRole]?.includes(value)) };
}
