// Adapted from Untitled UI's multi-select.tsx (MIT), revision
// 1d410cb8facde8d50869e7bbb5f3d048e2267466. JSX/local imports and scoped styles;
// retain the application's removable chips and omit optional footer/empty-state copy.
'use client';
import './styles/generated.css';
import { useRef, useState } from 'react';
import { ChevronDown, SearchLg, XClose } from '@untitledui/icons';
import { useFilter } from 'react-aria';
import { Autocomplete, Button as AriaButton, Dialog, DialogTrigger, Input, ListBox, ListBoxSection, Header, Collection, SearchField } from 'react-aria-components';
import { Button } from './button';
import { Popover } from './popover';
import { SelectItem } from './select-item';
import { SelectContext } from './select-shared';
import styles from './multi-select.module.css';

export function MultiSelect({ items, groups, selectedItems, onSelectionChange, isMulti = true, isDisabled, isClearable,
    placeholder, id, name, 'aria-label': label, portalContainer, isOpen, onOpenChange, renderOption, shouldFlip = true,
    emptyMessage = 'No options', onSearchChange }) {
    const [search, setSearchText] = useState('');
    // With onSearchChange the caller loads matching items itself (e.g. a server search),
    // so items are shown as given rather than filtered by their labels here.
    const setSearch = value => { setSearchText(value); onSearchChange?.(value); };
    const controlRef = useRef(null);
    const { contains } = useFilter({ sensitivity: 'base' });
    const selectedKeys = new Set(selectedItems.map(item => item.value));
    const availableItems = isMulti ? items.filter(item => !selectedKeys.has(item.value)) : items;
    const availableGroups = groups?.map((group, index) => ({ id: `group-${index}`, label: group.label,
        options: group.options.filter(item => !isMulti || !selectedKeys.has(item.value)) })).filter(group => group.options.length);
    const renderItem = item => <SelectItem id={item.value} label={renderOption ? undefined : item.label} textValue={item.label}
        value={item} isDisabled={item.isDisabled}>{renderOption ? renderOption(item) : item.label}</SelectItem>;
    const changeOpen = open => { setSearch(''); onOpenChange(open); };
    const remove = value => onSelectionChange(selectedItems.filter(item => item.value !== value));
    const select = keys => {
        const values = [...keys];
        // A single assignment stays selected when its current option is chosen again.
        if (!isMulti && !values.length && selectedItems.length) values.push(selectedItems[0].value);
        // Keep saved option objects, including roles/availability metadata, and selection order.
        const options = new Map((isMulti ? [...items, ...selectedItems] : [...selectedItems, ...items]).map(item => [item.value, item]));
        onSelectionChange(values.map(key => options.get(key)).filter(Boolean));
        changeOpen(false);
    };
    return <SelectContext.Provider value={{ size: 'sm' }}>
        <div data-untitled-control data-untitled-multi-select data-disabled={isDisabled || undefined} className={styles.root}>
            <div ref={controlRef} className={styles.control} data-open={isOpen || undefined} onClick={event => {
                if (!isDisabled && event.currentTarget.contains(event.target) && !event.target.closest('button')) changeOpen(true);
            }}>
                <DialogTrigger isOpen={isOpen} onOpenChange={changeOpen}>
                    <AriaButton id={id} data-has-selection={selectedItems.length > 0 || undefined} isDisabled={isDisabled} aria-label={label} className={styles.trigger}
                        onKeyDown={event => {
                            if (event.key === 'ArrowDown') { event.preventDefault(); changeOpen(true); }
                            const removable = selectedItems.filter(item => !item.isFixed);
                            if (isMulti && ['Backspace', 'Delete'].includes(event.key) && removable.length) {
                                event.preventDefault(); remove(removable.at(-1).value);
                            }
                        }}>
                        {!selectedItems.length && <span className={styles.placeholder}>{placeholder}</span>}
                        <ChevronDown aria-hidden="true" className={styles.chevron} />
                    </AriaButton>
                    <Popover triggerRef={controlRef} UNSTABLE_portalContainer={portalContainer?.closest('[data-untitled-modal-overlay]') || portalContainer} placement="bottom start" shouldFlip={shouldFlip} data-untitled-fixed-bottom={!shouldFlip || undefined} containerPadding={8}
                        className={styles.popover}>
                        <Dialog aria-label={label} className={styles.dialog}>
                            <div className={styles.body} onKeyDownCapture={event => {
                                // Autocomplete normally clears search on Escape; Calendar menus dismiss first.
                                if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); changeOpen(false); }
                            }}>
                            <Autocomplete filter={onSearchChange ? undefined : contains} inputValue={search} onInputChange={setSearch}>
                                <SearchField aria-label={`Search ${label}`} value={search} onChange={setSearch} autoFocus className={styles.search}>
                                    <SearchLg aria-hidden="true" />
                                    <Input placeholder={placeholder} className={styles.searchInput} />
                                </SearchField>
                                <ListBox aria-label={label} items={availableGroups || availableItems} selectionMode={isMulti ? 'multiple' : 'single'}
                                    selectedKeys={selectedKeys} onSelectionChange={select} className={styles.list}
                                    renderEmptyState={() => <div className={styles.empty}>{typeof emptyMessage === 'function' ? emptyMessage(search) : emptyMessage}</div>}>
                                    {groups ? group => <ListBoxSection id={group.id} aria-label={group.label}>
                                        <Header className={styles.groupHeading}>{group.label}</Header>
                                        <Collection items={group.options}>{renderItem}</Collection>
                                    </ListBoxSection> : renderItem}
                                </ListBox>
                            </Autocomplete>
                            </div>
                        </Dialog>
                    </Popover>
                </DialogTrigger>
                <div className={styles.values}>
                    {selectedItems.map(item => isMulti ? <span key={item.value} data-multi-select-chip data-fixed={item.isFixed || undefined} className={styles.chip}>
                        <span>{item.label}</span>
                        {/* Fixed chips (e.g. the requesting student) can't be removed. */}
                        {!item.isFixed && <Button size="sm" color="tertiary" iconLeading={XClose} className={styles.remove} isDisabled={isDisabled}
                            aria-label={`Remove ${item.label}`} onPress={() => remove(item.value)} />}
                    </span> : <span key={item.value} className={styles.single}>{item.label}</span>)}
                </div>
                {isClearable && selectedItems.length > 0 && <Button size="sm" color="tertiary" iconLeading={XClose}
                    className={styles.clear} aria-label={`Clear ${label}`} isDisabled={isDisabled} onPress={() => onSelectionChange([])} />}
            </div>
            {name && selectedItems.map(item => <input key={item.value} type="hidden" name={name} value={item.value} />)}
        </div>
    </SelectContext.Provider>;
}
