exports.isValidImageURL = (url) => {
  try {
    const parsed = new URL(url);

    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
