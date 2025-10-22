import path from 'path';

const getSupabasePathFromURL = (url: string, bucketName: string) => {
  const path = url.split(bucketName)[1];
  return path.slice(1);
}

const constructSupabasePath = (file: Express.Multer.File, id: string, folderPath: string): string => {

  const UPLOAD_TESTER = process.env.UPLOAD_TESTER;

  const TESTER = UPLOAD_TESTER ? `${UPLOAD_TESTER}/` : ''; // if UPLOAD_TESTER exists, add its value as a base path
  const fileExt = path.extname(file.originalname);
  const fileName = `${id}${fileExt}`;
  const supabasePath = `${TESTER}${folderPath}/${fileName}`;

  return supabasePath;
};

export {
  getSupabasePathFromURL,
  constructSupabasePath,
};
