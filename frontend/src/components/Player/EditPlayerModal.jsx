import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditPlayerModal = ({ show, onHide, onEditPlayer, initialData }) => {
  // State variables to store player details
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [teamId, setTeamId] = useState('');

  // Update form fields when the modal opens
  useEffect(() => {
    if (show && initialData) {
      setName(initialData.name);
      setPosition(initialData.position);
      setTeamId(initialData.teamId);
    }
  }, [show, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onEditPlayer({ id: initialData._id, name, position, teamId });

    // Close the modal after submission
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Player</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="playerName" className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter player's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="playerPosition" className="mb-3">
            <Form.Label>Position</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter player's position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="playerTeamId" className="mb-3">
            <Form.Label>Team ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter team ID"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
            />
          </Form.Group>
          <Button variant="primary" type="submit">
            Save Changes
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditPlayerModal;
