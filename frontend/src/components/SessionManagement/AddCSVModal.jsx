// import React, { useState } from 'react';
// import { Modal, Button, Form } from 'react-bootstrap';
// import { toast } from 'react-toastify';
// import { useUploadSessionCSVMutation } from '../../slices/sessionsApiSlice';

// const AddCSVModal = ({ show, onHide, sessionId }) => {
//   const [files, setFiles] = useState([]);
//   const [uploadSessionCSV] = useUploadSessionCSVMutation();
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleFileChange = (e) => {
//     const selectedFiles = Array.from(e.target.files);
//     setFiles(selectedFiles);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (files.length === 0) {
//       toast.error("No CSV files selected!", { position: 'top-right' });
//       return;
//     }
//     setIsSubmitting(true);
//     try {
//       // Loop over all selected files (adjust as needed for your backend)
//       for (let file of files) {
//         const formData = new FormData();
//         formData.append("file", file);
//         formData.append("sessionId", sessionId);
//         await uploadSessionCSV(formData).unwrap();
//       }
//       toast.success("CSV files uploaded successfully!", { position: 'top-right' });
//       onHide();
//     } catch (err) {
//       toast.error(err.data?.message || "CSV upload failed.", { position: 'top-right' });
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <Modal show={show} onHide={onHide} centered>
//       <Modal.Header closeButton>
//         <Modal.Title>Upload CSV Files</Modal.Title>
//       </Modal.Header>
//       <Modal.Body>
//         <Form onSubmit={handleSubmit}>
//           <Form.Group controlId="csvFiles" className="mb-3">
//             <Form.Label>Select CSV Files</Form.Label>
//             <Form.Control
//               type="file"
//               accept=".csv"
//               multiple
//               onChange={handleFileChange}
//             />
//             <small className="text-muted">You can select multiple CSV files.</small>
//           </Form.Group>
//           <Button variant="primary" type="submit" disabled={isSubmitting}>
//             {isSubmitting ? "Uploading..." : "Submit"}
//           </Button>
//         </Form>
//       </Modal.Body>
//     </Modal>
//   );
// };

// export default AddCSVModal;
import React, { useState } from 'react';
import { Modal, Button, Form, ListGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useUploadSessionCSVMutation } from '../../slices/sessionsApiSlice';

const AddCSVModal = ({ show, onHide, sessionId }) => {
  const [files, setFiles] = useState([]);
  const [uploadSessionCSV] = useUploadSessionCSVMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
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
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Upload CSV Files</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="csvFiles" className="mb-3">
            <Form.Label>Select CSV Files</Form.Label>
            <Form.Control
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileChange}
            />
            <small className="text-muted">You can select multiple CSV files.</small>
          </Form.Group>
          {files.length > 0 && (
            <>
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
              <Button variant="warning" className="mb-3" onClick={clearFiles}>
                Remove All
              </Button>
            </>
          )}
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Uploading..." : "Submit"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddCSVModal;