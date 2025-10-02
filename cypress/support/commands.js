// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command for Google OAuth login (mocking for E2E)
Cypress.Commands.add('loginWithGoogle', (role = 'student') => {
  // Mock the NextAuth session for testing
  cy.window().then((win) => {
    win.localStorage.setItem('nextauth.message', JSON.stringify({
      event: 'session',
      data: {
        user: {
          name: role === 'tutor' ? 'Test Tutor' : 'Test User',
          email: role === 'tutor' ? 'tutor@kings.edu.au' : 'test@kings.edu.au',
          image: 'https://via.placeholder.com/150',
          role: role
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    }))
  })

  // Visit the dashboard directly (simulating successful auth)
  cy.visit('/dashboard')
})

// Custom command to clear session
Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.clear()
    win.sessionStorage.clear()
  })
  cy.clearCookies()
})