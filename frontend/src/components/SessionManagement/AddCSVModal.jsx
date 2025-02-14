import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Form, ListGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useUploadSessionCSVMutation } from '../../slices/sessionsApiSlice';

const AddCSVModal = ({ show, onHide, sessionId }) => {
  const [files, setFiles] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadSessionCSV] = useUploadSessionCSVMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    //.log("Files updated:", files.length);
  }, [files]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("No CSV files selected!", { position: 'top-right' });
      return;
    }
    setIsSubmitting(true);
    try {
      for (let file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionId", sessionId);
        await uploadSessionCSV(formData).unwrap();
      }
      toast.success("CSV files uploaded successfully!", { position: 'top-right' });
      clearFiles();
      onHide();
    } catch (err) {
      toast.error(err.data?.message || "CSV upload failed.", { position: 'top-right' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    !isRefreshing && (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload CSV Files</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="csvFiles" className="mb-3">
              <Form.Label>Select CSV Files</Form.Label>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }} // Hide default input
                  id="fileUpload"
                />
                <label htmlFor="fileUpload" className="btn btn-primary">
                  Choose Files
                </label>
              </div>
              <small className="text-muted">You can select multiple CSV files.</small>
            </Form.Group>
            {files.length > 0 && (
              <>
                <p><strong>Files selected: {files.length}</strong></p>
                <ListGroup className="mb-3">
                  {files.map((file, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      {file.name}
                      <Button variant="danger" size="sm" onClick={() => removeFile(index)}>
                        Delete
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <Button variant="warning" className="mb-2 w-100" onClick={clearFiles}>
                  Remove All
                </Button>
                <div className="d-flex justify-content-between">
                  <Button variant="primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Uploading..." : "Submit"}
                  </Button>
                  <Button variant="secondary" onClick={onHide}>Close</Button>
                </div>
              </>
            )}
          </Form>
        </Modal.Body>
      </Modal>
    )
  );
};

export default AddCSVModal;
