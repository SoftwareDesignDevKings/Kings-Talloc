export const parseStudentEntries = (commaSeparated) =>
    commaSeparated
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

export const extractEmailFromEntry = (entry) =>
    entry.includes(':') ? entry.split(':')[1].trim() : entry;

export const filterNewStudentEntries = (entries, existingEmails) => {
    const existingSet = new Set(existingEmails);
    const seenEmails = new Set();
    return entries.filter((entry) => {
        const email = extractEmailFromEntry(entry);
        if (seenEmails.has(email) || existingSet.has(email)) return false;
        seenEmails.add(email);
        return true;
    });
};

export const filterNewEmails = (emails, existingEmails) => {
    const existingSet = new Set(existingEmails);
    return [...new Set(emails.map((e) => e.trim()).filter(Boolean))].filter(
        (email) => !existingSet.has(email),
    );
};
