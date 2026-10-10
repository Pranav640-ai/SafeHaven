import React, {lazy,Suspense} from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
const ResponseDashboard=lazy(()=>import('./features/ResponseDashboard').then(m=>({default:m.ResponseDashboard})));
import './styles.css';
import './services/pwa';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.pathname==='/response'?<Suspense fallback={<p>Opening response access…</p>}><ResponseDashboard/></Suspense>:<App/>}
  </React.StrictMode>,
);
