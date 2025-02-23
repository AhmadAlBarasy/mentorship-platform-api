import app from "./app";
import dotenv from "dotenv";
import logger from "./loggers/appLogger";

dotenv.config({ path: './config/.env' });

const PORT: number = Number(process.env.PORT) || 80;

app.listen(PORT, () => logger.info(`Server is listening on port ${PORT}`));