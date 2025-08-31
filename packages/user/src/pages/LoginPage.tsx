import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, Eye, EyeOff, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      await login(data.username, data.password);
    } catch (error) {
      // Error is handled by the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Logo and Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto h-20 w-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mb-4 shadow-2xl"
          >
            <Gamepad2 className="h-10 w-10 text-white" />
          </motion.div>
          <h2 className="text-4xl font-bold text-white mb-2">Win5x</h2>
          <p className="text-gold-400 text-lg font-semibold">Roulette Game</p>
          <p className="mt-2 text-sm text-gray-400">
            Sign in to start spinning and winning!
          </p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="card-content">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  className="form-input"
                  placeholder="Enter your username"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="form-error">{errors.username.message}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="form-input pr-10"
                    placeholder="Enter your password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              <div>
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary btn-xl w-full"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Sign in
                    </>
                  )}
                </motion.button>
              </div>

              <div className="text-center">
                <p className="text-gray-400">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="text-gold-400 hover:text-gold-300 font-semibold transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Demo Credentials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-500 bg-gray-800/50 rounded-lg p-4"
        >
          <p className="mb-2 text-gold-400 font-semibold">Demo Credentials:</p>
          <div className="space-y-1">
            <p>Username: <code className="bg-gray-700 px-2 py-1 rounded text-white">testuser1</code></p>
            <p>Password: <code className="bg-gray-700 px-2 py-1 rounded text-white">Test123!</code></p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;