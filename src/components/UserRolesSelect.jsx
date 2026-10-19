'use client';

import { MultiSelect } from '@/components/untitled/multi-select';
import { ROLE_OPTIONS, updateRoleSelection } from '@/utils/userRoleSelection';

export function UserRolesSelect({ role, userRoles, onChange, portalContainer, isOpen, onOpenChange }) {
    const selected = [...new Set([role, ...userRoles])].filter(Boolean).map(value =>
        ROLE_OPTIONS.find(item => item.value === value) || { value, label: value });
    return <MultiSelect id="userRole" aria-label="Roles" placeholder="Select..."
        items={ROLE_OPTIONS} selectedItems={selected}
        onSelectionChange={items => onChange(updateRoleSelection(role, userRoles, items.map(item => item.value)))}
        portalContainer={portalContainer} shouldFlip={false} isOpen={isOpen} onOpenChange={onOpenChange} />;
}
