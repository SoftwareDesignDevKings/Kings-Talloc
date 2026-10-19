'use client';
import { useState } from 'react';
import { MultiSelect } from '@/components/untitled/multi-select';

// Keep calendar option objects and its controlled-menu callbacks unchanged.
export default function CalendarMultiSelect({ options = [], value, onChange, isMulti = false, isClearable = isMulti,
    placeholder = 'Select...', isDisabled, inputId, name, menuPortalTarget, menuIsOpen, onMenuOpen, onMenuClose,
    noOptionsMessage, renderOption, 'aria-label': ariaLabel }) {
    const [open, setOpen] = useState(false);
    const changeOpen = next => {
        setOpen(next);
        if (next) onMenuOpen?.(); else onMenuClose?.();
    };
    return <MultiSelect items={options} selectedItems={isMulti ? value || [] : value ? [value] : []}
        onSelectionChange={items => onChange(isMulti ? items : items[0] || null)} isMulti={isMulti}
        isClearable={isClearable} placeholder={placeholder} isDisabled={isDisabled} id={inputId} name={name}
        aria-label={ariaLabel || placeholder} portalContainer={menuPortalTarget}
        isOpen={menuIsOpen ?? open} onOpenChange={changeOpen} renderOption={renderOption}
        emptyMessage={noOptionsMessage?.() || 'No options'} />;
}
