import { useState } from 'react';

const useToggleSet = () => {
    const [set, setSet] = useState(new Set());

    const toggle = (id) => {
        setSet((prev) => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    const remove = (id) => {
        setSet((prev) => {
            const s = new Set(prev);
            s.delete(id);
            return s;
        });
    };

    return [set, toggle, remove];
};

export default useToggleSet;
