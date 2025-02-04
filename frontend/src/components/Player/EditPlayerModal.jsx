import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditPlayerModal = ({ show, onHide, onEditPlayer, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [position, setPosition] = useState(initialData?.position || '');
  const [teamId, setTeamId] = useState(initialData?.teamId || '');

  // Update form fields when the initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPosition(initialData.position);
      setTeamId(initialData.teamId);
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pass the updated data including the player's id
    onEditPlayer({ id: initialData._id, name, position, teamId });
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
