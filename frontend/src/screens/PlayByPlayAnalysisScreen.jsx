import React, { useState } from 'react';
import {
  Table,
  Button,
  Container,
  Alert,
  Row,
  Col,
  Form,
  Pagination,
} from 'react-bootstrap';
import { FaTrash, FaSortUp, FaSortDown } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import ConfirmDeletion from '../components/ConfirmDeletion';
import Message from '../components/Message'; // If you use a custom Message component
import {
  useGetPlayByPlayAnalysissQuery,
  useDeletePlayByPlayAnalysisMutation,
} from '../slices/playByPlayAnalysisApiSlice';

const PlayByPlayAnalysisScreen = () => {
  // Fetch all play-by-play analyses
  const { data: analyses, isLoading, error, refetch } = useGetPlayByPlayAnalysissQuery();
  const [deleteAnalysis] = useDeletePlayByPlayAnalysisMutation();

  // Sorting, filtering, and pagination state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterOutcome, setFilterOutcome] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Deletion modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  // Handle column sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ======== SORTING ========
  let sortedAnalyses = analyses ? [...analyses] : [];
  if (sortConfig.key) {
    sortedAnalyses.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      // Numeric comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      // String comparison
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return 0;
    });
  }

  // ======== FILTER & SEARCH ========
  let filteredAnalyses = [...sortedAnalyses];
  // Filter by outcome
  if (filterOutcome !== 'All') {
    filteredAnalyses = filteredAnalyses.filter(
      (analysis) => analysis.outcome?.toLowerCase() === filterOutcome.toLowerCase()
    );
  }


  // ======== PAGINATION ========
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAnalyses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnalyses.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Build unique outcomes for filter dropdown
  const uniqueOutcomes = [
    ...new Set(analyses?.map((analysis) => analysis.outcome) || []),
  ].filter(Boolean);

  // ======== DELETE LOGIC ========
  const handleDeleteClick = (analysis) => {
    setSelectedAnalysis(analysis);
    setShowConfirm(true);
  };

  const handleConfirmDeletion = async () => {
    if (!selectedAnalysis) return;
    try {
      await deleteAnalysis(selectedAnalysis._id).unwrap();
      toast.success('Analysis deleted successfully!');
      refetch();
    } catch (err) {
      toast.error('Failed to delete analysis.');
    } finally {
      setShowConfirm(false);
      setSelectedAnalysis(null);
    }
  };

  const handleCancelDeletion = () => {
    setShowConfirm(false);
    setSelectedAnalysis(null);
  };

  return (
    <Container>
      {/* Heading Row */}
      <Row className="align-items-center my-4">
        <Col>
          <h2>Play By Play Analysis</h2>
        </Col>
      </Row>

      {/* Filter & Search Row */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Group controlId="filterOutcome">
            <Form.Label>Filter by Outcome</Form.Label>
            <Form.Control
              as="select"
              value={filterOutcome}
              onChange={(e) => {
                setFilterOutcome(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              {uniqueOutcomes.map((out) => (
                <option key={out} value={out}>
                  {out}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
       
      </Row>

      {/* Main Content: Loader / Error / Table */}
      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">
          {error?.data?.message || 'An error occurred while fetching analyses.'}
        </Message>
      ) : currentItems.length === 0 ? (
        <Alert variant="info" className="text-center">
          No play-by-play analyses found.
        </Alert>
      ) : (
        <>
          <Table striped bordered hover responsive className="table-sm">
            <thead className="table-dark">
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('timeStart')}>
                  Time Start{' '}
                  {sortConfig.key === 'timeStart' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('timeEnd')}>
                  Time End{' '}
                  {sortConfig.key === 'timeEnd' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('teamStartPosession')}
                >
                  Team Start Posession{' '}
                  {sortConfig.key === 'teamStartPosession' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort('teamEndPosession')}
                >
                  Team End Posession{' '}
                  {sortConfig.key === 'teamEndPosession' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('turnovers')}>
                  Turnovers{' '}
                  {sortConfig.key === 'turnovers' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('startAction')}>
                  Start Action{' '}
                  {sortConfig.key === 'startAction' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('endAction')}>
                  End Action{' '}
                  {sortConfig.key === 'endAction' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('outcome')}>
                  Outcome{' '}
                  {sortConfig.key === 'outcome' &&
                    (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((analysis) => (
                <tr key={analysis._id}>
                  <td>{analysis.timeStart}</td>
                  <td>{analysis.timeEnd}</td>
                  <td>{analysis.teamStartPosession}</td>
                  <td>{analysis.teamEndPosession}</td>
                  <td>{analysis.turnovers}</td>
                  <td>{analysis.startAction}</td>
                  <td>{analysis.endAction}</td>
                  <td>{analysis.outcome}</td>
                  <td>
                    <Button
                      variant="light"
                      size="sm"
                      onClick={() => handleDeleteClick(analysis)}
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="justify-content-center">
              <Pagination.Prev
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              />
              {[...Array(totalPages).keys()].map((num) => (
                <Pagination.Item
                  key={num + 1}
                  active={num + 1 === currentPage}
                  onClick={() => paginate(num + 1)}
                >
                  {num + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          )}
        </>
      )}

      {/* Confirm Deletion Modal */}
      <ConfirmDeletion
        show={showConfirm}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancelDeletion}
        message={
          selectedAnalysis
            ? `Are you sure you want to delete analysis ID: ${selectedAnalysis._id}?`
            : 'Are you sure you want to delete this analysis?'
        }
      />
    </Container>
  );
};

export default PlayByPlayAnalysisScreen;
