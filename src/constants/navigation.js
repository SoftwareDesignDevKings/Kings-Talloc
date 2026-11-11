import {
    Calendar, Users01, BookOpen01, Clock, HomeLine, Settings01,
} from '@untitledui/icons';

// Shared by the desktop sidebar and the phone tab bar, so both always list the same pages.
export const ROLE_LABELS = {
    admin: 'Admin', teacher: 'Teacher', tutor: 'Tutor', coach: 'Coach', student: 'Student',
};

export const NAVIGATION_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: HomeLine },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Tutor hours', shortLabel: 'Hours', href: '/tutorHours', icon: Clock, roles: ['admin', 'teacher', 'tutor', 'coach'] },
    { label: 'Manage users', href: '/userRoles', icon: Users01, roles: ['admin'], management: true },
    { label: 'Canvas classes', href: '/classes', icon: BookOpen01, roles: ['admin', 'teacher'], management: true },
    { label: 'Canvas admin', href: '/admin/canvas', icon: Settings01, roles: ['admin'], management: true },
];

export const navigationItemsForRole = (userRole) =>
    NAVIGATION_ITEMS.filter(item => !item.roles || item.roles.includes(userRole));

export const currentNavigationItem = (pathname) =>
    NAVIGATION_ITEMS.find(item => pathname?.startsWith(item.href));
