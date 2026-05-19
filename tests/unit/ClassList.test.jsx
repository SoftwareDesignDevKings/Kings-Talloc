import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClassList from '@/components/ClassList.jsx';
import { useAppData } from '@/contexts/AppDataContext';

jest.mock('@/contexts/AppDataContext', () => ({
    useAppData: jest.fn(),
}));

describe('ClassList', () => {
    beforeEach(() => {
        useAppData.mockReturnValue({
            classes: [
                {
                    id: '123',
                    name: 'Mathematics Year 10',
                    courseCode: 'MATH10',
                    blueprintCourseName: 'Mathematics Blueprint',
                    students: [
                        { email: 'jane@example.edu', name: 'Jane Student' },
                    ],
                },
            ],
        });
    });

    test('renders read-only Canvas courses and roster counts', () => {
        render(<ClassList />);

        expect(screen.getByText('Canvas Classes')).toBeInTheDocument();
        expect(screen.getByText('Mathematics Year 10')).toBeInTheDocument();
        expect(screen.getByText('MATH10')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.queryByText('Add Class')).not.toBeInTheDocument();
        expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    test('expands Canvas roster details', () => {
        render(<ClassList />);

        fireEvent.click(screen.getByRole('button', { name: /expand students/i }));
        expect(screen.getByText('Jane Student')).toBeInTheDocument();
        expect(screen.getByText('jane@example.edu')).toBeInTheDocument();
    });
});
