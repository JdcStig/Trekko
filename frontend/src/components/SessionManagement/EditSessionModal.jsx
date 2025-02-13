// import React, { useState, useEffect } from 'react';
// import { Modal, Button, Form } from 'react-bootstrap';
// import { useSelector } from 'react-redux';
// import { toast } from 'react-toastify';
// import { useGetTeamsQuery } from '../../slices/teamsApiSlice';

// const EditSessionModal = ({ show, onHide, onEditSession, session }) => {
//   const [teamName, setTeamName] = useState('');
//   const [sessionName, setSessionName] = useState('');
//   const [date, setDate] = useState('');
//   const [type, setType] = useState('');
//   const [duration, setDuration] = useState('');
//   const [notes, setNotes] = useState('');

//   // Fetch user info & teams
//   const { userInfo } = useSelector((state) => state.auth);
//   const { data: teamsData } = useGetTeamsQuery();

//   // Filter teams based on the logged-in user
//   const filteredTeams = teamsData?.teams?.filter(team => team.userId === userInfo?._id) || [];

//   // Populate the form when editing a session
//   useEffect(() => {
//     if (session) {
//       setTeamName(session.teamName || '');
//       setSessionName(session.sessionName || '');
//       setDate(session.date ? new Date(session.date).toISOString().split('T')[0] : '');
//       setType(session.type || '');
//       setDuration(session.duration || '');
//       setNotes(session.notes || '');
//     }
//   }, [session]);

//   // Handle form submission
//   const handleSubmit = (e) => {
//     e.preventDefault();

//     if (!teamName.trim() || !sessionName.trim() || !date.trim() || !type.trim() || !duration.trim()) {
//       toast.error('All fields are required!', { position: 'top-right' });
//       return;
//     }

//     const updatedSession = {
//       ...session,
//       teamName,
//       sessionName,
//       date: new Date(date).getTime(), // Convert to UNIX timestamp
//       type,
//       duration,
//       notes,
//     };

//     onEditSession(updatedSession);
//     //toast.success("Session updated successfully!", { position: 'top-right' });
//     onHide();
//   };

//   return (
//     <Modal show={show} onHide={onHide} centered>
//       <Modal.Header closeButton>
//         <Modal.Title>Edit Session</Modal.Title>
//       </Modal.Header>
//       <Modal.Body>
//         <Form onSubmit={handleSubmit}>
//           {/* Team Name Dropdown */}
//           <Form.Group controlId="teamName" className="mb-3">
//             <Form.Label>Team Name</Form.Label>
//             <Form.Control as="select" value={teamName} onChange={(e) => setTeamName(e.target.value)} required>
//               <option value="">Select Team</option>
//               {filteredTeams.map((team) => (
//                 <option key={team._id} value={team.name}>
//                   {team.name}
//                 </option>
//               ))}
//             </Form.Control>
//           </Form.Group>

//           {/* Session Name */}
//           <Form.Group controlId="sessionName" className="mb-3">
//             <Form.Label>Session Name</Form.Label>
//             <Form.Control
//               type="text"
//               placeholder="Enter session name"
//               value={sessionName}
//               onChange={(e) => setSessionName(e.target.value)}
//               required
//             />
//           </Form.Group>

//           {/* Date */}
//           <Form.Group controlId="date" className="mb-3">
//             <Form.Label>Date</Form.Label>
//             <Form.Control
//               type="date"
//               value={date}
//               onChange={(e) => setDate(e.target.value)}
//               required
//             />
//           </Form.Group>

//           {/* Type Dropdown */}
//           <Form.Group controlId="type" className="mb-3">
//             <Form.Label>Session Type</Form.Label>
//             <Form.Control as="select" value={type} onChange={(e) => setType(e.target.value)} required>
//               <option value="">Select Type</option>
//               <option value="Training">Training</option>
//               <option value="Game">Game</option>
//             </Form.Control>
//           </Form.Group>

