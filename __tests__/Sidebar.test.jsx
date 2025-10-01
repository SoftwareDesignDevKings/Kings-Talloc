import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Sidebar from '../components/Sidebar.js'

const setup = (userRole = 'student', userOverrides = {}) => {
  const setActiveSection = jest.fn()
  const user = {
    name: 'Test User',
    email: 'test@kings.edu.au',
    image: null,
    ...userOverrides,
  }

  render(
    <Sidebar
      setActiveSection={setActiveSection}
      userRole={userRole}
      user={user}
    />
  )

  return { setActiveSection }
}

describe('Sidebar', () => {

  it('renders calendar for all user roles', () => {
    setup('student')
    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })

  it('shows limited menu items for students', () => {
    setup('student')

    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.queryByText('User Roles')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Classes')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Subjects')).not.toBeInTheDocument()
    expect(screen.queryByText('Tutor Hours')).not.toBeInTheDocument()
  })

  it('shows tutor hours for tutor role', () => {
    setup('tutor')

    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Tutor Hours')).toBeInTheDocument()
    expect(screen.queryByText('User Roles')).not.toBeInTheDocument()
  })

  it('shows all menu items for teacher role', () => {
    setup('teacher')

    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('User Roles')).toBeInTheDocument()
    expect(screen.getByText('Manage Classes')).toBeInTheDocument()
    expect(screen.getByText('Manage Subjects')).toBeInTheDocument()
    expect(screen.getByText('Tutor Hours')).toBeInTheDocument()
  })

  it('calls setActiveSection when menu item is clicked', () => {
    const { setActiveSection } = setup('teacher')

    fireEvent.click(screen.getByText('Calendar'))
    expect(setActiveSection).toHaveBeenCalledWith('calendar')

    fireEvent.click(screen.getByText('User Roles'))
    expect(setActiveSection).toHaveBeenCalledWith('userRoles')

    fireEvent.click(screen.getByText('Manage Classes'))
    expect(setActiveSection).toHaveBeenCalledWith('classes')
  })

  it('displays user name when provided', () => {
    setup('student', { name: 'John Student' })
    expect(screen.getByText('John Student')).toBeInTheDocument()
  })

  it('collapses sidebar when toggle button is clicked', () => {
    setup('teacher')

    // Initially expanded - should show "Menu" text
    expect(screen.getByText('Menu')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()

    // Click collapse button
    const toggleButton = screen.getByRole('button')
    fireEvent.click(toggleButton)

    // After collapse - "Menu" text should be hidden
    expect(screen.queryByText('Menu')).not.toBeInTheDocument()
    expect(screen.queryByText('Calendar')).not.toBeInTheDocument()
  })

  it('expands sidebar when toggle button is clicked again', () => {
    setup('teacher')

    const toggleButton = screen.getByRole('button')

    // Collapse first
    fireEvent.click(toggleButton)
    expect(screen.queryByText('Menu')).not.toBeInTheDocument()

    // Expand again
    fireEvent.click(toggleButton)
    expect(screen.getByText('Menu')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })

  it('shows profile section with user image when provided', () => {
    setup('teacher', {
      name: 'Jane Teacher',
      image: 'https://example.com/avatar.jpg'
    })

    expect(screen.getByText('Jane Teacher')).toBeInTheDocument()

    // Check if image is rendered (Next/Image is mocked as <img>)
    const userImage = screen.getByRole('img')
    expect(userImage).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('shows default user icon when no image provided', () => {
    setup('teacher', { name: 'No Image User', image: null })

    expect(screen.getByText('No Image User')).toBeInTheDocument()

    // Should have default icon container with rounded styling
    const profileSection = screen.getByText('No Image User').closest('div')
    const iconContainer = profileSection.querySelector('.tw-rounded-full')
    expect(iconContainer).toBeInTheDocument()
  })
})