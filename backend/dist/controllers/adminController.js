"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = exports.createRedeemCode = exports.createPlan = void 0;
const prisma_1 = require("../prisma");
const createPlan = async (req, res) => {
    try {
        const plan = await prisma_1.prisma.plan.create({ data: req.body });
        res.status(201).json(plan);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
exports.createPlan = createPlan;
const createRedeemCode = async (req, res) => {
    try {
        const code = await prisma_1.prisma.redeemCode.create({ data: req.body });
        res.status(201).json(code);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
exports.createRedeemCode = createRedeemCode;
const getUsers = async (req, res) => {
    try {
        // Exclude password manually or use select
        const users = await prisma_1.prisma.user.findMany({
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
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getUsers = getUsers;
