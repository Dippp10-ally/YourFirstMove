import { Router } from 'express';
import taskService from '../services/TaskService';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  validate,
  validateQuery,
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  reorderTasksSchema,
  duplicateDaySchema,
} from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List tasks
router.get('/', validateQuery(listTasksQuerySchema), async (req: AuthRequest, res, next) => {
  try {
    const filters = {
      priority: req.query.priority as string,
      isCompleted: req.query.isCompleted as boolean | undefined,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      search: req.query.search as string,
    };

    const pagination = {
      page: (req.query.page as any) || 1,
      pageSize: (req.query.pageSize as any) || 50,
    };

    const result = await taskService.listTasks(req.userId!, filters, pagination);

    res.json({
      success: true,
      data: result,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Create task
router.post('/', validate(createTaskSchema), async (req: AuthRequest, res, next) => {
  try {
    const task = await taskService.createTask(req.userId!, req.body);

    res.status(201).json({
      success: true,
      data: { task },
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Get single task
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const task = await taskService.getTask(parseInt(req.params.id), req.userId!);

    res.json({
      success: true,
      data: { task },
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Update task
router.put('/:id', validate(updateTaskSchema), async (req: AuthRequest, res, next) => {
  try {
    const task = await taskService.updateTask(parseInt(req.params.id), req.userId!, req.body);

    res.json({
      success: true,
      data: { task },
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Delete task
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await taskService.deleteTask(parseInt(req.params.id), req.userId!);

    res.status(204).send();
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Mark task complete
router.patch('/:id/complete', async (req: AuthRequest, res, next) => {
  try {
    const task = await taskService.markComplete(parseInt(req.params.id), req.userId!);

    res.json({
      success: true,
      data: { task },
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Mark task incomplete
router.patch('/:id/uncomplete', async (req: AuthRequest, res, next) => {
  try {
    const task = await taskService.markIncomplete(parseInt(req.params.id), req.userId!);

    res.json({
      success: true,
      data: { task },
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Reorder tasks
router.patch('/reorder', validate(reorderTasksSchema), async (req: AuthRequest, res, next) => {
  try {
    await taskService.reorderTasks(req.userId!, req.body.taskIds);

    res.json({
      success: true,
      message: 'Tasks reordered successfully',
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Get tasks by date
router.get('/daily/:date', async (req: AuthRequest, res, next) => {
  try {
    const tasks = await taskService.getTasksByDate(req.userId!, req.params.date);

    res.json({
      success: true,
      data: { tasks },
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Get tasks by month
router.get('/monthly/:month', async (req: AuthRequest, res, next) => {
  try {
    const tasks = await taskService.getTasksByMonth(req.userId!, req.params.month);

    res.json({
      success: true,
      data: { tasks },
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Duplicate day's schedule to another date
router.post('/duplicate-day', validate(duplicateDaySchema), async (req: AuthRequest, res, next) => {
  try {
    const { sourceDate, targetDate } = req.body;
    
    const duplicatedTasks = await taskService.duplicateDaySchedule(
      req.userId!,
      sourceDate,
      targetDate
    );

    res.json({
      success: true,
      data: { tasks: duplicatedTasks, count: duplicatedTasks.length },
      message: `Successfully duplicated ${duplicatedTasks.length} tasks`
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
