// Full dates shown to users follow the school's Sydney date and time.
export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';

const dateOptions = {
    timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric',
};
const dateFormatter = new Intl.DateTimeFormat('en-AU', dateOptions);
const dateTimeFormatter = new Intl.DateTimeFormat('en-AU', {
    ...dateOptions, hour: 'numeric', minute: '2-digit', hour12: true,
});
const timeFormatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: dateOptions.timeZone, hour: 'numeric', minute: '2-digit', hour12: true,
});
const asDate = value => value?.toDate ? value.toDate() : new Date(value);

export const formatDisplayDate = value => {
    // Hours calculations use date-only keys, not instants to convert between zones.
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-');
        return `${day}/${month}/${year}`;
    }
    return dateFormatter.format(asDate(value));
};

export const formatDisplayDateTime = value => dateTimeFormatter.format(asDate(value));

export const formatDisplayTime = value => timeFormatter.format(asDate(value));

// Drop a repeated am/pm so ranges fit narrow calendar columns: "3:00 – 4:00 pm".
export const formatCompactTimeRange = (start, end) => {
    const [from, to] = [formatDisplayTime(start), formatDisplayTime(end)];
    const period = text => text.match(/\s*([ap]\.?m\.?)$/i);
    const [fromPeriod, toPeriod] = [period(from), period(to)];
    return fromPeriod && toPeriod && fromPeriod[1] === toPeriod[1]
        ? `${from.slice(0, fromPeriod.index)} – ${to}` : `${from} – ${to}`;
};
