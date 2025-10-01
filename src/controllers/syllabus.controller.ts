import { Request, Response } from 'express';
import { SyllabusService } from '../services/syllabus.service';
import logger from '../utils/logger';

export const getSyllabus = async (req: Request, res: Response) => {
  try {
    const { classLevel } = req.params;
    const syllabus = await SyllabusService.getSyllabus(classLevel);
    res.json(syllabus);
  } catch (err: any) {
    logger.error(`Error fetching syllabus: ${err.message}`);
    res.status(404).json({ error: err.message });
  }
};

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const { classLevel } = req.params;
    const subjects = await SyllabusService.getSubjects(classLevel);
    res.json(subjects);
  } catch (err: any) {
    logger.error(`Error fetching subjects: ${err.message}`);
    res.status(404).json({ error: err.message });
  }
};

export const getTopics = async (req: Request, res: Response) => {
  try {
    const { classLevel, subject } = req.params;
    const topics = await SyllabusService.getTopics(classLevel, subject);
    res.json(topics);
  } catch (err: any) {
    logger.error(`Error fetching topics: ${err.message}`);
    res.status(404).json({ error: err.message });
  }
};
