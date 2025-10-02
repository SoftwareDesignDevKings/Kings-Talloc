describe('Tutor Availability Management', () => {
  beforeEach(() => {
    cy.logout()
  })

  it('should allow tutor to create availability in calendar modal', () => {
    // Login as tutor
    cy.loginWithGoogle('tutor')

    // Should be on dashboard
    cy.url().should('include', '/dashboard')

    // Wait for calendar to load
    cy.get('.rbc-calendar', { timeout: 10000 }).should('be.visible')

    // Click on a time slot to open modal (adjust selector based on your calendar)
    cy.get('.rbc-time-slot').first().click()

    // Check if modal opens (adjust selector based on your modal implementation)
    cy.get('[data-testid="availability-modal"]', { timeout: 5000 }).should('be.visible')
      .or(cy.get('.modal', { timeout: 5000 }).should('be.visible'))
      .or(cy.contains('Add Availability', { timeout: 5000 }).should('be.visible'))

    // Fill out availability form (adjust selectors based on your form)
    cy.get('[data-testid="availability-title"]').type('Available for Tutoring')
      .or(cy.get('input[placeholder*="title"]', { timeout: 3000 }).type('Available for Tutoring'))
      .or(cy.get('input[name="title"]', { timeout: 3000 }).type('Available for Tutoring'))

    // Set time slots if available
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="start-time"]').length > 0) {
        cy.get('[data-testid="start-time"]').clear().type('09:00')
        cy.get('[data-testid="end-time"]').clear().type('11:00')
      }
    })

    // Submit the availability
    cy.get('[data-testid="submit-availability"]').click()
      .or(cy.contains('Save', { matchCase: false }).click())
      .or(cy.contains('Add', { matchCase: false }).click())
      .or(cy.get('button[type="submit"]').click())

    // Modal should close
    cy.get('[data-testid="availability-modal"]').should('not.exist')
      .or(cy.get('.modal').should('not.be.visible'))

    // Availability should appear on calendar
    cy.get('.rbc-calendar').should('contain.text', 'Available')
      .or('contain.text', 'Tutoring')
  })

  it('should allow tutor to drag and move availability slots', () => {
    // Login as tutor
    cy.loginWithGoogle('tutor')

    // Wait for calendar to load
    cy.get('.rbc-calendar', { timeout: 10000 }).should('be.visible')

    // First create an availability (similar to previous test but simplified)
    cy.get('.rbc-time-slot').first().click()

    // Wait for modal and quickly add availability
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="availability-modal"]').length > 0 ||
          $body.find('.modal').length > 0) {

        // Fill minimal required fields
        cy.get('input').first().type('Test Availability')

        // Submit
        cy.get('button').contains(/save|add|submit/i).click()
      }
    })

    // Wait for availability to appear
    cy.wait(1000)

    // Find the created availability event
    cy.get('.rbc-event', { timeout: 5000 }).should('be.visible').first().as('availabilityEvent')

    // Test drag and drop functionality
    cy.get('@availabilityEvent').then(($event) => {
      const originalPosition = $event.offset()

      // Perform drag operation
      cy.get('@availabilityEvent')
        .trigger('mousedown', { which: 1 })
        .trigger('mousemove', { clientX: originalPosition.left + 100, clientY: originalPosition.top + 50 })
        .trigger('mouseup')

      // Verify the event moved (position should be different)
      cy.get('.rbc-event').first().then(($movedEvent) => {
        const newPosition = $movedEvent.offset()
        expect(newPosition.left).to.not.equal(originalPosition.left)
      })
    })
  })

  it('should display different availability options for tutors vs students', () => {
    // Login as tutor first
    cy.loginWithGoogle('tutor')
    cy.get('.rbc-calendar', { timeout: 10000 }).should('be.visible')

    // Check tutor-specific UI elements
    cy.get('body').should(($body) => {
      const text = $body.text().toLowerCase()
      expect(text.includes('availability') || text.includes('tutor') || text.includes('schedule')).to.be.true
    })

    // Click on calendar to check if availability modal appears
    cy.get('.rbc-time-slot').first().click()

    // Should see availability creation options
    cy.get('body').should('contain.text', 'Add')
      .or('contain.text', 'Create')
      .or('contain.text', 'Available')

    // Logout and login as student
    cy.logout()
    cy.loginWithGoogle('student')
    cy.get('.rbc-calendar', { timeout: 10000 }).should('be.visible')

    // Click on calendar as student
    cy.get('.rbc-time-slot').first().click()

    // Should see different options (like booking, not creating availability)
    cy.get('body').should(($body) => {
      const text = $body.text().toLowerCase()
      // Students should see booking/request options, not availability creation
      expect(text.includes('book') || text.includes('request') || text.includes('session')).to.be.true
    })
  })

  it('should handle availability conflicts and overlaps', () => {
    // Login as tutor
    cy.loginWithGoogle('tutor')
    cy.get('.rbc-calendar', { timeout: 10000 }).should('be.visible')

    // Create first availability
    cy.get('.rbc-time-slot').first().click()
    cy.get('body').then(($body) => {
      if ($body.find('input').length > 0) {
        cy.get('input').first().type('Morning Availability')
        cy.get('button').contains(/save|add|submit/i).click()
      }
    })

    cy.wait(1000)

    // Try to create overlapping availability
    cy.get('.rbc-time-slot').first().click()
    cy.get('body').then(($body) => {
      if ($body.find('input').length > 0) {
        cy.get('input').first().clear().type('Conflicting Availability')
        cy.get('button').contains(/save|add|submit/i).click()

        // Should either show error message or prevent creation
        cy.get('body').should(($body) => {
          const text = $body.text().toLowerCase()
          expect(text.includes('conflict') || text.includes('overlap') || text.includes('error')).to.be.true
        })
      }
    })
  })
})