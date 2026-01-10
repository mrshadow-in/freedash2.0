import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const createPlan = async (req: Request, res: Response) => {
    try {
        const plan = await prisma.plan.create({ data: req.body });
        res.status(201).json(plan);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

export const createRedeemCode = async (req: Request, res: Response) => {
    try {
        const code = await prisma.redeemCode.create({ data: req.body });
        res.status(201).json(code);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        // Exclude password manually or use select
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                coins: true,
                discordId: true,
                isBanned: true,
                createdAt: true,
                updatedAt: true,
                // exclude password
            }
        });
        res.json(users);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
