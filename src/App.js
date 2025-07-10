import Chat from './Components/Chat';
import './App.css';
import Dashboard from './Pages/Dashboard';
import Home from './Pages/Home';
import ProtectedRoute from './Components/ProtectedRoute';

import { RouterProvider, createBrowserRouter } from 'react-router-dom';

function App() {
  const AppRouter = createBrowserRouter([
    {
      path: '/',
      element: <Home />,
    },
    {
      path: '/dashboard',
      element: (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      ),
      children: [
        {
          path: 'chat',
          element: <Chat />
        }
      ]
    },
  ]);

  return (
    <div className='font-poppins'>
      <RouterProvider router={AppRouter} />
    </div>
  );
}

export default App;
