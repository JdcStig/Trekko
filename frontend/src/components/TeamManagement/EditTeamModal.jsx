import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditTeamModal = ({ show, onHide, onEditTeam, team }) => {
  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [teamId, setTeamId] = useState('');

  useEffect(() => {
    if (show && team) {
      setName(team.name);
      setSport(team.sport);
    }
  }, [show, team]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onEditTeam({ id: team.id, name, sport });

    // Close modal after submission
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Team</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="teamName" className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter team's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="teamSport" className="mb-3">
            <Form.Label>Sport</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter team's sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              required
            />
          </Form.Group>


          <Button variant="primary" type="submit">
            Update Team
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditTeamModal;
