import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, ListGroup, Spinner, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { 
  useGetSessionCSVsQuery, 
  useDeleteAllSessionCSVsMutation,
  useUploadSessionCSVMutation,
  useUploadPlayCSVMutation,
  useDeleteAllPlayCSVsMutation
} from '../../slices/sessionsApiSlice';

const EditCSVModal = ({ 
  show, 
  onSave = () => {}, // default to no-op function to avoid errors
  onCancel, 
  sessionId 
}) => {
  const { data, isLoading, refetch } = useGetSessionCSVsQuery(sessionId, {
    skip: !sessionId,
  });
  
  // Mutations for deleting all CSVs and uploading a CSV file
  const [deleteAllSessionCSVs] = useDeleteAllSessionCSVsMutation();
  const [deleteAllPlayCSVs] = useDeleteAllPlayCSVsMutation();
  const [uploadSessionCSV] = useUploadSessionCSVMutation();
  const [uploadPlayCSV] = useUploadPlayCSVMutation();

  // Local state for pending CSV actions
  const [pendingPlayerFiles, setPendingPlayerFiles] = useState([]);
  const [pendingPlayFiles, setPendingPlayFiles] = useState([]); // Array of File objects
  const [processing, setProcessing] = useState(false); // Local loader state
  
  const playerFileInputRef = useRef(null);
  const playFileInputRef = useRef(null);
  
  useEffect(() => {
    if (show) {
      refetch();
    }
  }, [show, sessionId, refetch]);
  
  // Trigger hidden file input
  const handleAddPlayerCSVClick = () => {
    if (playerFileInputRef.current) {
      playerFileInputRef.current.click();
    }
  };

  const handleAddPlayCSVClick = () => {
    if (playFileInputRef.current) {
      playFileInputRef.current.click();
    }
  };
  
  // When files are selected, add them to pendingFiles array
  const handlePlayerFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    setPendingPlayerFiles(prev => [...prev, ...files]);
  };
  
  const handlePlayFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    setPendingPlayFiles(prev => [...prev, ...files]);
  };
  
  // Remove a selected file from pendingFiles
  const handleRemovePlayerFile = (index) => {
    setPendingPlayerFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleRemovePlayFile = (index) => {
    setPendingPlayFiles(prev => prev.filter((_, i) => i !== index));
  };

  // When Delete All CSVs is clicked, delete them in the DB immediately and refresh the CSV list.
   // Delete all player CSV data using deleteAllSessionCSVs
   const handleDeleteAllPlayers = async () => {
    setProcessing(true);
    try {
      await deleteAllSessionCSVs(sessionId).unwrap();
      setPendingPlayerFiles([]);
      await refetch();
    } catch (error) {
      toast.error('Error deleting all player CSVs');
    } finally {
      setProcessing(false);
    }
  };

  // Delete all play CSV data using deleteAllPlayCSVs
  const handleDeleteAllPlays = async () => {
    setProcessing(true);
    try {
      await deleteAllPlayCSVs(sessionId).unwrap();
      setPendingPlayFiles([]);
      await refetch();
    } catch (error) {
      toast.error('Error deleting all play CSVs');
    } finally {
      setProcessing(false);
    }
  };
  
  // When the user clicks Save CSV Changes, perform uploads (if any) and check for new players.
  // Save action: upload all pending files (both players and plays) then refresh data
  const handleSave = async () => {
    setProcessing(true);
    try {
      const uploadPromises = [];
      // Upload pending player CSVs (using type "session")
      if (pendingPlayerFiles.length > 0) {
        uploadPromises.push(
          ...pendingPlayerFiles.map((file) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('sessionId', sessionId);
            formData.append('type', 'session'); // for players CSV
            return uploadSessionCSV(formData).unwrap();
          })
        );
      }
      // Upload pending play CSVs (using uploadPlayCSV)
      if (pendingPlayFiles.length > 0) {
        uploadPromises.push(
          ...pendingPlayFiles.map((file) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('sessionId', sessionId);
            return uploadPlayCSV(formData).unwrap();
          })
        );
      }
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }
      await refetch();
      // Display a toast when CSV updates are successful
      toast.success("CSV updated successfully!", { position: 'top-right' });
      onSave(data?.sessionPlayerDataArray || null);
      onCancel();
    } catch (error) {
      toast.error('Error saving CSV changes', { position: 'top-right' });
    } finally {
      setProcessing(false);
      setPendingPlayerFiles([]);
      setPendingPlayFiles([]);
    }
  };  
  
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit CSV Files</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {(isLoading || processing) ? (
          <div className="text-center">
            <Spinner animation="border" />
          </div>
        ) : (
          <>
            <h5>Existing Player Data</h5>
            {data?.sessionPlayerDataArray && data.sessionPlayerDataArray.length > 0 ? (
              <ListGroup className="mb-3">
                {data.sessionPlayerDataArray.map((playerData) => (
                  <ListGroup.Item key={playerData._id}>
                    <strong>{playerData.playerName}</strong>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <p>No Player Data available.</p>
            )}
            <div className="d-flex justify-content-around mb-3">
              <Button variant="danger" onClick={handleDeleteAllPlayers}>
                Delete all Player CSVs
              </Button>
              <Button variant="primary" onClick={handleAddPlayerCSVClick}>
                Add Player CSV(s)
              </Button>
            </div>
            {pendingPlayerFiles.length > 0 && (
              <div className="mb-3">
                <p className="text-info">Player files to add:</p>
                <ListGroup>
                  {pendingPlayerFiles.map((file, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      {file.name}
                      <Button variant="outline-danger" size="sm" onClick={() => handleRemovePlayerFile(index)}>
                        Remove
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
            <hr />
            <h5>Existing Play Data</h5>
            {data?.plays && data.plays.length > 0 ? (
              <ListGroup className="mb-3">
                {data.plays.map((play) => (
                  <ListGroup.Item key={play.playNumber}>
                    <strong>{play.title}</strong> (Duration: {play.duration} sec)
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <p>No Play Data available.</p>
            )}
            <div className="d-flex justify-content-around mb-3">
              <Button variant="danger" onClick={handleDeleteAllPlays}>
                Delete all Play CSVs
              </Button>
              <Button variant="primary" onClick={handleAddPlayCSVClick}>
                Add Play CSV(s)
              </Button>
            </div>
            {pendingPlayFiles.length > 0 && (
              <div className="mb-3">
                <p className="text-info">Play files to add:</p>
                <ListGroup>
                  {pendingPlayFiles.map((file, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      {file.name}
                      <Button variant="outline-danger" size="sm" onClick={() => handleRemovePlayFile(index)}>
                        Remove
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
            {/* Hidden file inputs */}
            <input
              type="file"
              accept=".csv"
              multiple
              ref={playerFileInputRef}
              style={{ display: 'none' }}
              onChange={handlePlayerFileChange}
            />
            <input
              type="file"
              accept=".csv"
              multiple
              ref={playFileInputRef}
              style={{ display: 'none' }}
              onChange={handlePlayFileChange}
            />
            <div className="d-flex justify-content-end mt-3">
              <Button variant="success" onClick={handleSave}>
                Save CSV Changes
              </Button>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default EditCSVModal;
