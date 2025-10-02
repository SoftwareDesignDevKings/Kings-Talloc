"use client";

import React, { useState } from 'react';
import { Button, Form, Alert } from 'react-bootstrap';
import BaseModal from '../modals/BaseModal.jsx';

/**
 * Examples showing different BaseModal usage patterns
 * Demonstrates the flexibility of the new Bootstrap-based modal system
 */
const BaseModalExamples = () => {
  const [modals, setModals] = useState({
    basic: false,
    form: false,
    confirmation: false,
    customFooter: false,
    noFooter: false,
    loading: false
  });

  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);

  const toggleModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: !prev[modalName] }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      console.log('Form submitted:', formData);
      setLoading(false);
      toggleModal('form');
      setFormData({ name: '', email: '' });
    }, 2000);
  };

  const handleConfirmAction = () => {
    console.log('Action confirmed!');
    toggleModal('confirmation');
  };

  return (
    <div className="p-4">
      <h2>Bootstrap BaseModal Examples</h2>
      <p>Demonstrating different modal patterns using the unified BaseModal component.</p>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <Button variant="primary" onClick={() => toggleModal('basic')}>
          Basic Modal
        </Button>
        <Button variant="success" onClick={() => toggleModal('form')}>
          Form Modal
        </Button>
        <Button variant="danger" onClick={() => toggleModal('confirmation')}>
          Confirmation Modal
        </Button>
        <Button variant="warning" onClick={() => toggleModal('customFooter')}>
          Custom Footer
        </Button>
        <Button variant="info" onClick={() => toggleModal('noFooter')}>
          No Footer
        </Button>
        <Button variant="secondary" onClick={() => toggleModal('loading')}>
          Loading State
        </Button>
      </div>

      {/* Basic Information Modal */}
      <BaseModal
        show={modals.basic}
        onHide={() => toggleModal('basic')}
        title="Basic Information Modal"
        size="md"
      >
        <Alert variant="info">
          <Alert.Heading>Welcome!</Alert.Heading>
          <p>This is a basic modal that displays information to the user.</p>
          <hr />
          <p className="mb-0">
            It uses the default footer with just a close button since no onSubmit is provided.
          </p>
        </Alert>
        <p>You can put any content here including forms, tables, or other components.</p>
      </BaseModal>

      {/* Form Modal */}
      <BaseModal
        show={modals.form}
        onHide={() => toggleModal('form')}
        title="User Registration Form"
        size="lg"
        onSubmit={handleFormSubmit}
        submitText={loading ? "Creating Account..." : "Create Account"}
        loading={loading}
      >
        <Form.Group className="mb-3">
          <Form.Label>Full Name</Form.Label>
          <Form.Control
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            disabled={loading}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
            disabled={loading}
          />
        </Form.Group>

        <Alert variant="secondary">
          <small>This form demonstrates loading states and form validation.</small>
        </Alert>
      </BaseModal>

      {/* Confirmation Modal */}
      <BaseModal
        show={modals.confirmation}
        onHide={() => toggleModal('confirmation')}
        title="Confirm Deletion"
        size="sm"
        customFooter={
          <div className="w-100 d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={() => toggleModal('confirmation')}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmAction}>
              Delete
            </Button>
          </div>
        }
      >
        <Alert variant="warning">
          <p className="mb-0">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
        </Alert>
      </BaseModal>

      {/* Custom Footer Modal */}
      <BaseModal
        show={modals.customFooter}
        onHide={() => toggleModal('customFooter')}
        title="Custom Footer Example"
        customFooter={
          <div className="w-100 d-flex justify-content-between align-items-center">
            <small className="text-muted">Last updated: 2 minutes ago</small>
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" size="sm">
                Save Draft
              </Button>
              <Button variant="secondary" onClick={() => toggleModal('customFooter')}>
                Close
              </Button>
              <Button variant="primary">
                Publish
              </Button>
            </div>
          </div>
        }
      >
        <p>This modal demonstrates a completely custom footer with multiple buttons and additional information.</p>
        <Form.Group className="mb-3">
          <Form.Label>Article Title</Form.Label>
          <Form.Control type="text" placeholder="Enter title..." />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Content</Form.Label>
          <Form.Control as="textarea" rows={4} placeholder="Write your article..." />
        </Form.Group>
      </BaseModal>

      {/* No Footer Modal */}
      <BaseModal
        show={modals.noFooter}
        onHide={() => toggleModal('noFooter')}
        title="Content Only Modal"
        showFooter={false}
      >
        <div className="text-center py-4">
          <h4>📊 Analytics Dashboard</h4>
          <p>This modal has no footer - perfect for displaying charts, graphs, or other visual content.</p>
          <div className="d-flex justify-content-around mt-4">
            <div>
              <h5>1,234</h5>
              <small>Total Users</small>
            </div>
            <div>
              <h5>567</h5>
              <small>Active Sessions</small>
            </div>
            <div>
              <h5>89%</h5>
              <small>Uptime</small>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => toggleModal('noFooter')}
            className="mt-4"
          >
            Close Dashboard
          </Button>
        </div>
      </BaseModal>

      {/* Loading State Modal */}
      <BaseModal
        show={modals.loading}
        onHide={() => toggleModal('loading')}
        title="Processing Request"
        onSubmit={() => {}} // Empty handler to show submit button
        submitText="Processing..."
        loading={true}
        disabled={true}
        backdrop="static"
        keyboard={false}
      >
        <div className="text-center py-4">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Please wait while we process your request...</p>
          <p className="text-muted">This may take a few moments.</p>
        </div>
      </BaseModal>

      {/* New Configuration Object Examples */}
      <div className="mt-5">
        <h3>Clean, Simple API</h3>
        <p className="text-muted mb-4">BaseModal now uses a streamlined prop interface that's intuitive and easy to use:</p>

        <div className="alert alert-success">
          <h5>✨ Simple, Clean API</h5>
          <p>The BaseModal now uses a streamlined prop interface that's intuitive and easy to use:</p>
          <pre className="bg-white p-3 rounded border">
{`<BaseModal
  show={true}
  onHide={handleClose}
  title="Example"
  size="lg"
  onSubmit={handleSubmit}
  submitText="Save"
  loading={false}
  disabled={false}
/>`}
          </pre>

          <h6 className="mt-3">Key Benefits:</h6>
          <ul className="mb-0">
            <li><strong>Intuitive:</strong> Props named exactly what you'd expect</li>
            <li><strong>Minimal:</strong> Only pass the props you actually need</li>
            <li><strong>Clean:</strong> No nested configuration objects</li>
            <li><strong>Fast:</strong> Easy to write and read</li>
          </ul>
        </div>
      </div>

      {/* Usage Documentation */}
      <div className="mt-5">
        <h3>BaseModal Props Reference</h3>
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Default</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>show</code></td>
                <td>boolean</td>
                <td>false</td>
                <td>Controls modal visibility</td>
              </tr>
              <tr>
                <td><code>onHide</code></td>
                <td>function</td>
                <td>-</td>
                <td>Called when modal should close</td>
              </tr>
              <tr>
                <td><code>title</code></td>
                <td>string</td>
                <td>-</td>
                <td>Modal title text</td>
              </tr>
              <tr>
                <td><code>size</code></td>
                <td>&apos;sm&apos;|&apos;md&apos;|&apos;lg&apos;|&apos;xl&apos;</td>
                <td>&apos;lg&apos;</td>
                <td>Modal size</td>
              </tr>
              <tr>
                <td><code>onSubmit</code></td>
                <td>function</td>
                <td>-</td>
                <td>Form submit handler (shows submit button)</td>
              </tr>
              <tr>
                <td><code>submitText</code></td>
                <td>string</td>
                <td>&apos;Submit&apos;</td>
                <td>Submit button text</td>
              </tr>
              <tr>
                <td><code>loading</code></td>
                <td>boolean</td>
                <td>false</td>
                <td>Shows loading state on buttons</td>
              </tr>
              <tr>
                <td><code>disabled</code></td>
                <td>boolean</td>
                <td>false</td>
                <td>Disables form submission</td>
              </tr>
              <tr>
                <td><code>customFooter</code></td>
                <td>ReactNode</td>
                <td>-</td>
                <td>Custom footer content</td>
              </tr>
              <tr>
                <td><code>showFooter</code></td>
                <td>boolean</td>
                <td>true</td>
                <td>Whether to show footer</td>
              </tr>
              <tr>
                <td><code>deleteButton</code></td>
                <td>object</td>
                <td>-</td>
                <td>Delete button config: {`{text, onClick, variant}`}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BaseModalExamples;