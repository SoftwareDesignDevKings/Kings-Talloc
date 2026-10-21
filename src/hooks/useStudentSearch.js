import { useEffect, useState } from 'react';

const MIN_QUERY_LENGTH = 2;

/**
 * Searches the cached server student directory as staff type, instead of loading
 * every Canvas student into the browser. Returns select options ({ value, label }).
 */
export default function useStudentSearch() {
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < MIN_QUERY_LENGTH) { setOptions([]); return; }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(`/api/students?q=${encodeURIComponent(trimmed)}`, { cache: 'no-store', signal: controller.signal });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                setOptions(data.students.map(student => ({ value: student.email, label: student.name })));
                setError(null);
            } catch (searchError) {
                if (searchError.name === 'AbortError') return;
                setOptions([]);
                setError('Unable to search students. Please try again.');
            }
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query]);

    const noOptionsMessage = ({ inputValue = '' } = {}) => error
        || (inputValue.trim().length < MIN_QUERY_LENGTH ? 'Type at least 2 letters to find students' : 'No students found');

    return { options, search: setQuery, noOptionsMessage };
}
