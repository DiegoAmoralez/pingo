const productionUrl = 'https://www.pingogo.eu';

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured && !(process.env.NODE_ENV === 'production' && configured.includes('localhost'))) {
    return configured.replace(/\/$/, '');
  }
  return process.env.NODE_ENV === 'production' ? productionUrl : 'http://localhost:3000';
}
