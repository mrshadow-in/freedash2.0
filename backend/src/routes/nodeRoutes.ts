import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
    listNodes,
    getNode,
    createNode,
    updateNode,
    deleteNode,
    testNodeConnection,
    getNodeStats,
    getNodeAllocations,
    createNodeAllocations,
    deleteNodeAllocation
} from '../controllers/nodeController';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate as any);
router.use(requireAdmin as any);

// Node CRUD
router.get('/', listNodes as any);
router.get('/:id', getNode as any);
router.post('/', createNode as any);
router.put('/:id', updateNode as any);
router.delete('/:id', deleteNode as any);

// Node operations
router.post('/:id/test', testNodeConnection as any);
router.get('/:id/stats', getNodeStats as any);

// Node Allocations
router.get('/:id/allocations', getNodeAllocations as any);
router.post('/:id/allocations', createNodeAllocations as any);
router.delete('/:id/allocations/:allocationId', deleteNodeAllocation as any);

export default router;
