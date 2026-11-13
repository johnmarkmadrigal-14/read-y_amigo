module.exports = ({ config }) => {
  const isDevelopment = process.env.APP_VARIANT === "development";
  const googleServicesFile = isDevelopment
    ? process.env.GOOGLE_SERVICES_JSON_DEV
    : process.env.GOOGLE_SERVICES_JSON;

  return {
    ...config,
    name: isDevelopment ? "Read-y Amigo Dev" : config.name,
    scheme: isDevelopment ? "readyamigo-dev" : config.scheme,
    android: {
      ...config.android,
      package: isDevelopment ? "com.readyamigo.app.dev" : config.android.package,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};