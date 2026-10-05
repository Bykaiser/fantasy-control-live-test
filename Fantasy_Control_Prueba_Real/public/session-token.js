export function accessTokenFromConfig(text) {
  const data = JSON.parse(text);
  const token = data?.access_token;
  if (typeof token !== 'string' || !/^[A-Za-z0-9._~+\/-]{20,8192}={0,2}$/.test(token)) {
    throw new Error('El archivo no contiene un access_token válido.');
  }
  return token;
}
