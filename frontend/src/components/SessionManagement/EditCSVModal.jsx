import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, ListGroup, Spinner, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { 
  useGetSessionCSVsQuery, 
  useDeleteAllSessionCSVsMutation,
  useUploadSessionCSVMutation
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
  const [uploadSessionCSV] = useUploadSessionCSVMutation();

  // Local state for pending CSV actions
  const [pendingDeleteAll, setPendingDeleteAll] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // Array of File objects
  const [processing, setProcessing] = useState(false); // Local loader state
  
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    if (show) {
      refetch();
    }
  }, [show, sessionId, refetch]);
  
  // Trigger hidden file input
  const handleAddCSVClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // When files are selected, add them to pendingFiles array
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    setPendingFiles(prev => [...prev, ...files]);
  };
  
  // Remove a selected file from pendingFiles
  const handleRemoveFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // When Delete All CSVs is clicked, delete them in the DB immediately and refresh the CSV list.
  const handleDeleteAll = async () => {
    setProcessing(true);
    try {
      await deleteAllSessionCSVs(sessionId).unwrap();
      // Clear any pending new files
      setPendingFiles([]);
      // Refresh the CSV list
      await refetch();
    } catch (error) {
      //console.error("Error deleting all CSVs", error);
    } finally {
      setProcessing(false);
      setPendingDeleteAll(false);
    }
  };
  
  // When the user clicks Save CSV Changes, perform uploads (if any) and check for new players.
  const handleSave = async () => {
    setProcessing(true);
    let allCreatedPlayers = [];
    try {
      // If there are pending files, upload each one
      if (pendingFiles.length > 0) {
        const uploadPromises = pendingFiles.map(file => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('sessionId', sessionId);
          return uploadSessionCSV(formData).unwrap();
        });
        const responses = await Promise.all(uploadPromises);
        responses.forEach(response => {
          if (response.createdPlayers && response.createdPlayers.length > 0) {
            allCreatedPlayers = allCreatedPlayers.concat(response.createdPlayers);
          }
        });
      }
      // Refresh CSV list after uploads
      await refetch();
      window.location.reload();
      // Pass updated CSV data back to the parent
      onSave(data?.sessionPlayerDataArray || null);
    } catch (error) {
      //console.error("Error saving CSV changes", error);
    } finally {
      setProcessing(false);
      // Clear pending files and delete flag after processing
      setPendingFiles([]);
      setPendingDeleteAll(false);
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
              <Button variant="danger" onClick={handleDeleteAll}>
                Delete All CSVs
              </Button>
              <Button variant="primary" onClick={handleAddCSVClick}>
                Add CSV(s)
              </Button>
            </div>
            {pendingFiles.length > 0 && (
              <div>
                <p className="text-info">Files to add:</p>
                <ListGroup>
                  {pendingFiles.map((file, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      {file.name}
                      <Button variant="outline-danger" size="sm" onClick={() => handleRemoveFile(index)}>
                        Remove
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
            {/* Hidden file input accepting multiple files */}
            <input
              type="file"
              accept=".csv"
              multiple
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
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
