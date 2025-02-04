import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { FaUsers, FaUser, FaSignOutAlt } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout as logoutAction } from '../slices/authSlice';
import { useLogoutMutation } from '../slices/usersApiSlices';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.auth);

  const [logout] = useLogoutMutation();

  const logoutHandler = async () => {
    try {
      // Call backend logout to clear cookie
      await logout().unwrap();
      // Clear Redux state and localStorage
      dispatch(logoutAction());
      navigate('/LoginScreen');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header>
      <Navbar bg="dark" variant="dark" expand="md" collapseOnSelect>
        <Container>
          <img src={logo} alt="TrakkoLogo" className="logo" />
          <Navbar.Brand href="/">Trakko</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link href="/SquadManagementScreen">
                <FaUsers /> Squad Management
              </Nav.Link>
              {userInfo ? (
                <NavDropdown title={userInfo.name} id="username">
                  <NavDropdown.Item onClick={logoutHandler}>
                    <FaSignOutAlt /> Logout
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <Nav.Link href="/LoginScreen">
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
