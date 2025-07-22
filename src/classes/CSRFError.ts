import APIError from './APIError';

export default class CSRFError extends APIError {
  constructor(message = 'Invalid or missing CSRF token.') {
    super(403, message);
    this.name = 'CSRFError';
  }
}
