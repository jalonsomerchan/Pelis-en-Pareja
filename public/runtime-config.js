// Configuración pública. La clave de TMDB vive exclusivamente en la clase PHP.
window.pelisConfig = {
  apiBaseUrl: ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost/OV2/api' : 'https://alon.one/api',
  firebase: {
    apiKey: 'AIzaSyDlsvRoB3_IVLQK1OIl1G20VvFA4hz4iXA',
    authDomain: 'alonsoftware.firebaseapp.com',
    projectId: 'alonsoftware',
    appId: '1:928763728875:web:cd49619140844491e6ffae'
  }
};
