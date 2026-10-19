// Single-date calendar excerpt from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports and prefixed utilities. Optional Today/duplicate input controls omitted.
'use client';
import './styles/generated.css';
import { ChevronLeft, ChevronRight } from '@untitledui/icons';
import { Calendar as AriaCalendar, CalendarGrid, CalendarGridBody, CalendarGridHeader, CalendarHeaderCell, Heading } from 'react-aria-components';
import { Button } from './button';
import { CalendarCell } from './calendar-cell';
import { cx } from './utils/cx';

export function Calendar({ className, ...props }) {
    return <AriaCalendar {...props} data-untitled-control className={cx('uui:flex uui:flex-col uui:gap-3', className)}>
        <header className="uui:flex uui:items-center uui:justify-between">
            <Button slot="previous" iconLeading={ChevronLeft} size="sm" color="tertiary" className="uui:size-8" />
            <Heading className="uui:text-sm uui:font-semibold uui:text-fg-secondary" />
            <Button slot="next" iconLeading={ChevronRight} size="sm" color="tertiary" className="uui:size-8" />
        </header>
        <CalendarGrid weekdayStyle="short" className="uui:w-max">
            <CalendarGridHeader className="uui:border-b-4 uui:border-transparent">
                {day => <CalendarHeaderCell className="uui:p-0"><div className="uui:flex uui:size-10 uui:items-center uui:justify-center uui:text-sm uui:font-medium uui:text-secondary">{day.slice(0, 2)}</div></CalendarHeaderCell>}
            </CalendarGridHeader>
            <CalendarGridBody className="uui:[&_td]:p-0 uui:[&_tr]:border-b-4 uui:[&_tr]:border-transparent uui:[&_tr:last-of-type]:border-none">
                {date => <CalendarCell date={date} />}
            </CalendarGridBody>
        </CalendarGrid>
    </AriaCalendar>;
}
