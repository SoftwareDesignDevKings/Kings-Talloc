// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities and scoped reset.
"use client";
import "./styles/generated.css";
import { getDayOfWeek } from "@internationalized/date";
import { CalendarCell as AriaCalendarCell, RangeCalendarContext, useLocale, useSlottedContext } from "react-aria-components";
import { cx } from "./utils/cx";
export const CalendarCell = ({ date, isHighlighted, showOutOfRangeDates = false, ...props }) => {
    const { locale } = useLocale();
    const dayOfWeek = getDayOfWeek(date, locale);
    const rangeCalendarContext = useSlottedContext(RangeCalendarContext);
    const isRangeCalendar = !!rangeCalendarContext;
    const start = rangeCalendarContext?.value?.start;
    const end = rangeCalendarContext?.value?.end;
    const isAfterStart = start ? date.compare(start) > 0 : true;
    const isBeforeEnd = end ? date.compare(end) < 0 : true;
    const isAfterOrOnStart = start && date.compare(start) >= 0;
    const isBeforeOrOnEnd = end && date.compare(end) <= 0;
    const isInRange = isAfterOrOnStart && isBeforeOrOnEnd;
    const lastDayOfMonth = new Date(date.year, date.month, 0).getDate();
    const isLastDayOfMonth = date.day === lastDayOfMonth;
    const isFirstDayOfMonth = date.day === 1;
    return (<AriaCalendarCell data-untitled-calendar-cell {...props} date={date} className={({ isDisabled, isFocusVisible, isSelectionStart, isSelectionEnd, isSelected, isOutsideMonth }) => {
            const isRoundedLeft = isSelectionStart || dayOfWeek === 0;
            const isRoundedRight = isSelectionEnd || dayOfWeek === 6;
            return cx("uui:relative uui:size-10 uui:focus:outline-hidden", isRoundedLeft && "uui:rounded-l-full", isRoundedRight && "uui:rounded-r-full", isInRange && isDisabled && "uui:bg-secondary", isSelected && isRangeCalendar && "uui:bg-secondary", isDisabled ? "uui:pointer-events-none" : "uui:cursor-pointer", isFocusVisible ? "uui:z-10" : "uui:z-0", isOutsideMonth && "uui:opacity-50", isRangeCalendar && isOutsideMonth && !showOutOfRangeDates && "uui:hidden",
            // Show gradient on last day of month if it's within the selected range.
            isLastDayOfMonth &&
                isSelected &&
                isBeforeEnd &&
                isRangeCalendar &&
                "uui:after:absolute uui:after:inset-0 uui:after:translate-x-full uui:after:bg-gradient-to-l uui:after:from-transparent uui:after:to-bg-secondary uui:in-[[role=gridcell]:last-child]:after:hidden",
            // Show gradient on first day of month if it's within the selected range.
            isFirstDayOfMonth &&
                isSelected &&
                isAfterStart &&
                isRangeCalendar &&
                "uui:after:absolute uui:after:inset-0 uui:after:-translate-x-full uui:after:bg-gradient-to-r uui:after:from-transparent uui:after:to-bg-secondary uui:in-[[role=gridcell]:first-child]:after:hidden");
        }}>
            {({ isDisabled, isFocusVisible, isSelectionStart, isSelectionEnd, isSelected, formattedDate }) => {
            const markedAsSelected = isSelectionStart || isSelectionEnd || (isSelected && !isDisabled && !isRangeCalendar);
            return (<div className={cx("uui:relative uui:flex uui:size-full uui:items-center uui:justify-center uui:rounded-full uui:text-sm uui:text-secondary uui:hover:text-secondary_hover",
                // Disabled state.
                isDisabled && "uui:text-secondary/50",
                // Focus ring, visible while the cell has keyboard focus.
                isFocusVisible ? "uui:outline-2 uui:outline-offset-2 uui:outline-focus-ring" : "",
                // Hover state for cells in the middle of the range.
                isSelected && !isDisabled && isRangeCalendar ? "uui:font-medium" : "", markedAsSelected && "uui:bg-brand-solid uui:font-medium uui:text-white uui:hover:bg-brand-solid_hover uui:hover:text-white",
                // Hover state for non-selected cells.
                !isSelected && !isDisabled ? "uui:hover:bg-primary_hover uui:hover:font-medium!" : "")}>
                        {formattedDate}

                        {isHighlighted && (<div data-calendar-marker aria-hidden="true" className={cx("uui:absolute uui:bottom-1 uui:left-1/2 uui:size-1.25 uui:-translate-x-1/2 uui:rounded-full", markedAsSelected ? "uui:bg-fg-white" : "uui:bg-fg-brand-primary", isDisabled && "uui:opacity-50")}/>)}
                    </div>);
        }}
        </AriaCalendarCell>);
};
