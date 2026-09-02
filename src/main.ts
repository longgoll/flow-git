import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

window.addEventListener('error', (e) => {
  console.error('Global Window Error:', e.error || e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled Promise Rejection:', e.reason);
});

const target = document.getElementById('app');
if (!target) {
  throw new Error('Target element #app not found in document');
}

const app = mount(App, { target });

export default app;
