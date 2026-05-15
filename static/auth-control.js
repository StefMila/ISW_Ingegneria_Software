const protectRoute = (allowedTypes) => {
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');


  // Se manca token o userType non è 'allevatore', reindirizza a login
  if (!token || !allowedTypes.includes(userType)) {
    console.warn('Accesso non autorizzato. Reindirizzamento a login.');
        window.location.href = '/login.html';
    return false;
  }
  return true;
};