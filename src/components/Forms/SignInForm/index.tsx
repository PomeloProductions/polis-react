import React, { useState } from 'react';
import { Button, Form, FormControl, FormLabel } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import AuthRequests, { LoginReq } from '../../../services/requests/AuthRequests';
import { useFormik } from 'formik';

interface SignInFormProps {
  defaultRedirect?: string;
}

interface ApiError {
  status?: number;
  message?: string;
}

const SignInForm: React.FC<SignInFormProps> = ({ defaultRedirect }) => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const SignupSchema = Yup.object().shape({
    email: Yup.string().required('Email required'),
    password: Yup.string().required('Password is required'),
  });

  const submit = async (userReq: LoginReq) => {
    setError(null);
    try {
      if (await AuthRequests.signIn(userReq)) {
        const redirectUrl = localStorage.getItem('login_redirect');
        localStorage.removeItem('login_redirect');
        navigate(redirectUrl ?? defaultRedirect ?? '/');
      } else {
        setError('Unknown Error');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.status && apiError.status === 401) {
        setError('Invalid Login Credentials.');
      }
    }
  };

  const form = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: SignupSchema,
    onSubmit: (values) => submit(values),
  });

  return (
    <Form onSubmit={(event) => form.handleSubmit(event)}>
      <FormLabel>
        {form.submitCount > 0 && form.errors.email ? (
          <p className={'error'}>{form.errors.email}</p>
        ) : (
          <p>Email</p>
        )}
      </FormLabel>
      <FormControl
        value={form.values.email}
        onInput={(email) => form.setFieldValue('email', email.currentTarget.value)}
        type={'email'}
      />
      <FormLabel>
        {form.submitCount > 0 && form.errors.password ? (
          <p className={'error'}>{form.errors.password}</p>
        ) : (
          <p>Password</p>
        )}
      </FormLabel>
      <FormControl
        value={form.values.password}
        onInput={(password) => form.setFieldValue('password', password.currentTarget.value)}
        type={'password'}
      />

      <p>
        <Link to="/forgot-password">forgot password?</Link>
      </p>
      <Button type={'submit'}>Submit</Button>
      <p className={'error'}>{error}</p>
    </Form>
  );
};

export default SignInForm;
