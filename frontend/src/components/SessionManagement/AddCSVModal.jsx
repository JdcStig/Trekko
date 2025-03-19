import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Form, ListGroup, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useUploadSessionCSVMutation, useUploadPlayCSVMutation } from '../../slices/sessionsApiSlice';

const AddCSVModal = ({ show, onHide, sessionId }) => {
  const [sessionFiles, setSessionFiles] = useState([]);
  const [playByPlayFiles, setPlayByPlayFiles] = useState([]);
  const sessionFileInputRef = useRef(null);
  const playByPlayFileInputRef = useRef(null);
  const [uploadSessionCSV] = useUploadSessionCSVMutation();
  const [uploadPlayCSV] = useUploadPlayCSVMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log("Session Files updated:", sessionFiles.length);
    console.log("PlayByPlay Files updated:", playByPlayFiles.length);
  }, [sessionFiles, playByPlayFiles]);
  
  const handleFileChange = (e, setFiles) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  const removeFile = (index, setFiles, fileList) => {
    setFiles(fileList.filter((_, i) => i !== index));
  };

  const clearFiles = (setFiles, inputRef) => {
    setFiles([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  async function uploadMultipleCSVs(files, uploadFn) {
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('file', files[i]);
      formData.append('sessionId', sessionId);
      // Set finalize flag on the last file to trigger any backend recalculations
      formData.append('finalize', i === files.length - 1);
      await uploadFn(formData).unwrap();
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (sessionFiles.length > 0) {
        await uploadMultipleCSVs(sessionFiles, uploadSessionCSV);
      }
      if (playByPlayFiles.length > 0) {
        await uploadMultipleCSVs(playByPlayFiles, uploadPlayCSV);
      }

      toast.success("CSV uploaded successfully!", { position: 'top-right' });
      clearFiles(setSessionFiles, sessionFileInputRef);
      clearFiles(setPlayByPlayFiles, playByPlayFileInputRef);
      onHide();
    } catch (err) {
      toast.error(err.data?.message || "CSV upload failed.", { position: 'top-right' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Upload CSV Files</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isSubmitting ? (
          <div className="text-center">
            <Spinner animation="border" role="status" />
            <p>Uploading CSVs...</p>
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            {/* Session CSV Upload */}
            <Form.Group controlId="sessionCsv" className="mb-3">
              <Form.Label>Upload Session CSV</Form.Label>
              <input
                ref={sessionFileInputRef}
                type="file"
                accept=".csv"
                multiple
                onChange={(e) => handleFileChange(e, setSessionFiles)}
                style={{ display: 'none' }}
                id="sessionFileUpload"
              />
              <label htmlFor="sessionFileUpload" className="btn btn-primary">
                Choose Files
              </label>
              <ListGroup className="mt-2">
                {sessionFiles.map((file, index) => (
                  <ListGroup.Item key={index}>
                    {file.name}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeFile(index, setSessionFiles, sessionFiles)}
                    >
                      Delete
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Form.Group>

            {/* Play-by-Play CSV Upload */}
            <Form.Group controlId="playByPlayCsv" className="mb-3">
              <Form.Label>Upload Play-by-Play CSV</Form.Label>
              <input
                ref={playByPlayFileInputRef}
                type="file"
                accept=".csv"
                multiple
                onChange={(e) => handleFileChange(e, setPlayByPlayFiles)}
                style={{ display: 'none' }}
                id="playByPlayFileUpload"
              />
              <label htmlFor="playByPlayFileUpload" className="btn btn-primary">
                Choose Files
              </label>
              <ListGroup className="mt-2">
                {playByPlayFiles.map((file, index) => (
                  <ListGroup.Item key={index}>
                    {file.name}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeFile(index, setPlayByPlayFiles, playByPlayFiles)}
                    >
                      Delete
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Form.Group>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Submit"}
            </Button>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default AddCSVModal;
