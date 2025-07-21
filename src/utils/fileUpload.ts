import multer from 'multer';
import APIError from '../classes/APIError';

const oneMB = 1024 * 1024;
const MAX_FILE_SIZE = (Number(process.env.MAX_FILE_SIZE) || 2) * oneMB;

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new APIError(400, 'Usupported file type'));
  }

  cb(null, true);
};


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

export default upload;
