export const checkDuplicateName = (items, name, currentId = null) =>
    items.some(
        (item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== currentId,
    );
