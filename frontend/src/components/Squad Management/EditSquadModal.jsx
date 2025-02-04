import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditSquadModal = ({ show, onHide, onEditSquad, squad }) => {
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');

  //If the squad exists, it will put the name and TeamId into the inputs
  useEffect(() => {
    if (squad) {
      setName(squad.name);
      setTeamId(squad.teamId);
    }
  }, [squad]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onEditSquad({ id: squad.id, name, teamId });
    
    setName('');
    setTeamId('');
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit New Squad</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="squadName" className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter squad's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>      
          <Form.Group controlId="squadTeamId" className="mb-3">
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
          Update Squad
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditSquadModal;
