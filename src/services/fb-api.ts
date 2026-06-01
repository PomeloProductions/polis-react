import axios from 'axios'

const baseURL = "https://graph.facebook.com/v15.0";

const fbApi = axios.create({ baseURL });

export default fbApi;
