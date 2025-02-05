import React, { useState, useEffect } from 'react';
import FormContainer from '../components/FormContainer';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../components/Loader';
import { useLoginMutation, useGoogleLoginMutation } from '../slices/usersApiSlices';
import { setCredentials } from '../slices/authSlice';
import { toast } from 'react-toastify';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

//loads info from the front end .env
const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;



const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [login, { isLoading }] = useLoginMutation();
  const [googleLogin] = useGoogleLoginMutation();

  const { userInfo } = useSelector((state) => state.auth);

  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const redirect = sp.get('redirect') || '/SquadManagementScreen';

  // redirect user if already loged in
  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [userInfo, redirect, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      const res = await login({ email, password }).unwrap();
      dispatch(setCredentials(res));
      navigate(redirect);
    } catch (error) {
      toast.error(error?.data?.message || error.error);
    }
  };

  const handleGoogleSuccess = async (response) => {
    try {
      const decoded = jwtDecode(response.credential);// Decode JWT token from Google
      const { email, name, sub } = decoded;// Extract user details


      const res = await googleLogin({ email, name, googleId: sub }).unwrap();
      dispatch(setCredentials(res));
      navigate(redirect);
    } catch (error) {
      
      toast.error("Google login failed. Please try again.");
    }
  };

  const handleGoogleFailure = () => {
   
    toast.error("Google login failed. Please try again.");
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <FormContainer>
        <h1>Sign In</h1>
        <Form onSubmit={submitHandler}>
          <Form.Group controlId="email" className="my-3">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Form.Group>

          <Form.Group controlId="password" className="my-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>

          <Button type="submit" variant="primary" className="mt-2 custom-button" disabled={isLoading}>
            Sign In
          </Button>

          {isLoading && <Loader />}
        </Form>

        {/* Google Login Button */}
        <div className="mt-3 custom-button">
          <GoogleLogin 
            onSuccess={handleGoogleSuccess} 
            onError={handleGoogleFailure} 
          />
        </div>

        <Row className="py-3">
          <Col>
            New Customer?{' '}
            <Link to={redirect ? `/RegisterScreen?redirect=${redirect}` : '/RegisterScreen'}>
              Register
            </Link>
          </Col>
        </Row>
      </FormContainer>
    </GoogleOAuthProvider>
  );
};

export default LoginScreen;
