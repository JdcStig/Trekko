import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { FaUsers, FaUser, FaSignOutAlt, FaTrophy, FaChartBar, FaChartLine } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { logout as logoutAction } from '../slices/authSlice';
import { useLogoutMutation } from '../slices/usersApiSlices';
import { apiSlice } from '../slices/apiSlice';
import { useEffect } from 'react';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.auth);
  const [logout, { isLoading, isError }] = useLogoutMutation();

  const logoutHandler = async () => {
    try {
      await logout().unwrap();
      dispatch(logoutAction());
      dispatch(apiSlice.util.resetApiState());
      navigate('/LoginScreen');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (!userInfo) {
      navigate('/LoginScreen');
    }
  }, [userInfo, navigate]);

  return (
    <header>
      <Navbar bg="dark" variant="dark" expand="md" collapseOnSelect>
        <Container>
          <Navbar.Brand as={Link} to="/">
            <img src={logo} alt="TrakkoLogo" className="logo" /> Trakko
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/PlayerManagementScreen">
                <FaUser /> Player Management
              </Nav.Link>
              <Nav.Link as={Link} to="/TeamManagementScreen">
                <FaUsers /> Team Management
              </Nav.Link>
              <Nav.Link as={Link} to="/SessionManagementScreen">
                <FaTrophy /> Session Management
              </Nav.Link>
              <Nav.Link as={Link} to="/PlayByPlayAnalysisScreen">
                <FaChartBar /> PlayByPlay Analysis
              </Nav.Link>
              <Nav.Link as={Link} to="/ForceVelocityScreen">
                <FaChartLine /> ForceVelocity Analysis
              </Nav.Link>
              {userInfo ? (
                <NavDropdown title={userInfo.name} id="username">
                  <NavDropdown.Item onClick={logoutHandler} disabled={isLoading}>
                    <FaSignOutAlt /> {isLoading ? 'Logging out...' : 'Logout'}
                  </NavDropdown.Item>
                  {isError && <span className="text-danger">Logout failed</span>}
                </NavDropdown>
              ) : (
                <Nav.Link as={Link} to="/LoginScreen">
                  <FaUser /> Login
                </Nav.Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;
