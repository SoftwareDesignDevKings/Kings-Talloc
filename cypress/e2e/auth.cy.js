describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.logout()
  })

  it('redirect unauthenticated users to login page', () => {
    cy.visit('/dashboard')

    // Should be redirected to the home/login page
    cy.url().should('include', '/')
    cy.get('body').should('be.visible')

    // Check for login elements (adjust selectors based on your actual login page)
    cy.contains('Sign in', { matchCase: false }).should('be.visible')
  })

  it('should allow authenticated users to access dashboard', () => {
    cy.loginWithGoogle()

    // Should be on dashboard
    cy.url().should('include', '/dashboard')

    // Check for dashboard elements
    cy.get('body').should('be.visible')

    cy.get('body').should(($body) => {
      expect($body.text()).to.satisfy((text) => {
        return text.includes('Dashboard') || text.includes('Calendar') || text.includes('Tutor')
      })
    })
  })

  it('should maintain session across page reloads', () => {
    // Login and visit dashboard
    cy.loginWithGoogle()
    cy.url().should('include', '/dashboard')

    // Reload the page
    cy.reload()

    // Should still be authenticated and on dashboard
    cy.url().should('include', '/dashboard')
    cy.get('body').should('be.visible')
  })

  it('should logout successfully', () => {
    // Login first
    cy.loginWithGoogle()
    cy.url().should('include', '/dashboard')

    // Clear session to simulate logout
    cy.logout()

    // Visit root to trigger redirect check
    cy.visit('/')

    // Should be on home page, not dashboard
    cy.url().should('not.include', '/dashboard')
  })
})