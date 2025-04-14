import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useGetTeamsQuery } from '../../slices/teamsApiSlice';

const AddSessionModal = ({ show, onHide, onAddSession, onAddSessionSuccess }) => {
  const [teamName, setTeamName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [duration, setDuration] = useState('');
  const [numSplits, setNumSplits] = useState('');
  const [splits, setSplits] = useState([]);
  const [notes, setNotes] = useState('');
  const [csvFiles, setCsvFiles] = useState(null);

  const { userInfo } = useSelector((state) => state.auth);
  const { data: teamsData } = useGetTeamsQuery();
  const filteredTeams =
    teamsData?.teams?.filter((team) => team.userId === userInfo?._id) || [];

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
      setCsvFiles(null);
    }
  }, [show]);

  useEffect(() => {
    const num = parseInt(numSplits, 10);
    if (!isNaN(num) && num > 0) {
      setSplits(
        Array.from({ length: num }, (_, index) => ({
          title: '',
          start: '',
          end: '',
          splitNumber: index + 1,
        }))
      );
    } else {
      setSplits([]);
    }
  }, [numSplits]);

  const handleSplitChange = (index, field, value) => {
    const updatedSplits = [...splits];
    updatedSplits[index][field] = value;
    setSplits(updatedSplits);
  };

  const validateDateTime = () => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      toast.error('Date cannot be in the future.', { position: 'top-right' });
      return false;
    }

    for (let i = 0; i < splits.length; i++) {
      const { start, end } = splits[i];
      if (!start || !end) {
        toast.error(`Start and end times are required for split ${i + 1}.`, {
          position: 'top-right',
        });
        return false;
      }
      if (start >= end) {
        toast.error(`Split ${i + 1}: Start time cannot be after or equal to end time.`, {
          position: 'top-right',
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!teamName || !sessionName || !date || !type || !duration) {
      toast.error('All fields are required!', { position: 'top-right' });
      return;
    }

    if (!validateDateTime()) return;

    const unixDate = new Date(date).getTime();
    if (isNaN(unixDate)) {
      toast.error('Invalid date format.', { position: 'top-right' });
      return;
    }

    const sessionFormData = {
      teamName,
      sessionName,
      date: unixDate,
      type,
      duration,
      splits,
      notes,
    };

    if (type === 'Game' && csvFiles) {
      sessionFormData.csvFiles = csvFiles;
    }

    onAddSession(sessionFormData)
      .then((newSession) => {
        toast.success('Session added successfully!', { position: 'top-right' });
        if (onAddSessionSuccess) onAddSessionSuccess(newSession);
        onHide();
      })
      .catch(() => {
        toast.error('Failed to create session.', { position: 'top-right' });
      });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Add New Session</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="teamName" className="mb-3">
            <Form.Label>Team Name</Form.Label>
            <Form.Control
              as="select"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            >
              <option value="">Select Team</option>
              {filteredTeams.map((team) => (
                <option key={team._id} value={team.name}>
                  {team.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Form.Group controlId="sessionName" className="mb-3">
            <Form.Label>Session Name</Form.Label>
            <Form.Control
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="date" className="mb-3">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="type" className="mb-3">
            <Form.Label>Session Type</Form.Label>
            <Form.Control
              as="select"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              <option value="">Select Type</option>
              <option value="Training">Training</option>
              <option value="Game">Game</option>
            </Form.Control>
          </Form.Group>

          <Form.Group controlId="duration" className="mb-3">
            <Form.Label>Duration (minutes)</Form.Label>
            <Form.Control
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              min="0"
            />
          </Form.Group>

          <Form.Group controlId="numSplits" className="mb-3">
            <Form.Label>Number of Splits</Form.Label>
            <Form.Control
              type="number"
              value={numSplits}
              onChange={(e) => setNumSplits(e.target.value)}
              min="0"
            />
          </Form.Group>

          {splits.map((split, index) => (
            <div key={index} className="border p-2 mb-2">
              <Form.Group className="mb-2">
                <Form.Label>Split {index + 1} Title</Form.Label>
                <Form.Control
                  type="text"
                  value={split.title}
                  onChange={(e) => handleSplitChange(index, 'title', e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Start Time</Form.Label>
                <Form.Control
                  type="time"
                  step="1"
                  value={split.start}
                  onChange={(e) => handleSplitChange(index, 'start', e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>End Time</Form.Label>
                <Form.Control
                  type="time"
                  step="1"
                  value={split.end}
                  onChange={(e) => handleSplitChange(index, 'end', e.target.value)}
                  required
                />
              </Form.Group>
            </div>
          ))}

          <Form.Group controlId="notes" className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Form.Group>

          <Button variant="primary" type="submit">Add Session</Button>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddSessionModal;
