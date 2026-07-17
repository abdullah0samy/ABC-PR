import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import App from './App.tsx';
import {setApiClientCallbacks} from './services/api-client';
import {logout as clearSession} from './services/auth.service';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Root() {
  useEffect(() => {
    setApiClientCallbacks({
      onUnauthorized() {
        clearSession();
        window.location.reload();
      },
      onForbidden() {
        // Forbidden handled by component-level error handling
      },
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
