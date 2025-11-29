import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { authAPI } from '../../services/api';
import './AuthPages.css';

const RegisterSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .required('Vui lòng nhập tên đăng nhập'),
  email: Yup.string()
    .email('Email không hợp lệ')
    .required('Vui lòng nhập email'),
  password: Yup.string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .required('Vui lòng nhập mật khẩu'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Mật khẩu không khớp')
    .required('Vui lòng xác nhận mật khẩu'),
  role: Yup.string().required('Vui lòng chọn loại tài khoản'),
});

const RegisterPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError('');
      setSuccess('');
      
      // Prepare data for backend
      const registerData = {
        username: values.username,
        email: values.email,
        password: values.password,
        role: values.role,
      };
      
      // Call backend API
      const response = await authAPI.register(registerData);
      
      // Check if registration was successful
      if (response.success === true) {
        setSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // Should not reach here as errors throw exceptions
        setError(response.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
      
      setSubmitting(false);
    } catch (err) {
      // Handle error from API (409 for duplicate, 400 for validation, etc.)
      console.error('Register error:', err);
      
      // Check if error has our expected structure
      if (err && err.success === false) {
        setError(err.message || 'Đăng ký thất bại');
      } else if (err && err.message) {
        setError(err.message);
      } else {
        setError('Đăng ký thất bại. Vui lòng thử lại.');
      }
      
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <h2 className="auth-title">Đăng ký</h2>
      <p className="auth-subtitle">Tạo tài khoản mới</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <Formik
        initialValues={{
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'normal',
        }}
        validationSchema={RegisterSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched, isSubmitting }) => (
          <Form className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Tên đăng nhập</label>
              <Field
                id="username"
                name="username"
                type="text"
                className={`form-input ${errors.username && touched.username ? 'error' : ''}`}
                placeholder="Nhập tên đăng nhập"
              />
              {errors.username && touched.username && (
                <div className="field-error">{errors.username}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <Field
                id="email"
                name="email"
                type="email"
                className={`form-input ${errors.email && touched.email ? 'error' : ''}`}
                placeholder="Nhập email"
              />
              {errors.email && touched.email && (
                <div className="field-error">{errors.email}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <Field
                id="password"
                name="password"
                type="password"
                className={`form-input ${errors.password && touched.password ? 'error' : ''}`}
                placeholder="Nhập mật khẩu"
              />
              {errors.password && touched.password && (
                <div className="field-error">{errors.password}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <Field
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className={`form-input ${errors.confirmPassword && touched.confirmPassword ? 'error' : ''}`}
                placeholder="Nhập lại mật khẩu"
              />
              {errors.confirmPassword && touched.confirmPassword && (
                <div className="field-error">{errors.confirmPassword}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="role">Loại tài khoản</label>
              <Field
                as="select"
                id="role"
                name="role"
                className="form-input"
              >
                <option value="normal">Người dùng thông thường</option>
                <option value="merchant">Merchant (Nhà cung cấp P2P)</option>
              </Field>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </Form>
        )}
      </Formik>

      <div className="auth-footer">
        <p>
          Đã có tài khoản? <Link to="/login" className="link">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
