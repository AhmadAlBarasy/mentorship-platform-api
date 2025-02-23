import { Application } from "express";
import swaggerUI from 'swagger-ui-express';
import docs from '../../docs/swagger.json';

const setupSwagger = (app: Application): void => {
    app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(docs));
};

export default setupSwagger;