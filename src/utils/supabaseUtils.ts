const getSupabasePathFromURL = (url: string, bucketName: string) => {
  const path = url.split(bucketName)[1];
  return path.slice(1);
}

export {
  getSupabasePathFromURL,
};
