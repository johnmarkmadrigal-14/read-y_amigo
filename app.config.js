// Set this to an EAS file environment variable for Android push builds.
module.exports = ({ config }) => {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  if (!googleServicesFile) return config;

  return { ...config, android: { ...config.android, googleServicesFile } };
};
