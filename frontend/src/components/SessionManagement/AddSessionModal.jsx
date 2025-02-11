import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useGetTeamsQuery } from '../../slices/teamsApiSlice';

const AddSessionModal = ({ show, onHide, onAddSession }) => {
  // State variables
  const [teamName, setTeamName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [duration, setDuration] = useState('');
  const [numSplits, setNumSplits] = useState('');
  const [splits, setSplits] = useState([]);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState([]); // File state

  // Fetch user info & teams
  const { userInfo } = useSelector((state) => state.auth);
  const { data: teamsData } = useGetTeamsQuery();

  // Filter teams by logged-in user
  const filteredTeams = teamsData?.teams?.filter(team => team.userId === userInfo?._id) || [];

  // Reset fields when modal closes
  useEffect(() => {
    if (!show) {
      setTeamName('');
      setSessionName('');
      setDate('');
      setType('');
      setDuration('');
      setNumSplits('');
      setSplits([]);
      setNotes('');
      setFiles([]);
    }
  }, [show]);

  // Handle number of splits input
  useEffect(() => {
    const num = parseInt(numSplits, 10);
    if (!isNaN(num) && num > 0) {
      setSplits(Array.from({ length: num }, () => ({ title: '', start: '', end: '' })));
    } else {
      setSplits([]);
    }
  }, [numSplits]);

  // Handle split input change
  const handleSplitChange = (index, field, value) => {
    const updatedSplits = [...splits];
    updatedSplits[index][field] = value;
    setSplits(updatedSplits);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!teamName.trim() || !sessionName.trim() || !date.trim() || !type.trim() || !duration.trim()) {
      toast.error('All fields are required!', { position: 'top-right' });
      return;
    }

    const unixDate = new Date(date).getTime();
    if (isNaN(unixDate)) {
      toast.error("Invalid date format. Please select a valid date.", { position: 'top-right' });
      return;
    }

    const sessionData = {
      teamName,
      sessionName,
      date: unixDate, // Store as UNIX timestamp
      type,
      duration,
      splits,
      notes,
      files, // Attach files array
    };

    onAddSession(sessionData);
    toast.success("Session added successfully!", { position: 'top-right' });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add New Session</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* Team Name Dropdown */}
          <Form.Group controlId="teamName" className="mb-3">
            <Form.Label>Team Name</Form.Label>
            <Form.Control as="select" value={teamName} onChange={(e) => setTeamName(e.target.value)} required>
              <option value="">Select Team</option>
              {filteredTeams.map((team) => (
                <option key={team._id} value={team.name}>
                  {team.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          {/* Session Name */}
          <Form.Group controlId="sessionName" className="mb-3">
            <Form.Label>Session Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter session name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              required
            />
          </Form.Group>

          {/* Date */}
          <Form.Group controlId="date" className="mb-3">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Form.Group>

          {/* Type Dropdown */}
          <Form.Group controlId="type" className="mb-3">
            <Form.Label>Session Type</Form.Label>
            <Form.Control as="select" value={type} onChange={(e) => setType(e.target.value)} required>
              <option value="">Select Type</option>
              <option value="Training">Training</option>
              <option value="Game">Game</option>
            </Form.Control>
          </Form.Group>

          {/* Duration */}
          <Form.Group controlId="duration" className="mb-3">
            <Form.Label>Duration (in minutes)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </Form.Group>

          {/* Number of Splits */}
          <Form.Group controlId="numSplits" className="mb-3">
            <Form.Label>Number of Splits</Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter number of splits"
              value={numSplits}
              onChange={(e) => setNumSplits(e.target.value)}
            />
          </Form.Group>

          {/* Splits Inputs */}
          {splits.map((split, index) => (
            <div key={index} className="border p-2 mb-2">
              <Form.Group controlId={`splitTitle${index}`} className="mb-2">
                <Form.Label>Split {index + 1} Title</Form.Label>
                <Form.Control
                  type="text"
                  value={split.title}
                  onChange={(e) => handleSplitChange(index, 'title', e.target.value)}
                  placeholder="Enter title"
                  required
                />
              </Form.Group>

              <Form.Group controlId={`splitStart${index}`} className="mb-2">
                <Form.Label>Start Time</Form.Label>
                <Form.Control
                  type="time"
                  value={split.start}
                  onChange={(e) => handleSplitChange(index, 'start', e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group controlId={`splitEnd${index}`} className="mb-2">
                <Form.Label>End Time</Form.Label>
                <Form.Control
                  type="time"
                  value={split.end}
                  onChange={(e) => handleSplitChange(index, 'end', e.target.value)}
                  required
                />
              </Form.Group>
            </div>
          ))}

          {/* Notes */}
          <Form.Group controlId="notes" className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes"
            />
          </Form.Group>

          {/* File Upload */}
          <Form.Group controlId="fileUpload" className="mb-3">
            <Form.Label>Attach Files</Form.Label>
            <Form.Control type="file" multiple onChange={handleFileChange} />
            <small className="text-muted">You can attach multiple files.</small>
          </Form.Group>

          <Button variant="primary" type="submit">
            Add Session
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddSessionModal;
