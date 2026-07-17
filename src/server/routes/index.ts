import { Router } from "express";
import { authRouter } from "../controllers/auth";
import { usersRouter } from "../controllers/users";
import { templatesRouter, questionsRouter } from "../controllers/questions";
import { surveysRouter } from "../controllers/surveys";
import { analyticsRouter } from "../controllers/analytics";
import { categoriesRouter } from "../controllers/categories";
import { whatsappRouter } from "../controllers/whatsapp";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/templates", templatesRouter);
apiRouter.use("/questions", questionsRouter);
apiRouter.use("/surveys", surveysRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/whatsapp", whatsappRouter);
