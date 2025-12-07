import { Request, Response } from 'express';
import Plan from '../models/Plan';
import RedeemCode from '../models/RedeemCode';
import User from '../models/User';

export const createPlan = async (req: Request, res: Response) => {
    try {
        const plan = await Plan.create(req.body);
        res.status(201).json(plan);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

export const createRedeemCode = async (req: Request, res: Response) => {
    try {
        const code = await RedeemCode.create(req.body);
        res.status(201).json(code);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select('-password_hash');
        res.json(users);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
