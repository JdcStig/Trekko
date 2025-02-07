import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { useGetTeamsQuery } from '../../slices/teamsApiSlice';
import sportPositions from '../../data/sportPositions.json';

const EditPlayerModal = ({ show, onHide, onEditPlayer, initialData }) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState('');

  const { userInfo } = useSelector((state) => state.auth);
  const { data: teamsData } = useGetTeamsQuery();

  const filteredTeams = useMemo(() => {
    return teamsData?.teams?.filter(team => team.userId === userInfo?._id) || [];
  }, [teamsData, userInfo]);

  useEffect(() => {
    if (show && initialData) {
      console.log('Initial data:', initialData);

      setName(initialData.name || '');
      setTeamName(initialData.teamName || '');
      setPosition(initialData.position || '');

      const selectedTeam = filteredTeams.find(team => team.name === initialData.teamName);
      setSport(selectedTeam?.sport || 'Other');
    }
  }, [show, initialData, filteredTeams]);

  const handleTeamChange = (e) => {
    const selectedTeamName = e.target.value;
    setTeamName(selectedTeamName);

    const selectedTeam = filteredTeams.find(team => team.name === selectedTeamName);
    if (selectedTeam) {
      setSport(selectedTeam.sport);
      setPosition(''); // Reset position when changing teams
    }
  };

  
  const handlePositionChange = (e) => {
    setPosition(e.target.value);
    console.log('Updated Position:', e.target.value);
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !position.trim() || !teamName.trim()) {
      return alert('All fields are required!');
    }

    console.log('Submitting:', { id: initialData._id, name, position, teamName });

    await onEditPlayer({ id: initialData._id, name, position, teamName });

    onHide(); // Close modal after updating
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
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </Form.Group>

          <Form.Group controlId="team">
            <Form.Label>Team Name</Form.Label>
            <Form.Control 
              as="select" 
              value={teamName} 
              onChange={handleTeamChange} 
              required
            >
              <option value="">Select Team</option>
              {filteredTeams.map(team => (
                <option key={team._id} value={team.name}>{team.name} ({team.sport})</option>
              ))}
            </Form.Control>
          </Form.Group>

          <Form.Group controlId="playerPosition">
            <Form.Label>Position</Form.Label>
            <Form.Control 
              as="select" 
              value={position} 
              onChange={handlePositionChange} 
              required
            >
              <option value="">Select Position</option>
              {sportPositions[sport]?.map((pos, index) => (
                <option key={index} value={pos}>{pos}</option>
              ))}
            </Form.Control>
          </Form.Group>

          <Button type="submit">Save Changes</Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditPlayerModal;
