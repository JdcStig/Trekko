// src/components/SessionManagement/EditSessionModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditSessionModal = ({ show, onHide, onEditSession, session }) => {
  const [formData, setFormData] = useState({
    team: '',
    sessionName: '',
    date: '',
    number: '',
    type: '',
    duration: '',
    avgDistance: '',
    numberOfSplits: '',
    notes: '',
    _id: '',
  });

  useEffect(() => {
    if (session) {
      setFormData({
        team: session.team || '',
        sessionName: session.sessionName || '',
        date: session.date || '',
        number: session.number || '',
        type: session.type || '',
        duration: session.duration || '',
        avgDistance: session.avgDistance || '',
        numberOfSplits: session.numberOfSplits || '',
        notes: session.notes || '',
        _id: session._id,
      });
    }
  }, [session]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onEditSession(formData);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Session</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="team" className="mb-3">
            <Form.Label>Team</Form.Label>
            <Form.Control
              type="text"
              name="team"
              value={formData.team}
              onChange={handleChange}
              placeholder="Enter team name"
              required
            />
          </Form.Group>
          <Form.Group controlId="sessionName" className="mb-3">
            <Form.Label>Session Name</Form.Label>
            <Form.Control
              type="text"
              name="sessionName"
              value={formData.sessionName}
              onChange={handleChange}
              placeholder="Enter session name"
              required
            />
          </Form.Group>
          <Form.Group controlId="date" className="mb-3">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group controlId="number" className="mb-3">
            <Form.Label>Number</Form.Label>
            <Form.Control
              type="text"
              name="number"
              value={formData.number}
              onChange={handleChange}
              placeholder="Enter number"
            />
          </Form.Group>
          <Form.Group controlId="type" className="mb-3">
            <Form.Label>Type</Form.Label>
            <Form.Control
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              placeholder="Enter type"
            />
          </Form.Group>
          <Form.Group controlId="duration" className="mb-3">
            <Form.Label>Duration</Form.Label>
            <Form.Control
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              placeholder="Enter duration"
            />
          </Form.Group>
          <Form.Group controlId="avgDistance" className="mb-3">
            <Form.Label>AvgDistance</Form.Label>
            <Form.Control
              type="text"
              name="avgDistance"
              value={formData.avgDistance}
              onChange={handleChange}
              placeholder="Enter average distance"
            />
          </Form.Group>
          <Form.Group controlId="numberOfSplits" className="mb-3">
            <Form.Label>Number of Splits</Form.Label>
            <Form.Control
              type="text"
              name="numberOfSplits"
              value={formData.numberOfSplits}
              onChange={handleChange}
              placeholder="Enter number of splits"
            />
          </Form.Group>
          <Form.Group controlId="notes" className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter notes"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit">Save Changes</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditSessionModal;
