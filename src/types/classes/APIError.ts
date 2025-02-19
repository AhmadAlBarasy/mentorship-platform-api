// A custom class to handle the status code and the message of the error
export default class APIError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string){
    super(message);
    this.statusCode = statusCode;
  }
}