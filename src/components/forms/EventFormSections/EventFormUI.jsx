'use client';

import { createContext, useContext, useId, useState } from 'react';
import { ChevronDown, XClose } from '@untitledui/icons';
import { ModalOverlay, Modal, Dialog } from '@/components/untitled/modal';
import { Button } from '@/components/untitled/button';
import { Select } from '@/components/untitled/select';
import CalendarMultiSelect from '@/components/calendar/CalendarMultiSelect';
import styles from '@/styles/staffEventForm.module.css';

export const EventFormUIContext = createContext({});

// Local dialog/accordion composition; persistence remains owned by EventForm.
export function StaffEventDialog({ show = true, onHide, title, children, onSubmit, submitText, submitVariant, loading = false, size = 'lg', deleteButton, customFooter, showFooter = true, menuOpen = false, setPortalContainer }) {
    const titleId = useId();
    const footer = showFooter && (customFooter || (onSubmit && <>
        {deleteButton && <Button size="md" color="secondary-destructive" isDisabled={loading} onClick={async () => { if (await deleteButton.onClick() !== false) onHide(); }}>{deleteButton.text}</Button>}
        <Button size="md" color={submitVariant === 'danger' ? 'primary-destructive' : 'primary'} type="submit" isDisabled={loading} isLoading={loading} showTextWhileLoading>{loading ? 'Loading...' : submitText}</Button>
    </>));
    return <ModalOverlay isOpen={show} isDismissable={!loading} isKeyboardDismissDisabled={loading || menuOpen}
        onOpenChange={open => { if (!open && !loading) onHide(); }} className={styles.overlay}>
        <Modal className={`${styles.modal} ${size === 'md' ? styles.confirmation : ''}`}>
            <Dialog ref={setPortalContainer} aria-labelledby={titleId} className={styles.dialog}>
                <header className={styles.header}>
                    <h5 id={titleId} className={styles.title}>{title}</h5>
                    <Button size="sm" color="tertiary" iconLeading={XClose} aria-label="Close" isDisabled={loading} onClick={onHide} />
                </header>
                {onSubmit ? <form aria-label="Event form" noValidate className={styles.form} onSubmit={async e => { e.preventDefault(); if (!loading && await onSubmit(e) !== false) onHide(); }}>
                    <div className={styles.body}>{children}</div>
                    {footer && <footer className={styles.footer}>{footer}</footer>}
                </form> : <><div className={styles.body}>{children}</div>{footer && <footer className={styles.footer}>{footer}</footer>}</>}
            </Dialog>
        </Modal>
    </ModalOverlay>;
}

export function EventSection({ id, title, icon: Icon, trailing, children, defaultExpanded = false }) {
    const { activeSection, setActiveSection, busy } = useContext(EventFormUIContext);
    const uniqueId = useId();
    const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
    const expanded = setActiveSection ? activeSection === id : localExpanded;
    return <section className={styles.section}>
        <h2 className={styles.sectionHeading}>
            <Button size="sm" color="tertiary" className={styles.sectionToggle} isDisabled={busy}
                aria-expanded={expanded} aria-controls={uniqueId} onClick={() => setActiveSection ? setActiveSection(expanded ? null : id) : setLocalExpanded(!expanded)}>
                <Icon aria-hidden="true" /> <span className={styles.sectionTitle}>{title}</span>{trailing}
                <ChevronDown aria-hidden="true" className={expanded ? styles.chevronOpen : styles.chevron} />
            </Button>
        </h2>
        <div id={uniqueId} aria-hidden={!expanded} data-expanded={expanded}
            ref={node => { if (node) node.inert = !expanded; }} className={styles.sectionPanel}>
            <div className={styles.sectionContent}>
                <div className={styles.sectionBody}>{children}</div>
            </div>
        </div>
    </section>;
}

export function EventSelect({ options, value, onChange, isDisabled, label, ...props }) {
    const { portalContainer, busy } = useContext(EventFormUIContext);
    return <Select placeholder="Select..." {...props} label={label} size="md" isDisabled={isDisabled || busy} portalContainer={portalContainer}
        selectedKey={options.some(option => option.value === value) ? value : null}
        onSelectionChange={key => { const option = options.find(item => item.value === key); if (option) onChange(option); }}
        items={options.map(option => ({ ...option, id: option.value }))}>
        {item => <Select.Item id={item.id} label={item.label} />}
    </Select>;
}

export function EventMultiSelect(props) {
    const { portalContainer, setMenuOpen, busy } = useContext(EventFormUIContext);
    const [open, setOpen] = useState(false);
    return <CalendarMultiSelect {...props} isDisabled={props.isDisabled || busy} menuPortalTarget={portalContainer} menuIsOpen={open}
        onMenuOpen={() => { setOpen(true); setMenuOpen(true); }} onMenuClose={() => { setOpen(false); setMenuOpen(false); }} />;
}