//           {/* Duration */}
//           <Form.Group controlId="duration" className="mb-3">
//             <Form.Label>Duration (in minutes)</Form.Label>
//             <Form.Control
//               type="text"
//               placeholder="Enter duration"
//               value={duration}
//               onChange={(e) => setDuration(e.target.value)}
//               required
//             />
//           </Form.Group>

//           {/* Notes */}
//           <Form.Group controlId="notes" className="mb-3">
//             <Form.Label>Notes</Form.Label>
//             <Form.Control
//               as="textarea"
//               rows={3}
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//               placeholder="Enter notes"
//             />
//           </Form.Group>

//           <Button variant="primary" type="submit">
//             Save Changes
//           </Button>
//         </Form>
//       </Modal.Body>
//     </Modal>
//   );
// };

// export default EditSessionModal;
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useGetTeamsQuery } from '../../slices/teamsApiSlice';

const EditSessionModal = ({ show, onHide, onEditSession, session }) => {
  const [teamName, setTeamName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [splits, setSplits] = useState([]);

  // Fetch user info & teams
  const { userInfo } = useSelector((state) => state.auth);
  const { data: teamsData } = useGetTeamsQuery();
  const filteredTeams = teamsData?.teams?.filter(team => team.userId === userInfo?._id) || [];

  // Populate fields when opening the modal
  useEffect(() => {
    if (session) {
      setTeamName(session.teamName);
      setSessionName(session.sessionName);
      setDate(session.date ? new Date(session.date).toISOString().split('T')[0] : '');
      setType(session.type);
      setDuration(session.duration);
      setNotes(session.notes || '');
      setSplits(session.splits || []);
    }
  }, [session]);

  // Handle input changes for table cells (Immutable state update)
  const handleSplitChange = (index, field, value) => {
    setSplits(prevSplits =>
      prevSplits.map((split, i) => (i === index ? { ...split, [field]: value } : split))
    );
  };

  // Add a new row
  const handleAddSplit = () => {
    setSplits([...splits, { title: '', start: '', end: '' }]);
  };

  // Delete a row
  const handleDeleteSplit = (index) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  // ** Validation function for date & time **
  const validateDateTime = () => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of the day for comparison

    // **Date must not be in the future**
    if (selectedDate > today) {
      toast.error("Date cannot be in the future.", { position: 'top-right' });
      return false;
    }

    // **Validate each split time**
    for (let i = 0; i < splits.length; i++) {
      const { start, end } = splits[i];

      if (!start || !end) {
        toast.error(`Start time and end time are required for split ${i + 1}.`, { position: 'top-right' });
        return false;
      }

      if (end <= start) {
        toast.error(`End time cannot be before start time in split ${i + 1}.`, { position: 'top-right' });
        return false;
      }
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!teamName.trim() || !sessionName.trim() || !date.trim() || !type.trim() || !duration.trim()) {
      toast.error('All fields are required!', { position: 'top-right' });
      return;
    }

    if (!validateDateTime()) {
      return; // Stop submission if validation fails
    }

    const updatedSession = {
      ...session,
      teamName,
      sessionName,
      date: new Date(date).getTime(),
      type,
      duration,
      notes,
      splits,
    };

    onEditSession(updatedSession);
    //toast.success("Session updated successfully!");
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Session</Modal.Title>
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

          {/* Splits Table */}
          <h5>Splits</h5>
          <Table striped bordered hover>
            <thead className="table-dark">
              <tr>
                <th>Title</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {splits.map((split, index) => (
                <tr key={index}>
                  <td>
                    <Form.Control
                      type="text"
                      value={split.title}
                      onChange={(e) => handleSplitChange(index, 'title', e.target.value)}
                      placeholder="Enter title"
                      required
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="time"
                      value={split.start}
                      onChange={(e) => handleSplitChange(index, 'start', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="time"
                      value={split.end}
                      onChange={(e) => handleSplitChange(index, 'end', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteSplit(index)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Button variant="success" onClick={handleAddSplit}>+ Add Split</Button>

          {/* Notes */}
          <Form.Group controlId="notes" className="mt-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes"
            />
          </Form.Group>

          <Button variant="primary" type="submit" className="mt-3">
            Save Changes
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditSessionModal;
