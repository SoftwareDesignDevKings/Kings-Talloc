export const parseStudentEntries = (commaSeparated) =>
    commaSeparated
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

export const extractEmailFromEntry = (entry) => {
    const raw = entry.includes(':') ? entry.split(':')[1].trim() : entry;
    return raw.toLowerCase();
};

export const filterNewStudentEntries = (entries, existingEmails) => {
    const existingSet = new Set(existingEmails.map((e) => e.toLowerCase()));
    const seenEmails = new Set();
    return entries.filter((entry) => {
        const email = extractEmailFromEntry(entry);
        if (seenEmails.has(email) || existingSet.has(email)) return false;
        seenEmails.add(email);
        return true;
    });
};

export const filterNewEmails = (emails, existingEmails) => {
    const existingSet = new Set(existingEmails.map((e) => e.toLowerCase()));
    return [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))].filter(
        (email) => !existingSet.has(email),
    );
};
