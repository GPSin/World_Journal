import axios from 'axios';

const API = axios.create({
  baseURL: 'https://world-journal.onrender.com/api',
});

export default API;
