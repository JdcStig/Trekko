import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const AddSquadModal = ({ show, onHide, onAddSquad }) => {
  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [teamId, setTeamId] = useState('');

  useEffect(() => {
    if (!show) {
      setName('');
      setSport('');
      setTeamId('');
    }
  }, [show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddSquad({ name, sport, teamId });
    
    //resets data after submit to balnk
    setName('');
    setSport('');
    setTeamId('');
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add New Squad</Modal.Title>
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
          
          <Form.Group controlId="squadSport" className="mb-3">
            <Form.Label>Sport</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter squad's sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
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
            Add Squad
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddSquadModal;
